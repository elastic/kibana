/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import {
  DOCUMENT_EXTRACTION_AVAILABILITY_INTERVAL_MS,
  DOCUMENT_EXTRACTION_AVAILABILITY_RETRY_MS,
} from './constants';
import { createDocumentExtractionAvailability } from './extraction_availability';

const createEsClient = (request: jest.Mock) =>
  ({ transport: { request } } as unknown as ElasticsearchClient);

interface GetEndpointsResponse {
  endpoints: Array<{ inference_id: string }>;
}

const withEndpoints =
  (...ids: string[]) =>
  async (): Promise<GetEndpointsResponse> => ({
    endpoints: ids.map((id) => ({ inference_id: id })),
  });
const found = withEndpoints('.jina-reader');
const notFound = async (): Promise<GetEndpointsResponse> => {
  throw Object.assign(new Error('not found'), { statusCode: 404 });
};
const serverError = async (): Promise<GetEndpointsResponse> => {
  throw Object.assign(new Error('server error'), { statusCode: 500 });
};

describe('document extraction availability', () => {
  const logger = loggingSystemMock.createLogger();
  let availability: ReturnType<typeof createDocumentExtractionAvailability>;

  const startWith = async (get: jest.Mock) => {
    availability.start(createEsClient(get));
    await jest.advanceTimersByTimeAsync(0);
  };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    availability = createDocumentExtractionAvailability({ logger });
  });

  afterEach(() => {
    availability.stop();
    jest.useRealTimers();
  });

  it('is not available before the check runs', () => {
    expect(availability.isAvailable()).toBe(false);
    expect(availability.getEndpointId()).toBeUndefined();
  });

  it('lists the document extraction endpoints and uses the only one', async () => {
    const get = jest.fn(withEndpoints('.some-reader'));

    await startWith(get);

    expect(get).toHaveBeenCalledWith({
      method: 'GET',
      path: '/_inference/document_extraction/_all',
    });
    expect(availability.isAvailable()).toBe(true);
    expect(availability.getEndpointId()).toBe('.some-reader');
  });

  it('uses .jina-reader when there are several endpoints', async () => {
    await startWith(jest.fn(withEndpoints('.a-reader', '.jina-reader', '.z-reader')));

    expect(availability.getEndpointId()).toBe('.jina-reader');
  });

  it('uses the first endpoint when there are several and none is .jina-reader', async () => {
    await startWith(jest.fn(withEndpoints('.a-reader', '.z-reader')));

    expect(availability.getEndpointId()).toBe('.a-reader');
  });

  it('is not available when ES returns no endpoints', async () => {
    await startWith(jest.fn(async () => ({ endpoints: [] })));

    expect(availability.isAvailable()).toBe(false);
  });

  it('is not available when the endpoint is not found (404)', async () => {
    await startWith(jest.fn(notFound));

    expect(availability.isAvailable()).toBe(false);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('checks again every interval and picks up an endpoint added later', async () => {
    const get = jest.fn(notFound);
    await startWith(get);
    expect(availability.isAvailable()).toBe(false);

    get.mockImplementation(found);
    await jest.advanceTimersByTimeAsync(DOCUMENT_EXTRACTION_AVAILABILITY_INTERVAL_MS);

    expect(get).toHaveBeenCalledTimes(2);
    expect(availability.isAvailable()).toBe(true);
  });

  it('picks up an endpoint that was removed', async () => {
    const get = jest.fn(found);
    await startWith(get);
    expect(availability.isAvailable()).toBe(true);

    get.mockImplementation(notFound);
    await jest.advanceTimersByTimeAsync(DOCUMENT_EXTRACTION_AVAILABILITY_INTERVAL_MS);

    expect(availability.isAvailable()).toBe(false);
  });

  it('logs a warning and retries sooner when the check fails', async () => {
    const get = jest.fn(serverError);
    await startWith(get);

    expect(availability.isAvailable()).toBe(false);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('server error'));

    get.mockImplementation(found);
    await jest.advanceTimersByTimeAsync(DOCUMENT_EXTRACTION_AVAILABILITY_RETRY_MS);

    expect(get).toHaveBeenCalledTimes(2);
    expect(availability.isAvailable()).toBe(true);
  });

  it('keeps the last known state when a later check fails', async () => {
    const get = jest.fn(found);
    await startWith(get);

    get.mockImplementation(serverError);
    await jest.advanceTimersByTimeAsync(DOCUMENT_EXTRACTION_AVAILABILITY_INTERVAL_MS);

    expect(logger.warn).toHaveBeenCalled();
    expect(availability.isAvailable()).toBe(true);
  });

  it('switches to a new endpoint when the old one is removed', async () => {
    const get = jest.fn(found);
    await startWith(get);

    get.mockImplementation(withEndpoints('.jina-reader-v2'));
    await jest.advanceTimersByTimeAsync(DOCUMENT_EXTRACTION_AVAILABILITY_INTERVAL_MS);

    expect(availability.getEndpointId()).toBe('.jina-reader-v2');
  });

  it('logs the state only when it changes', async () => {
    await startWith(jest.fn(found));
    await jest.advanceTimersByTimeAsync(DOCUMENT_EXTRACTION_AVAILABILITY_INTERVAL_MS);

    expect(logger.info).toHaveBeenCalledTimes(1);
  });

  it('stops checking after stop', async () => {
    const get = jest.fn(found);
    await startWith(get);

    availability.stop();
    await jest.advanceTimersByTimeAsync(DOCUMENT_EXTRACTION_AVAILABILITY_INTERVAL_MS * 2);

    expect(get).toHaveBeenCalledTimes(1);
  });

  it('starts only once', async () => {
    const get = jest.fn(found);

    availability.start(createEsClient(get));
    await startWith(get);

    expect(get).toHaveBeenCalledTimes(1);
  });
});
