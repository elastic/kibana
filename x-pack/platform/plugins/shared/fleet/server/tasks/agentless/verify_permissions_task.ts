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
  CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
} from '../../../common/constants';
import type { CloudConnectorSOAttributes } from '../../types/so_attributes';
import { appContextService } from '../../services';
import { agentPolicyService, getAgentPolicySavedObjectType } from '../../services/agent_policy';
import { getPackageInfo } from '../../services/epm/packages';
import { ensureInstalledPackage } from '../../services/epm/packages/install';
import { throwIfAborted } from '../utils';

const TASK_TYPE = 'fleet:verify_permissions';
const TASK_TITLE = 'OTel Verify Permission Task';
const TASK_TIMEOUT = '5m';
const TASK_ID = `${TASK_TYPE}:1.0.0`;
const TASK_INTERVAL = '5m';
export const VERIFY_PERMISSIONS_TASK = '[OTel Verify Permissions Task]';
const VERIFICATION_TTL_MS = 5 * 60 * 1000;
const ELIGIBILITY_WINDOW_MS = 5 * 60 * 1000;

export function registerVerifyPermissionsTask(taskManager: TaskManagerSetupContract) {
  taskManager.registerTaskDefinitions({
    [TASK_TYPE]: {
      title: TASK_TITLE,
      timeout: TASK_TIMEOUT,
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
        };
      },
    },
  });
}

export async function scheduleVerifyPermissionsTask(taskManager: TaskManagerStartContract) {
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
      .error(`${VERIFY_PERMISSIONS_TASK} Error scheduling permission verifier task.`, {
        error,
      });
  }
}

/*
 * Task flow (runs every 5 minutes):
 *
 * Phase 1 - Cleanup: Delete stale verifier policies. A policy is deleted when:
 *           - TTL expired: has agents but the oldest enrollment exceeds TTL.
 *           - Orphan: 0 agents and updated_at exceeds TTL (deployment never
 *             came up or was torn down externally).
 *
 * Phase 2 - Pre-filter: Fetch package policies with cloud_connector_id to build
 *           a map of connector ID -> package policy IDs. Then fetch only the
 *           cloud connectors that have installed packages via KQL id filter.
 *
 * Phase 3 - Verify one eligible connector per task run (one deployment at a time).
 *           Eligibility criteria:
 *             1. Never verified (verification_started_at is null)
 *             2. Recently created (created_at within last 5 min)
 *             3. Recently updated (updated_at within last 5 min)
 *             4. Due for re-verification (started_at > 5 min ago, status != failed)
 *             5. Failed with cooldown expired (failed_at > 5 min ago)
 *             6. Backwards compat (verification_status not set)
 *           Each eligible connector gets a verifier policy. On failure the
 *           connector is marked failed; on success the separate status update
 *           task sets the final status.
 */
async function runPermissionVerifierTask(abortController: AbortController) {
  const logger = appContextService.getLogger().get('otel-verifier');

  if (!appContextService.getExperimentalFeatures()?.enableOTelVerifier) {
    logger.debug(`${VERIFY_PERMISSIONS_TASK} OTel verifier is disabled, skipping`);
    return;
  }

  logger.debug(`${VERIFY_PERMISSIONS_TASK} Task run started`);

  const soClient = appContextService.getInternalUserSOClientWithoutSpaceExtension();
  const esClient = appContextService.getInternalUserESClient();

  // Phase 1: Cleanup expired verifier policies before creating new ones
  try {
    await cleanupExpiredVerifierPolicies(soClient, esClient, abortController);
  } catch (error) {
    logger.error(
      `${VERIFY_PERMISSIONS_TASK} Failed to cleanup expired verifier policies: ${error.message}`
    );
  }

  try {
    throwIfAborted(abortController);

    // Gate check: only one verifier deployment at a time.
    // If a non-expired verifier policy still exists, skip this run.
    const saveObjectType = await getAgentPolicySavedObjectType();
    const activeVerifiers = await agentPolicyService.list(soClient, {
      kuery: `${saveObjectType}.is_verifier: true`,
      perPage: 1,
    });

    if (activeVerifiers.items.length > 0) {
      const policy = activeVerifiers.items[0];
      const createdAt = policy.created_at ?? policy.updated_at;
      const ageMs = Date.now() - new Date(createdAt).getTime();
      const ageSec = Math.round(ageMs / 1000);
      if (ageMs <= VERIFICATION_TTL_MS) {
        logger.debug(
          `${VERIFY_PERMISSIONS_TASK} Active verifier policy ${policy.id} exists (age: ${ageSec}s), skipping new verifications`
        );
        logger.debug(`${VERIFY_PERMISSIONS_TASK} Task run completed`);
        return;
      }
    }

    throwIfAborted(abortController);

    // Phase 2: Pre-filter package policies to build connector -> package policy IDs map
    const packagePolicyMap = await getPackagePolicyMap(soClient);

    if (packagePolicyMap.size === 0) {
      logger.info(`${VERIFY_PERMISSIONS_TASK} No connectors with installed packages found`);
      logger.info(`${VERIFY_PERMISSIONS_TASK} Task run completed`);
      return;
    }

    const connectorIds = [...packagePolicyMap.keys()].filter((id) => id.length > 0);

    if (connectorIds.length === 0) {
      logger.info(`${VERIFY_PERMISSIONS_TASK} No valid connector IDs found after filtering`);
      logger.info(`${VERIFY_PERMISSIONS_TASK} Task run completed`);
      return;
    }

    const SO_TYPE = CLOUD_CONNECTOR_SAVED_OBJECT_TYPE;
    const idFilter = connectorIds.map((id) => `${SO_TYPE}.id:"${SO_TYPE}:${id}"`).join(' or ');

    throwIfAborted(abortController);
    const connectorResults = await soClient.find<CloudConnectorSOAttributes>({
      type: CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
      filter: idFilter,
      perPage: 50,
    });

    const connectors = connectorResults.saved_objects;
    logger.info(
      `${VERIFY_PERMISSIONS_TASK} Found ${connectors.length} connectors with installed packages`
    );

    throwIfAborted(abortController);

    // Phase 3: Verify the first eligible connector (one at a time per task run)
    for (const connector of connectors) {
      throwIfAborted(abortController);

      if (!isConnectorEligible(connector.attributes)) {
        logger.debug(
          `${VERIFY_PERMISSIONS_TASK} Connector ${connector.id} is not eligible, skipping`
        );
        continue;
      }

      logger.info(
        `${VERIFY_PERMISSIONS_TASK} Connector ${connector.id} is eligible (status: ${
          connector.attributes.verification_status ?? 'pending'
        })`
      );

      const policyTemplates = packagePolicyMap.get(connector.id);
      if (!policyTemplates || policyTemplates.length === 0) {
        logger.debug(
          `${VERIFY_PERMISSIONS_TASK} Connector ${connector.id} has no policy templates, skipping`
        );
        continue;
      }
      try {
        await verifyConnector(soClient, esClient, connector, policyTemplates, abortController);
      } catch (error) {
        logger.error(
          `${VERIFY_PERMISSIONS_TASK} Failed to verify connector ${connector.id}: ${error.message}`
        );
      }
      break;
    }

    logger.debug(`${VERIFY_PERMISSIONS_TASK} Task run completed`);
  } catch (error) {
    if (abortController.signal.aborted) {
      logger.info(`${VERIFY_PERMISSIONS_TASK} Task was aborted`);
      return;
    }
    logger.error(`${VERIFY_PERMISSIONS_TASK} Task run failed: ${error.message}`);
    throw error;
  }
}

/**
 * Phase 1: Delete verifier policies whose creation time has exceeded the TTL.
 * Uses the immutable `created_at` timestamp — unaffected by subsequent SO updates.
 * Runs before picking a new connector to ensure at most one active verifier deployment.
 */
async function cleanupExpiredVerifierPolicies(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  abortController: AbortController
) {
  const logger = appContextService.getLogger().get('otel-verifier');
  const saveObjectType = await getAgentPolicySavedObjectType();

  try {
    const verifierPolicies = await agentPolicyService.list(soClient, {
      kuery: `${saveObjectType}.is_verifier: true`,
      perPage: 50,
    });

    logger.info(
      `${VERIFY_PERMISSIONS_TASK} Found ${verifierPolicies.items.length} verifier policies for cleanup check`
    );

    for (const policy of verifierPolicies.items) {
      throwIfAborted(abortController);
      logger.info(
        `${VERIFY_PERMISSIONS_TASK} Current policy verifier policy ${policy.id} created at ${policy.created_at} updated at ${policy.updated_at}`
      );
      const createdAt = policy.created_at ?? policy.updated_at;
      const ageMs = Date.now() - new Date(createdAt).getTime();

      if (ageMs <= VERIFICATION_TTL_MS) {
        continue;
      }

      try {
        const ageSec = Math.round(ageMs / 1000);
        const ttlSec = Math.round(VERIFICATION_TTL_MS / 1000);
        logger.info(
          `${VERIFY_PERMISSIONS_TASK} Deleting verifier policy ${policy.id} (age: ${ageSec}s, TTL: ${ttlSec}s)`
        );
        await agentPolicyService.deleteVerifierPolicy(soClient, esClient, policy.id);
        logger.info(`${VERIFY_PERMISSIONS_TASK} Deleted verifier policy ${policy.id}`);
      } catch (err) {
        logger.error(
          `${VERIFY_PERMISSIONS_TASK} Failed to delete verifier policy ${policy.id}: ${err.message}`
        );
      }
    }
  } catch (error) {
    logger.error(
      `${VERIFY_PERMISSIONS_TASK} Failed to cleanup verifier policies: ${error.message}`
    );
  }
}

interface ConnectorVerificationInfo {
  policyTemplates: string[];
  packageName: string;
  packageTitle: string;
  packageVersion: string;
}

/**
 * Build a map of connector ID -> policy templates from package policies
 * that have a cloud_connector_id set. Extracts policy_templates from each
 * package policy's enabled input.
 */
async function getPackagePolicyMap(
  soClient: SavedObjectsClientContract
): Promise<Map<string, string[]>> {
  const packagePolicies = await soClient.find<{
    cloud_connector_id?: string;
    inputs?: Array<{ enabled: boolean; policy_template?: string }>;
  }>({
    type: PACKAGE_POLICY_SAVED_OBJECT_TYPE,
    filter: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.attributes.cloud_connector_id: *`,
    perPage: 100,
  });

  const map = new Map<string, string[]>();
  for (const pp of packagePolicies.saved_objects) {
    const connectorId = pp.attributes.cloud_connector_id?.trim();
    if (!connectorId) continue;

    const enabledInput = pp.attributes.inputs?.find((i) => i.enabled);
    const template = enabledInput?.policy_template ?? '';

    const existing = map.get(connectorId) ?? [];

    if (template && !existing.includes(template)) {
      existing.push(template);
    }

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
async function updateConnectorStatus(
  soClient: SavedObjectsClientContract,
  connectorId: string,
  attrs: Partial<CloudConnectorSOAttributes>
): Promise<void> {
  const logger = appContextService.getLogger().get('otel-verifier');
  try {
    await soClient.update<CloudConnectorSOAttributes>(
      CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
      connectorId,
      attrs
    );
  } catch (err) {
    logger.error(
      `${VERIFY_PERMISSIONS_TASK} Failed to update connector ${connectorId} status: ${err.message}`
    );
  }
}

async function verifyConnector(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  connector: SavedObject<CloudConnectorSOAttributes>,
  policyTemplates: string[],
  abortController: AbortController
) {
  const logger = appContextService.getLogger().get('otel-verifier');

  try {
    throwIfAborted(abortController);
    const { cloudProvider } = connector.attributes;
    const ensureResult = await ensureInstalledPackage({
      savedObjectsClient: soClient,
      esClient,
      pkgName: cloudProvider,
    });
    logger.info(
      `${VERIFY_PERMISSIONS_TASK} Package '${cloudProvider}' ${
        ensureResult.status === 'already_installed' ? 'already installed' : 'installed'
      } (v${ensureResult.package.version})`
    );

    throwIfAborted(abortController);
    const pkgInfo = await getPackageInfo({
      savedObjectsClient: soClient,
      pkgName: cloudProvider,
      pkgVersion: ensureResult.package.version,
      skipArchive: true,
    });

    const verificationInfo: ConnectorVerificationInfo = {
      policyTemplates,
      packageName: pkgInfo.name,
      packageTitle: pkgInfo.title ?? cloudProvider,
      packageVersion: pkgInfo.version,
    };

    logger.info(
      `${VERIFY_PERMISSIONS_TASK} Creating verifier policy for connector ${connector.id} with templates [` +
        `${verificationInfo.policyTemplates.join(', ')}]`
    );
    throwIfAborted(abortController);
    const { policyId } = await agentPolicyService.createVerifierPolicy(
      soClient,
      esClient,
      connector,
      verificationInfo
    );

    const startedAt = new Date().toISOString();
    logger.info(
      `${VERIFY_PERMISSIONS_TASK} Verifier policy ${policyId} created for connector ${connector.id}`
    );

    await updateConnectorStatus(soClient, connector.id, {
      verification_started_at: startedAt,
      verification_status: 'pending',
    });
  } catch (err) {
    logger.error(
      `${VERIFY_PERMISSIONS_TASK} Failed to verify connector ${connector.id}: ${err.message}`
    );
    await updateConnectorStatus(soClient, connector.id, {
      verification_status: 'failed',
      verification_failed_at: new Date().toISOString(),
    });
  }
}
