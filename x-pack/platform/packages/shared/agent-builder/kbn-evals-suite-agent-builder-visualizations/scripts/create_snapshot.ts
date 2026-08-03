/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * One-off script: seed `metrics-hostmetricsreceiver.otel-default` with synthetic
 * OTel host-metrics data, snapshot it to the local filesystem, then upload to GCS.
 *
 * ES writes snapshots directly to whatever repository backend it has credentials
 * for. A local FS snapshot sidesteps GCS credential setup entirely — you just
 * need `gsutil` installed and `gcloud auth login` (or ADC) before uploading.
 *
 * Prerequisites:
 *   - A running ES cluster at ELASTICSEARCH_URL with path.repo configured to
 *     include SNAPSHOT_DIR (add `-E path.repo=/tmp/es-snapshots` when starting ES)
 *   - `gsutil` available in PATH (part of Google Cloud SDK)
 *
 * Usage:
 *   ELASTICSEARCH_URL=http://localhost:9200 \
 *   ELASTICSEARCH_USERNAME=elastic \
 *   ELASTICSEARCH_PASSWORD=changeme \
 *   npx ts-node scripts/create_snapshot.ts
 */

import { execSync } from 'child_process';
import { Client } from '@elastic/elasticsearch';
import { createFsRepository, createSnapshot } from '@kbn/es-snapshot-loader';
import { ToolingLog } from '@kbn/tooling-log';

const GCS_BUCKET = 'obs-ai-datasets';
const GCS_BASE_PATH = 'viz-evals/otel-host-metrics';
const SNAPSHOT_NAME = 'otel-host-metrics';
const SNAPSHOT_DIR = process.env.SNAPSHOT_DIR ?? '/tmp/es-snapshots/viz-evals';

const INDEX = 'metrics-hostmetricsreceiver.otel-default';
// Priority 500 wins over `metrics-otel@template` (priority 120) and ensures
// time_series_metric: gauge is set on load_average fields before data stream creation.
// Cleaned up after the snapshot is taken.
const COMPONENT_TEMPLATE = 'viz-evals-otel-host-metrics@mappings';
const INDEX_TEMPLATE = 'viz-evals-otel-host-metrics';

const HOSTS = ['host-a', 'host-b'] as const;
const SAMPLE_HOURS = 12;

function buildDocuments(now: number = Date.now()) {
  const topOfHour = Math.floor(now / 3_600_000) * 3_600_000;
  const documents = [];

  for (let hour = 0; hour < SAMPLE_HOURS; hour++) {
    const timestamp = new Date(topOfHour - hour * 3_600_000).toISOString();
    for (const [hostIndex, host] of HOSTS.entries()) {
      const load1m = 0.5 + hostIndex * 0.4 + hour * 0.05;
      documents.push({
        '@timestamp': timestamp,
        host: { name: host },
        system: {
          cpu: {
            load_average: {
              '1m': +load1m.toFixed(3),
              '5m': +(load1m * 0.9).toFixed(3),
              '15m': +(load1m * 0.8).toFixed(3),
            },
          },
        },
      });
    }
  }

  return documents;
}

async function main() {
  const log = new ToolingLog({ level: 'info', writeTo: process.stdout });

  const esUrl = process.env.ELASTICSEARCH_URL ?? 'http://localhost:9200';
  const username = process.env.ELASTICSEARCH_USERNAME ?? 'elastic';
  const password = process.env.ELASTICSEARCH_PASSWORD ?? 'changeme';

  log.info(`Connecting to ES at ${esUrl}`);
  const esClient = new Client({ node: esUrl, auth: { username, password } });

  try {
    log.info('Step 1/5: registering component template for TSDB gauge mappings');
    await esClient.cluster.putComponentTemplate({
      name: COMPONENT_TEMPLATE,
      template: {
        settings: { index: { mode: 'time_series', routing_path: ['host.name'] } },
        mappings: {
          properties: {
            host: { properties: { name: { type: 'keyword', time_series_dimension: true } } },
            system: {
              properties: {
                cpu: {
                  properties: {
                    load_average: {
                      properties: {
                        '1m': { type: 'double', time_series_metric: 'gauge' },
                        '5m': { type: 'double', time_series_metric: 'gauge' },
                        '15m': { type: 'double', time_series_metric: 'gauge' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    log.info('Step 2/5: registering index template');
    await esClient.indices.putIndexTemplate({
      name: INDEX_TEMPLATE,
      priority: 500,
      index_patterns: [INDEX],
      data_stream: {},
      composed_of: [COMPONENT_TEMPLATE],
    });

    log.info('Step 3/5: clearing any existing data');
    await esClient.indices.deleteDataStream({ name: INDEX }).catch(() => {});

    log.info('Step 4/5: seeding OTel host-metrics documents');
    const documents = buildDocuments();
    const operations = documents.flatMap((doc) => [{ create: { _index: INDEX } }, doc]);
    const bulkResponse = await esClient.bulk({ operations: operations as object[], refresh: 'wait_for' });
    if (bulkResponse.errors) {
      const firstError = bulkResponse.items.find((item) => item.create?.error)?.create?.error;
      throw new Error(`Bulk indexing failed: ${firstError ? JSON.stringify(firstError) : 'unknown'}`);
    }
    log.info(`Indexed ${documents.length} documents into ${INDEX}`);

    log.info('Step 5a/5: verifying TS query executes');
    const tsResult = await esClient.esql.query({
      query: [
        `TS ${INDEX}`,
        '| STATS `1m` = AVG(AVG_OVER_TIME(`system.cpu.load_average.1m`)),',
        '        `5m` = AVG(AVG_OVER_TIME(`system.cpu.load_average.5m`)),',
        '       `15m` = AVG(AVG_OVER_TIME(`system.cpu.load_average.15m`))',
        '  BY `Bucket` = TBUCKET(4, NOW() - 13h, NOW())',
      ].join('\n'),
    });
    const rowCount = (tsResult.values ?? []).length;
    if (rowCount === 0) {
      throw new Error('TS query returned no rows — TSDB gauge mappings may not be in effect');
    }
    log.info(`TS query verified: ${rowCount} bucket(s) returned`);

    log.info(`Step 5b/5: creating local FS snapshot at ${SNAPSHOT_DIR}`);
    const result = await createSnapshot({
      esClient,
      log,
      repository: createFsRepository({ location: SNAPSHOT_DIR }),
      snapshotName: SNAPSHOT_NAME,
      indices: [INDEX],
    });
    if (!result.success) {
      throw new Error(`Snapshot creation failed: ${result.errors.join('; ')}`);
    }
    log.success(`Snapshot "${SNAPSHOT_NAME}" created (${result.indices.length} indices) at ${SNAPSHOT_DIR}`);
  } finally {
    log.info('Cleaning up temporary templates');
    await esClient.indices.deleteIndexTemplate({ name: INDEX_TEMPLATE }).catch(() => {});
    await esClient.cluster.deleteComponentTemplate({ name: COMPONENT_TEMPLATE }).catch(() => {});
  }

  log.info(`Uploading snapshot to gs://${GCS_BUCKET}/${GCS_BASE_PATH}`);
  execSync(
    `gsutil -m cp -r "${SNAPSHOT_DIR}/" "gs://${GCS_BUCKET}/${GCS_BASE_PATH}/"`,
    { stdio: 'inherit' }
  );
  log.success('Upload complete. Snapshot is ready for use by the eval suite.');
}

main().catch((err) => {
  process.stderr.write(`\nFatal: ${(err as Error).message}\n`);
  process.exit(1);
});
