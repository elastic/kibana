/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { Logger } from '@kbn/logging';
import { getDataStreamName } from './reindex';
import { TEMP_INDEX_PREFIX } from '.';
import { createTimestampPipeline } from './pipeline';

const createMockLogger = (): Logger =>
  ({
    trace: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    fatal: jest.fn(),
    log: jest.fn(),
    isLevelEnabled: jest.fn().mockReturnValue(true),
    get: jest.fn().mockReturnThis(),
  } as unknown as Logger);

const createMockEsClient = (): Client =>
  ({
    ingest: {
      putPipeline: jest.fn().mockResolvedValue({}),
      deletePipeline: jest.fn().mockResolvedValue({}),
    },
  } as unknown as Client);

describe('getDataStreamName', () => {
  it('extracts data stream name from backing index', () => {
    expect(getDataStreamName('.ds-logs-nginx-default-2024.01.01-000001')).toBe(
      'logs-nginx-default'
    );
  });

  it('removes temp prefix and extracts data stream name', () => {
    const tempIndex = `${TEMP_INDEX_PREFIX}.ds-logs-nginx-default-2024.01.01-000001`;
    expect(getDataStreamName(tempIndex)).toBe('logs-nginx-default');
  });

  it('removes temp prefix from regular index', () => {
    const tempIndex = `${TEMP_INDEX_PREFIX}my-index`;
    expect(getDataStreamName(tempIndex)).toBe('my-index');
  });

  it('returns original name for non-backing index', () => {
    expect(getDataStreamName('logs-nginx-default')).toBe('logs-nginx-default');
  });

  it('handles complex data stream names with dots', () => {
    expect(getDataStreamName('.ds-metrics-system.cpu-default-2024.12.08-000001')).toBe(
      'metrics-system.cpu-default'
    );
  });
});

describe('createTimestampPipeline', () => {
  it('creates pipeline with correct timestamp parameter', async () => {
    const esClient = createMockEsClient();
    const logger = createMockLogger();
    const maxTimestamp = '2024-01-15T12:00:00.000Z';

    await createTimestampPipeline({ esClient, logger, maxTimestamp });

    expect(esClient.ingest.putPipeline).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'snapshot-loader-timestamp-pipeline',
        processors: expect.arrayContaining([
          expect.objectContaining({
            script: expect.objectContaining({
              params: { max_timestamp: maxTimestamp },
            }),
          }),
        ]),
      })
    );
  });

  it('logs success message', async () => {
    const esClient = createMockEsClient();
    const logger = createMockLogger();

    await createTimestampPipeline({
      esClient,
      logger,
      maxTimestamp: '2024-01-15T12:00:00.000Z',
    });

    expect(logger.debug).toHaveBeenCalledWith('Timestamp pipeline created');
  });
});
