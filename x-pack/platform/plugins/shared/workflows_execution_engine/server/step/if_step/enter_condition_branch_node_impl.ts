/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EnterConditionBranchNode } from '@kbn/workflows/graph';
import type { WorkflowExecutionRuntimeManager } from '../../workflow_context_manager/workflow_execution_runtime_manager';
import type { NodeImplementation } from '../node_implementation';

export class EnterConditionBranchNodeImpl implements NodeImplementation {
  constructor(
    private node: EnterConditionBranchNode,
    private wfExecutionRuntimeManager: WorkflowExecutionRuntimeManager
  ) {}

  public run(): void {
    if (this.node.type === 'enter-then-branch') {
      this.wfExecutionRuntimeManager.enterScope('true');
    } else {
      this.wfExecutionRuntimeManager.enterScope('false');
    }
    this.wfExecutionRuntimeManager.navigateToNextNode();
  }
}
