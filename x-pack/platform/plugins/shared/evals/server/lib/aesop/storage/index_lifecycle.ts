/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';

const AESOP_ILM_POLICY = 'aesop-lifecycle';

const RETENTION_DAYS: Record<string, string> = {
  '.aesop-proposed-skills': '180d',
  '.aesop-workflow-executions': '90d',
  '.aesop-discovered-patterns': '90d',
  '.aesop-discovered-relationships': '90d',
  '.aesop-rejection-feedback': '90d',
  '.aesop-rate-limits': '7d',
};

export async function ensureAesopILMPolicy(
  esClient: ElasticsearchClient,
  logger: Logger
): Promise<void> {
  try {
    const exists = await esClient.ilm.getLifecycle({ name: AESOP_ILM_POLICY }).catch(() => null);
    if (exists) return;

    await esClient.ilm.putLifecycle({
      name: AESOP_ILM_POLICY,
      policy: {
        phases: {
          hot: {
            actions: {},
          },
          delete: {
            min_age: '90d',
            actions: {
              delete: {},
            },
          },
        },
      },
    });

    logger.info(`[AESOP] Created ILM policy: ${AESOP_ILM_POLICY}`);
  } catch (error) {
    logger.warn(
      `[AESOP] Failed to create ILM policy (non-fatal): ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

export function getRetentionDays(indexName: string): string {
  return RETENTION_DAYS[indexName] || '90d';
}

export function getILMPolicyName(): string {
  return AESOP_ILM_POLICY;
}
