/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowExecutionRuntimeManager } from '../../../workflow_context_manager/workflow_execution_runtime_manager';
import type { NodeImplementation } from '../../node_implementation';

export class EnterFallbackPathNodeImpl implements NodeImplementation {
  constructor(private wfExecutionRuntimeManager: WorkflowExecutionRuntimeManager) {}

  public run(): void {
    this.wfExecutionRuntimeManager.enterScope('fallback');
    this.wfExecutionRuntimeManager.navigateToNextNode();
  }
}
