/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type { SeedContext, SeedScenario, SeededQuery } from '../types';
import type { ConnectionConfig } from '../lib/get_connection_config';
import { kibanaRequest } from '../lib/kibana';
import { buildInsightPayloads } from '../lib/builders';

export { buildInsightPayloads } from '../lib/builders';

export async function seedInsights(
  ctx: SeedContext,
  scenario: SeedScenario,
  seededQueries: SeededQuery[],
  config: ConnectionConfig,
  log: ToolingLog
): Promise<void> {
  const payloads = buildInsightPayloads(ctx, scenario, seededQueries);
  const operations = payloads.map((insight) => ({ index: insight }));

  const res = await kibanaRequest(config, 'POST', '/internal/streams/_insights/_bulk', {
    operations,
  });

  if (res.status >= 300) {
    throw new Error(`Failed to bulk-index insights (HTTP ${res.status})`);
  }

  log.info(`Posted ${operations.length} insight operation(s).`);
}
