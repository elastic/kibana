/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowExecutionRuntimeManager } from '../../../../workflow_context_manager/workflow_execution_runtime_manager';
import { ExitWorkflowTimeoutZoneNodeImpl } from '../exit_workflow_timeout_zone_node_impl';

describe('ExitWorkflowTimeoutZoneNodeImpl', () => {
  let wfExecutionRuntimeManagerMock: WorkflowExecutionRuntimeManager;
  let impl: ExitWorkflowTimeoutZoneNodeImpl;

  beforeEach(() => {
    wfExecutionRuntimeManagerMock = {
      navigateToNextNode: jest.fn(),
    } as unknown as WorkflowExecutionRuntimeManager;

    impl = new ExitWorkflowTimeoutZoneNodeImpl(wfExecutionRuntimeManagerMock);
  });

  it('should navigate to next node', async () => {
    await impl.run();
    expect(wfExecutionRuntimeManagerMock.navigateToNextNode).toHaveBeenCalledTimes(1);
    expect(wfExecutionRuntimeManagerMock.navigateToNextNode).toHaveBeenCalledWith();
  });
});
