/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { EsWorkflow } from '@kbn/workflows';
import {
  ExecutionStatus,
  isTerminalStatus,
  toWorkflowExecutionEngineModel,
  WORKFLOW_STEP_TRIGGER_SOURCE,
} from '@kbn/workflows';
import type { StepExecutionRepository } from '../../../repositories/step_execution_repository';
import type { WorkflowExecutionRepository } from '../../../repositories/workflow_execution_repository';
import type { WorkflowsExecutionEnginePluginStart } from '../../../types';
import type { StepExecutionRuntime } from '../../../workflow_context_manager/step_execution_runtime';
import type { IWorkflowEventLogger } from '../../../workflow_event_logger';
import { buildChildEventChainContext } from '../build_child_event_chain_context';
import { buildChildLineageContext } from '../build_child_lineage_context';
import { buildChildFailureError, readChildExecutionOutput } from '../child_execution_result';
import type { StrategyResult } from '../types';

export type { StrategyResult } from '../types';

interface SubWorkflowWaitState extends Record<string, unknown> {
  workflowId: string;
  executionId: string;
  startedAt: string;
}

export class WorkflowExecuteSyncStrategy {
  constructor(
    private workflowsExecutionEngine: WorkflowsExecutionEnginePluginStart,
    private workflowExecutionRepository: WorkflowExecutionRepository,
    private stepExecutionRepository: StepExecutionRepository,
    private stepExecutionRuntime: StepExecutionRuntime,
    private workflowLogger: IWorkflowEventLogger
  ) {}

  async execute(
    workflow: EsWorkflow,
    inputs: Record<string, unknown>,
    spaceId: string,
    request: KibanaRequest,
    parentDepth: number,
    inheritParentIdentity: boolean,
    parentStepName: string
  ): Promise<StrategyResult> {
    const currentState = this.stepExecutionRuntime.getCurrentStepState() as
      | SubWorkflowWaitState
      | undefined;

    if (!currentState?.executionId) {
      return this.initiateSubWorkflowExecution(
        workflow,
        inputs,
        spaceId,
        request,
        parentDepth,
        inheritParentIdentity,
        parentStepName
      );
    }

    return this.readChildExecutionFromEs(currentState, spaceId);
  }

  /** True when wait state exists (e.g. after entering WAITING_FOR_CHILD). */
  canResume(): boolean {
    const state = this.stepExecutionRuntime.getCurrentStepState() as
      | SubWorkflowWaitState
      | undefined;
    return !!state?.executionId;
  }

  /** Child execution id when waiting on a sub-workflow (for onCancel). */
  getExecutionIdForCancel(): string | undefined {
    const state = this.stepExecutionRuntime.getCurrentStepState() as
      | SubWorkflowWaitState
      | undefined;
    return state?.executionId;
  }

  /** Re-read child execution from ES after child completion resumed the parent. */
  async resume(spaceId: string): Promise<StrategyResult> {
    const currentState = this.stepExecutionRuntime.getCurrentStepState() as
      | SubWorkflowWaitState
      | undefined;

    if (!currentState?.executionId) {
      return {
        status: 'failed',
        error: new Error('Cannot resume workflow.execute step without existing wait state'),
      };
    }

    return this.readChildExecutionFromEs(currentState, spaceId);
  }

  private async initiateSubWorkflowExecution(
    workflow: EsWorkflow,
    inputs: Record<string, unknown>,
    spaceId: string,
    request: KibanaRequest,
    parentDepth: number,
    inheritParentIdentity: boolean,
    parentStepName: string
  ): Promise<StrategyResult> {
    try {
      const workflowExecution = this.stepExecutionRuntime.workflowExecution;
      const isTestRun = !!this.stepExecutionRuntime.workflowExecution.isTestRun;
      const { workflowExecutionId } = await this.workflowsExecutionEngine.executeWorkflow(
        toWorkflowExecutionEngineModel(workflow, { isTestRun, isEphemeral: false }),
        {
          spaceId,
          inputs,
          triggeredBy: WORKFLOW_STEP_TRIGGER_SOURCE,
          parentWorkflowInvocation: 'sync',
          parentWorkflowId: workflowExecution.workflowId,
          parentWorkflowExecutionId: workflowExecution.id,
          parentStepId: this.stepExecutionRuntime.node.stepId,
          parentDepth,
          ...buildChildLineageContext({ invocation: 'sync', parent: workflowExecution }),
          ...buildChildEventChainContext(workflowExecution),
          ...(inheritParentIdentity ? { inheritParentIdentity: true, parentStepName } : {}),
        },
        request
      );

      this.workflowLogger.logInfo(
        `Started sync sub-workflow execution: ${workflowExecutionId}, entering wait state`
      );

      const state: SubWorkflowWaitState = {
        workflowId: workflow.id,
        executionId: workflowExecutionId,
        startedAt: new Date().toISOString(),
      };

      this.stepExecutionRuntime.setCurrentStepState(state);

      const childAlreadyTerminal = await this.isChildAlreadyTerminal(state, spaceId);

      // Checked after the read so a cancellation that lands during it is not overwritten below.
      if (this.stepExecutionRuntime.abortController.signal.aborted) {
        return { status: 'cancelled' };
      }

      if (childAlreadyTerminal) {
        return this.readChildExecutionFromEs(state, spaceId);
      }

      this.stepExecutionRuntime.tryEnterWaitUntil(undefined, ExecutionStatus.WAITING_FOR_CHILD);
      return { status: 'waiting' };
    } catch (error) {
      return { status: 'failed', error: error as Error };
    }
  }

  private async isChildAlreadyTerminal(
    state: SubWorkflowWaitState,
    spaceId: string
  ): Promise<boolean> {
    try {
      const execution = await this.workflowExecutionRepository.getWorkflowExecutionById(
        state.executionId,
        spaceId
      );
      return !!execution && isTerminalStatus(execution.status);
    } catch (error) {
      // Best-effort: a read failure falls back to waiting, where the child's task wakes the parent.
      this.workflowLogger.logDebug(
        `Failed to read sub-workflow execution ${state.executionId} after start: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return false;
    }
  }

  private async readChildExecutionFromEs(
    state: SubWorkflowWaitState,
    spaceId: string
  ): Promise<StrategyResult> {
    try {
      const execution = await this.workflowExecutionRepository.getWorkflowExecutionById(
        state.executionId,
        spaceId
      );

      if (!execution) {
        return {
          status: 'failed',
          error: new Error(`Sub-workflow execution ${state.executionId} not found`),
        };
      }

      if (!isTerminalStatus(execution.status)) {
        // Child still running (e.g. parent idle-timeout task fired before child finished).
        // Stay in WAITING_FOR_CHILD so workflow timeout zones can run; do not fail the parent step.
        return { status: 'waiting' };
      }

      if (execution.status !== ExecutionStatus.COMPLETED) {
        return {
          status: 'failed',
          error: await buildChildFailureError(
            execution,
            this.stepExecutionRepository,
            this.workflowLogger
          ),
        };
      }

      return {
        status: 'completed',
        output: await readChildExecutionOutput(execution, this.stepExecutionRepository),
      };
    } catch (error) {
      return { status: 'failed', error: error as Error };
    }
  }
}
