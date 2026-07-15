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
import { GLOBAL_WORKFLOW_SPACE_ID } from '@kbn/workflows/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { RulesClientApi } from '@kbn/alerting-v2-plugin/server';
import {
  SIGNIFICANT_EVENTS_DETECTION_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_DISCOVERY_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_INVESTIGATION_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_KI_FEATURES_IDENTIFICATION_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_KI_ONBOARDING_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_KI_QUERIES_GENERATION_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_MEMORY_CONSOLIDATION_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_MEMORY_CONVERSATION_SCRAPER_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_MEMORY_GAP_DETECTION_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_MEMORY_SYNTHESIS_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_ORCHESTRATOR_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_SCHEDULED_DETECTION_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_SCHEDULED_REVIEW_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_TRIAGE_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import type { StreamsServer } from '@kbn/streams-plugin/server/types';
import { LEGACY_CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID } from '../../../common/constants';
import type {
  SignificantEventsMaintenanceFailure,
  SignificantEventsMaintenanceStatus,
  SignificantEventsMaintenanceSummary,
} from '../../../common/maintenance/types';
import {
  DEFAULT_MAINTENANCE_STATE,
  isMaintenanceState,
} from '../../../common/maintenance/state_machine';
import type { GetScopedClients } from '../../routes/types';
import {
  SIGNIFICANT_EVENTS_MAINTENANCE_STATE_SO_ID,
  SIGNIFICANT_EVENTS_MAINTENANCE_STATE_SO_TYPE,
  type SignificantEventsMaintenanceStateAttributes,
} from './saved_object';

type ManagementApi = WorkflowsServerPluginSetup['management'];

const RUNNING_EXECUTIONS_PAGE_SIZE = 1000;

/**
 * Workflows installed once at the global scope (`spaceId: '*'`). Their executions,
 * however, run in whichever space triggered them, so cancellation sweeps every space.
 */
const GLOBAL_WORKFLOW_IDS = [
  SIGNIFICANT_EVENTS_KI_FEATURES_IDENTIFICATION_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_KI_QUERIES_GENERATION_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_KI_ONBOARDING_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_DETECTION_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_DISCOVERY_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_TRIAGE_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_ORCHESTRATOR_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_INVESTIGATION_WORKFLOW_ID,
] as const;

/** Workflows installed in the default space (continuous onboarding, memory, legacy coordinator). */
const DEFAULT_SPACE_WORKFLOW_IDS = [
  SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_MEMORY_SYNTHESIS_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_MEMORY_CONSOLIDATION_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_MEMORY_CONVERSATION_SCRAPER_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_MEMORY_GAP_DETECTION_WORKFLOW_ID,
  LEGACY_CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID,
] as const;

/** Scheduled discovery workflows installed per space with a `-${spaceId}` document suffix. */
const SCHEDULED_WORKFLOW_IDS = [
  SIGNIFICANT_EVENTS_SCHEDULED_DETECTION_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_SCHEDULED_REVIEW_WORKFLOW_ID,
] as const;

interface WorkflowTarget {
  documentId: string;
  spaceId: string;
}

/**
 * Pauses and resumes all Significant Events background activity from a single
 * synchronous call each. Pause is a control-plane action: it issues workflow
 * cancellations and disables directly from the request handler rather than
 * enqueuing a workflow execution, so it takes effect immediately instead of
 * queuing behind the very executions it is meant to stop. Both operations are
 * idempotent and persist the resulting state (and a summary) for the UI.
 */
export interface SignificantEventsMaintenanceService {
  /** Read the persisted maintenance state. */
  getStatus(params: { request: KibanaRequest }): Promise<SignificantEventsMaintenanceStatus>;
  /**
   * Disable every managed workflow across spaces, cancel their in-flight
   * executions, and disable the alerting rules backing knowledge indicator
   * queries. Records what it disabled so resume can re-enable exactly that.
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
}

const toMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

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
    failures: fatalErrors.map((error) => ({ target: `rule:${error.id}`, error: error.error.message })),
  };
};

/** Normalise a persisted (possibly newer/unknown) state string to a known state. */
const normalizeState = (raw: string | undefined) =>
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

  const buildDisableTargets = (spaceIds: string[]): WorkflowTarget[] => [
    ...GLOBAL_WORKFLOW_IDS.map((documentId) => ({
      documentId,
      spaceId: GLOBAL_WORKFLOW_SPACE_ID,
    })),
    ...DEFAULT_SPACE_WORKFLOW_IDS.map((documentId) => ({ documentId, spaceId: DEFAULT_SPACE_ID })),
    ...spaceIds.flatMap((spaceId) =>
      SCHEDULED_WORKFLOW_IDS.map((id) => ({ documentId: `${id}-${spaceId}`, spaceId }))
    ),
  ];

  const buildCancelTargets = (spaceIds: string[]): WorkflowTarget[] => [
    ...spaceIds.flatMap((spaceId) =>
      GLOBAL_WORKFLOW_IDS.map((documentId) => ({ documentId, spaceId }))
    ),
    ...DEFAULT_SPACE_WORKFLOW_IDS.map((documentId) => ({ documentId, spaceId: DEFAULT_SPACE_ID })),
    ...spaceIds.flatMap((spaceId) =>
      SCHEDULED_WORKFLOW_IDS.map((id) => ({ documentId: `${id}-${spaceId}`, spaceId }))
    ),
  ];

  const disableWorkflow = async (
    mgmt: ManagementApi,
    { documentId, spaceId }: WorkflowTarget,
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
    { documentId, spaceId }: WorkflowTarget,
    request: KibanaRequest,
    failures: SignificantEventsMaintenanceFailure[]
  ): Promise<number> => {
    try {
      let cancelled = 0;
      // Page forward through the backlog rather than re-querying page 1: a
      // just-cancelled execution can still report a non-terminal status on the
      // next read, so re-querying could loop. `total` bounds the sweep.
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
        // Best-effort: fire cancellations without draining/awaiting termination,
        // but only count the ones that were actually accepted.
        const outcomes = await Promise.all(
          results.map((execution) =>
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
        cancelled += outcomes.filter(Boolean).length;
        if (
          results.length < RUNNING_EXECUTIONS_PAGE_SIZE ||
          page * RUNNING_EXECUTIONS_PAGE_SIZE >= total
        ) {
          break;
        }
      }
      return cancelled;
    } catch (error) {
      failures.push({ target: `executions:${documentId}@${spaceId}`, error: toMessage(error) });
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

  return {
    async pause({ request, updatedBy }) {
      const soClient = getSoClient(request);
      const existing = await readState(soClient);

      // Idempotent: already paused → return the recorded summary, no further changes.
      if (normalizeState(existing?.state) === 'paused') {
        return normalizeSummary(existing?.lastSummary) ?? emptySummary('paused');
      }

      const failures: SignificantEventsMaintenanceFailure[] = [];
      const mgmt = server.workflowsManagement?.management;
      const disabledWorkflows: WorkflowTarget[] = [];
      let executionsCancelled = 0;

      if (mgmt) {
        const spaceIds = await getAllSpaceIds(request, failures);
        for (const target of buildDisableTargets(spaceIds)) {
          if (await disableWorkflow(mgmt, target, request, failures)) {
            disabledWorkflows.push(target);
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

      const disabledRuleIds = await disableBackedRules(request, failures);

      const summary: SignificantEventsMaintenanceSummary = {
        state: 'paused',
        executionsCancelled,
        workflowsDisabled: disabledWorkflows.length,
        rulesDisabled: disabledRuleIds.length,
        partialFailures: failures,
      };

      await writeState(soClient, {
        state: 'paused',
        updatedAt: new Date().toISOString(),
        updatedBy,
        disabledWorkflows: disabledWorkflows.map(({ documentId, spaceId }) => ({
          id: documentId,
          spaceId,
        })),
        disabledRuleIds,
        lastSummary: summary,
      });

      const message = `Significant Events paused: disabled ${summary.workflowsDisabled} workflow(s) and ${summary.rulesDisabled} rule(s), cancelled ${summary.executionsCancelled} execution(s), ${failures.length} failure(s)`;
      if (failures.length > 0) {
        log.warn(message);
      } else {
        log.info(message);
      }
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

      const fullyResumed =
        stillDisabledWorkflows.length === 0 && stillDisabledRuleIds.length === 0;
      const nextState = fullyResumed ? 'running' : 'paused';

      // Resume only flips `enabled` back on for what pause recorded, so the
      // disable/cancel counts are zero; failures (if any) are still surfaced.
      const summary: SignificantEventsMaintenanceSummary = {
        ...emptySummary(nextState),
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
        log.warn(message);
      }
      return summary;
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
