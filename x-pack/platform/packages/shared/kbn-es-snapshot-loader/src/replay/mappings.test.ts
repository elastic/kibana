/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { ToolingLog } from '@kbn/tooling-log';
import { copySourceMappings } from './mappings';

const log = new ToolingLog({ level: 'silent', writeTo: { write: () => {} } });

const counterMapping = { type: 'double', time_series_metric: 'counter' };

const createMockEsClient = (
  mappingsByIndex: Record<string, Record<string, unknown>>,
  emptyIndices: string[] = []
): Client =>
  ({
    count: jest.fn(async ({ index }: { index: string }) => ({
      count: emptyIndices.includes(index) ? 0 : 42,
    })),
    indices: {
      createDataStream: jest.fn().mockResolvedValue({ acknowledged: true }),
      getMapping: jest.fn(async ({ index }: { index: string }) => ({
        [index]: { mappings: { properties: mappingsByIndex[index] } },
      })),
      putMapping: jest.fn().mockResolvedValue({ acknowledged: true }),
    },
  } as unknown as Client);

describe('copySourceMappings', () => {
  it('creates each destination data stream and copies the mapping of every restored backing index', async () => {
    const esClient = createMockEsClient({
      'snapshot-loader-temp-.ds-metrics-app.otel-2026-04-19-2026.04.18-000003': {
        metrics: { properties: { requests_total: counterMapping } },
      },
      'snapshot-loader-temp-.ds-metrics-app.otel-2026-04-19-2026.04.19-000002': {
        metrics: { properties: { errors_total: counterMapping } },
      },
    });

    await copySourceMappings({
      esClient,
      log,
      restoredIndices: [
        'snapshot-loader-temp-.ds-metrics-app.otel-2026-04-19-2026.04.18-000003',
        'snapshot-loader-temp-.ds-metrics-app.otel-2026-04-19-2026.04.19-000002',
      ],
      originalIndices: [
        '.ds-metrics-app.otel-2026-04-19-2026.04.18-000003',
        '.ds-metrics-app.otel-2026-04-19-2026.04.19-000002',
      ],
    });

    expect(esClient.indices.createDataStream).toHaveBeenCalledTimes(1);
    expect(esClient.indices.createDataStream).toHaveBeenCalledWith({
      name: 'metrics-app.otel-2026-04-19',
    });
    expect(esClient.indices.putMapping).toHaveBeenCalledTimes(2);
    expect(esClient.indices.putMapping).toHaveBeenCalledWith({
      index: 'metrics-app.otel-2026-04-19',
      properties: { metrics: { properties: { errors_total: counterMapping } } },
    });
  });

  it('skips plain indices, empty backing indices and restored indices without mappings', async () => {
    const esClient = createMockEsClient(
      {
        'snapshot-loader-temp-logs-plain': { message: { type: 'text' } },
        'snapshot-loader-temp-.ds-logs-app-default-2024.01.01-000001': {},
        'snapshot-loader-temp-.ds-logs-app-default-2024.01.02-000002': {
          data_stream: { properties: { namespace: { type: 'constant_keyword' } } },
        },
      },
      ['snapshot-loader-temp-.ds-logs-app-default-2024.01.02-000002']
    );

    await copySourceMappings({
      esClient,
      log,
      restoredIndices: [
        'snapshot-loader-temp-logs-plain',
        'snapshot-loader-temp-.ds-logs-app-default-2024.01.01-000001',
        'snapshot-loader-temp-.ds-logs-app-default-2024.01.02-000002',
      ],
      originalIndices: [
        'logs-plain',
        '.ds-logs-app-default-2024.01.01-000001',
        '.ds-logs-app-default-2024.01.02-000002',
      ],
    });

    expect(esClient.indices.createDataStream).toHaveBeenCalledWith({ name: 'logs-app-default' });
    expect(esClient.indices.putMapping).not.toHaveBeenCalled();
  });

  it('names source and destination when a mapping cannot be copied', async () => {
    const esClient = createMockEsClient({
      'snapshot-loader-temp-.ds-logs-app-default-2024.01.01-000001': { message: { type: 'text' } },
    });
    (esClient.indices.putMapping as jest.Mock).mockRejectedValue(
      new Error('illegal_argument_exception: Mapper for [message] conflicts with existing mapper')
    );

    await expect(
      copySourceMappings({
        esClient,
        log,
        restoredIndices: ['snapshot-loader-temp-.ds-logs-app-default-2024.01.01-000001'],
        originalIndices: ['.ds-logs-app-default-2024.01.01-000001'],
      })
    ).rejects.toThrow(
      'Failed to copy mappings from snapshot-loader-temp-.ds-logs-app-default-2024.01.01-000001 to logs-app-default: illegal_argument_exception: Mapper for [message] conflicts with existing mapper'
    );
  });

  it('tolerates a destination data stream that already exists', async () => {
    const esClient = createMockEsClient({
      'snapshot-loader-temp-.ds-logs-app-default-2024.01.01-000001': { message: { type: 'text' } },
    });
    (esClient.indices.createDataStream as jest.Mock).mockRejectedValue(
      new Error('resource_already_exists_exception: data stream already exists')
    );

    await copySourceMappings({
      esClient,
      log,
      restoredIndices: ['snapshot-loader-temp-.ds-logs-app-default-2024.01.01-000001'],
      originalIndices: ['.ds-logs-app-default-2024.01.01-000001'],
    });

    expect(esClient.indices.putMapping).toHaveBeenCalledTimes(1);
  });
});
