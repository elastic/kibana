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

import { VERIFICATION_TTL_MS } from './verifier_policy_cleanup';

const TASK_TYPE = 'fleet:verify_permissions';
const TASK_TITLE = 'OTel Verify Permission Task';
const TASK_TIMEOUT = '1d';
const TASK_ID = `${TASK_TYPE}:1.0.0`;
const TASK_INTERVAL = '12h';
export const VERIFY_PERMISSIONS_TASK = '[OTel Verify Permissions Task]';
const ELIGIBILITY_WINDOW_MS = 5 * 60 * 1000;
/** Buffer added to VERIFICATION_TTL_MS when computing `runAt` for the next run, so
 *  the verifier-policy cleanup task reliably sees the just-created verifier as expired on the
 *  next fire (protects against clock skew and task-manager polling jitter). */
const RESCHEDULE_BUFFER_MS = 30 * 1000;

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
            const { shouldReschedule } = await runPermissionVerifierTask(abortController);
            // If more work remains (either a gating verifier will soon expire, or
            // additional eligible connectors are waiting), ask task manager to fire
            // the task again shortly after the current verifier's TTL elapses.
            // This keeps verifier deployments serial (one at a time) while draining
            // the backlog in O(N * TTL) instead of O(N * TASK_INTERVAL).
            if (shouldReschedule) {
              return {
                runAt: new Date(Date.now() + VERIFICATION_TTL_MS + RESCHEDULE_BUFFER_MS),
                state: taskInstance.state,
              };
            }
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
 * Task flow (fires on a 12 h cron, and self-reschedules at VERIFICATION_TTL_MS
 * cadence whenever additional work remains):
 *
 * Phase 1 - Gate: If a non-expired verifier agent policy exists, skip this run.
 *
 * Phase 2 - Pre-filter: Fetch package policies with cloud_connector_id to build
 *           a map of connector ID -> package policy IDs. Then fetch only the
 *           cloud connectors that have installed packages via KQL id filter.
 *
 * Phase 3 - Verify exactly one eligible connector per task run (one verifier
 *           deployment active at a time). Eligibility criteria:
 *             1. Never verified (verification_started_at is null)
 *             2. Recently created (created_at within last 5 min)
 *             3. Recently updated (updated_at within last 5 min)
 *             4. Due for re-verification (started_at > 5 min ago, status != failed)
 *             5. Failed with cooldown expired (failed_at > 5 min ago)
 *             6. Backwards compat (verification_status not set)
 *           On failure the connector is marked failed; on success the separate
 *           status update task sets the final status.
 *
 * Returns `shouldReschedule: true` if there is still work to do: a gating
 * verifier that will expire soon, additional eligible connectors waiting their
 * turn, or a verifier policy was just created (so fleet:verifier_policy_cleanup
 * can remove it after TTL without waiting for the 12 h cron). The caller uses this to return
 * `runAt = now + TTL` so task manager fires the task again without waiting for
 * the 12 h cron.
 */
async function runPermissionVerifierTask(
  abortController: AbortController
): Promise<{ shouldReschedule: boolean }> {
  const logger = appContextService.getLogger().get('otel-verifier');

  if (!appContextService.getExperimentalFeatures()?.enableOTelVerifier) {
    logger.debug(`${VERIFY_PERMISSIONS_TASK} OTel verifier is disabled, skipping`);
    return { shouldReschedule: false };
  }

  logger.debug(`${VERIFY_PERMISSIONS_TASK} Task run started`);

  const soClient = appContextService.getInternalUserSOClientWithoutSpaceExtension();
  const esClient = appContextService.getInternalUserESClient();

  try {
    throwIfAborted(abortController);

    // Phase 1 — Gate: only one verifier deployment at a time.
    // If a non-expired verifier policy still exists, skip this run.
    const saveObjectType = await getAgentPolicySavedObjectType();
    const activeVerifiers = await agentPolicyService.list(soClient, {
      kuery: `${saveObjectType}.is_verifier: true`,
      perPage: 1,
      spaceId: '*',
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
        // Ask for a follow-up run once this verifier's TTL elapses so we can
        // clean it up and pick up the next eligible connector without waiting
        // for the 12 h cron.
        return { shouldReschedule: true };
      }
    }

    throwIfAborted(abortController);

    // Phase 2: Pre-filter package policies to build connector -> package policy IDs map
    const packagePolicyMap = await getPackagePolicyMap(soClient);

    if (packagePolicyMap.size === 0) {
      logger.info(`${VERIFY_PERMISSIONS_TASK} No connectors with installed packages found`);
      logger.info(`${VERIFY_PERMISSIONS_TASK} Task run completed`);
      return { shouldReschedule: false };
    }

    const connectorIds = [...packagePolicyMap.keys()].filter((id) => id.length > 0);

    if (connectorIds.length === 0) {
      logger.info(`${VERIFY_PERMISSIONS_TASK} No valid connector IDs found after filtering`);
      logger.info(`${VERIFY_PERMISSIONS_TASK} Task run completed`);
      return { shouldReschedule: false };
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

    // Phase 3: Verify exactly one eligible connector per task run (one verifier
    // deployment active at a time). If additional eligible connectors remain,
    // the task runner reschedules the next run for `now + TTL + buffer` so we
    // drain the backlog at TTL cadence instead of every 12 h.
    let verifiedConnectorId: string | undefined;
    let verifierPolicyCreated = false;
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
        verifierPolicyCreated = await verifyConnector(
          soClient,
          esClient,
          connector,
          policyTemplates,
          abortController
        );
      } catch (error) {
        logger.error(
          `${VERIFY_PERMISSIONS_TASK} Failed to verify connector ${connector.id}: ${error.message}`
        );
      }
      verifiedConnectorId = connector.id;
      break;
    }

    logger.debug(`${VERIFY_PERMISSIONS_TASK} Task run completed`);

    if (!verifiedConnectorId) {
      return { shouldReschedule: false };
    }

    // Count remaining eligible connectors other than the one we just processed
    // (its in-memory attributes do not reflect the just-applied status update,
    // so it must be explicitly excluded or we would self-reschedule forever).
    const hasMoreEligible = connectors.some(
      (c) =>
        c.id !== verifiedConnectorId &&
        isConnectorEligible(c.attributes) &&
        (packagePolicyMap.get(c.id)?.length ?? 0) > 0
    );

    // Reschedule when more connectors need verification, or when we created a
    // verifier deployment so fleet:verifier_policy_cleanup can remove it after TTL
    // (otherwise a single-connector run would fall back to the 12 h interval and leave the
    // verifier policy orphaned until then).
    return { shouldReschedule: hasMoreEligible || verifierPolicyCreated };
  } catch (error) {
    if (abortController.signal.aborted) {
      logger.info(`${VERIFY_PERMISSIONS_TASK} Task was aborted`);
      return { shouldReschedule: false };
    }
    logger.error(`${VERIFY_PERMISSIONS_TASK} Task run failed: ${error.message}`);
    throw error;
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

/**
 * Verify a single cloud connector.
 *
 * Stamps verification_started_at after creating the verifier policy. On failure
 * before deployment, marks the connector as failed with verification_failed_at.
 * The separate status update task sets the final status after success.
 *
 * @returns true if a verifier agent policy was created (caller must reschedule
 *          for TTL cleanup); false if verification failed before that.
 */
async function verifyConnector(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  connector: SavedObject<CloudConnectorSOAttributes>,
  policyTemplates: string[],
  abortController: AbortController
): Promise<boolean> {
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
    return true;
  } catch (err) {
    logger.error(
      `${VERIFY_PERMISSIONS_TASK} Failed to verify connector ${connector.id}: ${err.message}`
    );
    await updateConnectorStatus(soClient, connector.id, {
      verification_status: 'failed',
      verification_failed_at: new Date().toISOString(),
    });
    return false;
  }
}
