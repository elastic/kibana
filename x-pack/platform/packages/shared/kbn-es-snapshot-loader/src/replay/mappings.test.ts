/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { MappingProperty } from '@elastic/elasticsearch/lib/api/types';
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
  metrics: {
    type: 'passthrough',
    priority: 10,
    dynamic: 'true',
    properties: { requests_total: counter, latency: histogram },
  },
} as Record<string, MappingProperty>;

const keptMapping = {
  metrics: { type: 'passthrough', properties: { requests_total: counter, latency: histogram } },
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

const metricsSource = (generation: string) =>
  `snapshot-loader-temp-.ds-metrics-app.otel-2026-04-19-2026.04.19-${generation}`;
const metricsOriginal = (generation: string) =>
  `.ds-metrics-app.otel-2026-04-19-2026.04.19-${generation}`;

describe('metricProperties', () => {
  it('keeps only time_series_metric fields, with the parent type and children only', () => {
    expect(metricProperties(sourceMapping)).toEqual(keptMapping);
  });
});

describe('copySourceMappings', () => {
  it('creates each destination data stream and copies the metric mappings once per distinct mapping', async () => {
    const esClient = createMockEsClient({
      [metricsSource('000001')]: sourceMapping,
      [metricsSource('000002')]: sourceMapping,
      'snapshot-loader-temp-.ds-logs-app-default-2024.01.01-000001': { message: { type: 'text' } },
    });

    await copySourceMappings({
      esClient,
      log,
      restoredIndices: [
        metricsSource('000001'),
        metricsSource('000002'),
        'snapshot-loader-temp-.ds-logs-app-default-2024.01.01-000001',
      ],
      originalIndices: [
        metricsOriginal('000001'),
        metricsOriginal('000002'),
        '.ds-logs-app-default-2024.01.01-000001',
      ],
    });

    expect(esClient.indices.createDataStream).toHaveBeenCalledTimes(2);
    expect(esClient.indices.putMapping).toHaveBeenCalledTimes(1);
    expect(esClient.indices.putMapping).toHaveBeenCalledWith({
      index: 'metrics-app.otel-2026-04-19',
      properties: keptMapping,
    });
  });

  it('skips plain indices and tolerates an existing destination data stream', async () => {
    const esClient = createMockEsClient({
      'snapshot-loader-temp-metrics-plain': sourceMapping,
      [metricsSource('000001')]: sourceMapping,
    });
    (esClient.indices.createDataStream as jest.Mock).mockRejectedValue(
      new Error('resource_already_exists_exception: data stream already exists')
    );

    await copySourceMappings({
      esClient,
      log,
      restoredIndices: ['snapshot-loader-temp-metrics-plain', metricsSource('000001')],
      originalIndices: ['metrics-plain', metricsOriginal('000001')],
    });

    expect(esClient.indices.putMapping).toHaveBeenCalledTimes(1);
  });

  it('leaves a stream to the reindex when the cluster has no template for it', async () => {
    const esClient = createMockEsClient({ [metricsSource('000001')]: sourceMapping });
    (esClient.indices.createDataStream as jest.Mock).mockRejectedValue(
      new Error('illegal_argument_exception: no matching index template found for data stream')
    );

    await copySourceMappings({
      esClient,
      log,
      restoredIndices: [metricsSource('000001')],
      originalIndices: [metricsOriginal('000001')],
    });

    expect(esClient.indices.getMapping).not.toHaveBeenCalled();
    expect(esClient.indices.putMapping).not.toHaveBeenCalled();
  });

  it('continues with the other streams when a mapping cannot be applied', async () => {
    const esClient = createMockEsClient({
      [metricsSource('000001')]: sourceMapping,
      'snapshot-loader-temp-.ds-metrics-other.otel-default-2026.04.19-000001': sourceMapping,
    });
    (esClient.indices.putMapping as jest.Mock)
      .mockRejectedValueOnce(
        new Error('illegal_argument_exception: mapper [metrics.latency] cannot be changed')
      )
      .mockResolvedValue({ acknowledged: true });

    await copySourceMappings({
      esClient,
      log,
      restoredIndices: [
        metricsSource('000001'),
        'snapshot-loader-temp-.ds-metrics-other.otel-default-2026.04.19-000001',
      ],
      originalIndices: [
        metricsOriginal('000001'),
        '.ds-metrics-other.otel-default-2026.04.19-000001',
      ],
    });

    expect(esClient.indices.putMapping).toHaveBeenCalledTimes(2);
    expect(esClient.indices.putMapping).toHaveBeenLastCalledWith({
      index: 'metrics-other.otel-default',
      properties: keptMapping,
    });
  });
});
