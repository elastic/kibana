/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { appContextService } from '../../services';
import { agentPolicyService, getAgentPolicySavedObjectType } from '../../services/agent_policy';
import { throwIfAborted } from '../utils';

/** Same log prefix as verify_permissions_task for greppable OTel verifier logs. */
const CLEANUP_TASK_LOG = '[OTel Permission Verifier Cleanup Task]';

/** TTL after verifier policy creation before it is eligible for deletion (phase 1). */
export const VERIFICATION_TTL_MS = 5 * 60 * 1000;

/**
 * Delete verifier agent policies (`is_verifier: true`) whose `created_at` age
 * exceeds {@link VERIFICATION_TTL_MS}. Shared by the verify-permissions task and
 * the dedicated cleanup task.
 *
 * No-ops when `enableOTelVerifier` is disabled (same as verify task).
 */
export async function runVerifierPolicyCleanup(abortController: AbortController): Promise<void> {
  const logger = appContextService.getLogger().get('otel-verifier');

  if (!appContextService.getExperimentalFeatures()?.enableOTelVerifier) {
    logger.debug(`${CLEANUP_TASK_LOG} OTel verifier is disabled, skipping verifier cleanup`);
    return;
  }

  const soClient = appContextService.getInternalUserSOClientWithoutSpaceExtension();
  const esClient = appContextService.getInternalUserESClient();
  const saveObjectType = await getAgentPolicySavedObjectType();

  try {
    const verifierPolicies = await agentPolicyService.list(soClient, {
      kuery: `${saveObjectType}.is_verifier: true`,
      perPage: 50,
      spaceId: '*',
    });

    logger.debug(
      `${CLEANUP_TASK_LOG} Found ${verifierPolicies.items.length} verifier policies for cleanup check`
    );

    for (const policy of verifierPolicies.items) {
      throwIfAborted(abortController);
      logger.debug(
        `${CLEANUP_TASK_LOG} Current policy verifier policy ${policy.id} created at ${policy.created_at} updated at ${policy.updated_at}`
      );
      const createdAt = policy.created_at ?? policy.updated_at;
      const ageMs = Date.now() - new Date(createdAt).getTime();

      if (ageMs <= VERIFICATION_TTL_MS) {
        continue;
      }

      try {
        const ageSec = Math.round(ageMs / 1000);
        const ttlSec = Math.round(VERIFICATION_TTL_MS / 1000);
        logger.debug(
          `${CLEANUP_TASK_LOG} Deleting verifier policy ${policy.id} (age: ${ageSec}s, TTL: ${ttlSec}s)`
        );
        await agentPolicyService.deleteVerifierPolicy(soClient, esClient, policy.id);
        logger.debug(`${CLEANUP_TASK_LOG} Deleted verifier policy ${policy.id}`);
      } catch (err) {
        logger.error(
          `${CLEANUP_TASK_LOG} Failed to delete verifier policy ${policy.id}: ${err.message}`
        );
      }
    }
  } catch (error) {
    logger.error(`${CLEANUP_TASK_LOG} Failed to cleanup verifier policies: ${error.message}`);
  }
}
