/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract, ElasticsearchClient } from '@kbn/core/server';
import type { SavedObject } from '@kbn/core-saved-objects-api-server';
import type {
  ConcreteTaskInstance,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';

import {
  AGENTS_PREFIX,
  CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
} from '../../../common/constants';
import type { CloudConnectorSOAttributes } from '../../types/so_attributes';
import { appContextService } from '../../services';
import { agentPolicyService } from '../../services/agent_policy';
import { getAgentsByKuery } from '../../services/agents';
import { throwIfAborted } from '../utils';

const TASK_TYPE = 'fleet:permission-verifier-task';
const TASK_TITLE = 'Fleet OTel Permission Verifier Task';
const TASK_TIMEOUT = '1m'; // CHANGE TO 5m WHEN READY
const TASK_ID = `${TASK_TYPE}:1.0.0`;
const TASK_INTERVAL = '1m'; // CHANGE TO 5m WHEN READY
const LOG_PREFIX = '[OTelVerifier]';
const VERIFICATION_TTL_MS = 5 * 60 * 1000;
const ELIGIBILITY_WINDOW_MS = 5 * 60 * 1000;

export function registerPermissionVerifierTask(taskManager: TaskManagerSetupContract) {
  taskManager.registerTaskDefinitions({
    [TASK_TYPE]: {
      title: TASK_TITLE,
      timeout: TASK_TIMEOUT,
      maxAttempts: 1,
      createTaskRunner: ({
        taskInstance,
        abortController,
      }: {
        taskInstance: ConcreteTaskInstance;
        abortController: AbortController;
      }) => {
        return {
          run: async () => {
            await runPermissionVerifierTask(abortController);
          },
          cancel: async () => {},
        };
      },
    },
  });
}

export async function schedulePermissionVerifierTask(taskManager: TaskManagerStartContract) {
  try {
    await taskManager.ensureScheduled({
      id: TASK_ID,
      taskType: TASK_TYPE,
      schedule: {
        interval: TASK_INTERVAL,
      },
      state: {},
      params: {},
    });
  } catch (error) {
    appContextService
      .getLogger()
      .error(`${LOG_PREFIX} Error scheduling permission verifier task.`, { error });
  }
}

/*
 * Task flow (runs every 5 minutes):
 *
 * Phase 1 - Cleanup: Delete expired verifier policies (TTL > 5 min)
 *           to ensure at most one active verifier deployment at a time.
 *
 * Phase 2 - Pre-filter: Fetch package policies with cloud_connector_id to build
 *           a map of connector ID -> package policy IDs. Then fetch only the
 *           cloud connectors that have installed packages via KQL id filter.
 *
 * Phase 3 - Pick & Verify: Loop through filtered connectors, check eligibility:
 *             1. Never verified (verification_started_at is null)
 *             2. Recently created (created_at within last 5 min)
 *             3. Recently updated (updated_at within last 5 min)
 *             4. Due for re-verification (started_at > 5 min ago, status != failed)
 *             5. Failed with cooldown expired (failed_at > 5 min ago)
 *             6. Backwards compat (verification_status not set)
 *           First eligible connector gets verified (one deployment at a time),
 *           then break. Stamps verification_started_at, creates a verifier
 *           policy. On failure, marks as failed. On success, the separate
 *           status update task sets the final status.
 */
async function runPermissionVerifierTask(abortController: AbortController) {
  const logger = appContextService.getLogger().get('otel-verifier');

  if (!appContextService.getExperimentalFeatures()?.enableOTelVerifier) {
    logger.debug(`${LOG_PREFIX} OTel verifier is disabled, skipping`);
    return;
  }

  logger.info(`${LOG_PREFIX} Task run started`);

  const soClient = appContextService.getInternalUserSOClientWithoutSpaceExtension();
  const esClient = appContextService.getInternalUserESClient();

  try {
    // Phase 1: Cleanup expired verifier policies before creating new ones
    await cleanupExpiredVerifierPolicies(soClient, esClient);

    throwIfAborted(abortController);

    // Phase 2: Pre-filter package policies to build connector -> package policy IDs map
    const packagePolicyMap = await getPackagePolicyMap(soClient);

    if (packagePolicyMap.size === 0) {
      logger.info(`${LOG_PREFIX} No connectors with installed packages found`);
      logger.info(`${LOG_PREFIX} Task run completed`);
      return;
    }

    const connectorIds = [...packagePolicyMap.keys()];
    const SO_TYPE = CLOUD_CONNECTOR_SAVED_OBJECT_TYPE;
    const idFilter = `(${SO_TYPE}.id:${connectorIds
      .map((id) => `"${SO_TYPE}:${id}"`)
      .join(' or ')})`;

    const connectorResults = await soClient.find<CloudConnectorSOAttributes>({
      type: CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
      filter: idFilter,
      perPage: 1000,
    });

    const connectors = connectorResults.saved_objects;
    logger.info(`${LOG_PREFIX} Found ${connectors.length} connectors with installed packages`);

    throwIfAborted(abortController);

    // Phase 3: Loop through connectors, verify the first eligible one (one at a time)
    let verified = false;
    for (const connector of connectors) {
      throwIfAborted(abortController);

      if (!isConnectorEligible(connector.attributes)) {
        logger.debug(`${LOG_PREFIX} Connector ${connector.id} is not eligible, skipping`);
        continue;
      }

      logger.info(
        `${LOG_PREFIX} Connector ${connector.id} is eligible (status: ${
          connector.attributes.verification_status ?? 'unset'
        })`
      );

      const packagePolicyIds = packagePolicyMap.get(connector.id) ?? [];
      try {
        await verifyConnector(soClient, esClient, connector, packagePolicyIds, abortController);
        verified = true;
        break;
      } catch (error) {
        logger.error(`${LOG_PREFIX} Failed to verify connector ${connector.id}: ${error.message}`);
      }
    }

    if (!verified) {
      logger.info(`${LOG_PREFIX} No eligible connectors found, skipping verification`);
    }

    logger.info(`${LOG_PREFIX} Task run completed`);
  } catch (error) {
    if (abortController.signal.aborted) {
      logger.info(`${LOG_PREFIX} Task was aborted`);
      return;
    }
    logger.error(`${LOG_PREFIX} Task run failed: ${error.message}`);
    throw error;
  }
}

/**
 * Phase 1: Delete verifier policies whose deployed agent has exceeded the TTL.
 * Runs before picking a new connector to ensure at most one active verifier deployment.
 */
async function cleanupExpiredVerifierPolicies(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient
) {
  const logger = appContextService.getLogger().get('otel-verifier');

  try {
    const verifierPolicies = await agentPolicyService.list(soClient, {
      kuery: 'ingest-agent-policies.is_verifier: true',
      perPage: 50,
      withAgentCount: true,
    });

    logger.info(
      `${LOG_PREFIX} Found ${verifierPolicies.items.length} verifier policies for cleanup check`
    );

    for (const policy of verifierPolicies.items) {
      let deployedAt: string | undefined;

      if ((policy.agents ?? 0) > 0) {
        logger.info(`${LOG_PREFIX} Getting agents for verifier policy ${policy.id}`);
        const policyKuery = `${AGENTS_PREFIX}.policy_id:"${policy.id}"`;
        const { agents } = await getAgentsByKuery(esClient, soClient, {
          kuery: policyKuery,
          perPage: 1,
          page: 1,
          sortField: 'enrolled_at',
          sortOrder: 'asc',
          showInactive: true,
        });
        deployedAt = agents[0]?.enrolled_at;
      }

      if (!deployedAt) {
        continue;
      }

      const timeElapsedMs = Date.now() - new Date(deployedAt).getTime();
      if (timeElapsedMs > VERIFICATION_TTL_MS) {
        try {
          logger.info(`${LOG_PREFIX} TTL expired for verifier policy ${policy.id}, deleting`);
          await agentPolicyService.deleteVerifierPolicy(soClient, esClient, policy.id);
          logger.info(`${LOG_PREFIX} Deleted expired verifier policy ${policy.id}`);
        } catch (err) {
          logger.error(
            `${LOG_PREFIX} Failed to delete expired verifier policy ${policy.id}: ${err.message}`
          );
        }
      }
    }
  } catch (error) {
    logger.error(`${LOG_PREFIX} Failed to cleanup verifier policies: ${error.message}`);
  }
}

/**
 * Build a map of connector ID -> package policy IDs from package policies
 * that have a cloud_connector_id set. This serves as both the pre-filter
 * (which connectors have packages) and avoids re-querying later.
 */
async function getPackagePolicyMap(
  soClient: SavedObjectsClientContract
): Promise<Map<string, string[]>> {
  const packagePolicies = await soClient.find<{ cloud_connector_id?: string }>({
    type: PACKAGE_POLICY_SAVED_OBJECT_TYPE,
    filter: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.attributes.cloud_connector_id: *`,
    perPage: 1000,
  });

  const map = new Map<string, string[]>();
  for (const pp of packagePolicies.saved_objects) {
    const connectorId = pp.attributes.cloud_connector_id;
    if (!connectorId) continue;
    const existing = map.get(connectorId) ?? [];
    existing.push(pp.id);
    map.set(connectorId, existing);
  }
  return map;
}

/**
 * Check if a connector is eligible for verification based on 6 criteria:
 *   1. Never verified (verification_started_at is null)
 *   2. Recently created (created_at within last 5 min)
 *   3. Recently updated (updated_at within last 5 min)
 *   4. Due for re-verification (started_at > 5 min ago AND status != failed)
 *   5. Failed with cooldown expired (status = failed AND failed_at > 5 min ago)
 *   6. Backwards compat (verification_status not set)
 */
function isConnectorEligible(attrs: CloudConnectorSOAttributes): boolean {
  const fiveMinutesAgo = Date.now() - ELIGIBILITY_WINDOW_MS;

  if (!attrs.verification_started_at) return true;

  if (attrs.created_at && new Date(attrs.created_at).getTime() >= fiveMinutesAgo) return true;

  if (attrs.updated_at && new Date(attrs.updated_at).getTime() >= fiveMinutesAgo) return true;

  if (
    new Date(attrs.verification_started_at).getTime() <= fiveMinutesAgo &&
    attrs.verification_status !== 'failed'
  ) {
    return true;
  }

  if (
    attrs.verification_status === 'failed' &&
    attrs.verification_failed_at &&
    new Date(attrs.verification_failed_at).getTime() <= fiveMinutesAgo
  ) {
    return true;
  }

  if (!attrs.verification_status) return true;

  return false;
}

/**
 * Verify a single cloud connector.
 *
 * Stamps verification_started_at to move it to the back of the queue,
 * then creates a verifier policy using the pre-fetched package policy IDs.
 * On failure, marks the connector as failed with verification_failed_at.
 */
async function verifyConnector(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  connector: SavedObject<CloudConnectorSOAttributes>,
  packagePolicyIds: string[],
  abortController: AbortController
) {
  const logger = appContextService.getLogger().get('otel-verifier');

  try {
    // Create the verifier policy (triggers K8s deployment)
    logger.info(
      `${LOG_PREFIX} Creating verifier policy for connector ${connector.id} with ${packagePolicyIds.length} package policies`
    );
    const { policyId, startedAt } = await agentPolicyService.createVerifierPolicy(
      soClient,
      esClient,
      connector.id,
      packagePolicyIds
    );

    // Stamp verification_started_at to move connector to back of queue
    await soClient.update<CloudConnectorSOAttributes>(
      CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
      connector.id,
      { verification_started_at: startedAt }
    );

    throwIfAborted(abortController);

    logger.info(
      `${LOG_PREFIX} Successfully created verifier policy ${policyId} for connector ${connector.id}`
    );
  } catch (err) {
    const failedAt = new Date().toISOString();
    logger.error(`${LOG_PREFIX} Failed to verify connector ${connector.id}: ${err.message}`);

    try {
      await soClient.update<CloudConnectorSOAttributes>(
        CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
        connector.id,
        {
          verification_status: 'failed',
          verification_failed_at: failedAt,
        }
      );
    } catch (updateErr) {
      logger.error(
        `${LOG_PREFIX} Failed to update connector ${connector.id} status after error: ${updateErr.message}`
      );
    }
  }
}
