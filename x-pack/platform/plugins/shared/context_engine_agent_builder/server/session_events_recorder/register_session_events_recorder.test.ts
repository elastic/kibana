/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationRound } from '@kbn/agent-builder-common';
import type { AgentBuilderPluginSetup, AfterExecutionHookContext } from '@kbn/agent-builder-server';
import { HookExecutionMode, HookLifecycle } from '@kbn/agent-builder-server';
import { isContextEngineEnabledInSpace } from '@kbn/context-engine-plugin/server/utils/is_context_engine_enabled_in_space';
import type { CoreSetup } from '@kbn/core/server';
import { coreMock, httpServerMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import type {
  ContextEngineAgentBuilderPluginStart,
  ContextEngineAgentBuilderStartDependencies,
} from '../types';
import { registerSessionEventsRecorder } from './register_session_events_recorder';

jest.mock('@kbn/context-engine-plugin/server/utils/is_context_engine_enabled_in_space', () => ({
  isContextEngineEnabledInSpace: jest.fn(),
}));

describe('registerSessionEventsRecorder', () => {
  const saveEvents = jest.fn();
  const getAiIndex = jest.fn();
  const coreStart = coreMock.createStart();
  const logger = loggerMock.create();
  let memoryEnabled: boolean;
  let handler: (context: AfterExecutionHookContext) => Promise<void>;

  const round = {
    id: 'round-1',
    started_at: '2026-11-18T10:00:00.000Z',
    input: { message: 'Remember that I prefer metric units.' },
    steps: [],
    response: { message: 'Got it.' },
  } as unknown as ConversationRound;

  const hookContext = (overrides: Partial<AfterExecutionHookContext> = {}) =>
    ({
      conversationId: 'conversation-a',
      conversationAccess: 'readWrite',
      round,
      request: httpServerMock.createKibanaRequest(),
      agentConfiguration: { ai_indices: ['ops-memory', 'plain-index'] },
      ...overrides,
    } as unknown as AfterExecutionHookContext);

  beforeEach(() => {
    jest.clearAllMocks();
    memoryEnabled = true;
    jest.mocked(isContextEngineEnabledInSpace).mockResolvedValue(true);
    coreStart.uiSettings.globalAsScopedToClient = jest
      .fn()
      .mockReturnValue({ get: jest.fn(async () => memoryEnabled) });
    coreStart.userProfile.getCurrentProfileId.mockResolvedValue('profile-1');
    saveEvents.mockResolvedValue({ results: [] });
    getAiIndex.mockImplementation(async (id: string) => ({
      id,
      managed: true,
      memory_enabled: id === 'ops-memory',
      dest: { type: 'data_stream', value: id },
    }));

    const coreSetup = {
      getStartServices: jest.fn().mockResolvedValue([
        coreStart,
        {
          contextEngine: {
            getSessionEventsService: () => ({ saveEvents }),
            getAiIndexService: () => ({ get: getAiIndex }),
          },
        },
        {},
      ]),
    } as unknown as CoreSetup<
      ContextEngineAgentBuilderStartDependencies,
      ContextEngineAgentBuilderPluginStart
    >;
    const register = jest.fn();
    registerSessionEventsRecorder({
      agentBuilder: { hooks: { register } } as unknown as AgentBuilderPluginSetup,
      coreSetup,
      logger,
    });
    const entry = register.mock.calls[0][0].hooks[HookLifecycle.afterExecution];
    expect(entry.mode).toBe(HookExecutionMode.nonBlocking);
    handler = entry.handler;
  });

  it("saves the round to the conversation's session for the user's profile", async () => {
    await handler(hookContext());

    expect(saveEvents).toHaveBeenCalledWith(
      { space: 'default', userId: 'profile-1' },
      expect.objectContaining({
        sessionId: 'conversation-a',
        aiIndexIds: ['ops-memory'],
        events: [
          expect.objectContaining({ id: 'round-1:user', type: 'user' }),
          expect.objectContaining({ id: 'round-1:answer', type: 'assistant' }),
        ],
      })
    );
  });

  it.each([
    ['there is no conversation', { conversationId: undefined }],
    ['the conversation is read-only', { conversationAccess: 'readOnly' }],
  ] as const)('skips the round when %s', async (_, overrides) => {
    await handler(hookContext(overrides as Partial<AfterExecutionHookContext>));

    expect(saveEvents).not.toHaveBeenCalled();
  });

  it('skips the round when memory is turned off', async () => {
    memoryEnabled = false;

    await handler(hookContext());

    expect(saveEvents).not.toHaveBeenCalled();
  });

  it('logs a failure instead of throwing', async () => {
    saveEvents.mockRejectedValue(new Error('inference unavailable'));

    await expect(handler(hookContext())).resolves.toBeUndefined();
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('inference unavailable'));
  });
});
