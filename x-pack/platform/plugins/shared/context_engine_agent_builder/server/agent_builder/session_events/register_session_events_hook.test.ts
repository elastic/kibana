/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HookExecutionMode, HookLifecycle } from '@kbn/agent-builder-server';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { registerSessionEventsHook, SESSION_EVENTS_HOOK_ID } from './register_session_events_hook';

describe('registerSessionEventsHook', () => {
  it('registers a non-blocking after-execution hook', () => {
    const register = jest.fn();
    const agentBuilder = { hooks: { register } } as unknown as AgentBuilderPluginSetup;

    registerSessionEventsHook({
      agentBuilder,
      logger: loggingSystemMock.createLogger(),
      getCoreStart: jest.fn(),
      getContextEngineStart: jest.fn(),
      getSpaces: jest.fn(),
    });

    expect(register).toHaveBeenCalledWith({
      id: SESSION_EVENTS_HOOK_ID,
      hooks: {
        [HookLifecycle.afterExecution]: {
          mode: HookExecutionMode.nonBlocking,
          handler: expect.any(Function),
        },
      },
    });
  });
});
