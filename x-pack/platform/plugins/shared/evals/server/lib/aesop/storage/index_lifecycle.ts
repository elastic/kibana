/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';

/**
 * Name of the ILM policy used for all `.aesop-*` indices. Individual indices
 * may override via `index.lifecycle.name`, but the composable index template
 * below applies it by default so newly-auto-created indices never drift into
 * unbounded growth.
 */
const AESOP_ILM_POLICY = 'aesop-lifecycle';

/**
 * Composable index template applied to every `.aesop-*` index.
 *
 * We intentionally do NOT own the mappings here — each feature owns its own
 * mappings in ensureIndex calls. The template's job is to guarantee every
 * AESOP index is hidden and attached to the ILM policy, even when the index
 * is auto-created on first write (e.g. `.aesop-rejection-feedback`, which
 * has no explicit create path).
 */
const AESOP_INDEX_TEMPLATE = 'aesop-index-template';

export async function ensureAesopILMPolicy(
  esClient: ElasticsearchClient,
  logger: Logger
): Promise<void> {
  try {
    const exists = await esClient.ilm.getLifecycle({ name: AESOP_ILM_POLICY }).catch(() => null);
    if (!exists) {
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
    }
  } catch (error) {
    logger.warn(
      `[AESOP] Failed to create ILM policy (non-fatal): ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return;
  }

  // Register the composable index template. We always call putIndexTemplate
  // (it is idempotent) so any adjustments to index_patterns / settings land
  // on Kibana restart without requiring a manual Elasticsearch intervention.
  try {
    await esClient.indices.putIndexTemplate({
      name: AESOP_INDEX_TEMPLATE,
      index_patterns: ['.aesop-*'],
      priority: 200,
      template: {
        settings: {
          'index.hidden': true,
          'index.lifecycle.name': AESOP_ILM_POLICY,
          number_of_shards: 1,
          number_of_replicas: 0,
        },
      },
      _meta: {
        managed_by: 'evals-plugin',
        description: 'Ensures all AESOP indices are hidden and attached to ILM.',
      },
    });
    logger.info(`[AESOP] Registered index template: ${AESOP_INDEX_TEMPLATE}`);
  } catch (error) {
    logger.warn(
      `[AESOP] Failed to register index template (non-fatal): ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

export function getILMPolicyName(): string {
  return AESOP_ILM_POLICY;
}
