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
  DOCUMENT_EXTRACTION_ENDPOINT_ID,
} from './constants';
import { createDocumentExtractionAvailability } from './extraction_availability';

const createEsClient = (get: jest.Mock) =>
  ({ inference: { get } } as unknown as ElasticsearchClient);

interface GetEndpointsResponse {
  endpoints: Array<{ inference_id: string }>;
}

const found = async (): Promise<GetEndpointsResponse> => ({
  endpoints: [{ inference_id: DOCUMENT_EXTRACTION_ENDPOINT_ID }],
});
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
  });

  it('is available when the endpoint is found', async () => {
    const get = jest.fn(found);

    await startWith(get);

    expect(get).toHaveBeenCalledWith({ inference_id: DOCUMENT_EXTRACTION_ENDPOINT_ID });
    expect(availability.isAvailable()).toBe(true);
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
