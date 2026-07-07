/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { NonTerminalExecutionStatuses } from '@kbn/workflows';
import { SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID } from '@kbn/workflows/managed';
import { LEGACY_CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID } from '../../../common/constants';
import type { StreamsKIsOnboardingClient } from './onboarding_workflow_client';
import { pollUntil } from './poll_until';

// The managed continuous onboarding workflow is installed and scheduled in the
// default space so its executions (and the onboarding executions it triggers)
// are stored there, matching the legacy workflow's original space.
const MANAGED_WORKFLOW_SPACE_ID = DEFAULT_SPACE_ID;
// The legacy (pre-migration) workflow was always created in the default space.
const LEGACY_WORKFLOW_SPACE_ID = DEFAULT_SPACE_ID;

export interface ContinuousKiOnboardingWorkflowService {
  /**
   * Reconciles the continuous onboarding workflow when the user toggles the
   * feature on or off.
   *
   * - Enabling only enables the managed workflow (which schedules its trigger).
   *   The legacy normal workflow is never created again.
   * - Disabling deletes the legacy workflow if it is still present (users who had
   *   the feature enabled before the migration keep running on it until then),
   *   disables the managed workflow, and cancels any in-flight executions.
   *
   * Should be invoked only on an actual enabled-state transition so the legacy
   * and managed workflows never run at the same time.
   */
  ensureWorkflow(params: { enabled: boolean; request: KibanaRequest }): Promise<void>;
}

export const createContinuousKiOnboardingWorkflowService = ({
  logger,
  managementApi,
  streamsKIsOnboardingClient,
}: {
  logger: Logger;
  managementApi: WorkflowsServerPluginSetup['management'];
  streamsKIsOnboardingClient: StreamsKIsOnboardingClient;
}): ContinuousKiOnboardingWorkflowService => {
  const log = logger.get('continuous-ki-onboarding-workflow');

  const getNonTerminalExecutions = async ({
    workflowId,
    spaceId,
  }: {
    workflowId: string;
    spaceId: string;
  }) => {
    const { results, total } = await managementApi.getWorkflowExecutions(
      {
        workflowId,
        statuses: [...NonTerminalExecutionStatuses],
      },
      spaceId
    );
    return { results, total };
  };

  const cancelAndAwaitTermination = async ({
    workflowId,
    spaceId,
    request,
  }: {
    workflowId: string;
    spaceId: string;
    request: KibanaRequest;
  }) => {
    const { results } = await getNonTerminalExecutions({ workflowId, spaceId });
    if (results.length === 0) {
      return;
    }

    await Promise.all(
      results.map((result) => managementApi.cancelWorkflowExecution(result.id, spaceId, request))
    );

    log.debug(() => `Requested cancellation for ${results.length} running workflow execution(s)`);

    await pollUntil(
      () => getNonTerminalExecutions({ workflowId, spaceId }),
      ({ total }) => total === 0
    );
  };

  const setManagedEnabled = async ({
    enabled,
    request,
  }: {
    enabled: boolean;
    request: KibanaRequest;
  }) => {
    const existing = await managementApi.getWorkflow(
      SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID,
      MANAGED_WORKFLOW_SPACE_ID
    );

    if (!existing) {
      if (enabled) {
        throw new Error(
          `Managed continuous onboarding workflow ${SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID} is not installed yet`
        );
      }
      return;
    }

    if ((existing.enabled ?? false) === enabled) {
      return;
    }

    await managementApi.updateWorkflow(
      SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID,
      { enabled },
      MANAGED_WORKFLOW_SPACE_ID,
      request
    );
  };

  const deleteLegacyWorkflow = async ({ request }: { request: KibanaRequest }) => {
    const legacy = await managementApi.getWorkflow(
      LEGACY_CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID,
      LEGACY_WORKFLOW_SPACE_ID
    );
    if (!legacy) {
      return;
    }

    log.info(
      `Found legacy continuous KI extraction workflow ${LEGACY_CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID}, removing it`
    );

    await cancelAndAwaitTermination({
      workflowId: LEGACY_CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID,
      spaceId: LEGACY_WORKFLOW_SPACE_ID,
      request,
    }).catch((err) => log.warn(`Failed to cancel legacy workflow executions: ${err}`));

    const { deleted, failures } = await managementApi.deleteWorkflows(
      [LEGACY_CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID],
      LEGACY_WORKFLOW_SPACE_ID,
      request,
      { force: true }
    );

    if (deleted === 0 && failures.length > 0) {
      const reasons = failures.map((f) => `${f.id}: ${f.error}`).join('; ');
      throw new Error(
        `Failed to delete legacy workflow ${LEGACY_CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID}: ${reasons}`
      );
    }

    log.info(`Deleted legacy workflow ${LEGACY_CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID}`);
  };

  return {
    async ensureWorkflow({ enabled, request }) {
      if (enabled) {
        await setManagedEnabled({ enabled: true, request });
        log.info(`Enabled continuous KI onboarding workflow`);
        return;
      }

      // Disabling: retire the legacy workflow first so a delete failure does not
      // leave managed disabled while legacy is still present. Then stop
      // scheduling new managed runs and drain in-flight work.
      await deleteLegacyWorkflow({ request });

      await setManagedEnabled({ enabled: false, request });

      await cancelAndAwaitTermination({
        workflowId: SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID,
        spaceId: MANAGED_WORKFLOW_SPACE_ID,
        request,
      }).catch((err) =>
        log.warn(`Failed to cancel running continuous onboarding executions: ${err}`)
      );

      await streamsKIsOnboardingClient
        .cancelAllRunning({ request })
        .catch((err) => log.warn(`Failed to cancel running onboarding workflows: ${err}`));

      log.info(`Disabled continuous KI onboarding workflow`);
    },
  };
};
