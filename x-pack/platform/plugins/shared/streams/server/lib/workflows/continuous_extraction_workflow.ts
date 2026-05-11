/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import { NonTerminalExecutionStatuses } from '@kbn/workflows';
import {
  STREAMS_KI_CONTINUOUS_EXTRACTION_WORKFLOW_ID,
  STREAMS_KI_ONBOARDING_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import { LEGACY_CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID } from '../../../common/constants';
import { pollUntil } from './poll_until';
import type { WorkflowsManagementApi } from './workflow_execution_client';

export class ContinuousKiExtractionWorkflowService {
  private readonly log: Logger;
  private readonly managementApi: WorkflowsManagementApi;
  private legacyWorkflowMigrated = false;
  private migrationInProgress = false;

  constructor(logger: Logger, managementApi: WorkflowsManagementApi) {
    this.log = logger.get('continuous-ki-extraction-workflow');
    this.managementApi = managementApi;
  }

  /**
   * Run the one-time legacy workflow migration at startup using a fake
   * request. Safe to call fire-and-forget — errors are logged, not thrown.
   */
  async migrateLegacyWorkflowAtStartup(fakeRequest: KibanaRequest): Promise<void> {
    const legacyWasEnabled = await this.migrateLegacyWorkflow(fakeRequest);

    if (legacyWasEnabled) {
      await this.managementApi.updateWorkflow(
        STREAMS_KI_CONTINUOUS_EXTRACTION_WORKFLOW_ID,
        { enabled: true },
        DEFAULT_SPACE_ID,
        fakeRequest
      );
      this.log.info(
        `Enabled managed continuous extraction workflow ${STREAMS_KI_CONTINUOUS_EXTRACTION_WORKFLOW_ID} (inherited from legacy)`
      );
    }
  }

  async ensureWorkflow({
    enabled,
    request,
  }: {
    enabled: boolean;
    request: KibanaRequest;
  }): Promise<void> {
    await this.migrateLegacyWorkflow(request);

    const existing = await this.managementApi.getWorkflow(
      STREAMS_KI_CONTINUOUS_EXTRACTION_WORKFLOW_ID,
      DEFAULT_SPACE_ID
    );

    if (!existing) {
      this.log.warn('Managed continuous extraction workflow not found; skipping toggle');
      return;
    }

    if (existing.enabled === enabled) {
      this.log.debug(() => `Workflow already ${enabled ? 'enabled' : 'disabled'}, no-op`);
      return;
    }

    if (!enabled) {
      await this.cancelAndAwaitTermination(STREAMS_KI_CONTINUOUS_EXTRACTION_WORKFLOW_ID).catch(
        (err) => this.log.warn(`Failed to cancel running workflow executions: ${err}`)
      );
    }

    await this.managementApi.updateWorkflow(
      STREAMS_KI_CONTINUOUS_EXTRACTION_WORKFLOW_ID,
      { enabled },
      DEFAULT_SPACE_ID,
      request
    );

    this.log.info(
      `${
        enabled ? 'Enabled' : 'Disabled'
      } managed continuous extraction workflow ${STREAMS_KI_CONTINUOUS_EXTRACTION_WORKFLOW_ID}`
    );
  }

  /**
   * One-time migration: cancel executions and delete the legacy non-managed
   * workflow if it still exists. Returns the legacy workflow's enabled state
   * so the caller can transfer it to the new managed workflow.
   */
  private async migrateLegacyWorkflow(request: KibanaRequest): Promise<boolean | undefined> {
    if (this.legacyWorkflowMigrated || this.migrationInProgress) {
      return undefined;
    }
    this.migrationInProgress = true;

    try {
      const existing = await this.managementApi.getWorkflow(
        LEGACY_CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID,
        DEFAULT_SPACE_ID
      );

      if (!existing) {
        this.legacyWorkflowMigrated = true;
        return undefined;
      }

      const legacyWasEnabled = existing.enabled;

      this.log.info(
        `Found legacy continuous extraction workflow ${LEGACY_CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID} (enabled=${legacyWasEnabled}), migrating...`
      );

      await this.cancelAndAwaitTermination(LEGACY_CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID).catch(
        (err) => this.log.warn(`Failed to cancel running legacy workflow executions: ${err}`)
      );

      const { deleted, failures } = await this.managementApi.deleteWorkflows(
        [LEGACY_CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID],
        DEFAULT_SPACE_ID,
        request,
        { force: true }
      );

      if (deleted === 0 && failures.length > 0) {
        const reasons = failures.map((f) => `${f.id}: ${f.error}`).join('; ');
        this.log.error(
          `Failed to delete legacy workflow ${LEGACY_CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID}: ${reasons}`
        );
        return undefined;
      }

      this.legacyWorkflowMigrated = true;

      this.log.info(
        `Migrated legacy continuous extraction workflow ${LEGACY_CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID}`
      );

      return legacyWasEnabled;
    } finally {
      this.migrationInProgress = false;
    }
  }

  private async getNonTerminalExecutions(workflowId: string) {
    const { results, total } = await this.managementApi.getWorkflowExecutions(
      { workflowId, statuses: [...NonTerminalExecutionStatuses] },
      DEFAULT_SPACE_ID
    );
    return { results, total };
  }

  private async cancelChildOnboardingWorkflows(parentWorkflowId: string): Promise<void> {
    const { results } = await this.managementApi.getWorkflowExecutions(
      {
        workflowId: STREAMS_KI_ONBOARDING_WORKFLOW_ID,
        statuses: [...NonTerminalExecutionStatuses],
        omitStepRuns: true,
        size: 50,
      },
      DEFAULT_SPACE_ID
    );

    if (results.length === 0) {
      return;
    }

    const executionsWithParent = await Promise.all(
      results.map(async (item) => {
        const full = await this.managementApi.getWorkflowExecution(item.id, DEFAULT_SPACE_ID, {
          includeOutput: true,
        });
        return { id: item.id, isChild: full?.context?.parentWorkflowId === parentWorkflowId };
      })
    );

    const toCancel = executionsWithParent.filter(({ isChild }) => isChild).map(({ id }) => id);

    if (toCancel.length > 0) {
      await Promise.all(
        toCancel.map((id) => this.managementApi.cancelWorkflowExecution(id, DEFAULT_SPACE_ID))
      );
      this.log.debug(
        () =>
          `Cancelled ${toCancel.length} onboarding workflow(s) triggered by continuous extraction`
      );
    }
  }

  private async cancelAndAwaitTermination(workflowId: string): Promise<void> {
    const { results } = await this.getNonTerminalExecutions(workflowId);
    if (results.length === 0) {
      return;
    }

    await Promise.all([
      ...results.map((result) =>
        this.managementApi.cancelWorkflowExecution(result.id, DEFAULT_SPACE_ID)
      ),
      this.cancelChildOnboardingWorkflows(workflowId).catch((err) =>
        this.log.warn(`Failed to cancel child onboarding workflows: ${err}`)
      ),
    ]);

    this.log.debug(
      () => `Requested cancellation for ${results.length} running workflow execution(s)`
    );

    await pollUntil(
      () => this.getNonTerminalExecutions(workflowId),
      ({ total }) => total === 0
    );
  }
}
