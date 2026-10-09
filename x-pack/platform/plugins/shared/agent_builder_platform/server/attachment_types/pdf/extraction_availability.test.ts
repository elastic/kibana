/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { DOCUMENT_EXTRACTION_ENDPOINT_ID } from './constants';

jest.mock('./constants', () => ({
  ...jest.requireActual('./constants'),
  USE_FAKE_EXTRACTION: false,
}));

type ExtractionAvailabilityModule = typeof import('./extraction_availability');

const loadFreshModule = (): ExtractionAvailabilityModule => {
  let loaded: ExtractionAvailabilityModule | undefined;
  jest.isolateModules(() => {
    loaded = jest.requireActual('./extraction_availability');
  });
  if (!loaded) throw new Error('Could not load the module');
  return loaded;
};

const createEsClient = (get: jest.Mock) =>
  ({ inference: { get } } as unknown as ElasticsearchClient);

describe('pdf extraction availability', () => {
  const logger = loggingSystemMock.createLogger();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('is not available before the check runs', () => {
    const { isPdfExtractionAvailable } = loadFreshModule();
    expect(isPdfExtractionAvailable()).toBe(false);
  });

  it('is available when the endpoint is found', async () => {
    const { checkPdfExtractionAvailability, isPdfExtractionAvailable } = loadFreshModule();
    const get = jest.fn(async () => ({
      endpoints: [{ inference_id: DOCUMENT_EXTRACTION_ENDPOINT_ID }],
    }));

    await checkPdfExtractionAvailability({ esClient: createEsClient(get), logger });

    expect(get).toHaveBeenCalledWith({ inference_id: DOCUMENT_EXTRACTION_ENDPOINT_ID });
    expect(isPdfExtractionAvailable()).toBe(true);
  });

  it('is not available when ES returns no endpoints', async () => {
    const { checkPdfExtractionAvailability, isPdfExtractionAvailable } = loadFreshModule();
    const get = jest.fn(async () => ({ endpoints: [] }));

    await checkPdfExtractionAvailability({ esClient: createEsClient(get), logger });

    expect(isPdfExtractionAvailable()).toBe(false);
  });

  it('is not available when the endpoint is not found (404)', async () => {
    const { checkPdfExtractionAvailability, isPdfExtractionAvailable } = loadFreshModule();
    const get = jest.fn(async () => {
      throw Object.assign(new Error('not found'), { statusCode: 404 });
    });

    await checkPdfExtractionAvailability({ esClient: createEsClient(get), logger });

    expect(isPdfExtractionAvailable()).toBe(false);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('is not available and logs a warning for any other error', async () => {
    const { checkPdfExtractionAvailability, isPdfExtractionAvailable } = loadFreshModule();
    const get = jest.fn(async () => {
      throw Object.assign(new Error('server error'), { statusCode: 500 });
    });

    await checkPdfExtractionAvailability({ esClient: createEsClient(get), logger });

    expect(isPdfExtractionAvailable()).toBe(false);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('server error'));
  });

  it('checks only once', async () => {
    const { checkPdfExtractionAvailability } = loadFreshModule();
    const get = jest.fn(async () => ({
      endpoints: [{ inference_id: DOCUMENT_EXTRACTION_ENDPOINT_ID }],
    }));
    const esClient = createEsClient(get);

    await Promise.all([
      checkPdfExtractionAvailability({ esClient, logger }),
      checkPdfExtractionAvailability({ esClient, logger }),
    ]);
    await checkPdfExtractionAvailability({ esClient, logger });

    expect(get).toHaveBeenCalledTimes(1);
  });
});
