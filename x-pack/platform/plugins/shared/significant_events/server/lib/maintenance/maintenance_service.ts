/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { WorkflowNotFoundError } from '@kbn/workflows/common/errors';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { ALERTING_V2_ERROR_CODES, type RulesClientApi } from '@kbn/alerting-v2-plugin/server';
import type { StreamsServer } from '@kbn/streams-plugin/server/types';
import type {
  SignificantEventsMaintenanceFailure,
  SignificantEventsMaintenanceStatus,
  SignificantEventsMaintenanceSummary,
} from '../../../common/maintenance/types';
import {
  DEFAULT_MAINTENANCE_STATE,
  isMaintenanceState,
  type SignificantEventsMaintenanceState,
} from '../../../common/maintenance/state_machine';
import type { GetScopedClients } from '../../routes/types';
import {
  SIGNIFICANT_EVENTS_MAINTENANCE_STATE_SO_ID,
  SIGNIFICANT_EVENTS_MAINTENANCE_STATE_SO_TYPE,
  type SignificantEventsMaintenanceStateAttributes,
} from './saved_object';
import {
  createFeatureSettingsController,
  shouldRestoreSettingsBackedWorkflow,
  type PausedFeatureSettings,
} from './feature_settings';
import {
  buildCancelTargets,
  buildDisableTargets,
  type MaintenanceWorkflowTarget,
} from './managed_workflow_targets';

type ManagementApi = WorkflowsServerPluginSetup['management'];

/**
 * Pauses and resumes all Significant Events background activity from a single
 * synchronous call each. Pause is a control-plane action: it issues workflow
 * cancellations and disables directly from the request handler rather than
 * enqueuing a workflow execution, so it takes effect immediately instead of
 * queuing behind the very executions it is meant to stop. Both operations are
 * idempotent and persist the resulting state (and a summary) for the UI.
 *
 * Calling pause while already paused re-sweeps disable/cancel so partial
 * failures (or out-of-band re-enables) can be retried without a resume cycle.
 */
export interface SignificantEventsMaintenanceService {
  /** Read the persisted maintenance state plus live feature-toggle values (for the UI). */
  getStatus(params: { request: KibanaRequest }): Promise<SignificantEventsMaintenanceStatus>;
  /** Read only the persisted maintenance state (no feature-settings I/O). */
  getState(params: { request: KibanaRequest }): Promise<SignificantEventsMaintenanceState>;
  /**
   * Disable every managed workflow across spaces, cancel their in-flight
   * executions, turn off continuous/scheduled Settings toggles (recording which
   * were on), and disable the alerting rules backing knowledge indicator
   * queries. Resume restores only previously-enabled settings and their
   * workflows. Safe to call again while already paused: retries failed targets.
   */
  pause(params: {
    request: KibanaRequest;
    updatedBy?: string;
  }): Promise<SignificantEventsMaintenanceSummary>;
  /**
   * Re-enable workflows/rules pause recorded, and restore only the Settings
   * toggles that were enabled before pause. Always flips the control plane to
   * `enabled` (best-effort; no compensating rollback). Targets that fail to
   * re-enable stay in the disabled snapshot so a later Resume can retry them
   * even after the deployment is already reported as enabled.
   */
  resume(params: {
    request: KibanaRequest;
    updatedBy?: string;
  }): Promise<SignificantEventsMaintenanceSummary>;
  /**
   * After a managed-workflow install/reinstall (e.g. feature-flag flip), if the
   * deployment is paused, disable every maintenance target again and merge any
   * newly disabled workflows into the snapshot. No-op when not paused.
   */
  reassertPausedWorkflows(params: { request: KibanaRequest }): Promise<void>;
}

const toMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const workflowKey = ({ id, spaceId }: MaintenanceWorkflowTarget): string => `${id}@${spaceId}`;

/** Normalise a persisted (possibly newer/unknown) state string to a known state. */
const normalizeState = (raw: string | undefined): SignificantEventsMaintenanceState =>
  // Fail-open: unknown values from a newer node are treated as enabled so
  // activity is not permanently blocked.
  raw && isMaintenanceState(raw) ? raw : DEFAULT_MAINTENANCE_STATE;

/**
 * The persisted summary stores `state` as a free-form string (see the saved
 * object); narrow it back to a known state when reading.
 */
const normalizeSummary = (
  raw: SignificantEventsMaintenanceStateAttributes['lastSummary']
): SignificantEventsMaintenanceSummary | undefined =>
  raw ? { ...raw, state: normalizeState(raw.state) } : undefined;

const emptySummary = (
  state: SignificantEventsMaintenanceSummary['state']
): SignificantEventsMaintenanceSummary => ({
  state,
  executionsCancelled: 0,
  workflowsDisabled: 0,
  rulesDisabled: 0,
  partialFailures: [],
});

const logFailures = (
  log: Logger,
  message: string,
  failures: SignificantEventsMaintenanceFailure[]
): void => {
  if (failures.length > 0) {
    log.warn(message);
    for (const failure of failures) {
      log.warn(`Significant Events maintenance failure [${failure.target}]: ${failure.error}`);
    }
  } else {
    log.info(message);
  }
};

/**
 * Toggle `enabled` on a set of alerting v2 signal rules. Rule pause/resume
 * targets the v2 engine only (v1 is being removed in a follow-up). Returns the
 * ids that were actually toggled (no error), the ids that failed for a non-not-found
 * reason, and one failure entry per fatal id. A missing rule is treated as
 * "already gone" and reported as neither toggled nor failed.
 */
const setV2RulesEnabled = async (
  rulesClient: RulesClientApi,
  ids: string[],
  enabled: boolean
): Promise<{
  toggledIds: string[];
  failedIds: string[];
  failures: SignificantEventsMaintenanceFailure[];
}> => {
  const { errors } = enabled
    ? await rulesClient.bulkEnableRules({ ids })
    : await rulesClient.bulkDisableRules({ ids });
  const fatalErrors = errors.filter(
    (error) => error.error.code !== ALERTING_V2_ERROR_CODES.RULE_NOT_FOUND
  );
  const erroredIds = new Set(errors.map((error) => error.id));
  return {
    toggledIds: ids.filter((id) => !erroredIds.has(id)),
    failedIds: fatalErrors.map((error) => error.id),
    failures: fatalErrors.map((error) => ({
      target: `rule:${error.id}`,
      error: error.error.message,
    })),
  };
};

export const createSignificantEventsMaintenanceService = ({
  logger,
  server,
  getScopedClients,
}: {
  logger: Logger;
  server: StreamsServer;
  getScopedClients: GetScopedClients;
}): SignificantEventsMaintenanceService => {
  const log = logger.get('significant-events-maintenance');
  const featureSettings = createFeatureSettingsController({ server, getScopedClients });

  // Serialize pause/resume/reassert on this Kibana node so concurrent callers
  // cannot interleave sweeps and overwrites. Cross-node races still rely on
  // last-write-wins of the single deployment-wide SO.
  let transitionChain: Promise<unknown> = Promise.resolve();
  const withTransitionLock = async <T>(run: () => Promise<T>): Promise<T> => {
    const next = transitionChain.then(run, run);
    transitionChain = next.then(
      () => undefined,
      () => undefined
    );
    return next;
  };

  const getSoClient = (request: KibanaRequest): SavedObjectsClientContract =>
    server.core.savedObjects.getScopedClient(request, {
      includedHiddenTypes: [SIGNIFICANT_EVENTS_MAINTENANCE_STATE_SO_TYPE],
    });

  const normalizePausedSettings = (
    raw: SignificantEventsMaintenanceStateAttributes['pausedSettings']
  ): PausedFeatureSettings | undefined =>
    raw
      ? {
          continuousOnboardingWasEnabled: raw.continuousOnboardingWasEnabled,
          scheduledDiscoveryEnabledSpaceIds: [...raw.scheduledDiscoveryEnabledSpaceIds],
        }
      : undefined;

  const readState = async (
    soClient: SavedObjectsClientContract
  ): Promise<SignificantEventsMaintenanceStateAttributes | undefined> => {
    try {
      const so = await soClient.get<SignificantEventsMaintenanceStateAttributes>(
        SIGNIFICANT_EVENTS_MAINTENANCE_STATE_SO_TYPE,
        SIGNIFICANT_EVENTS_MAINTENANCE_STATE_SO_ID
      );
      return so.attributes;
    } catch (error) {
      if (SavedObjectsErrorHelpers.isNotFoundError(error as Error)) {
        return undefined;
      }
      throw error;
    }
  };

  const writeState = async (
    soClient: SavedObjectsClientContract,
    attributes: SignificantEventsMaintenanceStateAttributes
  ): Promise<void> => {
    await soClient.create<SignificantEventsMaintenanceStateAttributes>(
      SIGNIFICANT_EVENTS_MAINTENANCE_STATE_SO_TYPE,
      attributes,
      { id: SIGNIFICANT_EVENTS_MAINTENANCE_STATE_SO_ID, overwrite: true }
    );
  };

  const getAllSpaceIds = async (
    request: KibanaRequest,
    failures: SignificantEventsMaintenanceFailure[]
  ): Promise<string[]> => {
    const spacesClient = server.spaces?.spacesService.createSpacesClient(request);
    if (!spacesClient) {
      failures.push({
        target: 'spaces',
        error:
          'Spaces client is not available; only the default space was processed for per-space workflows',
      });
      return [DEFAULT_SPACE_ID];
    }
    try {
      // SpacesClient.getAll already loads every space SO (up to xpack.spaces.maxSpaces).
      const spaces = await spacesClient.getAll();
      const ids = spaces.map((space) => space.id);
      return ids.length > 0 ? [...new Set([DEFAULT_SPACE_ID, ...ids])] : [DEFAULT_SPACE_ID];
    } catch (error) {
      // Surface (not just log) the under-scoping so pause doesn't silently skip
      // per-space workflows in every space but the default.
      failures.push({
        target: 'spaces',
        error: `Failed to enumerate spaces; only the default space was processed: ${toMessage(
          error
        )}`,
      });
      return [DEFAULT_SPACE_ID];
    }
  };

  const disableWorkflow = async (
    mgmt: ManagementApi,
    { id, spaceId }: MaintenanceWorkflowTarget,
    request: KibanaRequest,
    failures: SignificantEventsMaintenanceFailure[]
  ): Promise<boolean> => {
    const target = `workflow:${id}@${spaceId}`;
    try {
      const workflow = await mgmt.getWorkflow(id, spaceId);
      if (!workflow || !workflow.enabled) {
        return false;
      }
      const result = await mgmt.updateWorkflow(id, { enabled: false }, spaceId, request);
      if (result.enabled !== false) {
        failures.push({
          target,
          error: result.validationErrors.join('; ') || 'workflow was not disabled',
        });
        return false;
      }
      return true;
    } catch (error) {
      failures.push({ target, error: toMessage(error) });
      return false;
    }
  };

  /**
   * Best-effort cancel of every non-terminal execution for a workflow target.
   * Delegates paging/cancel to workflows management; missing workflows are a no-op.
   */
  const cancelTargetExecutions = async (
    mgmt: ManagementApi,
    { id, spaceId }: MaintenanceWorkflowTarget,
    request: KibanaRequest,
    failures: SignificantEventsMaintenanceFailure[]
  ): Promise<void> => {
    try {
      await mgmt.cancelAllActiveWorkflowExecutions(id, spaceId, request);
    } catch (error) {
      if (error instanceof WorkflowNotFoundError) {
        return;
      }
      failures.push({ target: `execution:${id}@${spaceId}`, error: toMessage(error) });
    }
  };

  const disableBackedRules = async (
    request: KibanaRequest,
    failures: SignificantEventsMaintenanceFailure[]
  ): Promise<string[]> => {
    try {
      const { getKnowledgeIndicatorClient, getSignificantEventsAlertingContext } =
        await getScopedClients({ request });
      const kiClient = await getKnowledgeIndicatorClient();
      const links = await kiClient.getRuleBackedQueryLinks();
      const ruleIds = [...new Set(links.map((link) => link.rule_id).filter(Boolean))];
      if (ruleIds.length === 0) {
        return [];
      }
      const { alertingV2RulesClient } = await getSignificantEventsAlertingContext();
      if (!alertingV2RulesClient) {
        failures.push({ target: 'rules', error: 'Alerting v2 rules client is not available' });
        return [];
      }
      const { toggledIds, failures: ruleFailures } = await setV2RulesEnabled(
        alertingV2RulesClient,
        ruleIds,
        false
      );
      failures.push(...ruleFailures);
      // Record only the rules we actually disabled, so resume re-enables exactly those.
      // Blanket re-enable on resume is intentional: if a user had manually disabled a
      // backed rule before pause, resume turns it back on (asymmetric with workflows,
      // which only record what pause itself disabled).
      return toggledIds;
    } catch (error) {
      failures.push({ target: 'rules', error: toMessage(error) });
      return [];
    }
  };

  /** Re-enable the recorded rules; returns failed ids and how many were toggled on. */
  const reEnableRules = async (
    request: KibanaRequest,
    ruleIds: string[],
    failures: SignificantEventsMaintenanceFailure[]
  ): Promise<{ failedIds: string[]; toggledCount: number }> => {
    if (ruleIds.length === 0) {
      return { failedIds: [], toggledCount: 0 };
    }
    try {
      const { getSignificantEventsAlertingContext } = await getScopedClients({ request });
      const { alertingV2RulesClient } = await getSignificantEventsAlertingContext();
      if (!alertingV2RulesClient) {
        failures.push({ target: 'rules', error: 'Alerting v2 rules client is not available' });
        // Keep every rule recorded so a later resume can retry them.
        return { failedIds: ruleIds, toggledCount: 0 };
      }
      const {
        toggledIds,
        failedIds,
        failures: ruleFailures,
      } = await setV2RulesEnabled(alertingV2RulesClient, ruleIds, true);
      failures.push(...ruleFailures);
      return { failedIds, toggledCount: toggledIds.length };
    } catch (error) {
      failures.push({ target: 'rules', error: toMessage(error) });
      return { failedIds: ruleIds, toggledCount: 0 };
    }
  };

  /**
   * Re-enable a single workflow.
   * - `toggled`: disable→enable update succeeded
   * - `already` / `gone`: no longer needs resume (already on, or deleted)
   * - `failed`: keep in the disabled snapshot for retry
   */
  const reEnableWorkflow = async (
    mgmt: ManagementApi,
    { id, spaceId }: MaintenanceWorkflowTarget,
    request: KibanaRequest,
    failures: SignificantEventsMaintenanceFailure[]
  ): Promise<'toggled' | 'already' | 'gone' | 'failed'> => {
    const target = `workflow:${id}@${spaceId}`;
    try {
      const workflow = await mgmt.getWorkflow(id, spaceId);
      if (!workflow) {
        // Gone — surface it, but don't keep the deployment paused on a workflow
        // that no longer exists.
        failures.push({ target, error: 'workflow not found' });
        return 'gone';
      }
      if (workflow.enabled) {
        return 'already';
      }
      if (!workflow.definition) {
        // Transient (installer hasn't finished); keep recorded so resume retries.
        failures.push({ target, error: 'workflow is not fully installed yet' });
        return 'failed';
      }
      const result = await mgmt.updateWorkflow(id, { enabled: true }, spaceId, request);
      if (result.enabled !== true) {
        failures.push({
          target,
          error: result.validationErrors.join('; ') || 'workflow was not enabled',
        });
        return 'failed';
      }
      return 'toggled';
    } catch (error) {
      failures.push({ target, error: toMessage(error) });
      return 'failed';
    }
  };

  /**
   * Disable + cancel every managed target, disable backed rules, and merge the
   * result with the previous snapshot (so re-pause keeps earlier successes and
   * adds anything newly disabled). Enumerates spaces once and returns them so
   * the settings step can reuse the same list.
   */
  const runPauseSweep = async ({
    request,
    previousWorkflows,
    previousRuleIds,
  }: {
    request: KibanaRequest;
    previousWorkflows: MaintenanceWorkflowTarget[];
    previousRuleIds: string[];
  }): Promise<{
    disabledWorkflows: MaintenanceWorkflowTarget[];
    disabledRuleIds: string[];
    workflowsDisabledThisSweep: number;
    rulesDisabledThisSweep: number;
    failures: SignificantEventsMaintenanceFailure[];
    spaceIds: string[];
  }> => {
    const failures: SignificantEventsMaintenanceFailure[] = [];
    const mgmt = server.workflowsManagement?.management;
    // Enumerate spaces regardless of workflow availability: settings still need
    // to be turned off per space even when workflows management is down.
    const spaceIds = await getAllSpaceIds(request, failures);
    const newlyDisabled: MaintenanceWorkflowTarget[] = [];

    if (mgmt) {
      for (const target of buildDisableTargets(spaceIds)) {
        if (await disableWorkflow(mgmt, target, request, failures)) {
          newlyDisabled.push(target);
        }
      }
      for (const target of buildCancelTargets(spaceIds)) {
        await cancelTargetExecutions(mgmt, target, request, failures);
      }
    } else {
      failures.push({
        target: 'workflows',
        error: 'Workflows management plugin is not available',
      });
    }

    const newlyDisabledRuleIds = await disableBackedRules(request, failures);

    const workflowByKey = new Map<string, MaintenanceWorkflowTarget>();
    for (const workflow of previousWorkflows) {
      workflowByKey.set(workflowKey(workflow), workflow);
    }
    for (const target of newlyDisabled) {
      workflowByKey.set(workflowKey(target), target);
    }

    const disabledRuleIds = [...new Set([...previousRuleIds, ...newlyDisabledRuleIds])];

    return {
      disabledWorkflows: [...workflowByKey.values()],
      disabledRuleIds,
      workflowsDisabledThisSweep: newlyDisabled.length,
      rulesDisabledThisSweep: newlyDisabledRuleIds.length,
      failures,
      spaceIds,
    };
  };

  /**
   * Shared pause-persist path for `pause` and `reassertPausedWorkflows`.
   *
   * Order:
   * 1. Persist `paused` (blocking intent) before side effects so guards fail closed
   *    even if the later sweep write fails.
   * 2. Sweep disable/cancel + turn Settings off.
   * 3. Persist the final snapshot (disabled targets, restore flags, summary).
   *
   * A final-write failure leaves the deployment paused with a possibly stale
   * snapshot; Pause again retries. For user pause, return a summary with the
   * snapshot failure recorded (partial success — intent already blocks activity).
   * Reassert still throws so workflow install cannot succeed while reassert fails.
   */
  const persistPause = async ({
    soClient,
    request,
    existing,
    mode,
    updatedBy,
  }: {
    soClient: SavedObjectsClientContract;
    request: KibanaRequest;
    existing: SignificantEventsMaintenanceStateAttributes | undefined;
    mode: 'pause' | 'reassert';
    updatedBy?: string;
  }): Promise<{
    summary: SignificantEventsMaintenanceSummary;
    sweep: Awaited<ReturnType<typeof runPauseSweep>>;
  }> => {
    const previousSummary = normalizeSummary(existing?.lastSummary);
    const actor = mode === 'pause' ? updatedBy : existing?.updatedBy ?? 'system:reassert';

    // 1. Blocking intent first (skip when already paused — reassert/re-pause).
    if (normalizeState(existing?.state) !== 'paused') {
      try {
        await writeState(soClient, {
          state: 'paused',
          updatedAt: new Date().toISOString(),
          updatedBy: actor,
          disabledWorkflows: existing?.disabledWorkflows ?? [],
          disabledRuleIds: existing?.disabledRuleIds ?? [],
          pausedSettings: existing?.pausedSettings,
          lastSummary: previousSummary ?? {
            state: 'paused',
            executionsCancelled: 0,
            workflowsDisabled: 0,
            rulesDisabled: 0,
            partialFailures: [],
          },
        });
      } catch (writeError) {
        logFailures(
          log,
          `Significant Events ${mode} failed before sweep: could not persist paused intent: ${toMessage(
            writeError
          )}`,
          [
            {
              target: mode === 'reassert' ? 'reassert' : 'pause',
              error: `Failed to persist pause intent: ${toMessage(writeError)}`,
            },
          ]
        );
        throw writeError;
      }
    }

    // 2. Always re-sweep: a second pause while already paused retries targets that
    // failed (or were re-enabled out-of-band) instead of returning a stale summary.
    const sweep = await runPauseSweep({
      request,
      previousWorkflows: existing?.disabledWorkflows ?? [],
      previousRuleIds: existing?.disabledRuleIds ?? [],
    });

    // Turn Settings off after the workflow sweep so a settings write failure
    // still leaves workflows stopped. Reuse the sweep's space enumeration.
    let pausedSettings: SignificantEventsMaintenanceStateAttributes['pausedSettings'];
    if (mode === 'pause') {
      pausedSettings = await featureSettings.pauseFeatureSettings({
        request,
        spaceIds: sweep.spaceIds,
        previous: normalizePausedSettings(existing?.pausedSettings),
        failures: sweep.failures,
      });
    } else {
      await featureSettings.reassertFeatureSettingsOff({
        request,
        spaceIds: sweep.spaceIds,
        failures: sweep.failures,
      });
      // Re-assert does not change the restore snapshot.
      pausedSettings = existing?.pausedSettings;
    }

    // Snapshot lengths (not this-sweep deltas) so a clean re-pause still shows
    // how much is currently off. Cancel is best-effort via
    // cancelAllActiveWorkflowExecutions and does not return a count.
    const summary: SignificantEventsMaintenanceSummary = {
      state: 'paused',
      executionsCancelled: 0,
      workflowsDisabled: sweep.disabledWorkflows.length,
      rulesDisabled: sweep.disabledRuleIds.length,
      partialFailures: sweep.failures,
    };

    // 3. Final snapshot write.
    try {
      await writeState(soClient, {
        state: 'paused',
        updatedAt: new Date().toISOString(),
        updatedBy: actor,
        disabledWorkflows: sweep.disabledWorkflows,
        disabledRuleIds: sweep.disabledRuleIds,
        pausedSettings,
        lastSummary: summary,
      });
    } catch (writeError) {
      // Intent is already paused, so guards stay closed. Log the sweep outcome;
      // a later Pause retries the snapshot write.
      const snapshotFailure: SignificantEventsMaintenanceFailure = {
        target: mode === 'reassert' ? 'reassert' : 'pause',
        error: `Failed to persist pause snapshot: ${toMessage(writeError)}`,
      };
      const failuresWithSnapshot = [...sweep.failures, snapshotFailure];
      logFailures(
        log,
        `Significant Events ${mode} snapshot persist failed after sweep (state remains paused): newly disabled ${
          sweep.workflowsDisabledThisSweep
        } workflow(s) / ${sweep.rulesDisabledThisSweep} rule(s), snapshot would have ${
          sweep.disabledWorkflows.length
        } workflow(s); write error: ${toMessage(writeError)}`,
        failuresWithSnapshot
      );
      // User pause: return partial success so the UI shows a warning, not "pause failed".
      // Reassert: throw so managed-workflow install cannot succeed while reassert is broken.
      if (mode === 'pause') {
        return {
          summary: { ...summary, partialFailures: failuresWithSnapshot },
          sweep: { ...sweep, failures: failuresWithSnapshot },
        };
      }
      throw writeError;
    }

    return { summary, sweep };
  };

  return {
    async getState({ request }) {
      return normalizeState((await readState(getSoClient(request)))?.state);
    },

    async pause({ request, updatedBy }) {
      return withTransitionLock(async () => {
        const soClient = getSoClient(request);
        const existing = await readState(soClient);
        const { summary, sweep } = await persistPause({
          soClient,
          request,
          existing,
          mode: 'pause',
          updatedBy,
        });

        logFailures(
          log,
          `Significant Events paused: disabled ${summary.workflowsDisabled} workflow(s) and ${summary.rulesDisabled} rule(s) (this sweep: ${sweep.workflowsDisabledThisSweep}/${sweep.rulesDisabledThisSweep}), ${sweep.failures.length} failure(s)`,
          sweep.failures
        );
        return summary;
      });
    },

    async resume({ request, updatedBy }) {
      return withTransitionLock(async () => {
        const soClient = getSoClient(request);
        const existing = await readState(soClient);
        const currentState = normalizeState(existing?.state);
        const recordedWorkflows = existing?.disabledWorkflows ?? [];
        const recordedRuleIds = existing?.disabledRuleIds ?? [];
        const hasRetryInventory = recordedWorkflows.length > 0 || recordedRuleIds.length > 0;

        // Idempotent when fully enabled. Also accept a follow-up Resume while
        // already enabled if a prior partial resume left failed targets recorded.
        if (currentState !== 'paused' && !hasRetryInventory) {
          return emptySummary('enabled');
        }

        const failures: SignificantEventsMaintenanceFailure[] = [];
        const mgmt = server.workflowsManagement?.management;
        const pausedSettings = normalizePausedSettings(existing?.pausedSettings);
        // First resume from paused gates settings-backed workflows. A retry of
        // leftover inventory already filtered those once — retry everything left.
        const isFirstResumeFromPaused = currentState === 'paused';
        const shouldAttemptWorkflow = (workflow: MaintenanceWorkflowTarget): boolean =>
          !isFirstResumeFromPaused || shouldRestoreSettingsBackedWorkflow(workflow, pausedSettings);

        // Best-effort restore: re-enable inventory, restore settings, then flip the
        // control plane to enabled. Partial failures are reported as warnings —
        // no compensating rollback (rollback can fail too). Failed targets stay
        // in the snapshot so a later Resume can retry them.
        let workflowsToggled = 0;
        const remainingWorkflows: MaintenanceWorkflowTarget[] = [];
        if (mgmt) {
          for (const workflow of recordedWorkflows) {
            if (!shouldAttemptWorkflow(workflow)) {
              continue;
            }
            const outcome = await reEnableWorkflow(mgmt, workflow, request, failures);
            if (outcome === 'toggled') {
              workflowsToggled += 1;
            } else if (outcome === 'failed') {
              remainingWorkflows.push(workflow);
            }
          }
        } else {
          for (const workflow of recordedWorkflows) {
            if (shouldAttemptWorkflow(workflow)) {
              remainingWorkflows.push(workflow);
            }
          }
          if (remainingWorkflows.length > 0) {
            failures.push({
              target: 'workflows',
              error: 'Workflows management plugin is not available',
            });
          }
        }

        const { failedIds: remainingRuleIds, toggledCount: rulesToggled } = await reEnableRules(
          request,
          recordedRuleIds,
          failures
        );

        await featureSettings.resumeFeatureSettings({ request, pausedSettings, failures });

        const summary: SignificantEventsMaintenanceSummary = {
          state: 'enabled',
          executionsCancelled: 0,
          workflowsDisabled: remainingWorkflows.length,
          rulesDisabled: remainingRuleIds.length,
          partialFailures: failures,
        };

        try {
          await writeState(soClient, {
            state: 'enabled',
            updatedAt: new Date().toISOString(),
            updatedBy,
            disabledWorkflows: remainingWorkflows,
            disabledRuleIds: remainingRuleIds,
            lastSummary: summary,
          });
        } catch (writeError) {
          failures.push({
            target: 'resume',
            error: `Failed to persist resume state: ${toMessage(writeError)}`,
          });
          logFailures(
            log,
            `Significant Events resume persist failed after best-effort re-enable: ${toMessage(
              writeError
            )}`,
            failures
          );
          throw writeError;
        }

        const message = `Significant Events resume completed: toggled on ${workflowsToggled} workflow(s) and ${rulesToggled} rule(s), ${failures.length} failure(s); ${remainingWorkflows.length} workflow(s) / ${remainingRuleIds.length} rule(s) still disabled`;
        if (failures.length === 0) {
          log.info(message);
        } else {
          logFailures(log, message, failures);
        }
        return summary;
      });
    },

    async reassertPausedWorkflows({ request }) {
      return withTransitionLock(async () => {
        const soClient = getSoClient(request);
        const existing = await readState(soClient);
        if (normalizeState(existing?.state) !== 'paused') {
          return;
        }

        const { summary, sweep } = await persistPause({
          soClient,
          request,
          existing,
          mode: 'reassert',
        });

        if (sweep.workflowsDisabledThisSweep > 0 || summary.partialFailures.length > 0) {
          logFailures(
            log,
            `Significant Events re-asserted pause after workflow install: disabled ${sweep.workflowsDisabledThisSweep} workflow(s), ${summary.partialFailures.length} failure(s)`,
            summary.partialFailures
          );
        }
      });
    },

    async getStatus({ request }) {
      const soClient = getSoClient(request);
      const existing = await readState(soClient);
      const state = normalizeState(existing?.state);
      let featureSettingsStatus:
        | Awaited<ReturnType<typeof featureSettings.readFeatureSettingsStatus>>
        | undefined;
      let featureSettingsUnavailable = false;
      try {
        featureSettingsStatus = await featureSettings.readFeatureSettingsStatus(request);
      } catch (error) {
        featureSettingsUnavailable = true;
        log.warn(
          `Significant Events maintenance status: failed to read feature settings: ${toMessage(
            error
          )}`
        );
        // While paused, fail closed so the UI does not sync stale enabled=true
        // toggles when uiSettings are unreadable.
        if (state === 'paused') {
          featureSettingsStatus = {
            continuousOnboardingEnabled: false,
            scheduledDiscoveryEnabled: false,
          };
        }
      }
      if (!existing) {
        return {
          state: DEFAULT_MAINTENANCE_STATE,
          ...(featureSettingsStatus ? { featureSettings: featureSettingsStatus } : {}),
          ...(featureSettingsUnavailable ? { featureSettingsUnavailable: true } : {}),
        };
      }
      return {
        state,
        updatedAt: existing.updatedAt,
        updatedBy: existing.updatedBy,
        lastSummary: normalizeSummary(existing.lastSummary),
        ...(featureSettingsStatus ? { featureSettings: featureSettingsStatus } : {}),
        ...(featureSettingsUnavailable ? { featureSettingsUnavailable: true } : {}),
      };
    },
  };
};
