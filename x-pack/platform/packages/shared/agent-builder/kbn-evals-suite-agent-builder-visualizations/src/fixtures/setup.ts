/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import { buildOtelMetricsBulkOperations } from './documents';
import {
  OTEL_METRICS_INDEX,
  OTEL_METRICS_OVERRIDE_TEMPLATE_NAME,
  buildOtelMetricsIndexCreateRequest,
  otelMetricsFixtureIndexWildcards,
  otelMetricsOverrideTemplate,
} from './indices';

/**
 * Create the OTel host-metrics TSDB fixture and seed its documents so the
 * `TS`-based gold query in the visualization dataset has real time-series
 * data to execute against.
 *
 * Fail-fast on errors: without this index the `ES|QL Execution Validity` and
 * `ES|QL Result Equivalence` evaluators score 0 for every OTel example
 * (`verification_exception: Unknown index`), silently masking regressions in
 * `TS` query generation. Surfacing the failure lets CI fail loudly instead.
 */
export async function setupOtelMetricsFixtures({
  esClient,
  log,
}: {
  esClient: EsClient;
  log: ToolingLog;
}): Promise<void> {
  log.info('[viz-evals] creating OTel host-metrics TSDB fixture');

  // A single `now` keeps the index window and the seeded document
  // timestamps consistent (both are now-relative).
  const now = Date.now();
  const indexCreateRequest = buildOtelMetricsIndexCreateRequest(now);

  // Local / reused clusters often already have this name as a managed OTel
  // *data stream*. Our override template intentionally has no `data_stream`
  // block (we need a plain TSDB index), so ES rejects the put when an
  // existing data stream would lose its matching data-stream template.
  // Drop any prior data stream/index first — cleanup is idempotent.
  await cleanupOtelMetricsFixtures({ esClient, log });

  // Register the override template first: the managed `metrics-otel@template`
  // (priority 120) matches our index name and only creates data streams, so
  // a plain `indices.create` is rejected without a higher-priority override.
  await esClient.indices.putIndexTemplate(otelMetricsOverrideTemplate);

  try {
    await esClient.indices.create(indexCreateRequest);
  } catch (err) {
    const cause = err as { meta?: { body?: { error?: { type?: string } } } };
    if (cause?.meta?.body?.error?.type === 'resource_already_exists_exception') {
      log.debug(`[viz-evals] index already exists, skipping: ${indexCreateRequest.index}`);
    } else {
      throw new Error(`[viz-evals] failed to create index "${indexCreateRequest.index}"`, {
        cause: err instanceof Error ? err : new Error(String(err)),
      });
    }
  }

  const bulkOperations = buildOtelMetricsBulkOperations(now);
  log.info(`[viz-evals] indexing ${bulkOperations.length / 2} OTel metric samples`);

  const bulkResponse = await esClient.bulk({
    operations: bulkOperations as object[],
    refresh: 'wait_for',
  });

  if (bulkResponse.errors) {
    const firstError = bulkResponse.items.find((item) => item.create?.error)?.create?.error;
    throw new Error(
      `[viz-evals] failed to seed OTel metric samples: ${
        firstError ? JSON.stringify(firstError) : 'unknown bulk error'
      }`
    );
  }
}

/**
 * Delete the OTel host-metrics fixture. Resolves the configured wildcard
 * patterns to concrete names first because Scout clusters boot with
 * `action.destructive_requires_name=true`, which rejects wildcard deletes.
 * Tolerates missing indices so a partially-completed setup doesn't cascade
 * into a fixture leak on the next run.
 */
export async function cleanupOtelMetricsFixtures({
  esClient,
  log,
}: {
  esClient: EsClient;
  log: ToolingLog;
}): Promise<void> {
  log.info('[viz-evals] cleaning up OTel host-metrics fixture');

  const resolveResponses = await Promise.all(
    otelMetricsFixtureIndexWildcards.map(async (pattern) => {
      try {
        return await esClient.indices.resolveIndex({
          name: pattern,
          expand_wildcards: 'open',
          ignore_unavailable: true,
          allow_no_indices: true,
        });
      } catch (err) {
        log.warning(
          new Error(`[viz-evals] cleanup resolve failed for pattern "${pattern}" — skipping`, {
            cause: err instanceof Error ? err : new Error(String(err)),
          })
        );
        return undefined;
      }
    })
  );

  const dataStreamsToDelete = Array.from(
    new Set(
      resolveResponses
        .flatMap((response) => response?.data_streams ?? [])
        .map((dataStream) => dataStream.name)
    )
  );

  if (dataStreamsToDelete.length > 0) {
    try {
      await esClient.indices.deleteDataStream({ name: dataStreamsToDelete });
      log.debug(`[viz-evals] deleted data streams: ${dataStreamsToDelete.join(', ')}`);
    } catch (err) {
      log.warning(
        new Error(
          `[viz-evals] cleanup failed to delete data streams ${dataStreamsToDelete.join(
            ', '
          )} — continuing`,
          { cause: err instanceof Error ? err : new Error(String(err)) }
        )
      );
    }
  }

  const indicesToDelete = Array.from(
    new Set(
      resolveResponses.flatMap((response) => response?.indices ?? []).map((index) => index.name)
    )
  );

  if (indicesToDelete.length > 0) {
    try {
      await esClient.indices.delete({ index: indicesToDelete });
      log.debug(`[viz-evals] deleted indices: ${indicesToDelete.join(', ')}`);
    } catch (err) {
      log.warning(
        new Error(
          `[viz-evals] cleanup failed to delete indices ${indicesToDelete.join(', ')} — continuing`,
          { cause: err instanceof Error ? err : new Error(String(err)) }
        )
      );
    }
  }

  // Also try the exact fixture name in case resolve missed a data stream
  // (e.g. closed / hidden) that still blocks the override template put.
  try {
    await esClient.indices.deleteDataStream({ name: OTEL_METRICS_INDEX });
  } catch {
    // missing is fine
  }

  try {
    await esClient.indices.deleteIndexTemplate({ name: OTEL_METRICS_OVERRIDE_TEMPLATE_NAME });
    log.debug(`[viz-evals] deleted index template: ${OTEL_METRICS_OVERRIDE_TEMPLATE_NAME}`);
  } catch (err) {
    log.warning(
      new Error(
        `[viz-evals] cleanup failed to delete index template ${OTEL_METRICS_OVERRIDE_TEMPLATE_NAME} — continuing`,
        { cause: err instanceof Error ? err : new Error(String(err)) }
      )
    );
  }
}
