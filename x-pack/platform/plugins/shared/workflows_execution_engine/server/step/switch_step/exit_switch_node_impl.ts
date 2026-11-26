/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StepExecutionRuntime } from '../../workflow_context_manager/step_execution_runtime';
import type { WorkflowExecutionRuntimeManager } from '../../workflow_context_manager/workflow_execution_runtime_manager';
import type { NodeImplementation } from '../node_implementation';

export class ExitSwitchNodeImpl implements NodeImplementation {
  constructor(
    private stepExecutionRuntime: StepExecutionRuntime,
    private wfExecutionRuntimeManager: WorkflowExecutionRuntimeManager
  ) {}

  public run(): void {
    const stepState = this.stepExecutionRuntime.getCurrentStepState();
    const { matchedValue, matchedIndex } = stepState ?? {};
    this.stepExecutionRuntime.setCurrentStepState(undefined);
    this.stepExecutionRuntime.finishStep({ matchedValue, matchedIndex });
    this.wfExecutionRuntimeManager.navigateToNextNode();
  }
}
