/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { ToolingLog } from '@kbn/tooling-log';
import {
  DEFAULT_REINDEX_REQUEST_TIMEOUT_MS,
  getDestinationInfo,
  reindexAllIndices,
} from './reindex';
import { createTimestampPipeline } from './pipeline';
import { getMaxTimestampFromData, replaySnapshot } from '.';

const log = new ToolingLog({
  level: 'silent',
  writeTo: {
    write: () => {},
  },
});

const createMockEsClient = (esqlResponse?: { values: unknown[][] }): Client =>
  ({
    ingest: {
      putPipeline: jest.fn().mockResolvedValue({}),
      deletePipeline: jest.fn().mockResolvedValue({}),
    },
    reindex: jest.fn(),
    esql: {
      query: jest.fn().mockResolvedValue(esqlResponse ?? { columns: [], values: [] }),
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

    await createTimestampPipeline({ esClient, log, pipelineName, maxTimestamp });

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
});

describe('reindexAllIndices', () => {
  it('uses reindex API with correct parameters', async () => {
    const esClient = createMockEsClient();
    (esClient.reindex as unknown as jest.Mock).mockResolvedValue({
      timed_out: false,
      total: 10,
      created: 10,
      failures: [],
    });

    const result = await reindexAllIndices({
      esClient,
      log,
      restoredIndices: ['snapshot-loader-temp-a'],
      originalIndices: ['logs-nginx-default'],
      pipelineName: 'my-pipeline',
      maxTimestamp: '2024-01-15T12:00:00.000Z',
      concurrency: 1,
    });

    expect(esClient.reindex).toHaveBeenCalledWith(
      expect.objectContaining({
        wait_for_completion: true,
        source: { index: 'snapshot-loader-temp-a' },
        dest: expect.objectContaining({
          index: 'logs-nginx-default',
          pipeline: 'my-pipeline',
          op_type: 'index',
        }),
      }),
      expect.objectContaining({ requestTimeout: DEFAULT_REINDEX_REQUEST_TIMEOUT_MS })
    );
    expect(result).toEqual(['logs-nginx-default']);
  });

  it('treats any failures as an error and does not count as successful', async () => {
    const esClient = createMockEsClient();
    (esClient.reindex as unknown as jest.Mock).mockResolvedValue({
      timed_out: false,
      total: 10,
      created: 9,
      failures: [{ cause: { type: 'mapper_parsing_exception', reason: 'bad field' } }],
    });

    const result = await reindexAllIndices({
      esClient,
      log,
      restoredIndices: ['snapshot-loader-temp-a'],
      originalIndices: ['logs-nginx-default'],
      pipelineName: 'my-pipeline',
      maxTimestamp: '2024-01-15T12:00:00.000Z',
      concurrency: 1,
    });

    expect(result).toEqual([]);
  });

  it('treats timed_out=true as an error and does not count as successful', async () => {
    const esClient = createMockEsClient();
    (esClient.reindex as unknown as jest.Mock).mockResolvedValue({
      timed_out: true,
      total: 10,
      created: 10,
      failures: [],
    });

    const result = await reindexAllIndices({
      esClient,
      log,
      restoredIndices: ['snapshot-loader-temp-a'],
      originalIndices: ['logs-nginx-default'],
      pipelineName: 'my-pipeline',
      maxTimestamp: '2024-01-15T12:00:00.000Z',
      concurrency: 1,
    });

    expect(result).toEqual([]);
  });
});

describe('getMaxTimestampFromData', () => {
  it('returns max timestamp from ES|QL query result', async () => {
    const maxTimestamp = '2024-01-15T12:00:00.000Z';
    const esClient = createMockEsClient({ values: [[maxTimestamp]] });

    const result = await getMaxTimestampFromData({
      esClient,
      log,
      tempIndices: ['snapshot-loader-temp-logs-1', 'snapshot-loader-temp-logs-2'],
    });

    expect(result).toBe(maxTimestamp);
    expect(esClient.esql.query).toHaveBeenCalledWith({
      query: expect.stringContaining('snapshot-loader-temp-logs-1,snapshot-loader-temp-logs-2'),
    });
  });

  it('throws error when no values returned', async () => {
    const esClient = createMockEsClient({ values: [] });

    await expect(
      getMaxTimestampFromData({
        esClient,
        log,
        tempIndices: ['snapshot-loader-temp-logs-1'],
      })
    ).rejects.toThrow(/No @timestamp found in restored indices/);
  });
});

describe('replaySnapshot', () => {
  const createFullMockEsClient = () =>
    ({
      ingest: {
        putPipeline: jest.fn().mockResolvedValue({}),
        deletePipeline: jest.fn().mockResolvedValue({}),
      },
      reindex: jest.fn().mockResolvedValue({
        timed_out: false,
        total: 5,
        created: 5,
        failures: [],
      }),
      esql: {
        query: jest.fn().mockResolvedValue({ columns: [], values: [['2024-01-15T12:00:00.000Z']] }),
      },
      snapshot: {
        get: jest.fn().mockResolvedValue({
          snapshots: [
            {
              snapshot: 'test-snap',
              indices: ['.ds-logs-app-default-2024.01.01-000001'],
              start_time: '2024-01-01T00:00:00.000Z',
              end_time: '2024-01-01T01:00:00.000Z',
              state: 'SUCCESS',
            },
          ],
        }),
        restore: jest.fn().mockResolvedValue({
          snapshot: {
            indices: ['snapshot-loader-temp-.ds-logs-app-default-2024.01.01-000001'],
          },
        }),
        deleteRepository: jest.fn().mockResolvedValue({}),
      },
      indices: {
        delete: jest.fn().mockResolvedValue({}),
        getDataStream: jest
          .fn()
          .mockResolvedValue({ data_streams: [{ name: 'logs-app-default' }] }),
      },
    } as unknown as Client);

  const mockRepo = {
    type: 'gcs' as const,
    validate: jest.fn(),
    register: jest.fn().mockResolvedValue(undefined),
  };

  it('calls shouldUseInlineScript callback to determine reindex mode per index', async () => {
    const esClient = createFullMockEsClient();
    const shouldUseInlineScript = jest.fn((destIndex: string) => destIndex === 'logs.otel');

    (esClient.snapshot.get as unknown as jest.Mock).mockResolvedValue({
      snapshots: [
        {
          snapshot: 'test-snap',
          indices: ['logs.otel', 'logs-nginx-default'],
          start_time: '2024-01-01T00:00:00.000Z',
          end_time: '2024-01-01T01:00:00.000Z',
          state: 'SUCCESS',
        },
      ],
    });
    (esClient.snapshot.restore as unknown as jest.Mock).mockResolvedValue({
      snapshot: {
        indices: ['snapshot-loader-temp-logs.otel', 'snapshot-loader-temp-logs-nginx-default'],
      },
    });

    await replaySnapshot({
      esClient,
      log,
      repository: mockRepo,
      snapshotName: 'test-snap',
      patterns: ['logs*'],
      shouldUseInlineScript,
    });

    expect(shouldUseInlineScript).toHaveBeenCalledWith('logs.otel');
    expect(shouldUseInlineScript).toHaveBeenCalledWith('logs-nginx-default');

    const calls = (esClient.reindex as unknown as jest.Mock).mock.calls;
    const otelCall = calls.find(
      ([req]: [{ dest: { index: string } }]) => req.dest.index === 'logs.otel'
    );
    expect(otelCall[0].script).toBeDefined();
    expect(otelCall[0].dest).not.toHaveProperty('pipeline');

    const nginxCall = calls.find(
      ([req]: [{ dest: { index: string } }]) => req.dest.index === 'logs-nginx-default'
    );
    expect(nginxCall[0].dest.pipeline).toBeDefined();
    expect(nginxCall[0].script).toBeUndefined();
  });

  it('uses explicit pipeline when shouldUseInlineScript is not provided', async () => {
    const esClient = createFullMockEsClient();

    await replaySnapshot({
      esClient,
      log,
      repository: mockRepo,
      snapshotName: 'test-snap',
      patterns: ['logs-*'],
    });

    const reindexCall = (esClient.reindex as unknown as jest.Mock).mock.calls[0][0];
    expect(reindexCall.dest.pipeline).toBeDefined();
    expect(reindexCall.script).toBeUndefined();
  });

  it('invokes beforeReindex with correct params after restore and before reindex', async () => {
    const esClient = createFullMockEsClient();
    const beforeReindex = jest.fn();

    await replaySnapshot({
      esClient,
      log,
      repository: mockRepo,
      snapshotName: 'test-snap',
      patterns: ['logs-*'],
      beforeReindex,
    });

    expect(beforeReindex).toHaveBeenCalledTimes(1);
    expect(beforeReindex).toHaveBeenCalledWith(
      expect.objectContaining({
        esClient,
        log,
        originalIndices: expect.arrayContaining(['.ds-logs-app-default-2024.01.01-000001']),
        restoredIndices: expect.any(Array),
        destinationIndices: expect.arrayContaining(['logs-app-default']),
      })
    );

    const restoreOrder = (esClient.snapshot.restore as unknown as jest.Mock).mock
      .invocationCallOrder[0];
    const reindexOrder = (esClient.reindex as unknown as jest.Mock).mock.invocationCallOrder[0];
    expect(restoreOrder).toBeLessThan(reindexOrder);
  });
});
