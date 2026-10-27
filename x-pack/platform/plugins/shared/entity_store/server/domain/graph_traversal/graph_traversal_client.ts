/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type {
  WorkflowDetailDto,
  WorkflowExecutionDto,
  WorkflowExecutionEngineModel,
} from '@kbn/workflows';
import { ExecutionStatus, isTerminalStatus, toWorkflowExecutionEngineModel } from '@kbn/workflows';
import type { GraphTraversalOutput, RunGraphTraversalResponse } from '../../../common';
import { GraphTraversalError } from './graph_traversal_error';

/**
 * The slice of the workflows management API this client needs. Declared here rather than
 * imported from the workflows plugin because that plugin is a runtime dependency only
 * (a static dependency would be circular).
 */
export interface GraphTraversalWorkflowRunner {
  getWorkflow(
    workflowId: string,
    spaceId: string,
    request: KibanaRequest
  ): Promise<WorkflowDetailDto | null>;
  runWorkflow(
    workflow: WorkflowExecutionEngineModel,
    spaceId: string,
    inputs: Record<string, unknown>,
    request: KibanaRequest,
    triggeredBy?: string
  ): Promise<string>;
  getWorkflowExecution(
    workflowExecutionId: string,
    spaceId: string,
    options: { includeOutput?: boolean; request: KibanaRequest }
  ): Promise<WorkflowExecutionDto | null>;
  cancelWorkflowExecution(
    workflowExecutionId: string,
    spaceId: string,
    request: KibanaRequest
  ): Promise<void>;
}

export const GRAPH_TRAVERSAL_TRIGGERED_BY = 'entity_store_graph_traversal';

export const DEFAULT_GRAPH_TRAVERSAL_TIMEOUT_MS = 5 * 60 * 1000;
export const DEFAULT_GRAPH_TRAVERSAL_POLL_INTERVAL_MS = 1_000;

export interface GraphTraversalClientDeps {
  logger: Logger;
  namespace: string;
  getWorkflowsManagement: () => Promise<GraphTraversalWorkflowRunner | undefined>;
  pollIntervalMs?: number;
  sleep?: (ms: number) => Promise<void>;
}

export interface RunGraphTraversalParams {
  workflowId: string;
  inputs: Record<string, unknown>;
  request: KibanaRequest;
  timeoutMs?: number;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Runs the entity graph traversal managed workflow and waits for it to finish, returning its
 * output. Synchronous by design for now: the caller holds the request open while the
 * workflow runs, and a run that outlives `timeoutMs` is cancelled.
 */
export class GraphTraversalClient {
  private readonly logger: Logger;
  private readonly namespace: string;
  private readonly getWorkflowsManagement: GraphTraversalClientDeps['getWorkflowsManagement'];
  private readonly pollIntervalMs: number;
  private readonly sleep: (ms: number) => Promise<void>;

  constructor({
    logger,
    namespace,
    getWorkflowsManagement,
    pollIntervalMs = DEFAULT_GRAPH_TRAVERSAL_POLL_INTERVAL_MS,
    sleep = defaultSleep,
  }: GraphTraversalClientDeps) {
    this.logger = logger;
    this.namespace = namespace;
    this.getWorkflowsManagement = getWorkflowsManagement;
    this.pollIntervalMs = pollIntervalMs;
    this.sleep = sleep;
  }

  public async run({
    workflowId,
    inputs,
    request,
    timeoutMs = DEFAULT_GRAPH_TRAVERSAL_TIMEOUT_MS,
  }: RunGraphTraversalParams): Promise<RunGraphTraversalResponse> {
    const workflowsManagement = await this.getWorkflowsManagement();
    if (!workflowsManagement) {
      throw new GraphTraversalError('Workflows management is not available', 503);
    }

    const workflow = await workflowsManagement.getWorkflow(workflowId, this.namespace, request);
    if (!workflow) {
      throw new GraphTraversalError(
        `Graph traversal workflow "${workflowId}" is not installed in space "${this.namespace}"`,
        404
      );
    }
    if (!workflow.enabled || !workflow.valid || !workflow.definition) {
      throw new GraphTraversalError(
        `Graph traversal workflow "${workflowId}" is disabled or invalid`,
        409
      );
    }

    const startedAt = Date.now();
    const executionId = await workflowsManagement.runWorkflow(
      toWorkflowExecutionEngineModel(workflow),
      this.namespace,
      inputs,
      request,
      GRAPH_TRAVERSAL_TRIGGERED_BY
    );
    this.logger.debug(
      `Graph traversal workflow "${workflowId}" started execution ${executionId} in space "${this.namespace}"`
    );

    const deadline = startedAt + timeoutMs;
    const cancel = () =>
      workflowsManagement
        .cancelWorkflowExecution(executionId, this.namespace, request)
        .catch((error) => {
          this.logger.warn(`Failed to cancel graph traversal execution ${executionId}: ${error}`);
        });

    while (true) {
      let execution: WorkflowExecutionDto | null = null;
      try {
        execution = await workflowsManagement.getWorkflowExecution(executionId, this.namespace, {
          includeOutput: true,
          request,
        });
      } catch (error) {
        // Reads can fail transiently right after the run starts; keep polling until the deadline.
        this.logger.debug(`Polling graph traversal execution ${executionId} failed: ${error}`);
      }

      if (execution && isTerminalStatus(execution.status)) {
        return toResponse(execution, Date.now() - startedAt);
      }
      if (execution?.status === ExecutionStatus.WAITING_FOR_INPUT) {
        await cancel();
        throw new GraphTraversalError(
          `Graph traversal execution ${executionId} paused for input; traversal workflows must run unattended`,
          500
        );
      }
      if (Date.now() >= deadline) {
        await cancel();
        throw new GraphTraversalError(
          `Graph traversal execution ${executionId} did not finish within ${Math.round(
            timeoutMs / 1000
          )}s and was cancelled`,
          504
        );
      }
      await this.sleep(this.pollIntervalMs);
    }
  }
}

const toResponse = (
  execution: WorkflowExecutionDto,
  durationMs: number
): RunGraphTraversalResponse => {
  const base = { execution_id: execution.id, status: execution.status, duration_ms: durationMs };
  if (execution.status === ExecutionStatus.COMPLETED) {
    const output = execution.context?.output;
    return { ...base, output: isGraphTraversalOutput(output) ? output : null };
  }
  return {
    ...base,
    output: null,
    error: execution.error?.message ?? `Workflow execution ended with status "${execution.status}"`,
  };
};

const isGraphTraversalOutput = (value: unknown): value is GraphTraversalOutput =>
  typeof value === 'object' &&
  value !== null &&
  Array.isArray((value as { nodes?: unknown }).nodes) &&
  Array.isArray((value as { edges?: unknown }).edges);
