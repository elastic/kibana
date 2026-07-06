/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import { NonTerminalExecutionStatuses } from '@kbn/workflows';
import type { PluginScopedManagedWorkflowsApi } from '@kbn/workflows/server/types';
import {
  SIGNIFICANT_EVENTS_SCHEDULED_DETECTION_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_SCHEDULED_REVIEW_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { pollUntil } from './poll_until';

const RUNNING_EXECUTIONS_PAGE_SIZE = 1000;

export interface SignificantEventsScheduledWorkflowsConfig {
  detectionIntervalMinutes: number;
  reviewIntervalMinutes: number;
  discoveryBatchSize: number;
  triageBatchSize: number;
  maxReviewPasses: number;
}

export interface SignificantEventsScheduledWorkflowsService {
  /**
   * Reconciles scheduled Significant Events workflows for one Kibana space.
   *
   * - Enabling installs or updates the two per-space managed workflows, then
   *   enables them so Task Manager schedules their triggers.
   * - Updating while enabled re-renders the managed workflow templates with the
   *   new cadence and batch values, preserving enablement.
   * - Disabling disables both workflows, cancels non-terminal scheduled
   *   wrapper executions in that space, and uninstalls the per-space dynamic
   *   workflow instances.
   */
  ensureWorkflow(params: {
    enabled: boolean;
    request: KibanaRequest;
    spaceId: string;
    config: SignificantEventsScheduledWorkflowsConfig;
  }): Promise<void>;
}

export const createSignificantEventsScheduledWorkflowsService = ({
  logger,
  managementApi,
  getManagedWorkflowsClient,
}: {
  logger: Logger;
  managementApi: WorkflowsServerPluginSetup['management'];
  getManagedWorkflowsClient: () => Promise<PluginScopedManagedWorkflowsApi>;
}): SignificantEventsScheduledWorkflowsService => {
  const log = logger.get('significant-events-scheduled-workflows');

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
        size: RUNNING_EXECUTIONS_PAGE_SIZE,
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

    log.debug(
      () =>
        `Requested cancellation for ${results.length} running scheduled Significant Events execution(s)`
    );

    await pollUntil(
      () => getNonTerminalExecutions({ workflowId, spaceId }),
      ({ total }) => total === 0
    );
  };

  const installOrUpdate = async ({
    client,
    spaceId,
    config,
  }: {
    client: PluginScopedManagedWorkflowsApi;
    spaceId: string;
    config: SignificantEventsScheduledWorkflowsConfig;
  }) => {
    await Promise.all([
      client.install(SIGNIFICANT_EVENTS_SCHEDULED_DETECTION_WORKFLOW_ID, {
        spaceId,
        values: {
          detectionIntervalMinutes: config.detectionIntervalMinutes,
        },
      }),
      client.install(SIGNIFICANT_EVENTS_SCHEDULED_REVIEW_WORKFLOW_ID, {
        spaceId,
        values: {
          reviewIntervalMinutes: config.reviewIntervalMinutes,
          discoveryBatchSize: config.discoveryBatchSize,
          triageBatchSize: config.triageBatchSize,
          maxReviewPasses: config.maxReviewPasses,
        },
      }),
    ]);
  };

  const setManagedEnabled = async ({
    workflowId,
    enabled,
    request,
    spaceId,
  }: {
    workflowId: string;
    enabled: boolean;
    request: KibanaRequest;
    spaceId: string;
  }) => {
    const existing = await managementApi.getWorkflow(workflowId, spaceId);

    if (!existing) {
      if (enabled) {
        throw new Error(`Managed scheduled Significant Events workflow ${workflowId} is missing`);
      }
      return;
    }

    if ((existing.enabled ?? false) === enabled) {
      return;
    }

    await managementApi.updateWorkflow(workflowId, { enabled }, spaceId, request);
  };

  const setAllEnabled = async ({
    enabled,
    request,
    spaceId,
  }: {
    enabled: boolean;
    request: KibanaRequest;
    spaceId: string;
  }) => {
    await Promise.all(
      [
        SIGNIFICANT_EVENTS_SCHEDULED_DETECTION_WORKFLOW_ID,
        SIGNIFICANT_EVENTS_SCHEDULED_REVIEW_WORKFLOW_ID,
      ].map((workflowId) => setManagedEnabled({ workflowId, enabled, request, spaceId }))
    );
  };

  const cancelRunningScheduledExecutions = async ({
    request,
    spaceId,
  }: {
    request: KibanaRequest;
    spaceId: string;
  }) => {
    await Promise.all(
      [
        SIGNIFICANT_EVENTS_SCHEDULED_DETECTION_WORKFLOW_ID,
        SIGNIFICANT_EVENTS_SCHEDULED_REVIEW_WORKFLOW_ID,
      ].map((workflowId) =>
        cancelAndAwaitTermination({ workflowId, spaceId, request }).catch((err) =>
          log.warn(`Failed to cancel running scheduled Significant Events executions: ${err}`)
        )
      )
    );
  };

  const uninstallScheduledWorkflows = async ({
    client,
    spaceId,
  }: {
    client: PluginScopedManagedWorkflowsApi;
    spaceId: string;
  }) => {
    await Promise.all([
      client.uninstall(SIGNIFICANT_EVENTS_SCHEDULED_DETECTION_WORKFLOW_ID, { spaceId }),
      client.uninstall(SIGNIFICANT_EVENTS_SCHEDULED_REVIEW_WORKFLOW_ID, { spaceId }),
    ]);
  };

  return {
    async ensureWorkflow({ enabled, request, spaceId, config }) {
      const client = await getManagedWorkflowsClient();

      if (enabled) {
        await installOrUpdate({ client, spaceId, config });
        await setAllEnabled({ enabled: true, request, spaceId });
        log.info(`Enabled scheduled Significant Events discovery workflows in space ${spaceId}`);
        return;
      }

      await setAllEnabled({ enabled: false, request, spaceId });
      await cancelRunningScheduledExecutions({ request, spaceId });
      await uninstallScheduledWorkflows({ client, spaceId });
      log.info(
        `Disabled and uninstalled scheduled Significant Events discovery workflows in space ${spaceId}`
      );
    },
  };
};
