/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { DOCUMENT_EXTRACTION_ENDPOINT_ID } from './constants';
import { createDocumentExtractionAvailability } from './extraction_availability';

jest.mock('./constants', () => ({
  ...jest.requireActual('./constants'),
  USE_FAKE_EXTRACTION: false,
}));

const createEsClient = (get: jest.Mock) =>
  ({ inference: { get } } as unknown as ElasticsearchClient);

describe('document extraction availability', () => {
  const logger = loggingSystemMock.createLogger();
  const createAvailability = () => createDocumentExtractionAvailability({ logger });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('is not available before the check runs', () => {
    const { isAvailable } = createAvailability();
    expect(isAvailable()).toBe(false);
  });

  it('is available when the endpoint is found', async () => {
    const { check, isAvailable } = createAvailability();
    const get = jest.fn(async () => ({
      endpoints: [{ inference_id: DOCUMENT_EXTRACTION_ENDPOINT_ID }],
    }));

    await check(createEsClient(get));

    expect(get).toHaveBeenCalledWith({ inference_id: DOCUMENT_EXTRACTION_ENDPOINT_ID });
    expect(isAvailable()).toBe(true);
  });

  it('is not available when ES returns no endpoints', async () => {
    const { check, isAvailable } = createAvailability();
    const get = jest.fn(async () => ({ endpoints: [] }));

    await check(createEsClient(get));

    expect(isAvailable()).toBe(false);
  });

  it('is not available when the endpoint is not found (404)', async () => {
    const { check, isAvailable } = createAvailability();
    const get = jest.fn(async () => {
      throw Object.assign(new Error('not found'), { statusCode: 404 });
    });

    await check(createEsClient(get));

    expect(isAvailable()).toBe(false);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('is not available and logs a warning for any other error', async () => {
    const { check, isAvailable } = createAvailability();
    const get = jest.fn(async () => {
      throw Object.assign(new Error('server error'), { statusCode: 500 });
    });

    await check(createEsClient(get));

    expect(isAvailable()).toBe(false);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('server error'));
  });

  it('checks only once', async () => {
    const { check } = createAvailability();
    const get = jest.fn(async () => ({
      endpoints: [{ inference_id: DOCUMENT_EXTRACTION_ENDPOINT_ID }],
    }));
    const esClient = createEsClient(get);

    await Promise.all([check(esClient), check(esClient)]);
    await check(esClient);

    expect(get).toHaveBeenCalledTimes(1);
  });

  it('keeps the state separate for each instance', async () => {
    const first = createAvailability();
    const second = createAvailability();
    const get = jest.fn(async () => ({
      endpoints: [{ inference_id: DOCUMENT_EXTRACTION_ENDPOINT_ID }],
    }));

    await first.check(createEsClient(get));

    expect(first.isAvailable()).toBe(true);
    expect(second.isAvailable()).toBe(false);
  });
});
