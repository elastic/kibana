/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EnterTryBlockNode } from '@kbn/workflows/graph';
import type { StepExecutionRuntime } from '../../../workflow_context_manager/step_execution_runtime';
import type { WorkflowExecutionRuntimeManager } from '../../../workflow_context_manager/workflow_execution_runtime_manager';
import type { NodeImplementation, NodeWithErrorCatching } from '../../node_implementation';

export class EnterTryBlockNodeImpl implements NodeImplementation, NodeWithErrorCatching {
  constructor(
    private node: EnterTryBlockNode,
    private stepExecutionRuntime: StepExecutionRuntime,
    private wfExecutionRuntimeManager: WorkflowExecutionRuntimeManager
  ) {}

  public run(): void {
    this.stepExecutionRuntime.startStep();
    this.wfExecutionRuntimeManager.navigateToNode(this.node.enterNormalPathNodeId);
  }

  catchError(): void {
    this.stepExecutionRuntime.stepLogger.logError(
      'Error caught by the OnFailure zone. Redirecting to the fallback path'
    );
    const stepState = this.stepExecutionRuntime.getCurrentStepState() || {};

    if (!stepState.isFallbackExecuted) {
      this.stepExecutionRuntime.setCurrentStepState({
        ...stepState,
        isFallbackExecuted: true,
        error: this.wfExecutionRuntimeManager.getWorkflowErrorSerialized(), // save error to step state to preserve type
      });
      this.wfExecutionRuntimeManager.setWorkflowError(undefined); // clear workflow error to let run go
      this.wfExecutionRuntimeManager.navigateToNode(this.node.enterFallbackPathNodeId);
    }
  }
}
