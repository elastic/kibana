/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowExecutionRuntimeManager } from '../../workflow_context_manager/workflow_execution_runtime_manager';
import type { NodeImplementation } from '../node_implementation';

/**
 * The enter-parallel node owns fan-out, aggregation and the final step result,
 * navigating straight to this exit node once every branch is terminal. The exit
 * node is therefore a no-op cursor marker that simply continues to whatever
 * follows the parallel block.
 */
export class ExitParallelNodeImpl implements NodeImplementation {
  constructor(private wfExecutionRuntimeManager: WorkflowExecutionRuntimeManager) {}

  public run(): void {
    this.wfExecutionRuntimeManager.navigateToNextNode();
  }
}
