/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { getDestinationInfo } from './reindex';
import { createTimestampPipeline } from './pipeline';
import { loggerMock } from '@kbn/logging-mocks';

const logger = loggerMock.create();

const createMockEsClient = (): Client =>
  ({
    ingest: {
      putPipeline: jest.fn().mockResolvedValue({}),
      deletePipeline: jest.fn().mockResolvedValue({}),
    },
  } as unknown as Client);

describe('getDestinationInfo', () => {
  it('extracts data stream name from backing index', () => {
    expect(getDestinationInfo('.ds-logs-nginx-default-2024.01.01-000001')).toEqual({
      destIndex: 'logs-nginx-default',
      isDataStream: true,
    });
  });

  it('returns original name for non-backing index', () => {
    expect(getDestinationInfo('logs-nginx-default')).toEqual({
      destIndex: 'logs-nginx-default',
      isDataStream: false,
    });
  });

  it('handles complex data stream names with dots', () => {
    expect(getDestinationInfo('.ds-metrics-system.cpu-default-2024.12.08-000001')).toEqual({
      destIndex: 'metrics-system.cpu-default',
      isDataStream: true,
    });
  });
});

describe('createTimestampPipeline', () => {
  it('creates pipeline with correct timestamp parameter', async () => {
    const esClient = createMockEsClient();
    const maxTimestamp = '2024-01-15T12:00:00.000Z';
    const pipelineName = 'test-pipeline';

    await createTimestampPipeline({ esClient, logger, pipelineName, maxTimestamp });

    expect(esClient.ingest.putPipeline).toHaveBeenCalledWith(
      expect.objectContaining({
        id: pipelineName,
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

    await createTimestampPipeline({
      esClient,
      logger,
      pipelineName: 'test-pipeline',
      maxTimestamp: '2024-01-15T12:00:00.000Z',
    });

    expect(logger.debug).toHaveBeenCalledWith('Timestamp pipeline created');
  });
});
