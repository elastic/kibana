/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SerializedError } from '@kbn/workflows';
import { ExecutionError } from '@kbn/workflows/server';
import type { StepExecutionRuntime } from '../../../workflow_context_manager/step_execution_runtime';
import type { WorkflowExecutionRuntimeManager } from '../../../workflow_context_manager/workflow_execution_runtime_manager';
import type { NodeImplementation } from '../../node_implementation';

export class ExitTryBlockNodeImpl implements NodeImplementation {
  constructor(
    private stepExecutionRuntime: StepExecutionRuntime,
    private wfExecutionRuntimeManager: WorkflowExecutionRuntimeManager
  ) {}

  public async run(): Promise<void> {
    const stepState = this.stepExecutionRuntime.getCurrentStepState() || {};

    if (stepState.error) {
      // if error is in state, that means failure path was executed
      // and we have to re-throw error (preserve type e.g. TimeoutError)
      const executionError = new ExecutionError(stepState.error as SerializedError);
      this.stepExecutionRuntime.failStep(executionError);
      this.wfExecutionRuntimeManager.setWorkflowError(executionError);
      return;
    }

    this.stepExecutionRuntime.finishStep();
    this.wfExecutionRuntimeManager.navigateToNextNode();
  }
}
