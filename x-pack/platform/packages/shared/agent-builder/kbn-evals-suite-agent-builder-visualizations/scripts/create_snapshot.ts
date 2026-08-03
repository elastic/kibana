/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * One-off script: seed `metrics-hostmetricsreceiver.otel-default` with synthetic
 * OTel host-metrics data and snapshot it to GCS for use in viz eval fixtures.
 *
 * Prerequisites:
 *   - A running ES cluster reachable at ELASTICSEARCH_URL (default: http://localhost:9200)
 *   - A GCS service-account keyfile with write access to the obs-ai-datasets bucket,
 *     pointed to by GOOGLE_APPLICATION_CREDENTIALS
 *
 * Usage:
 *   ELASTICSEARCH_URL=http://localhost:9200 \
 *   ELASTICSEARCH_USERNAME=elastic \
 *   ELASTICSEARCH_PASSWORD=changeme \
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/keyfile.json \
 *   npx ts-node scripts/create_snapshot.ts
 */

import { Client } from '@elastic/elasticsearch';
import { createGcsRepository, createSnapshot } from '@kbn/es-snapshot-loader';
import { ToolingLog } from '@kbn/tooling-log';

const GCS_BUCKET = 'obs-ai-datasets';
const GCS_BASE_PATH = 'viz-evals/otel-host-metrics';
const SNAPSHOT_NAME = 'otel-host-metrics';

const INDEX = 'metrics-hostmetricsreceiver.otel-default';
// Added at priority 500 so it wins over `metrics-otel@template` (priority 120) and ensures
// time_series_metric: gauge is set on the load_average fields before data stream creation.
// Cleaned up after the snapshot is taken — the eval suite doesn't need it at run-time.
const COMPONENT_TEMPLATE = 'viz-evals-otel-host-metrics@mappings';
const INDEX_TEMPLATE = 'viz-evals-otel-host-metrics';

const HOSTS = ['host-a', 'host-b'] as const;
const SAMPLE_HOURS = 12;

// ---- document generation -----------------------------------------------------------------------

function buildDocuments(now: number = Date.now()) {
  const topOfHour = Math.floor(now / (3_600_000)) * 3_600_000;
  const documents = [];

  for (let hour = 0; hour < SAMPLE_HOURS; hour++) {
    const timestamp = new Date(topOfHour - hour * 3_600_000).toISOString();
    for (const [hostIndex, host] of HOSTS.entries()) {
      const load1m = 0.5 + hostIndex * 0.4 + hour * 0.05;
      documents.push({
        '@timestamp': timestamp,
        'data_stream.type': 'metrics',
        'data_stream.dataset': 'hostmetricsreceiver.otel',
        'data_stream.namespace': 'default',
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

// ---- main --------------------------------------------------------------------------------------

async function main() {
  const log = new ToolingLog({ level: 'info', writeTo: process.stdout });

  const esUrl = process.env.ELASTICSEARCH_URL ?? 'http://localhost:9200';
  const username = process.env.ELASTICSEARCH_USERNAME ?? 'elastic';
  const password = process.env.ELASTICSEARCH_PASSWORD ?? 'changeme';

  log.info(`Connecting to ES at ${esUrl}`);
  const esClient = new Client({ node: esUrl, auth: { username, password } });

  try {
    // Step 1: component template that guarantees TSDB gauge annotations on the load-average fields.
    // If metrics-otel@template already maps them as gauges this is harmless (same annotation).
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

    // Step 2: index template at priority 500 that composes our component and creates a data stream.
    log.info('Step 2/5: registering index template');
    await esClient.indices.putIndexTemplate({
      name: INDEX_TEMPLATE,
      priority: 500,
      index_patterns: [INDEX],
      data_stream: {},
      composed_of: [COMPONENT_TEMPLATE],
    });

    // Step 3: delete any pre-existing data stream so we start fresh.
    log.info('Step 3/5: clearing any existing data');
    await esClient.indices.deleteDataStream({ name: INDEX }).catch(() => {});

    // Step 4: seed documents — the data stream is created on first write.
    log.info('Step 4/5: seeding OTel host-metrics documents');
    const now = Date.now();
    const documents = buildDocuments(now);
    const operations = documents.flatMap((doc) => [{ create: { _index: INDEX } }, doc]);

    const bulkResponse = await esClient.bulk({ operations: operations as object[], refresh: 'wait_for' });
    if (bulkResponse.errors) {
      const firstError = bulkResponse.items.find((item) => item.create?.error)?.create?.error;
      throw new Error(`Bulk indexing failed: ${firstError ? JSON.stringify(firstError) : 'unknown'}`);
    }
    log.info(`Indexed ${documents.length} documents into ${INDEX}`);

    // Step 5: verify the TS query works before committing to a snapshot.
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

    // Step 5b: snapshot to GCS.
    log.info(`Step 5b/5: creating GCS snapshot "${SNAPSHOT_NAME}" in ${GCS_BUCKET}/${GCS_BASE_PATH}`);
    const result = await createSnapshot({
      esClient,
      log,
      repository: createGcsRepository({ bucket: GCS_BUCKET, basePath: GCS_BASE_PATH }),
      snapshotName: SNAPSHOT_NAME,
      indices: [INDEX],
    });

    if (!result.success) {
      throw new Error(`Snapshot creation failed: ${result.errors.join('; ')}`);
    }
    log.success(`Snapshot "${SNAPSHOT_NAME}" created with ${result.indices.length} indices`);
  } finally {
    // Clean up the ad-hoc templates regardless of success/failure.
    log.info('Cleaning up temporary templates');
    await esClient.indices.deleteIndexTemplate({ name: INDEX_TEMPLATE }).catch(() => {});
    await esClient.cluster.deleteComponentTemplate({ name: COMPONENT_TEMPLATE }).catch(() => {});
  }
}

main().catch((err) => {
  process.stderr.write(`\nFatal: ${(err as Error).message}\n`);
  process.exit(1);
});
