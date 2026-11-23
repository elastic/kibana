/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import { HOST_METRICS_CPU_FIELD } from './full_stack_data';

/**
 * A real data stream, unlike the data-forge indices: its backing index
 * (`.ds-<name>-<yyyy.MM.dd>-<generation>`) is what the concrete-index evals
 * hand to the agent, so ES|QL validation accepts it.
 */
export const HOST_METRICS_DATA_STREAM = 'metrics-alerting_v2_eval.cpu-default';

const INDEX_TEMPLATE_NAME = 'alerting-v2-eval-cpu-data-stream';
const HOSTS = ['eval-host-1', 'eval-host-2', 'eval-host-3'];
const MINUTES_OF_DATA = 15;

export interface HostMetricsDataStream {
  name: string;
  /** Current write index of the data stream, e.g. `.ds-metrics-…-2026.06.11-000001`. */
  backingIndex: string;
}

export const installHostMetricsDataStream = async (
  esClient: Client,
  log: ToolingLog
): Promise<HostMetricsDataStream> => {
  await esClient.indices.putIndexTemplate({
    name: INDEX_TEMPLATE_NAME,
    index_patterns: [HOST_METRICS_DATA_STREAM],
    data_stream: {},
    priority: 500,
    template: {
      mappings: {
        properties: {
          '@timestamp': { type: 'date' },
          host: { properties: { name: { type: 'keyword' } } },
          system: {
            properties: {
              cpu: {
                properties: {
                  total: { properties: { norm: { properties: { pct: { type: 'float' } } } } },
                },
              },
            },
          },
        },
      },
    },
  });

  const now = Date.now();
  const operations = HOSTS.flatMap((host) =>
    Array.from({ length: MINUTES_OF_DATA }, (_, minute) => [
      { create: { _index: HOST_METRICS_DATA_STREAM } },
      {
        '@timestamp': new Date(now - minute * 60_000).toISOString(),
        host: { name: host },
        system: { cpu: { total: { norm: { pct: 0.95 } } } },
      },
    ]).flat()
  );
  const response = await esClient.bulk({ operations, refresh: 'wait_for' });
  if (response.errors) {
    throw new Error(`Failed to seed data stream ${HOST_METRICS_DATA_STREAM}`);
  }

  const { data_streams: dataStreams } = await esClient.indices.getDataStream({
    name: HOST_METRICS_DATA_STREAM,
  });
  const backingIndex = dataStreams[0]?.indices[0]?.index_name;
  if (!backingIndex) {
    throw new Error(`Data stream ${HOST_METRICS_DATA_STREAM} has no backing index`);
  }
  log.info(
    `Seeded data stream ${HOST_METRICS_DATA_STREAM} (field ${HOST_METRICS_CPU_FIELD}) with backing index ${backingIndex}`
  );
  return { name: HOST_METRICS_DATA_STREAM, backingIndex };
};

export const removeHostMetricsDataStream = async (
  esClient: Client,
  log: ToolingLog
): Promise<void> => {
  await esClient.indices.deleteDataStream({ name: HOST_METRICS_DATA_STREAM }, { ignore: [404] });
  await esClient.indices.deleteIndexTemplate({ name: INDEX_TEMPLATE_NAME }, { ignore: [404] });
  log.info(`Removed data stream ${HOST_METRICS_DATA_STREAM}`);
};
