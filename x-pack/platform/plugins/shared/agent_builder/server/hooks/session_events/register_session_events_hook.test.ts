/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { ConversationAccessControl, ConversationRound } from '@kbn/agent-builder-common';
import {
  ConversationAccessControlMode,
  ConversationAccessControlRole,
  ConversationRoundStatus,
} from '@kbn/agent-builder-common';
import { HookExecutionMode, HookLifecycle } from '@kbn/agent-builder-server';
import type { AfterExecutionHookContext } from '@kbn/agent-builder-server';
import { AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/management-settings-ids';
import type { InternalSetupServices, InternalStartServices } from '../../services';
import { getUserFromRequest } from '../../services/utils';
import type { RegisterSessionEventsHookDeps } from './register_session_events_hook';
import { registerSessionEventsHook } from './register_session_events_hook';
import { roundToSessionEvents } from './round_to_session_events';

jest.mock('../../services/utils', () => ({ getUserFromRequest: jest.fn() }));

const getUserFromRequestMock = jest.mocked(getUserFromRequest);

const CONVERSATION_ID = 'conversation-1';
const PROFILE_UID = 'u_profile_1';

const round: ConversationRound = {
  id: 'round-1',
  status: ConversationRoundStatus.completed,
  input: { message: 'What is in my index?' },
  steps: [],
  response: { message: 'It holds logs.' },
  started_at: '2026-11-27T10:00:00.000Z',
  time_to_first_token: 10,
  time_to_last_token: 20,
  model_usage: { connector_id: 'connector-1', llm_calls: 1, input_tokens: 5, output_tokens: 5 },
};

const createContext = (
  overrides: Partial<AfterExecutionHookContext> = {}
): AfterExecutionHookContext => ({
  request: httpServerMock.createKibanaRequest(),
  round,
  conversationId: CONVERSATION_ID,
  conversationAccess: 'readWrite',
  agentConfiguration: { tools: [], ai_indices: ['elastic', 'team-notes'] },
  ...overrides,
});

const setup = ({ withContextEngine = true }: { withContextEngine?: boolean } = {}) => {
  const logger = loggingSystemMock.createLogger();
  const hookLogger = loggingSystemMock.createLogger();
  logger.get.mockReturnValue(hookLogger);

  const getSetting = jest.fn().mockResolvedValue(true);
  const getConversation = jest.fn().mockResolvedValue({});
  const getScopedClientAsUser = jest.fn().mockResolvedValue({ get: getConversation });
  const saveEvents = jest.fn().mockResolvedValue({ results: [] });
  const getSpaceId = jest.fn().mockReturnValue('my-space');

  const internalServices = {
    uiSettings: { asScopedToClient: () => ({ get: getSetting }) },
    savedObjects: { getScopedClient: jest.fn() },
    spaces: { spacesService: { getSpaceId } },
    conversations: { getScopedClientAsUser },
  } as unknown as InternalStartServices;

  const coreStart = {
    security: {},
    elasticsearch: { client: { asScoped: () => ({ asCurrentUser: {} }) } },
  };
  const startDeps = withContextEngine
    ? { contextEngine: { getSessionEventsService: () => ({ saveEvents }) } }
    : {};
  const getStartServices = jest
    .fn()
    .mockResolvedValue([
      coreStart,
      startDeps,
    ]) as unknown as RegisterSessionEventsHookDeps['getStartServices'];

  getUserFromRequestMock.mockResolvedValue({
    id: PROFILE_UID,
    username: 'chris',
    type: 'user',
    isAdmin: false,
  });

  const register = jest.fn();
  registerSessionEventsHook({ hooks: { register } } as unknown as InternalSetupServices, {
    logger,
    getInternalServices: () => internalServices,
    getStartServices,
  });
  const { mode, handler } = register.mock.calls[0][0].hooks[HookLifecycle.afterExecution];

  return {
    register,
    mode,
    handler: handler as (context: AfterExecutionHookContext) => Promise<void>,
    hookLogger,
    getSetting,
    getConversation,
    getScopedClientAsUser,
    saveEvents,
  };
};

describe('registerSessionEventsHook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers one non-blocking after-execution hook', () => {
    const { register, mode } = setup();

    expect(register).toHaveBeenCalledTimes(1);
    expect(register.mock.calls[0][0].id).toBe('session-events');
    expect(mode).toBe(HookExecutionMode.nonBlocking);
  });

  it('saves the round with the conversation, user, space and AI indices', async () => {
    const { handler, saveEvents, getSetting, getScopedClientAsUser, getConversation } = setup();

    await handler(createContext());

    expect(getSetting).toHaveBeenCalledWith(AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID);
    expect(getScopedClientAsUser).toHaveBeenCalledWith(
      expect.objectContaining({ user: expect.objectContaining({ id: PROFILE_UID }) })
    );
    expect(getConversation).toHaveBeenCalledWith(CONVERSATION_ID);
    expect(saveEvents).toHaveBeenCalledTimes(1);
    expect(saveEvents).toHaveBeenCalledWith(
      { space: 'my-space', userId: PROFILE_UID },
      {
        sessionId: CONVERSATION_ID,
        aiIndexIds: ['elastic', 'team-notes'],
        events: roundToSessionEvents(round),
      }
    );
  });

  describe('does not save', () => {
    it('without a conversation id', async () => {
      const { handler, saveEvents, getSetting } = setup();

      await handler(createContext({ conversationId: undefined }));

      expect(getSetting).not.toHaveBeenCalled();
      expect(saveEvents).not.toHaveBeenCalled();
    });

    it.each(['readOnly', 'none'] as const)(
      'when the conversation access is %s',
      async (conversationAccess) => {
        const { handler, saveEvents } = setup();

        await handler(createContext({ conversationAccess }));

        expect(saveEvents).not.toHaveBeenCalled();
      }
    );

    it.each([ConversationRoundStatus.awaitingPrompt, ConversationRoundStatus.inProgress])(
      'when the round status is %s',
      async (status) => {
        const { handler, saveEvents } = setup();

        await handler(createContext({ round: { ...round, status } }));

        expect(saveEvents).not.toHaveBeenCalled();
      }
    );

    it.each([[[]], [undefined]])('when the agent AI indices are %p', async (aiIndices) => {
      const { handler, saveEvents, getSetting } = setup();

      await handler(createContext({ agentConfiguration: { tools: [], ai_indices: aiIndices } }));

      expect(getSetting).not.toHaveBeenCalled();
      expect(saveEvents).not.toHaveBeenCalled();
    });

    it('when experimental features are off', async () => {
      const { handler, saveEvents, getSetting } = setup();
      getSetting.mockResolvedValue(false);

      await handler(createContext());

      expect(getUserFromRequestMock).not.toHaveBeenCalled();
      expect(saveEvents).not.toHaveBeenCalled();
    });

    it('when Context Engine is not available', async () => {
      const { handler, getConversation } = setup({ withContextEngine: false });

      await handler(createContext());

      expect(getUserFromRequestMock).not.toHaveBeenCalled();
      expect(getConversation).not.toHaveBeenCalled();
    });

    it.each([
      ['a service account', 'service_account:my-account'],
      ['a user identified by realm', 'realm:["native","native1","chris"]'],
      ['a user without an id', undefined],
    ])('for %s', async (_label, id) => {
      const { handler, saveEvents, getConversation } = setup();
      getUserFromRequestMock.mockResolvedValue({ id, username: 'chris', isAdmin: false });

      await handler(createContext());

      expect(getConversation).not.toHaveBeenCalled();
      expect(saveEvents).not.toHaveBeenCalled();
    });

    it('when the conversation is shared with everyone', async () => {
      const { handler, saveEvents, getConversation, hookLogger } = setup();
      getConversation.mockResolvedValue({
        access_control: { access_mode: ConversationAccessControlMode.Public, entries: [] },
      });

      await handler(createContext());

      expect(getConversation).toHaveBeenCalledWith(CONVERSATION_ID);
      expect(saveEvents).not.toHaveBeenCalled();
      expect(hookLogger.warn).not.toHaveBeenCalled();
    });

    it('when the conversation is shared with named users', async () => {
      const { handler, saveEvents, getConversation, hookLogger } = setup();
      const accessControl: ConversationAccessControl = {
        access_mode: ConversationAccessControlMode.Private,
        entries: [
          {
            type: 'user',
            id: 'u_profile_2',
            role: ConversationAccessControlRole.Member,
            added_at: round.started_at,
          },
        ],
      };
      getConversation.mockResolvedValue({ access_control: accessControl });

      await handler(createContext());

      expect(getConversation).toHaveBeenCalledWith(CONVERSATION_ID);
      expect(saveEvents).not.toHaveBeenCalled();
      expect(hookLogger.warn).not.toHaveBeenCalled();
    });
  });

  describe('never fails the round', () => {
    it('logs a warning when some events fail to save', async () => {
      const { handler, saveEvents, hookLogger } = setup();
      saveEvents.mockResolvedValue({
        results: [
          { id: 'round-1:user', status: 'created' },
          { id: 'round-1:answer', status: 'failed', error: 'rejected' },
        ],
      });

      await expect(handler(createContext())).resolves.toBeUndefined();

      expect(hookLogger.warn).toHaveBeenCalledWith(
        'Failed to save 1 of 2 session events for conversation [conversation-1]'
      );
    });

    it('logs a warning when the save throws', async () => {
      const { handler, saveEvents, hookLogger } = setup();
      saveEvents.mockRejectedValue(new Error('data stream missing'));

      await expect(handler(createContext())).resolves.toBeUndefined();

      expect(hookLogger.warn).toHaveBeenCalledWith(
        'Failed to save session events for conversation [conversation-1]: data stream missing'
      );
    });

    it('logs a warning when the conversation cannot be read', async () => {
      const { handler, saveEvents, getConversation, hookLogger } = setup();
      getConversation.mockRejectedValue(new Error('not found'));

      await expect(handler(createContext())).resolves.toBeUndefined();

      expect(saveEvents).not.toHaveBeenCalled();
      expect(hookLogger.warn).toHaveBeenCalledWith(
        'Failed to save session events for conversation [conversation-1]: not found'
      );
    });

    it('logs nothing when every event is saved', async () => {
      const { handler, saveEvents, hookLogger } = setup();
      saveEvents.mockResolvedValue({ results: [{ id: 'round-1:user', status: 'created' }] });

      await handler(createContext());

      expect(hookLogger.warn).not.toHaveBeenCalled();
    });
  });
});
