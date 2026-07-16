/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { NonTerminalExecutionStatuses } from '@kbn/workflows';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { RulesClientApi } from '@kbn/alerting-v2-plugin/server';
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
  buildCancelTargets,
  buildDisableTargets,
  type MaintenanceWorkflowTarget,
} from './managed_workflow_targets';

type ManagementApi = WorkflowsServerPluginSetup['management'];

const RUNNING_EXECUTIONS_PAGE_SIZE = 1000;
/** Caps cancel rounds that re-query page 1 after each batch (status lag). */
const MAX_CANCEL_ROUNDS = 50;

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
  /** Read the persisted maintenance state. */
  getStatus(params: { request: KibanaRequest }): Promise<SignificantEventsMaintenanceStatus>;
  /**
   * Disable every managed workflow across spaces, cancel their in-flight
   * executions, and disable the alerting rules backing knowledge indicator
   * queries. Records what it disabled so resume can re-enable exactly that.
   * Safe to call again while already paused: retries failed targets.
   */
  pause(params: {
    request: KibanaRequest;
    updatedBy?: string;
  }): Promise<SignificantEventsMaintenanceSummary>;
  /** Re-enable exactly the workflows and rules pause recorded as disabled. */
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

const workflowKey = ({ documentId, spaceId }: MaintenanceWorkflowTarget) =>
  `${documentId}@${spaceId}`;

const recordedWorkflowKey = ({ id, spaceId }: { id: string; spaceId: string }) =>
  `${id}@${spaceId}`;

/**
 * Toggle `enabled` on a set of alerting v2 signal rules. Rule pause/resume
 * targets the v2 engine only (v1 is being removed in a follow-up). Returns the
 * ids that were actually toggled (no error), the ids that failed for a non-404
 * reason, and one failure entry per fatal id. A 404 is treated as "already
 * gone" and reported as neither toggled nor failed.
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
  const fatalErrors = errors.filter((error) => error.error.statusCode !== 404);
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

/** Normalise a persisted (possibly newer/unknown) state string to a known state. */
const normalizeState = (raw: string | undefined): SignificantEventsMaintenanceState =>
  // Fail-open: unknown values from a newer node are treated as running so an
  // older node does not permanently block activity it cannot interpret.
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

  const getSoClient = (request: KibanaRequest): SavedObjectsClientContract =>
    server.core.savedObjects.getScopedClient(request, {
      includedHiddenTypes: [SIGNIFICANT_EVENTS_MAINTENANCE_STATE_SO_TYPE],
    });

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
    { documentId, spaceId }: MaintenanceWorkflowTarget,
    request: KibanaRequest,
    failures: SignificantEventsMaintenanceFailure[]
  ): Promise<boolean> => {
    const target = `workflow:${documentId}@${spaceId}`;
    try {
      const workflow = await mgmt.getWorkflow(documentId, spaceId);
      if (!workflow || !workflow.enabled) {
        return false;
      }
      const result = await mgmt.updateWorkflow(documentId, { enabled: false }, spaceId, request);
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

  const cancelTargetExecutions = async (
    mgmt: ManagementApi,
    { documentId, spaceId }: MaintenanceWorkflowTarget,
    request: KibanaRequest,
    failures: SignificantEventsMaintenanceFailure[]
  ): Promise<number> => {
    try {
      let cancelled = 0;
      const attemptedIds = new Set<string>();

      const cancelBatch = async (executions: Array<{ id: string }>): Promise<number> => {
        const pending = executions.filter((execution) => !attemptedIds.has(execution.id));
        if (pending.length === 0) {
          return 0;
        }
        for (const execution of pending) {
          attemptedIds.add(execution.id);
        }
        const outcomes = await Promise.all(
          pending.map((execution) =>
            mgmt.cancelWorkflowExecution(execution.id, spaceId, request).then(
              () => true,
              (error) => {
                failures.push({
                  target: `execution:${execution.id}@${spaceId}`,
                  error: toMessage(error),
                });
                return false;
              }
            )
          )
        );
        return outcomes.filter(Boolean).length;
      };

      // Pass 1: page forward through the known backlog.
      for (let page = 1; ; page++) {
        const { results, total } = await mgmt.getWorkflowExecutions(
          {
            workflowId: documentId,
            statuses: [...NonTerminalExecutionStatuses],
            page,
            size: RUNNING_EXECUTIONS_PAGE_SIZE,
          },
          spaceId
        );
        if (results.length === 0) {
          break;
        }
        cancelled += await cancelBatch(results);
        if (
          results.length < RUNNING_EXECUTIONS_PAGE_SIZE ||
          page * RUNNING_EXECUTIONS_PAGE_SIZE >= total
        ) {
          break;
        }
      }

      // Pass 2: re-check page 1 for any ids that were not seen in pass 1 (e.g.
      // status lag left earlier pages non-empty while newer work was queued).
      // Attempted-id tracking prevents infinite re-cancels of the same execution.
      for (let round = 0; round < MAX_CANCEL_ROUNDS; round++) {
        const { results } = await mgmt.getWorkflowExecutions(
          {
            workflowId: documentId,
            statuses: [...NonTerminalExecutionStatuses],
            page: 1,
            size: RUNNING_EXECUTIONS_PAGE_SIZE,
          },
          spaceId
        );
        const accepted = await cancelBatch(results);
        if (accepted === 0) {
          break;
        }
        cancelled += accepted;
      }

      return cancelled;
    } catch (error) {
      failures.push({ target: `execution:${documentId}@${spaceId}`, error: toMessage(error) });
      return 0;
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

  /** Re-enable the recorded rules; returns the ids that could not be re-enabled. */
  const reEnableRules = async (
    request: KibanaRequest,
    ruleIds: string[],
    failures: SignificantEventsMaintenanceFailure[]
  ): Promise<string[]> => {
    if (ruleIds.length === 0) {
      return [];
    }
    try {
      const { getSignificantEventsAlertingContext } = await getScopedClients({ request });
      const { alertingV2RulesClient } = await getSignificantEventsAlertingContext();
      if (!alertingV2RulesClient) {
        failures.push({ target: 'rules', error: 'Alerting v2 rules client is not available' });
        // Keep every rule recorded so a later resume can retry them.
        return ruleIds;
      }
      const { failedIds, failures: ruleFailures } = await setV2RulesEnabled(
        alertingV2RulesClient,
        ruleIds,
        true
      );
      failures.push(...ruleFailures);
      return failedIds;
    } catch (error) {
      failures.push({ target: 'rules', error: toMessage(error) });
      return ruleIds;
    }
  };

  /** Re-enable a single workflow; returns whether it no longer needs re-enabling. */
  const reEnableWorkflow = async (
    mgmt: ManagementApi,
    { id, spaceId }: { id: string; spaceId: string },
    request: KibanaRequest,
    failures: SignificantEventsMaintenanceFailure[]
  ): Promise<boolean> => {
    const target = `workflow:${id}@${spaceId}`;
    try {
      const workflow = await mgmt.getWorkflow(id, spaceId);
      if (!workflow) {
        // Gone — surface it, but don't keep the deployment paused on a workflow
        // that no longer exists.
        failures.push({ target, error: 'workflow not found' });
        return true;
      }
      if (workflow.enabled) {
        return true;
      }
      if (!workflow.definition) {
        // Transient (installer hasn't finished); keep recorded so resume retries.
        failures.push({ target, error: 'workflow is not fully installed yet' });
        return false;
      }
      const result = await mgmt.updateWorkflow(id, { enabled: true }, spaceId, request);
      if (result.enabled !== true) {
        failures.push({
          target,
          error: result.validationErrors.join('; ') || 'workflow was not enabled',
        });
        return false;
      }
      return true;
    } catch (error) {
      failures.push({ target, error: toMessage(error) });
      return false;
    }
  };

  const runPauseSweep = async ({
    request,
    previousWorkflows,
    previousRuleIds,
  }: {
    request: KibanaRequest;
    previousWorkflows: Array<{ id: string; spaceId: string }>;
    previousRuleIds: string[];
  }): Promise<{
    disabledWorkflows: Array<{ id: string; spaceId: string }>;
    disabledRuleIds: string[];
    executionsCancelled: number;
    workflowsDisabledThisSweep: number;
    rulesDisabledThisSweep: number;
    failures: SignificantEventsMaintenanceFailure[];
  }> => {
    const failures: SignificantEventsMaintenanceFailure[] = [];
    const mgmt = server.workflowsManagement?.management;
    const newlyDisabled: MaintenanceWorkflowTarget[] = [];
    let executionsCancelled = 0;

    if (mgmt) {
      const spaceIds = await getAllSpaceIds(request, failures);
      for (const target of buildDisableTargets(spaceIds)) {
        if (await disableWorkflow(mgmt, target, request, failures)) {
          newlyDisabled.push(target);
        }
      }
      for (const target of buildCancelTargets(spaceIds)) {
        executionsCancelled += await cancelTargetExecutions(mgmt, target, request, failures);
      }
    } else {
      failures.push({
        target: 'workflows',
        error: 'Workflows management plugin is not available',
      });
    }

    const newlyDisabledRuleIds = await disableBackedRules(request, failures);

    // Merge previous snapshot with this sweep so re-pause keeps earlier successes
    // and adds anything newly disabled (including after a flag-flip reinstall).
    const workflowByKey = new Map<string, { id: string; spaceId: string }>();
    for (const workflow of previousWorkflows) {
      workflowByKey.set(recordedWorkflowKey(workflow), workflow);
    }
    for (const target of newlyDisabled) {
      workflowByKey.set(workflowKey(target), { id: target.documentId, spaceId: target.spaceId });
    }

    const disabledRuleIds = [...new Set([...previousRuleIds, ...newlyDisabledRuleIds])];

    return {
      disabledWorkflows: [...workflowByKey.values()],
      disabledRuleIds,
      executionsCancelled,
      workflowsDisabledThisSweep: newlyDisabled.length,
      rulesDisabledThisSweep: newlyDisabledRuleIds.length,
      failures,
    };
  };

  return {
    async pause({ request, updatedBy }) {
      const soClient = getSoClient(request);
      const existing = await readState(soClient);
      const previousWorkflows = existing?.disabledWorkflows ?? [];
      const previousRuleIds = existing?.disabledRuleIds ?? [];

      // Always re-sweep: a second pause while already paused retries targets that
      // failed (or were re-enabled out-of-band) instead of returning a stale summary.
      const sweep = await runPauseSweep({
        request,
        previousWorkflows,
        previousRuleIds,
      });

      const summary: SignificantEventsMaintenanceSummary = {
        state: 'paused',
        executionsCancelled: sweep.executionsCancelled,
        workflowsDisabled: sweep.workflowsDisabledThisSweep,
        rulesDisabled: sweep.rulesDisabledThisSweep,
        partialFailures: sweep.failures,
      };

      await writeState(soClient, {
        state: 'paused',
        updatedAt: new Date().toISOString(),
        updatedBy,
        disabledWorkflows: sweep.disabledWorkflows,
        disabledRuleIds: sweep.disabledRuleIds,
        lastSummary: summary,
      });

      logFailures(
        log,
        `Significant Events paused: disabled ${summary.workflowsDisabled} workflow(s) and ${summary.rulesDisabled} rule(s), cancelled ${summary.executionsCancelled} execution(s), ${sweep.failures.length} failure(s)`,
        sweep.failures
      );
      return summary;
    },

    async resume({ request, updatedBy }) {
      const soClient = getSoClient(request);
      const existing = await readState(soClient);

      // Idempotent: only a paused deployment has anything to resume.
      if (normalizeState(existing?.state) !== 'paused') {
        return emptySummary('running');
      }

      const failures: SignificantEventsMaintenanceFailure[] = [];
      const mgmt = server.workflowsManagement?.management;
      const recordedWorkflows = existing?.disabledWorkflows ?? [];
      const recordedRuleIds = existing?.disabledRuleIds ?? [];
      const previousSummary = normalizeSummary(existing?.lastSummary);

      // Keep whatever we could not re-enable recorded, so state only returns to
      // `running` once everything pause disabled is back on, and a later resume
      // retries only the leftovers.
      const stillDisabledWorkflows: Array<{ id: string; spaceId: string }> = [];
      if (mgmt) {
        for (const workflow of recordedWorkflows) {
          const resolved = await reEnableWorkflow(mgmt, workflow, request, failures);
          if (!resolved) {
            stillDisabledWorkflows.push(workflow);
          }
        }
      } else if (recordedWorkflows.length > 0) {
        failures.push({
          target: 'workflows',
          error: 'Workflows management plugin is not available',
        });
        stillDisabledWorkflows.push(...recordedWorkflows);
      }

      const stillDisabledRuleIds = await reEnableRules(request, recordedRuleIds, failures);

      const fullyResumed = stillDisabledWorkflows.length === 0 && stillDisabledRuleIds.length === 0;
      const nextState = fullyResumed ? 'running' : 'paused';

      // Incomplete resume keeps the original pause counts in lastSummary so the
      // settings callout still shows what Pause turned off; resume-time failures
      // replace partialFailures.
      const summary: SignificantEventsMaintenanceSummary = fullyResumed
        ? { ...emptySummary('running'), partialFailures: failures }
        : {
            state: 'paused',
            executionsCancelled: previousSummary?.executionsCancelled ?? 0,
            workflowsDisabled: previousSummary?.workflowsDisabled ?? stillDisabledWorkflows.length,
            rulesDisabled: previousSummary?.rulesDisabled ?? stillDisabledRuleIds.length,
            partialFailures: failures,
          };

      await writeState(soClient, {
        state: nextState,
        updatedAt: new Date().toISOString(),
        updatedBy,
        disabledWorkflows: stillDisabledWorkflows,
        disabledRuleIds: stillDisabledRuleIds,
        lastSummary: summary,
      });

      const reEnabledWorkflows = recordedWorkflows.length - stillDisabledWorkflows.length;
      const reEnabledRules = recordedRuleIds.length - stillDisabledRuleIds.length;
      const message = `Significant Events resume ${
        fullyResumed ? 'completed' : 'incomplete (still paused)'
      }: re-enabled ${reEnabledWorkflows} workflow(s) and ${reEnabledRules} rule(s), ${
        failures.length
      } failure(s)`;
      if (fullyResumed) {
        log.info(message);
      } else {
        logFailures(log, message, failures);
      }
      return summary;
    },

    async reassertPausedWorkflows({ request }) {
      const soClient = getSoClient(request);
      const existing = await readState(soClient);
      if (normalizeState(existing?.state) !== 'paused') {
        return;
      }

      const sweep = await runPauseSweep({
        request,
        previousWorkflows: existing?.disabledWorkflows ?? [],
        previousRuleIds: existing?.disabledRuleIds ?? [],
      });

      const previousSummary = normalizeSummary(existing?.lastSummary);
      const summary: SignificantEventsMaintenanceSummary = {
        state: 'paused',
        executionsCancelled:
          (previousSummary?.executionsCancelled ?? 0) + sweep.executionsCancelled,
        workflowsDisabled:
          (previousSummary?.workflowsDisabled ?? 0) + sweep.workflowsDisabledThisSweep,
        rulesDisabled: (previousSummary?.rulesDisabled ?? 0) + sweep.rulesDisabledThisSweep,
        partialFailures: sweep.failures,
      };

      await writeState(soClient, {
        state: 'paused',
        updatedAt: existing?.updatedAt ?? new Date().toISOString(),
        updatedBy: existing?.updatedBy,
        disabledWorkflows: sweep.disabledWorkflows,
        disabledRuleIds: sweep.disabledRuleIds,
        lastSummary: summary,
      });

      if (sweep.workflowsDisabledThisSweep > 0 || sweep.failures.length > 0) {
        logFailures(
          log,
          `Significant Events re-asserted pause after workflow install: disabled ${sweep.workflowsDisabledThisSweep} workflow(s), ${sweep.failures.length} failure(s)`,
          sweep.failures
        );
      }
    },

    async getStatus({ request }) {
      const soClient = getSoClient(request);
      const existing = await readState(soClient);
      if (!existing) {
        return { state: DEFAULT_MAINTENANCE_STATE };
      }
      return {
        state: normalizeState(existing.state),
        updatedAt: existing.updatedAt,
        updatedBy: existing.updatedBy,
        lastSummary: normalizeSummary(existing.lastSummary),
      };
    },
  };
};
