/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { ExecutionStatus, NonTerminalExecutionStatuses, isTerminalStatus } from '@kbn/workflows';
import type { WorkflowExecutionListItemDto } from '@kbn/workflows';
import { STREAMS_KI_ONBOARDING_WORKFLOW_ID } from '@kbn/workflows/managed';
import { GLOBAL_WORKFLOW_SPACE_ID } from '@kbn/workflows/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { OnboardingStatus, type OnboardingStatusResult } from '@kbn/streams-schema';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';

/**
 * Inputs passed to the managed onboarding workflow (streams_ki/onboarding.yaml).
 * Required fields drive the two main steps (features identification and queries
 * generation); optional fields override tuning knobs that default inside the YAML.
 */
export interface OnboardingWorkflowInputs {
  streamName: string;
  skipFeatures: boolean;
  skipQueries: boolean;
  featuresStart: number;
  featuresEnd: number;
  featuresConnectorId?: string;
  queriesConnectorId?: string;
  featuresMaxIterations?: number;
  featuresSampleSize?: number;
  featuresTtlDays?: number;
  featuresEntityFilteredRatio?: number;
  featuresDiverseRatio?: number;
  featuresMaxExcludedInPrompt?: number;
  featuresMaxEntityFilters?: number;
  featuresMaxPreviouslyIdentified?: number;
  featuresRecencyThresholdHours?: number;
}

/**
 * Shape of the `context.output` object produced by a completed onboarding
 * workflow execution. Used to extract summary counts for the status response.
 */
export interface OnboardingWorkflowOutput {
  streamName: string;
  featuresSkipped: boolean;
  featuresConnectorUsed: string;
  discoveredFeatures: unknown[];
  featuresTokensUsed: Record<string, unknown>;
  queriesSkipped: boolean;
  queriesConnectorUsed: string;
  persistedQueries: unknown[];
  queriesTokensUsed: Record<string, unknown>;
}

const ONBOARDING_EXECUTIONS_SPACE_ID = DEFAULT_SPACE_ID;

const CONCURRENCY_KEY_PREFIX = 'streams-ki-onboarding-';

/**
 * Builds the concurrency group key used to correlate workflow executions with
 * a specific stream. Must stay in sync with the `settings.concurrency.key`
 * template in the onboarding YAML definition.
 */
export const buildConcurrencyKey = (streamName: string) => `${CONCURRENCY_KEY_PREFIX}${streamName}`;

/** Extracts the stream name from a concurrency key, or returns null if the prefix doesn't match. */
export const parseStreamNameFromConcurrencyKey = (key: string): string | null => {
  if (!key.startsWith(CONCURRENCY_KEY_PREFIX)) {
    return null;
  }
  return key.slice(CONCURRENCY_KEY_PREFIX.length);
};

/** Maps a workflow engine execution status to the domain-level onboarding status. */
const mapExecutionToOnboardingStatus = (
  status: ExecutionStatus
):
  | OnboardingStatus.InProgress
  | OnboardingStatus.Completed
  | OnboardingStatus.Failed
  | OnboardingStatus.Canceled => {
  switch (status) {
    case ExecutionStatus.PENDING:
    case ExecutionStatus.RUNNING:
    case ExecutionStatus.WAITING:
    case ExecutionStatus.WAITING_FOR_INPUT:
    case ExecutionStatus.WAITING_FOR_CHILD:
      return OnboardingStatus.InProgress;
    case ExecutionStatus.COMPLETED:
      return OnboardingStatus.Completed;
    case ExecutionStatus.FAILED:
    case ExecutionStatus.TIMED_OUT:
      return OnboardingStatus.Failed;
    case ExecutionStatus.CANCELLED:
    case ExecutionStatus.SKIPPED:
      return OnboardingStatus.Canceled;
  }
};

/**
 * Converts a workflow execution (optionally enriched with `context.output`)
 * into the public {@link OnboardingStatusResult} shape returned by the API.
 * For completed executions the output is unpacked into summary counts;
 * for failures the error message is extracted.
 */
const mapExecutionToStatusResult = (
  execution: WorkflowExecutionListItemDto
): OnboardingStatusResult => {
  const onboardingStatus = mapExecutionToOnboardingStatus(execution.status);

  if (onboardingStatus === OnboardingStatus.Failed) {
    const errorMessage =
      execution.status === ExecutionStatus.TIMED_OUT
        ? 'Onboarding workflow timed out'
        : execution.error?.message ?? 'Unknown error';
    return { status: OnboardingStatus.Failed, error: errorMessage };
  }

  if (onboardingStatus === OnboardingStatus.Completed) {
    const ctx = (execution.context ?? {}) as { output?: Partial<OnboardingWorkflowOutput> };
    const output = ctx.output ?? {};
    return {
      status: OnboardingStatus.Completed,
      featuresSkipped: output.featuresSkipped === true,
      discoveredFeaturesCount: Array.isArray(output.discoveredFeatures)
        ? output.discoveredFeatures.length
        : 0,
      featuresConnectorUsed: output.featuresConnectorUsed ?? '',
      queriesSkipped: output.queriesSkipped === true,
      persistedQueriesCount: Array.isArray(output.persistedQueries)
        ? output.persistedQueries.length
        : 0,
      queriesConnectorUsed: output.queriesConnectorUsed ?? '',
    };
  }

  return { status: onboardingStatus };
};

// TODO: request collapse-by-concurrencyGroupKey and source filtering from the
// workflows team so we can fetch exactly 1 execution per stream with only the
// fields we need (status, startedAt, finishedAt, concurrencyGroupKey).
const MAX_EXECUTIONS_QUERY_SIZE = 2000;

/**
 * Client that wraps the workflows management API to provide a stream-centric
 * interface for running, querying, and canceling KI onboarding workflows.
 *
 * Each stream's onboarding execution is keyed by a concurrency group derived
 * from the stream name, so at most one onboarding run is active per stream.
 */
export class OnboardingWorkflowClient {
  private readonly managementApi: WorkflowsServerPluginSetup['management'];

  constructor({ managementApi }: { managementApi: WorkflowsServerPluginSetup['management'] }) {
    this.managementApi = managementApi;
  }

  /**
   * Triggers a new onboarding workflow execution for a stream.
   * Fetches the managed workflow definition from the global space and
   * runs it in the default space with the provided inputs.
   *
   * @throws If the managed onboarding workflow definition is not found.
   */
  async run({
    inputs,
    request,
  }: {
    inputs: OnboardingWorkflowInputs;
    request: KibanaRequest;
  }): Promise<void> {
    const workflow = await this.managementApi.getWorkflow(
      STREAMS_KI_ONBOARDING_WORKFLOW_ID,
      GLOBAL_WORKFLOW_SPACE_ID
    );

    if (!workflow || !workflow.definition) {
      throw new Error(`Onboarding workflow ${STREAMS_KI_ONBOARDING_WORKFLOW_ID} not found`);
    }

    await this.managementApi.runWorkflow(
      { ...workflow, definition: workflow.definition },
      ONBOARDING_EXECUTIONS_SPACE_ID,
      inputs,
      request
    );
  }

  /**
   * Returns the onboarding status for a stream by looking up its most recent
   * workflow execution via the concurrency group key.
   *
   * For completed executions a second fetch retrieves the full execution
   * context so output counts can be included in the result.
   */
  async getStatus({ streamName }: { streamName: string }): Promise<OnboardingStatusResult> {
    const { results } = await this.managementApi.getWorkflowExecutions(
      {
        workflowId: STREAMS_KI_ONBOARDING_WORKFLOW_ID,
        concurrencyGroupKey: buildConcurrencyKey(streamName),
        size: 1,
      },
      ONBOARDING_EXECUTIONS_SPACE_ID
    );

    if (results.length === 0) {
      return { status: OnboardingStatus.NotStarted };
    }

    const execution = results[0];

    if (execution.status === ExecutionStatus.COMPLETED) {
      const fullExecution = await this.managementApi.getWorkflowExecution(
        execution.id,
        ONBOARDING_EXECUTIONS_SPACE_ID,
        { includeOutput: true }
      );

      if (fullExecution) {
        return mapExecutionToStatusResult({
          ...execution,
          context: fullExecution.context,
        });
      }
    }

    return mapExecutionToStatusResult(execution);
  }

  /**
   * Cancels the latest non-terminal onboarding execution for a stream.
   * No-ops if no active execution exists or the latest execution already reached
   * a terminal state.
   */
  async cancel({
    streamName,
    request,
  }: {
    streamName: string;
    request: KibanaRequest;
  }): Promise<void> {
    const { results } = await this.managementApi.getWorkflowExecutions(
      {
        workflowId: STREAMS_KI_ONBOARDING_WORKFLOW_ID,
        concurrencyGroupKey: buildConcurrencyKey(streamName),
        size: 1,
      },
      ONBOARDING_EXECUTIONS_SPACE_ID
    );

    if (results.length > 0 && !isTerminalStatus(results[0].status)) {
      await this.managementApi.cancelWorkflowExecution(
        results[0].id,
        ONBOARDING_EXECUTIONS_SPACE_ID,
        request
      );
    }
  }

  /**
   * Cancels every non-terminal onboarding execution across all streams.
   * Used during teardown of the continuous KI extraction workflow.
   */
  async cancelAllRunning(): Promise<void> {
    const { results } = await this.managementApi.getWorkflowExecutions(
      {
        workflowId: STREAMS_KI_ONBOARDING_WORKFLOW_ID,
        statuses: [...NonTerminalExecutionStatuses],
      },
      ONBOARDING_EXECUTIONS_SPACE_ID
    );

    if (results.length === 0) {
      return;
    }

    await Promise.all(
      results.map((result) =>
        this.managementApi.cancelWorkflowExecution(result.id, ONBOARDING_EXECUTIONS_SPACE_ID)
      )
    );
  }

  /**
   * Returns up to {@link MAX_EXECUTIONS_QUERY_SIZE} most recent onboarding
   * executions sorted by creation date (newest first). Callers are responsible
   * for deduplicating by stream via the concurrency group key.
   */
  async getRecentExecutions(): Promise<WorkflowExecutionListItemDto[]> {
    const { results } = await this.managementApi.getWorkflowExecutions(
      {
        workflowId: STREAMS_KI_ONBOARDING_WORKFLOW_ID,
        size: MAX_EXECUTIONS_QUERY_SIZE,
        sortField: 'createdAt',
        sortOrder: 'desc',
      },
      ONBOARDING_EXECUTIONS_SPACE_ID
    );

    return results;
  }
}
