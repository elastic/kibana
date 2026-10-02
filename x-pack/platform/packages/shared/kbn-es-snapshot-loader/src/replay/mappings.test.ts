/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { ToolingLog } from '@kbn/tooling-log';
import { copySourceMappings, metricProperties } from './mappings';

const log = new ToolingLog({ level: 'silent', writeTo: { write: () => {} } });

const counter = { type: 'double', time_series_metric: 'counter' };
const histogram = { type: 'histogram', time_series_metric: 'histogram' };

const sourceMapping = {
  '@timestamp': { type: 'date' },
  attributes: {
    type: 'passthrough',
    priority: 20,
    properties: { 'http.status_code': { type: 'keyword', time_series_dimension: true } },
  },
  metrics: { properties: { requests_total: counter, latency: histogram } },
};

const createMockEsClient = (mappingsByIndex: Record<string, Record<string, unknown>>): Client =>
  ({
    indices: {
      createDataStream: jest.fn().mockResolvedValue({ acknowledged: true }),
      getMapping: jest.fn(async ({ index }: { index: string }) => ({
        [index]: { mappings: { properties: mappingsByIndex[index] } },
      })),
      putMapping: jest.fn().mockResolvedValue({ acknowledged: true }),
    },
  } as unknown as Client);

describe('metricProperties', () => {
  it('keeps only fields with a time_series_metric declaration, inside their parent objects', () => {
    expect(metricProperties(sourceMapping as never)).toEqual({
      metrics: { properties: { requests_total: counter, latency: histogram } },
    });
  });
});

describe('copySourceMappings', () => {
  it('creates each destination data stream and copies the metric mappings of its backing indices', async () => {
    const esClient = createMockEsClient({
      'snapshot-loader-temp-.ds-metrics-app.otel-2026-04-19-2026.04.18-000003': sourceMapping,
      'snapshot-loader-temp-.ds-metrics-app.otel-2026-04-19-2026.04.19-000002': sourceMapping,
      'snapshot-loader-temp-.ds-logs-app-default-2024.01.01-000001': { message: { type: 'text' } },
    });

    await copySourceMappings({
      esClient,
      log,
      restoredIndices: [
        'snapshot-loader-temp-.ds-metrics-app.otel-2026-04-19-2026.04.18-000003',
        'snapshot-loader-temp-.ds-metrics-app.otel-2026-04-19-2026.04.19-000002',
        'snapshot-loader-temp-.ds-logs-app-default-2024.01.01-000001',
      ],
      originalIndices: [
        '.ds-metrics-app.otel-2026-04-19-2026.04.18-000003',
        '.ds-metrics-app.otel-2026-04-19-2026.04.19-000002',
        '.ds-logs-app-default-2024.01.01-000001',
      ],
    });

    expect(esClient.indices.createDataStream).toHaveBeenCalledTimes(2);
    expect(esClient.indices.putMapping).toHaveBeenCalledTimes(2);
    expect(esClient.indices.putMapping).toHaveBeenCalledWith({
      index: 'metrics-app.otel-2026-04-19',
      properties: { metrics: { properties: { requests_total: counter, latency: histogram } } },
    });
  });

  it('skips plain indices and tolerates an existing destination data stream', async () => {
    const esClient = createMockEsClient({
      'snapshot-loader-temp-metrics-plain': sourceMapping,
      'snapshot-loader-temp-.ds-metrics-app.otel-2026-04-19-2026.04.19-000002': sourceMapping,
    });
    (esClient.indices.createDataStream as jest.Mock).mockRejectedValue(
      new Error('resource_already_exists_exception: data stream already exists')
    );

    await copySourceMappings({
      esClient,
      log,
      restoredIndices: [
        'snapshot-loader-temp-metrics-plain',
        'snapshot-loader-temp-.ds-metrics-app.otel-2026-04-19-2026.04.19-000002',
      ],
      originalIndices: ['metrics-plain', '.ds-metrics-app.otel-2026-04-19-2026.04.19-000002'],
    });

    expect(esClient.indices.putMapping).toHaveBeenCalledTimes(1);
  });

  it('names source and destination when a mapping cannot be copied', async () => {
    const esClient = createMockEsClient({
      'snapshot-loader-temp-.ds-metrics-app.otel-2026-04-19-2026.04.19-000002': sourceMapping,
    });
    (esClient.indices.putMapping as jest.Mock).mockRejectedValue(
      new Error('illegal_argument_exception: mapper [metrics.latency] cannot be changed')
    );

    await expect(
      copySourceMappings({
        esClient,
        log,
        restoredIndices: ['snapshot-loader-temp-.ds-metrics-app.otel-2026-04-19-2026.04.19-000002'],
        originalIndices: ['.ds-metrics-app.otel-2026-04-19-2026.04.19-000002'],
      })
    ).rejects.toThrow(
      'Failed to copy mappings from snapshot-loader-temp-.ds-metrics-app.otel-2026-04-19-2026.04.19-000002 to metrics-app.otel-2026-04-19: illegal_argument_exception: mapper [metrics.latency] cannot be changed'
    );
  });
});
