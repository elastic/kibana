/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type { LogsManifest } from '@kbn/synthtrace/src/lib/service_graph_logs/types';
import type { SeedContext } from '../types';
import type { ConnectionConfig } from '../lib/get_connection_config';
import { kibanaRequest } from '../lib/kibana';
import { buildFeaturePayloads } from '../lib/builders';

export { buildFeaturePayloads } from '../lib/builders';

export async function seedFeatures(
  ctx: SeedContext,
  manifest: LogsManifest,
  config: ConnectionConfig,
  log: ToolingLog
): Promise<void> {
  const lastSeen = new Date().toISOString();
  const baseFeatures = buildFeaturePayloads(ctx, manifest);

  if (baseFeatures.length === 0) {
    throw new Error('seedFeatures: no feature operations to index (unexpected empty set)');
  }

  // Add index-only display fields (status, last_seen) on top of the shared base payload.
  const operations = baseFeatures.map((base) => ({
    index: {
      feature: {
        ...base,
        status: 'active',
        last_seen: lastSeen,
      },
    },
  }));

  const res = await kibanaRequest(
    config,
    'POST',
    `/internal/streams/${encodeURIComponent(ctx.streamName)}/features/_bulk`,
    { operations }
  );
  if (res.status >= 300) {
    throw new Error(`Failed to bulk-index features (HTTP ${res.status})`);
  }

  log.info(`Posted ${operations.length} feature operations for stream "${ctx.streamName}".`);
}
