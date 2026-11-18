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
  findDocumentExtractionEndpoint,
} from './document_extraction';

const createEsError = (statusCode: number) =>
  Object.assign(new Error(`status ${statusCode}`), { statusCode });

describe('findDocumentExtractionEndpoint', () => {
  let esClient: ElasticsearchClientMock;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createElasticsearchClient();
  });

  it('lists the document_extraction inference endpoints', async () => {
    esClient.transport.request.mockResolvedValue({ endpoints: [] });

    await findDocumentExtractionEndpoint(esClient);

    expect(esClient.transport.request).toHaveBeenCalledTimes(1);
    expect(esClient.transport.request).toHaveBeenCalledWith({
      method: 'GET',
      path: '/_inference/document_extraction/_all',
    });
  });

  it('prefers the Elastic Inference Service endpoint', async () => {
    esClient.transport.request.mockResolvedValue({
      endpoints: [
        { inference_id: 'custom-jina', service: 'jinaai' },
        { inference_id: '.jina-reader', service: 'elastic' },
        { inference_id: 'other-elastic', service: 'elastic' },
      ],
    });

    await expect(findDocumentExtractionEndpoint(esClient)).resolves.toBe('.jina-reader');
  });

  it('falls back to the first endpoint when none is served by the Elastic Inference Service', async () => {
    esClient.transport.request.mockResolvedValue({
      endpoints: [
        { inference_id: 'custom-jina', service: 'jinaai' },
        { inference_id: 'another', service: 'other' },
      ],
    });

    await expect(findDocumentExtractionEndpoint(esClient)).resolves.toBe('custom-jina');
  });

  it('returns undefined when there is no endpoint', async () => {
    esClient.transport.request.mockResolvedValue({ endpoints: [] });

    await expect(findDocumentExtractionEndpoint(esClient)).resolves.toBeUndefined();
  });

  it('propagates Elasticsearch errors', async () => {
    esClient.transport.request.mockRejectedValue(new Error('forbidden'));

    await expect(findDocumentExtractionEndpoint(esClient)).rejects.toThrow('forbidden');
  });
});

describe('extractPage', () => {
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

  it('asks the inference endpoint to fetch the URL', async () => {
    esClient.transport.request.mockResolvedValue({
      document_extraction: [{ content: '# Page', format: 'markdown' }],
    });

    await extract();

    expect(esClient.transport.request).toHaveBeenCalledTimes(1);
    expect(esClient.transport.request).toHaveBeenCalledWith(
      {
        method: 'POST',
        path: '/_inference/document_extraction/.jina-reader',
        querystring: { timeout: '30s' },
        body: {
          input: { content: { type: 'html', format: 'url', value: 'https://example.com/page' } },
        },
      },
      { signal, requestTimeout: 45_000, maxRetries: 0 }
    );
  });

  it('encodes the inference endpoint ID in the path', async () => {
    esClient.transport.request.mockResolvedValue({
      document_extraction: [{ content: '# Page', format: 'markdown' }],
    });

    await extract('my endpoint/../_all');

    expect(esClient.transport.request).toHaveBeenCalledWith(
      expect.objectContaining({
        path: '/_inference/document_extraction/my%20endpoint%2F..%2F_all',
      }),
      expect.anything()
    );
  });

  it('returns the content with the title and description from the metadata', async () => {
    esClient.transport.request.mockResolvedValue({
      document_extraction: [
        {
          content: '# Page\n\nBody',
          format: 'markdown',
          metadata: { title: 'Page title', description: 'Page description', lang: 'en' },
        },
      ],
    });

    await expect(extract()).resolves.toEqual({
      content: '# Page\n\nBody',
      title: 'Page title',
      description: 'Page description',
    });
  });

  it('returns only the first extraction result', async () => {
    esClient.transport.request.mockResolvedValue({
      document_extraction: [
        { content: 'first', format: 'markdown', metadata: { title: 'First' } },
        { content: 'second', format: 'markdown', metadata: { title: 'Second' } },
      ],
    });

    await expect(extract()).resolves.toEqual({ content: 'first', title: 'First' });
  });

  it('returns the content without title or description when there is no metadata', async () => {
    esClient.transport.request.mockResolvedValue({
      document_extraction: [{ content: '# Page', format: 'markdown' }],
    });

    await expect(extract()).resolves.toEqual({
      content: '# Page',
      title: undefined,
      description: undefined,
    });
  });

  it.each([
    ['there is no result', []],
    ['the content is empty', [{ content: '', format: 'markdown' }]],
    ['the content is blank', [{ content: ' \n\t ', format: 'markdown' }]],
    ['the content is missing', [{ format: 'markdown', metadata: { title: 'Title' } }]],
    ['the content is not a string', [{ content: { text: 'Page' }, format: 'markdown' }]],
  ])('returns undefined when %s', async (_, results) => {
    esClient.transport.request.mockResolvedValue({ document_extraction: results });

    await expect(extract()).resolves.toBeUndefined();
  });

  it('ignores non-string and blank metadata', async () => {
    esClient.transport.request.mockResolvedValue({
      document_extraction: [
        {
          content: '# Page',
          format: 'markdown',
          metadata: { title: { text: 'Title' }, description: 42 },
        },
      ],
    });

    await expect(extract()).resolves.toEqual({
      content: '# Page',
      title: undefined,
      description: undefined,
    });

    esClient.transport.request.mockResolvedValue({
      document_extraction: [
        { content: '# Page', format: 'markdown', metadata: { title: '   ', description: null } },
      ],
    });

    await expect(extract()).resolves.toEqual({
      content: '# Page',
      title: undefined,
      description: undefined,
    });
  });

  it('propagates Elasticsearch errors', async () => {
    esClient.transport.request.mockRejectedValue(new Error('upstream timeout'));

    await expect(extract()).rejects.toThrow('upstream timeout');
  });

  describe('rate limiting', () => {
    const PAGE_RESPONSE = { document_extraction: [{ content: '# Page', format: 'markdown' }] };
    const [FIRST_DELAY_MS, SECOND_DELAY_MS] = RATE_LIMIT_RETRY_DELAYS_MS;

    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('backs off twice, waiting longer the second time', () => {
      expect(RATE_LIMIT_RETRY_DELAYS_MS).toHaveLength(2);
      expect(SECOND_DELAY_MS).toBeGreaterThan(FIRST_DELAY_MS);
    });

    it('tries again after the first delay when the endpoint is rate limiting', async () => {
      esClient.transport.request
        .mockRejectedValueOnce(createEsError(429))
        .mockResolvedValueOnce(PAGE_RESPONSE);

      const extraction = extract();
      await jest.advanceTimersByTimeAsync(FIRST_DELAY_MS - 1);

      expect(esClient.transport.request).toHaveBeenCalledTimes(1);

      await jest.advanceTimersByTimeAsync(1);

      expect(esClient.transport.request).toHaveBeenCalledTimes(2);
      await expect(extraction).resolves.toEqual({ content: '# Page' });
      expect(esClient.transport.request.mock.calls[1]).toEqual(
        esClient.transport.request.mock.calls[0]
      );
    });

    it('tries a third time after the second delay', async () => {
      esClient.transport.request
        .mockRejectedValueOnce(createEsError(429))
        .mockRejectedValueOnce(createEsError(429))
        .mockResolvedValueOnce(PAGE_RESPONSE);

      const extraction = extract();
      await jest.advanceTimersByTimeAsync(FIRST_DELAY_MS);

      expect(esClient.transport.request).toHaveBeenCalledTimes(2);

      await jest.advanceTimersByTimeAsync(SECOND_DELAY_MS - 1);

      expect(esClient.transport.request).toHaveBeenCalledTimes(2);

      await jest.advanceTimersByTimeAsync(1);

      expect(esClient.transport.request).toHaveBeenCalledTimes(3);
      await expect(extraction).resolves.toEqual({ content: '# Page' });
    });

    it('gives up with the rate limiting error once every delay was used', async () => {
      const errors = RATE_LIMIT_RETRY_DELAYS_MS.map(() => createEsError(429));
      const lastError = createEsError(429);
      errors.forEach((error) => esClient.transport.request.mockRejectedValueOnce(error));
      esClient.transport.request.mockRejectedValueOnce(lastError);

      const rejection = expect(extract()).rejects.toBe(lastError);
      await jest.advanceTimersByTimeAsync(FIRST_DELAY_MS + SECOND_DELAY_MS);
      await rejection;

      expect(esClient.transport.request).toHaveBeenCalledTimes(
        RATE_LIMIT_RETRY_DELAYS_MS.length + 1
      );
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
      ['a timeout', createEsError(408)],
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

    it('stops listening to the signal once the delay has passed', async () => {
      const addEventListener = jest.spyOn(signal, 'addEventListener');
      const removeEventListener = jest.spyOn(signal, 'removeEventListener');
      esClient.transport.request
        .mockRejectedValueOnce(createEsError(429))
        .mockResolvedValueOnce(PAGE_RESPONSE);

      const extraction = extract();
      await jest.advanceTimersByTimeAsync(FIRST_DELAY_MS);
      await extraction;

      expect(addEventListener).toHaveBeenCalledTimes(1);
      const [, listener] = addEventListener.mock.calls[0];
      expect(removeEventListener).toHaveBeenCalledWith('abort', listener);
    });
  });
});
