/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { MappingTimeSeriesMetricType } from '@elastic/elasticsearch/lib/api/types';
import type { ToolingLog } from '@kbn/tooling-log';

const INDEX_NAME = 'perf-test-metrics-experience';
const TIME_STEP_MS = 60_000;
const BULK_CHUNK_SIZE = 500;

const INDEX_TIME_RANGE = {
  from: '2025-01-01T00:00:00.000Z',
  to: '2025-12-31T23:59:59.000Z',
  documentsBaseTime: '2025-01-01T00:30:00.000Z',
} as const;

export const METRICS_EXPERIENCE_CONFIG = {
  indexName: INDEX_NAME,
  timeRange: INDEX_TIME_RANGE,
  esqlQuery: `TS ${INDEX_NAME}`,
  discoverTimeRange: {
    from: '2025-01-01T00:00:00.000Z',
    to: '2025-01-01T02:00:00.000Z',
  },
  metrics: {
    gaugeCount: 50,
    counterCount: 50,
  },
  dimensions: {
    count: 1,
    valuesPerDimension: 3,
  },
  documentsCount: 10000,
} as const;

interface MetricDefinition {
  readonly name: string;
  readonly type: MappingTimeSeriesMetricType;
}

interface DimensionDefinition {
  readonly name: string;
  readonly values: readonly string[];
}

interface MetricsIndexConfig {
  readonly indexName: string;
  readonly dimensions: readonly DimensionDefinition[];
  readonly metrics: readonly MetricDefinition[];
  readonly timeRange: typeof INDEX_TIME_RANGE;
}

type EsMappingProperty = Record<string, unknown>;

function getEsMapping({ type }: MetricDefinition): EsMappingProperty {
  switch (type) {
    case 'gauge':
      return { type: 'double', time_series_metric: 'gauge' };
    case 'counter':
      return { type: 'long', time_series_metric: 'counter' };
    default:
      throw new Error(`Unsupported metric type: ${type}`);
  }
}

function generateMetrics(count: number, type: MappingTimeSeriesMetricType): MetricDefinition[] {
  return Array.from({ length: count }, (_, i) => ({ name: `${type}_${i}`, type }));
}

function generateDimensions(count: number, valuesPerDimension: number): DimensionDefinition[] {
  return Array.from({ length: count }, (__, i) => ({
    name: `dimension_${i}`,
    values: Array.from({ length: valuesPerDimension }, (___, j) => `d${i}_v${j}`),
  }));
}

function deterministicMetricValue(
  metricIndex: number,
  docIndex: number,
  type: MappingTimeSeriesMetricType
): number {
  switch (type) {
    case 'gauge':
      return (docIndex % 37) + (metricIndex % 7) * 0.01;
    case 'counter':
      return (docIndex * 31 + metricIndex) % 10000;
    default:
      throw new Error(`Unsupported metric type: ${type}`);
  }
}

function buildMappingProperties(config: MetricsIndexConfig): Record<string, EsMappingProperty> {
  const properties: Record<string, EsMappingProperty> = {
    '@timestamp': { type: 'date' },
  };

  for (const dim of config.dimensions) {
    properties[dim.name] = { type: 'keyword', time_series_dimension: true };
  }

  for (const metric of config.metrics) {
    properties[metric.name] = getEsMapping(metric);
  }

  return properties;
}

function resolveIndexConfig(): MetricsIndexConfig {
  const { indexName, timeRange, metrics, dimensions } = METRICS_EXPERIENCE_CONFIG;
  return {
    indexName,
    timeRange,
    metrics: [
      ...generateMetrics(metrics.gaugeCount, 'gauge'),
      ...generateMetrics(metrics.counterCount, 'counter'),
    ],
    dimensions: generateDimensions(dimensions.count, dimensions.valuesPerDimension),
  };
}

async function recreateTimeSeriesIndex(es: Client, config: MetricsIndexConfig): Promise<void> {
  await es.indices.delete({ index: config.indexName, ignore_unavailable: true });
  await es.indices.create({
    index: config.indexName,
    settings: {
      mode: 'time_series',
      routing_path: config.dimensions.map((d) => d.name),
      time_series: {
        start_time: config.timeRange.from,
        end_time: config.timeRange.to,
      },
    },
    mappings: { properties: buildMappingProperties(config) },
  });
}

async function bulkIndexInChunks(
  es: Client,
  config: MetricsIndexConfig,
  documentCount: number,
  log: ToolingLog
): Promise<void> {
  const { indexName, dimensions, metrics } = config;
  const baseTimeMs = new Date(config.timeRange.documentsBaseTime).getTime();
  const totalChunks = Math.ceil(documentCount / BULK_CHUNK_SIZE);

  for (let offset = 0; offset < documentCount; offset += BULK_CHUNK_SIZE) {
    const chunkIndex = Math.floor(offset / BULK_CHUNK_SIZE) + 1;
    const chunkEnd = Math.min(offset + BULK_CHUNK_SIZE, documentCount);
    const operations: Array<{ index: { _index: string } } | Record<string, string | number>> = [];

    for (let i = offset; i < chunkEnd; i++) {
      const source: Record<string, string | number> = {
        '@timestamp': new Date(baseTimeMs + i * TIME_STEP_MS).toISOString(),
      };

      for (const dim of dimensions) {
        source[dim.name] = dim.values[i % dim.values.length];
      }

      for (let m = 0; m < metrics.length; m++) {
        source[metrics[m].name] = deterministicMetricValue(m, i, metrics[m].type);
      }

      operations.push({ index: { _index: indexName } }, source);
    }

    await es.bulk({ operations, refresh: false });
    log.info(
      `  Indexed chunk ${chunkIndex}/${totalChunks} (${chunkEnd}/${documentCount} documents)`
    );
  }

  log.info('Refreshing index...');
  await es.indices.refresh({ index: indexName });
  log.info('Bulk indexing complete');
}

export async function setupMetricsExperienceData(es: Client, log: ToolingLog): Promise<void> {
  const { documentsCount } = METRICS_EXPERIENCE_CONFIG;
  const config = resolveIndexConfig();

  log.info(`Creating TSDB index [${config.indexName}] with ${config.metrics.length} metrics`);
  await recreateTimeSeriesIndex(es, config);

  log.info(`Bulk-indexing ${documentsCount} documents in chunks of ${BULK_CHUNK_SIZE}...`);
  await bulkIndexInChunks(es, config, documentsCount, log);

  log.info(`Inserted ${documentsCount} documents into [${config.indexName}]`);
}
