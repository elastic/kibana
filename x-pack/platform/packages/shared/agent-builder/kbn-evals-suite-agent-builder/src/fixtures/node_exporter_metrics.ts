/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import { readFileSync } from 'fs';
import Path from 'path';
import { gunzipSync } from 'zlib';

/** Matches the built-in `metrics-prometheus@template`, which maps it as a TSDB data stream. */
export const NODE_EXPORTER_INDEX = 'metrics-node_exporter.prometheus-evals';

const DATASET_PATH = Path.resolve(__dirname, 'node_exporter_metrics.ndjson.gz');
const SAMPLE_INTERVAL_MS = 30_000;
const MINUTE_MS = 60_000;
const BULK_CHUNK_SIZE = 5_000;

export interface NodeExporterTimeRange {
  readonly from: string;
  readonly to: string;
}

interface NodeExporterDocument {
  '@timestamp': string;
  labels: Record<string, string>;
  metrics: Record<string, number>;
}

const readDocuments = (): NodeExporterDocument[] =>
  gunzipSync(readFileSync(DATASET_PATH))
    .toString('utf8')
    .split('\n')
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as NodeExporterDocument);

/**
 * Deletes the node_exporter data stream. Ignores a missing data stream.
 */
export const cleanNodeExporterMetrics = async (esClient: Client): Promise<void> => {
  await esClient.indices.deleteDataStream({ name: NODE_EXPORTER_INDEX }, { ignore: [404] });
};

/**
 * Loads the node_exporter fixture shifted to end at the current minute and returns its time range.
 */
export const loadNodeExporterMetrics = async ({
  esClient,
  log,
}: {
  esClient: Client;
  log: ToolingLog;
}): Promise<NodeExporterTimeRange> => {
  await cleanNodeExporterMetrics(esClient);

  const documents = readDocuments();
  const timestamps = documents.map((document) => Date.parse(document['@timestamp']));
  const first = timestamps.reduce((min, timestamp) => Math.min(min, timestamp), Infinity);
  const last = timestamps.reduce((max, timestamp) => Math.max(max, timestamp), -Infinity);
  // TSDB rejects documents older than `index.look_back_time` (2h by default), so the fixture is
  // moved to the present. Shifting by whole minutes keeps PROMQL step and TBUCKET boundaries stable.
  const shift = Math.floor(Date.now() / MINUTE_MS) * MINUTE_MS - last;

  log.info(`Loading ${documents.length} node_exporter documents into [${NODE_EXPORTER_INDEX}]`);

  for (let offset = 0; offset < documents.length; offset += BULK_CHUNK_SIZE) {
    const operations = documents
      .slice(offset, offset + BULK_CHUNK_SIZE)
      .flatMap((document, index) => [
        { create: {} },
        {
          ...document,
          '@timestamp': new Date(timestamps[offset + index] + shift).toISOString(),
        },
      ]);
    const response = await esClient.bulk({ index: NODE_EXPORTER_INDEX, operations });
    if (response.errors) {
      const failed = response.items.find(({ create }) => create?.error);
      throw new Error(
        `Failed to load node_exporter metrics: ${JSON.stringify(failed?.create?.error)}`
      );
    }
  }

  await esClient.indices.refresh({ index: NODE_EXPORTER_INDEX });

  return {
    from: new Date(first + shift).toISOString(),
    to: new Date(last + shift + SAMPLE_INTERVAL_MS).toISOString(),
  };
};
