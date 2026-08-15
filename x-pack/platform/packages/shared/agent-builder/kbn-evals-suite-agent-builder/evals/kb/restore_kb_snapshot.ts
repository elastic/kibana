/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import { createGcsRepository, restoreSnapshot } from '@kbn/es-snapshot-loader';

const KB_SNAPSHOT_CONFIG = {
  bucket: 'agent-builder-datasets',
  basePath: 'knowledge_base/snapshot_dt=2026-01-10',
  snapshotName: 'manual_test_snapshot_2',
  indices: [
    'customer_support_error_rate_daily',
    'customer_support_invoice',
    'customer_support_invoice_item',
    'customer_support_plan_entitlement_access',
    'customer_support_plans',
    'customer_support_project_entitlement_access',
    'customer_support_project_entitlement_catalog',
    'customer_support_project_plan_changelogs',
    'customer_support_projects',
    'customer_support_requests_daily_count',
    'customer_support_support_ticket',
    'customer_support_support_user',
    'customer_support_users',
    'customer_support_wix_knowledge_base',
  ],
};

export const restoreKbSnapshot = async ({
  esClient,
  log,
}: {
  esClient: Client;
  log: ToolingLog;
}): Promise<void> => {
  const { bucket, basePath, snapshotName, indices } = KB_SNAPSHOT_CONFIG;

  log.info(`[kb-snapshot] Checking for existing indices to delete before restore...`);
  const existing = await esClient.indices.exists({ index: indices.join(',') });
  if (existing) {
    log.info(`[kb-snapshot] Deleting existing indices: ${indices.join(', ')}`);
    await esClient.indices.delete({ index: indices.join(','), ignore_unavailable: true });
  }

  log.info(`[kb-snapshot] Restoring snapshot '${snapshotName}' from gs://${bucket}/${basePath}`);

  const repository = createGcsRepository({ bucket, basePath });

  const result = await restoreSnapshot({
    esClient,
    log,
    repository,
    snapshotName,
    indices,
  });

  if (!result.success) {
    throw new Error(`[kb-snapshot] Snapshot restore failed: ${result.errors.join(', ')}`);
  }

  log.info(`[kb-snapshot] Restored ${result.restoredIndices.length} indices successfully`);
};
