/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExitNormalPathNode } from '@kbn/workflows/graph';
import type { WorkflowExecutionRuntimeManager } from '../../../../workflow_context_manager/workflow_execution_runtime_manager';
import { ExitNormalPathNodeImpl } from '../exit_normal_path_node_impl';

describe('ExitNormalPathNodeImpl', () => {
  let underTest: ExitNormalPathNodeImpl;
  let node: ExitNormalPathNode;
  let workflowRuntime: WorkflowExecutionRuntimeManager;

  beforeEach(() => {
    node = {
      id: 'exitNormalPath1',
      type: 'exit-normal-path',
      stepId: 'exitNormalPath1',
      stepType: 'on-failure',
      exitOnFailureZoneNodeId: 'exitOnFailureZone1',
      enterNodeId: 'enterNormalPath1',
    };
    workflowRuntime = {} as unknown as WorkflowExecutionRuntimeManager;
    workflowRuntime.navigateToNode = jest.fn();

    underTest = new ExitNormalPathNodeImpl(node, workflowRuntime);
  });

  describe('run', () => {
    it('should go to exit on failure zone node', async () => {
      await underTest.run();
      expect(workflowRuntime.navigateToNode).toHaveBeenCalledWith(node.exitOnFailureZoneNodeId);
    });
  });
});
