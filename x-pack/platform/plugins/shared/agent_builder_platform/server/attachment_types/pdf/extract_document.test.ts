/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { DOCUMENT_EXTRACTION_ENDPOINT_ID, PDF_EXTRACTION_TIMEOUT_MS } from './constants';
import { extractDocument } from './extract_document';

jest.mock('./constants', () => ({
  ...jest.requireActual('./constants'),
  USE_FAKE_EXTRACTION: false,
}));

describe('extractDocument', () => {
  const logger = loggingSystemMock.createLogger();
  const pdf = Buffer.from('%PDF-1.7 fake');
  const request = jest.fn();
  const esClient = { transport: { request } } as unknown as ElasticsearchClient;

  const run = (signal?: AbortSignal) =>
    extractDocument({ esClient, pdf, fileId: 'file-abc', fileName: 'invoice.pdf', signal, logger });

  beforeEach(() => {
    jest.clearAllMocks();
    request.mockResolvedValue({
      document_extraction: [{ content: '# Invoice\n\nTotal: 145', format: 'markdown' }],
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('sends the PDF as base64 to the document extraction endpoint', async () => {
    await run();

    expect(request).toHaveBeenCalledTimes(1);
    const [params, options] = request.mock.calls[0];
    expect(params).toEqual({
      method: 'POST',
      path: `/_inference/document_extraction/${encodeURIComponent(
        DOCUMENT_EXTRACTION_ENDPOINT_ID
      )}`,
      querystring: { timeout: '180s' },
      body: {
        input: [
          {
            content: {
              type: 'pdf',
              format: 'base64',
              value: `data:application/pdf;base64,${pdf.toString('base64')}`,
            },
          },
        ],
      },
    });
    expect(options).toEqual({
      signal: expect.any(AbortSignal),
      requestTimeout: PDF_EXTRACTION_TIMEOUT_MS,
    });
  });

  it('returns the markdown of the first result', async () => {
    await expect(run()).resolves.toBe('# Invoice\n\nTotal: 145');
  });

  it.each([
    ['has no result', {}],
    ['has an empty result list', { document_extraction: [] }],
    ['has empty content', { document_extraction: [{ content: '' }] }],
  ])('fails when the response %s', async (_name, response) => {
    request.mockResolvedValue(response);

    await expect(run()).rejects.toThrow('Could not read the PDF. Try again later.');
    expect(logger.error).toHaveBeenCalled();
  });

  it('logs the real cause and fails with a plain message when ES fails', async () => {
    request.mockRejectedValue(
      Object.assign(new Error('bad gateway'), { meta: { body: { error: 'reader down' } } })
    );

    await expect(run()).rejects.toThrow('Could not read the PDF. Try again later.');
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('reader down'));
  });

  it('fails with a timeout error when the time budget is used up', async () => {
    jest.useFakeTimers();
    request.mockImplementation(
      (_params, { signal }: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
        })
    );

    const result = run();
    const expectation = expect(result).rejects.toThrow(
      'Reading the PDF took too long. Try a smaller PDF.'
    );
    await jest.advanceTimersByTimeAsync(PDF_EXTRACTION_TIMEOUT_MS);

    await expectation;
  });

  it('fails with a timeout error when the ES client times out', async () => {
    const timeoutError = new Error('Request timed out');
    timeoutError.name = 'TimeoutError';
    request.mockRejectedValue(timeoutError);

    await expect(run()).rejects.toThrow('Reading the PDF took too long. Try a smaller PDF.');
  });

  it('cancels the ES call and rethrows when the caller aborts', async () => {
    let esSignal: AbortSignal | undefined;
    request.mockImplementation(
      (_params, { signal }: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          esSignal = signal;
          signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
        })
    );
    const callerController = new AbortController();

    const result = run(callerController.signal);
    callerController.abort();

    await expect(result).rejects.toThrow('aborted');
    expect(esSignal?.aborted).toBe(true);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('does not call ES when the caller already aborted', async () => {
    const callerController = new AbortController();
    callerController.abort();

    await expect(run(callerController.signal)).rejects.toThrow();
    expect(request).not.toHaveBeenCalled();
  });
});
