/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import type { ApiServicesFixture } from '@kbn/scout';
import { ensureLogsIndexTemplate } from './logs_index_template';

// Deferred wired roots that `streams._enable` re-materializes; their backing
// data streams need a matching index template to exist before enable.
export const SIGEVENTS_WIRED_ROOTS = ['logs.otel', 'logs.ecs'] as const;

/**
 * Reset and re-enable streams safely.
 *
 * `streams._enable` recreates the backing data streams for the deferred wired
 * roots (`logs.otel`, `logs.ecs`). If a test has just deleted those data
 * streams, ES has no matching index template and enable returns a terminal 400.
 * Ensure the template exists before enabling so the data streams can be
 * recreated.
 */
export async function ensureStreamsEnabled({
  esClient,
  apiServices,
  log,
}: {
  esClient: Client;
  apiServices: ApiServicesFixture;
  log: ToolingLog;
}): Promise<void> {
  await apiServices.streams.disable().catch(() => {});
  await ensureLogsIndexTemplate(esClient, log, [...SIGEVENTS_WIRED_ROOTS]);
  await apiServices.streams.enable();
}
