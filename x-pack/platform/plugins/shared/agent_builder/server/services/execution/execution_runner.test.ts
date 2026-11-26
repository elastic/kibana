/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { lastValueFrom, of, toArray } from 'rxjs';
import {
  AgentExecutionMode,
  AgentBuilderErrorCode,
  ChatEventType,
  ConversationAccessControlMode,
  ConversationOriginType,
  createBadRequestError,
  type ChatEvent,
  type RoundCompleteEvent,
} from '@kbn/agent-builder-common';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import {
  collectAndWriteEvents,
  handleAgentExecution,
  serializeExecutionError,
} from './execution_runner';
import {
  createConversationClientMock,
  createEmptyConversation,
  createRound,
} from '../../test_utils';
import { loadTracingPrivacySettings, withConverseSpan } from '../../tracing';
import { executeAgent$, resolveServices } from './utils';

jest.mock('./utils', () => {
  const actual = jest.requireActual('./utils');

  return {
    ...actual,
    executeAgent$: jest.fn(),
    resolveServices: jest.fn(),
  };
});

jest.mock('../../tracing', () => {
  const actual = jest.requireActual('../../tracing');

  return {
    ...actual,
    withConverseSpan: jest.fn((_opts: unknown, cb: () => unknown) => cb()),
    loadTracingPrivacySettings: jest.fn().mockResolvedValue({
      enabled: true,
      includeUserPrompts: true,
      includeLlmResponses: true,
      includeToolDetails: true,
      includeSystemPrompt: true,
      includeRealNames: true,
      includeRealIds: true,
    }),
  };
});

const executeAgentMock = executeAgent$ as jest.MockedFunction<typeof executeAgent$>;
const resolveServicesMock = resolveServices as jest.MockedFunction<typeof resolveServices>;
const withConverseSpanMock = withConverseSpan as jest.MockedFunction<typeof withConverseSpan>;
const loadTracingPrivacySettingsMock = loadTracingPrivacySettings as jest.MockedFunction<
  typeof loadTracingPrivacySettings
>;

const tracingServiceDeps = {
  uiSettings: {
    asScopedToClient: jest.fn().mockReturnValue({}),
  },
  savedObjects: {
    getScopedClient: jest.fn().mockReturnValue({}),
  },
};

describe('handleAgentExecution', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads tracing privacy settings from the request-scoped saved objects client', async () => {
    const conversation = createEmptyConversation({
      id: 'conversation-1',
      agent_id: 'test-agent',
      user: { id: 'owner-id', username: 'owner' },
    });
    const conversationClient = createConversationClientMock();
    conversationClient.get.mockResolvedValue(conversation);
    conversationClient.update.mockResolvedValue(conversation);
    conversationClient.upsertRound.mockResolvedValue(conversation);
    resolveServicesMock.mockResolvedValue({
      conversationClient,
      selectedConnectorId: 'connector-1',
      modelProvider: {
        getDefaultModel: jest.fn().mockResolvedValue({
          chatModel: {
            getConnector: () => ({ type: '.gen-ai' }),
          },
        }),
      },
    } as never);
    executeAgentMock.mockReturnValue(
      of({
        type: ChatEventType.roundComplete,
        data: { round: createRound({}) },
      } as RoundCompleteEvent)
    );

    const request = { headers: {} } as never;
    const soClient = { id: 'so-marketing' };
    const uiSettingsClient = { id: 'ui-marketing' };
    const privacySettings = {
      enabled: true,
      includeUserPrompts: false,
      includeLlmResponses: false,
      includeToolDetails: false,
      includeSystemPrompt: false,
      includeRealNames: false,
      includeRealIds: false,
    };
    loadTracingPrivacySettingsMock.mockResolvedValue(privacySettings);

    const logger = loggingSystemMock.createLogger();
    const getScopedClient = jest.fn().mockReturnValue(soClient);
    const asScopedToClient = jest.fn().mockReturnValue(uiSettingsClient);

    const events$ = await handleAgentExecution({
      execution: {
        executionId: 'execution-1',
        executionMode: AgentExecutionMode.conversation,
        agentParams: {
          agentId: 'test-agent',
          conversationId: 'conversation-1',
          nextInput: { message: 'Hello' },
        },
      } as never,
      deps: {
        logger,
        runAgent: jest.fn(),
        agentService: {
          getRegistry: jest
            .fn()
            .mockResolvedValue({ get: jest.fn().mockResolvedValue({ name: 'Test agent' }) }),
        },
        meteringService: {
          reportExecution: jest.fn().mockResolvedValue(undefined),
        },
        conversationService: {
          getConversationRoundAuthor: jest.fn().mockResolvedValue(undefined),
        },
        uiSettings: {
          asScopedToClient,
        },
        savedObjects: {
          getScopedClient,
        },
        spaces: {
          spacesService: { getSpaceId: jest.fn().mockReturnValue('marketing') },
        },
      } as never,
      request,
      abortSignal: new AbortController().signal,
    });
    await lastValueFrom(events$.pipe(toArray()));

    expect(getScopedClient).toHaveBeenCalledWith(request);
    expect(asScopedToClient).toHaveBeenCalledWith(soClient);
    expect(loadTracingPrivacySettingsMock).toHaveBeenCalledWith({
      uiSettingsClient,
      logger,
      spaceId: 'marketing',
    });
    expect(withConverseSpanMock).toHaveBeenCalledWith(
      expect.objectContaining({
        spaceId: 'marketing',
        privacySettings,
      }),
      expect.any(Function)
    );
  });

  it('reports metering with the resolved conversation id when continuing by origin', async () => {
    const origin = {
      external_conversation_id: 'team:T123/channel:C123/thread:callback-continuation',
    };
    const conversation = createEmptyConversation({
      id: 'conversation-from-origin',
      title: 'Existing conversation',
      agent_id: 'test-agent',
      origin,
    });
    const conversationClient = createConversationClientMock();
    conversationClient.getByOrigin.mockResolvedValue(conversation);
    conversationClient.update.mockResolvedValue(conversation);
    conversationClient.upsertRound.mockResolvedValue(conversation);

    const roundCompleteEvent: ChatEvent = {
      type: ChatEventType.roundComplete,
      data: {
        round: createRound({}),
      },
    };
    executeAgentMock.mockReturnValue(of(roundCompleteEvent));
    resolveServicesMock.mockResolvedValue({
      conversationClient,
      selectedConnectorId: 'connector-1',
      modelProvider: {
        getDefaultModel: jest.fn().mockResolvedValue({
          chatModel: {
            getConnector: () => ({ type: '.gen-ai' }),
          },
        }),
      },
    } as never);

    const reportExecution = jest.fn().mockResolvedValue(undefined);
    const agentRegistry = {
      get: jest.fn().mockResolvedValue({ name: 'Test agent' }),
    };

    const execution = {
      executionId: 'execution-1',
      executionMode: AgentExecutionMode.conversation,
      agentParams: {
        agentId: 'test-agent',
        origin,
        nextInput: {
          message: 'Continue this thread',
        },
      },
    } as never;

    const events$ = await handleAgentExecution({
      execution,
      deps: {
        logger: loggingSystemMock.createLogger(),
        runAgent: jest.fn(),
        agentService: {
          getRegistry: jest.fn().mockResolvedValue(agentRegistry),
        },
        meteringService: {
          reportExecution,
        },
        conversationService: {
          getConversationRoundAuthor: jest.fn().mockResolvedValue(undefined),
        },
        ...tracingServiceDeps,
      } as never,
      request: { headers: {} } as never,
      abortSignal: new AbortController().signal,
    });

    await lastValueFrom(events$.pipe(toArray()));

    expect(reportExecution).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: 'conversation-from-origin',
      })
    );
  });

  describe('round origin attribution', () => {
    const originAuthor = { id: 'U123', full_name: 'Jane Doe', username: 'jane' };
    const origin = {
      type: ConversationOriginType.Slack,
      external_conversation_id: 'team:T123/channel:C123/thread:1712345678.000100',
      author: originAuthor,
    };

    const setup = ({ roundCompleteEvent }: { roundCompleteEvent: RoundCompleteEvent }) => {
      const conversation = createEmptyConversation({
        id: 'conversation-from-origin',
        agent_id: 'test-agent',
        origin: { external_conversation_id: origin.external_conversation_id },
      });
      const conversationClient = createConversationClientMock();
      conversationClient.get.mockResolvedValue(conversation);
      conversationClient.getByOrigin.mockResolvedValue(conversation);
      conversationClient.update.mockResolvedValue(conversation);
      conversationClient.upsertRound.mockResolvedValue(conversation);

      executeAgentMock.mockReturnValue(of(roundCompleteEvent));
      resolveServicesMock.mockResolvedValue({
        conversationClient,
        selectedConnectorId: 'connector-1',
        modelProvider: {
          getDefaultModel: jest.fn().mockResolvedValue({
            chatModel: {
              getConnector: () => ({ type: '.gen-ai' }),
            },
          }),
        },
      } as never);

      const deps = {
        logger: loggingSystemMock.createLogger(),
        runAgent: jest.fn(),
        agentService: {
          getRegistry: jest
            .fn()
            .mockResolvedValue({ get: jest.fn().mockResolvedValue({ name: 'Test agent' }) }),
        },
        meteringService: {
          reportExecution: jest.fn().mockResolvedValue(undefined),
        },
        conversationService: {
          getConversationRoundAuthor: jest.fn().mockResolvedValue(undefined),
        },
        ...tracingServiceDeps,
      } as never;

      return { conversationClient, deps };
    };

    const runExecution = async ({
      deps,
      executionOrigin,
    }: {
      deps: unknown;
      executionOrigin?: typeof origin;
    }) => {
      const events$ = await handleAgentExecution({
        execution: {
          executionId: 'execution-1',
          executionMode: AgentExecutionMode.conversation,
          agentParams: {
            agentId: 'test-agent',
            origin: executionOrigin,
            conversationId: executionOrigin ? undefined : 'conversation-from-origin',
            nextInput: { message: 'Continue this thread' },
          },
        } as never,
        deps: deps as never,
        request: { headers: {} } as never,
        abortSignal: new AbortController().signal,
      });

      return lastValueFrom(events$.pipe(toArray()));
    };

    it('resolves the conversation by external id only and forwards the full origin to the agent run', async () => {
      const { conversationClient, deps } = setup({
        roundCompleteEvent: {
          type: ChatEventType.roundComplete,
          data: { round: createRound({}) },
        },
      });

      await runExecution({ deps, executionOrigin: origin });

      expect(conversationClient.getByOrigin).toHaveBeenCalledWith({
        external_conversation_id: origin.external_conversation_id,
      });
      expect(executeAgentMock).toHaveBeenCalledWith(expect.objectContaining({ origin }));
    });
  });

  describe('round author attribution', () => {
    it('forwards the resolved round author to the agent run', async () => {
      const author = { id: 'test-user-id', username: 'test_user' };
      const conversation = createEmptyConversation({
        id: 'conversation-1',
        agent_id: 'test-agent',
      });
      const conversationClient = createConversationClientMock();
      conversationClient.get.mockResolvedValue(conversation);
      conversationClient.update.mockResolvedValue(conversation);
      conversationClient.upsertRound.mockResolvedValue(conversation);

      executeAgentMock.mockReturnValue(
        of({
          type: ChatEventType.roundComplete,
          data: { round: createRound({}) },
        } as RoundCompleteEvent)
      );
      resolveServicesMock.mockResolvedValue({
        conversationClient,
        selectedConnectorId: 'connector-1',
        modelProvider: {
          getDefaultModel: jest.fn().mockResolvedValue({
            chatModel: { getConnector: () => ({ type: '.gen-ai' }) },
          }),
        },
      } as never);

      const getConversationRoundAuthor = jest.fn().mockResolvedValue(author);
      const deps = {
        logger: loggingSystemMock.createLogger(),
        runAgent: jest.fn(),
        agentService: {
          getRegistry: jest
            .fn()
            .mockResolvedValue({ get: jest.fn().mockResolvedValue({ name: 'Test agent' }) }),
        },
        meteringService: {
          reportExecution: jest.fn().mockResolvedValue(undefined),
        },
        conversationService: {
          getConversationRoundAuthor,
        },
        ...tracingServiceDeps,
      } as never;

      const events$ = await handleAgentExecution({
        execution: {
          executionId: 'execution-1',
          executionMode: AgentExecutionMode.conversation,
          agentParams: {
            agentId: 'test-agent',
            conversationId: 'conversation-1',
            nextInput: { message: 'Hello' },
          },
        } as never,
        deps,
        request: { headers: {} } as never,
        abortSignal: new AbortController().signal,
      });

      await lastValueFrom(events$.pipe(toArray()));

      expect(getConversationRoundAuthor).toHaveBeenCalledWith(
        expect.objectContaining({ conversation: expect.objectContaining({ id: 'conversation-1' }) })
      );
      expect(executeAgentMock).toHaveBeenCalledWith(expect.objectContaining({ author }));
    });
  });
});

describe('collectAndWriteEvents', () => {
  const event: ChatEvent = {
    type: ChatEventType.conversationUpdated,
    data: {
      conversation_id: 'conversation-1',
      title: 'Conversation',
      access_control: { access_mode: ConversationAccessControlMode.Public },
    },
  };

  const createExecutionClient = () => ({
    appendEvents: jest.fn().mockResolvedValue(undefined),
  });

  const execution = {
    executionId: 'execution-1',
  };

  it('resolves with the collected events and appends them to the execution document', async () => {
    const executionClient = createExecutionClient();

    await expect(
      collectAndWriteEvents({
        events$: of(event),
        execution: execution as never,
        executionClient: executionClient as never,
        logger: loggingSystemMock.createLogger(),
      })
    ).resolves.toEqual([event]);

    expect(executionClient.appendEvents).toHaveBeenCalledWith('execution-1', [event]);
  });
});

describe('serializeExecutionError', () => {
  it('passes through AgentBuilderError code, message, and meta', () => {
    const err = createBadRequestError('bad input', { foo: 'bar' });

    expect(serializeExecutionError(err)).toEqual({
      code: AgentBuilderErrorCode.badRequest,
      message: 'bad input',
      meta: expect.objectContaining({ statusCode: 400, foo: 'bar' }),
    });
  });

  it('preserves the HTTP status from a Boom error in meta.statusCode', () => {
    const err = Boom.forbidden('Unauthorized to get actions');

    expect(serializeExecutionError(err)).toEqual({
      code: AgentBuilderErrorCode.internalError,
      message: 'Unauthorized to get actions',
      meta: { statusCode: 403 },
    });
  });

  it('preserves the HTTP status from a plain error carrying statusCode', () => {
    const err = Object.assign(new Error('nope'), { statusCode: 401 });

    expect(serializeExecutionError(err)).toEqual({
      code: AgentBuilderErrorCode.internalError,
      message: 'nope',
      meta: { statusCode: 401 },
    });
  });

  it('omits meta for plain errors with no status', () => {
    expect(serializeExecutionError(new Error('boom'))).toEqual({
      code: AgentBuilderErrorCode.internalError,
      message: 'boom',
    });
  });

  it('ignores out-of-range status codes', () => {
    const err = Object.assign(new Error('weird'), { statusCode: 200 });

    expect(serializeExecutionError(err)).toEqual({
      code: AgentBuilderErrorCode.internalError,
      message: 'weird',
    });
  });
});
