/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClientMock } from '@kbn/core/server/mocks';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import {
  RATE_LIMIT_RETRY_DELAYS_MS,
  extractPage,
  listDocumentExtractionEndpoints,
} from './document_extraction';

const createEsError = (statusCode: number) =>
  Object.assign(new Error(`status ${statusCode}`), { statusCode });

describe('listDocumentExtractionEndpoints', () => {
  let esClient: ElasticsearchClientMock;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createElasticsearchClient();
  });

  it('lists the document_extraction endpoints, the Elastic Inference Service ones first', async () => {
    esClient.transport.request.mockResolvedValue({
      endpoints: [
        { inference_id: 'custom-jina', service: 'jinaai' },
        { inference_id: '.jina-reader', service: 'elastic' },
        { inference_id: 'another', service: 'other' },
        { inference_id: 'other-elastic', service: 'elastic' },
      ],
    });

    await expect(listDocumentExtractionEndpoints(esClient)).resolves.toEqual([
      { inferenceId: '.jina-reader', service: 'elastic' },
      { inferenceId: 'other-elastic', service: 'elastic' },
      { inferenceId: 'custom-jina', service: 'jinaai' },
      { inferenceId: 'another', service: 'other' },
    ]);
    expect(esClient.transport.request).toHaveBeenCalledWith({
      method: 'GET',
      path: '/_inference/document_extraction/_all',
    });
  });

  it('lists nothing when there is no endpoint', async () => {
    esClient.transport.request.mockResolvedValue({ endpoints: [] });

    await expect(listDocumentExtractionEndpoints(esClient)).resolves.toEqual([]);
  });
});

describe('extractPage', () => {
  const PAGE_RESPONSE = { document_extraction: [{ content: '# Page', format: 'markdown' }] };
  let esClient: ElasticsearchClientMock;
  let abortController: AbortController;
  let signal: AbortSignal;

  const extract = (inferenceId = '.jina-reader') =>
    extractPage(esClient, { inferenceId, url: 'https://example.com/page', signal });

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    abortController = new AbortController();
    ({ signal } = abortController);
  });

  it('asks the inference endpoint, with its ID encoded in the path, to fetch the URL', async () => {
    esClient.transport.request.mockResolvedValue(PAGE_RESPONSE);

    await extract('my endpoint/../_all');

    expect(esClient.transport.request).toHaveBeenCalledTimes(1);
    expect(esClient.transport.request).toHaveBeenCalledWith(
      {
        method: 'POST',
        path: '/_inference/document_extraction/my%20endpoint%2F..%2F_all',
        querystring: { timeout: '30s' },
        body: {
          input: { content: { type: 'html', format: 'url', value: 'https://example.com/page' } },
        },
      },
      { signal, requestTimeout: 45_000, maxRetries: 0 }
    );
  });

  it('returns the content of the first result with the title and description from its metadata', async () => {
    esClient.transport.request.mockResolvedValue({
      document_extraction: [
        {
          content: '# Page\n\nBody',
          format: 'markdown',
          metadata: { title: 'Page title', description: 'Page description', lang: 'en' },
        },
        { content: 'second', format: 'markdown', metadata: { title: 'Second' } },
      ],
    });

    await expect(extract()).resolves.toEqual({
      content: '# Page\n\nBody',
      title: 'Page title',
      description: 'Page description',
    });
  });

  it('leaves out a title and description that are missing, blank or not a string', async () => {
    esClient.transport.request.mockResolvedValueOnce(PAGE_RESPONSE);
    await expect(extract()).resolves.toEqual({ content: '# Page' });

    esClient.transport.request.mockResolvedValueOnce({
      document_extraction: [
        { content: '# Page', format: 'markdown', metadata: { title: '   ', description: 42 } },
      ],
    });
    await expect(extract()).resolves.toEqual({ content: '# Page' });
  });

  it.each([
    ['there is no result', []],
    ['the content is blank', [{ content: ' \n\t ', format: 'markdown' }]],
    ['the content is not a string', [{ content: { text: 'Page' }, format: 'markdown' }]],
  ])('returns undefined when %s', async (_, results) => {
    esClient.transport.request.mockResolvedValue({ document_extraction: results });

    await expect(extract()).resolves.toBeUndefined();
  });

  describe('rate limiting', () => {
    const [FIRST_DELAY_MS, SECOND_DELAY_MS] = RATE_LIMIT_RETRY_DELAYS_MS;

    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('tries again after each delay while the endpoint is rate limiting', async () => {
      const removeEventListener = jest.spyOn(signal, 'removeEventListener');
      esClient.transport.request
        .mockRejectedValueOnce(createEsError(429))
        .mockRejectedValueOnce(createEsError(429))
        .mockResolvedValueOnce(PAGE_RESPONSE);

      const extraction = extract();
      await jest.advanceTimersByTimeAsync(FIRST_DELAY_MS - 1);
      expect(esClient.transport.request).toHaveBeenCalledTimes(1);

      await jest.advanceTimersByTimeAsync(1);
      expect(esClient.transport.request).toHaveBeenCalledTimes(2);

      await jest.advanceTimersByTimeAsync(SECOND_DELAY_MS - 1);
      expect(esClient.transport.request).toHaveBeenCalledTimes(2);

      await jest.advanceTimersByTimeAsync(1);
      expect(esClient.transport.request).toHaveBeenCalledTimes(3);
      await expect(extraction).resolves.toEqual({ content: '# Page' });
      expect(esClient.transport.request.mock.calls[2]).toEqual(
        esClient.transport.request.mock.calls[0]
      );
      expect(removeEventListener).toHaveBeenCalledTimes(2);
    });

    it('awaits beforeRetry after each delay, before the request is sent again', async () => {
      let release: () => void = () => {};
      const beforeRetry = jest.fn(
        () =>
          new Promise<void>((resolve) => {
            release = resolve;
          })
      );
      esClient.transport.request
        .mockRejectedValueOnce(createEsError(429))
        .mockResolvedValueOnce(PAGE_RESPONSE);

      const extraction = extractPage(esClient, {
        inferenceId: '.jina-reader',
        url: 'https://example.com/page',
        signal,
        beforeRetry,
      });
      await jest.advanceTimersByTimeAsync(FIRST_DELAY_MS);

      expect(beforeRetry).toHaveBeenCalledTimes(1);
      expect(esClient.transport.request).toHaveBeenCalledTimes(1);

      release();

      await expect(extraction).resolves.toEqual({ content: '# Page' });
      expect(esClient.transport.request).toHaveBeenCalledTimes(2);
      expect(beforeRetry).toHaveBeenCalledTimes(1);
    });

    it('gives up with the rate limiting error once every delay was used', async () => {
      const lastError = createEsError(429);
      esClient.transport.request
        .mockRejectedValueOnce(createEsError(429))
        .mockRejectedValueOnce(createEsError(429))
        .mockRejectedValueOnce(lastError);

      const rejection = expect(extract()).rejects.toBe(lastError);
      await jest.advanceTimersByTimeAsync(FIRST_DELAY_MS + SECOND_DELAY_MS);
      await rejection;

      expect(esClient.transport.request).toHaveBeenCalledTimes(3);
      expect(jest.getTimerCount()).toBe(0);
    });

    it('stops backing off as soon as another error comes back', async () => {
      esClient.transport.request
        .mockRejectedValueOnce(createEsError(429))
        .mockRejectedValueOnce(createEsError(503));

      const rejection = expect(extract()).rejects.toThrow('status 503');
      await jest.advanceTimersByTimeAsync(FIRST_DELAY_MS + SECOND_DELAY_MS);
      await rejection;

      expect(esClient.transport.request).toHaveBeenCalledTimes(2);
    });

    it.each([
      ['a server error', createEsError(500)],
      ['an error without status', new Error('socket hang up')],
    ])('does not try again after %s', async (_, error) => {
      esClient.transport.request.mockRejectedValue(error);

      await expect(extract()).rejects.toBe(error);

      expect(esClient.transport.request).toHaveBeenCalledTimes(1);
      expect(jest.getTimerCount()).toBe(0);
    });

    it('rejects without waiting out the delay when the signal is aborted while backing off', async () => {
      const error = createEsError(429);
      esClient.transport.request.mockRejectedValue(error);

      const rejection = expect(extract()).rejects.toBe(error);
      await jest.advanceTimersByTimeAsync(FIRST_DELAY_MS / 2);
      expect(jest.getTimerCount()).toBe(1);

      abortController.abort();
      await rejection;

      expect(esClient.transport.request).toHaveBeenCalledTimes(1);
      expect(jest.getTimerCount()).toBe(0);
    });

    it('does not back off when the signal is already aborted', async () => {
      const error = createEsError(429);
      esClient.transport.request.mockRejectedValue(error);
      abortController.abort();

      await expect(extract()).rejects.toBe(error);

      expect(esClient.transport.request).toHaveBeenCalledTimes(1);
      expect(jest.getTimerCount()).toBe(0);
    });
  });
});
