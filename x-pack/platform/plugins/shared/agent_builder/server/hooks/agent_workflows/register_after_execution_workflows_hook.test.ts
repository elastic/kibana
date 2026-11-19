/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { HookExecutionMode, HookLifecycle } from '@kbn/agent-builder-server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { InternalSetupServices, InternalStartServices } from '../../services';
import { registerAfterExecutionWorkflowsHook } from './register_after_execution_workflows_hook';

describe('registerAfterExecutionWorkflowsHook', () => {
  const setup = (workflowsManagement?: WorkflowsServerPluginSetup) => {
    const register = jest.fn();
    registerAfterExecutionWorkflowsHook(
      { hooks: { register } } as unknown as InternalSetupServices,
      {
        workflowsManagement,
        logger: loggingSystemMock.createLogger(),
        getInternalServices: jest.fn() as unknown as () => InternalStartServices,
      }
    );
    return register;
  };

  it('registers a non-blocking hook that asks the runner for a service-account request', () => {
    const register = setup({ management: {} } as unknown as WorkflowsServerPluginSetup);

    expect(register).toHaveBeenCalledTimes(1);
    expect(register.mock.calls[0][0].hooks[HookLifecycle.afterExecution]).toEqual(
      expect.objectContaining({
        mode: HookExecutionMode.nonBlocking,
        requiresServiceAccountRequest: true,
      })
    );
  });

  it('registers nothing without workflows management', () => {
    expect(setup()).not.toHaveBeenCalled();
  });
});
