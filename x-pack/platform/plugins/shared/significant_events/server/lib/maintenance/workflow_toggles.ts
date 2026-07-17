/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { RulesClientApi } from '@kbn/alerting-v2-plugin/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { SignificantEventsMaintenanceFailure } from '../../../common/maintenance/types';
import type { GetScopedClients } from '../../routes/types';
import type { MaintenanceWorkflowTarget } from './managed_workflow_targets';
import { toMessage } from './to_message';

type ManagementApi = WorkflowsServerPluginSetup['management'];

/**
 * Toggle `enabled` on a set of alerting v2 signal rules. Rule pause/resume
 * targets the v2 engine only (v1 is being removed in a follow-up). Returns the
 * ids that were actually toggled (no error), the ids that failed for a non-404
 * reason, and one failure entry per fatal id. A 404 is treated as "already
 * gone" and reported as neither toggled nor failed.
 */
export const setV2RulesEnabled = async (
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

/** Disable a single workflow; returns whether it was disabled by this call. */
export const disableWorkflow = async (
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

/** Re-enable a single workflow; returns whether it no longer needs re-enabling. */
export const reEnableWorkflow = async (
  mgmt: ManagementApi,
  { id, spaceId }: MaintenanceWorkflowTarget,
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

/**
 * Disable the alerting v2 rules backing knowledge-indicator queries. Returns the
 * ids actually disabled, so resume re-enables exactly those. Blanket re-enable
 * on resume is intentional: if a user had manually disabled a backed rule before
 * pause, resume turns it back on (asymmetric with workflows, which only record
 * what pause itself disabled).
 */
export const disableBackedRules = async ({
  getScopedClients,
  request,
  failures,
}: {
  getScopedClients: GetScopedClients;
  request: KibanaRequest;
  failures: SignificantEventsMaintenanceFailure[];
}): Promise<string[]> => {
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
    return toggledIds;
  } catch (error) {
    failures.push({ target: 'rules', error: toMessage(error) });
    return [];
  }
};

/** Re-enable the recorded rules; returns the ids that could not be re-enabled. */
export const reEnableRules = async ({
  getScopedClients,
  request,
  ruleIds,
  failures,
}: {
  getScopedClients: GetScopedClients;
  request: KibanaRequest;
  ruleIds: string[];
  failures: SignificantEventsMaintenanceFailure[];
}): Promise<string[]> => {
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
