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

const SCHEDULED_WORKFLOW_IDS = [
  SIGNIFICANT_EVENTS_SCHEDULED_DETECTION_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_SCHEDULED_REVIEW_WORKFLOW_ID,
] as const;

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

  // Managed workflow document ids are global at the storage layer (the document
  // carries a `spaceId` field for filtering, but the id itself is not namespaced
  // by space). Installing the same managed workflow in more than one space would
  // therefore collide on a single shared document and fail with an OCC
  // "updated concurrently" error. Disambiguate per space with `workflowIdSuffix`
  // so each space gets its own `${managedWorkflowId}-${spaceId}` document, and
  // reference that same id for every enable/execution operation below.
  const getWorkflowDocumentId = (managedWorkflowId: string, spaceId: string) =>
    `${managedWorkflowId}-${spaceId}`;

  const getNonTerminalExecutions = async ({
    documentId,
    spaceId,
  }: {
    documentId: string;
    spaceId: string;
  }) => {
    const { results, total } = await managementApi.getWorkflowExecutions(
      {
        workflowId: documentId,
        statuses: [...NonTerminalExecutionStatuses],
        size: RUNNING_EXECUTIONS_PAGE_SIZE,
      },
      spaceId
    );
    return { results, total };
  };

  const cancelAndAwaitTermination = async ({
    documentId,
    spaceId,
    request,
  }: {
    documentId: string;
    spaceId: string;
    request: KibanaRequest;
  }) => {
    const { results } = await getNonTerminalExecutions({ documentId, spaceId });
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
      () => getNonTerminalExecutions({ documentId, spaceId }),
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
        workflowIdSuffix: spaceId,
        values: {
          detectionIntervalMinutes: config.detectionIntervalMinutes,
        },
      }),
      client.install(SIGNIFICANT_EVENTS_SCHEDULED_REVIEW_WORKFLOW_ID, {
        spaceId,
        workflowIdSuffix: spaceId,
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
    documentId,
    enabled,
    request,
    spaceId,
  }: {
    documentId: string;
    enabled: boolean;
    request: KibanaRequest;
    spaceId: string;
  }) => {
    const existing = await managementApi.getWorkflow(documentId, spaceId);

    if (!existing) {
      if (enabled) {
        throw new Error(`Managed scheduled Significant Events workflow ${documentId} is missing`);
      }
      return;
    }

    if ((existing.enabled ?? false) === enabled) {
      return;
    }

    await managementApi.updateWorkflow(documentId, { enabled }, spaceId, request);
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
      SCHEDULED_WORKFLOW_IDS.map((workflowId) =>
        setManagedEnabled({
          documentId: getWorkflowDocumentId(workflowId, spaceId),
          enabled,
          request,
          spaceId,
        })
      )
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
      SCHEDULED_WORKFLOW_IDS.map((workflowId) =>
        cancelAndAwaitTermination({
          documentId: getWorkflowDocumentId(workflowId, spaceId),
          spaceId,
          request,
        }).catch((err) =>
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
      client.uninstall(SIGNIFICANT_EVENTS_SCHEDULED_DETECTION_WORKFLOW_ID, {
        spaceId,
        workflowIdSuffix: spaceId,
      }),
      client.uninstall(SIGNIFICANT_EVENTS_SCHEDULED_REVIEW_WORKFLOW_ID, {
        spaceId,
        workflowIdSuffix: spaceId,
      }),
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
