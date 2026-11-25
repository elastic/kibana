/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowExecutionRuntimeManager } from '../../../../workflow_context_manager/workflow_execution_runtime_manager';
import { EnterNormalPathNodeImpl } from '../enter_normal_path_node_impl';

describe('EnterNormalPathNodeImpl', () => {
  let underTest: EnterNormalPathNodeImpl;
  let mockWorkflowRuntime: jest.Mocked<WorkflowExecutionRuntimeManager>;

  beforeEach(() => {
    mockWorkflowRuntime = {
      navigateToNextNode: jest.fn(),
    } as any;

    underTest = new EnterNormalPathNodeImpl(mockWorkflowRuntime);
  });

  describe('run', () => {
    it('should go to next step', async () => {
      await underTest.run();
      expect(mockWorkflowRuntime.navigateToNextNode).toHaveBeenCalled();
    });
  });
});
