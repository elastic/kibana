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
import { UserAttributes } from '@kbn/inference-tracing';
import {
  collectAndWriteEvents,
  handleAgentExecution,
  serializeExecutionError,
  setUserAttributes,
} from './execution_runner';
import {
  createConversationClientMock,
  createEmptyConversation,
  createRound,
} from '../../test_utils';
import { withConverseSpan } from '../../tracing';
import { executeAgent$, generateTitle, resolveServices } from './utils';
import type { Span } from '@opentelemetry/api';

jest.mock('./utils', () => {
  const actual = jest.requireActual('./utils');

  return {
    ...actual,
    executeAgent$: jest.fn(),
    resolveServices: jest.fn(),
    generateTitle: jest.fn(),
  };
});

const mockSpanSetAttribute = jest.fn();

jest.mock('../../tracing', () => {
  const actual = jest.requireActual('../../tracing');

  return {
    ...actual,
    withConverseSpan: jest.fn(
      (_opts: unknown, cb: (span: { setAttribute: jest.Mock }) => unknown) =>
        cb({ setAttribute: mockSpanSetAttribute })
    ),
  };
});

const executeAgentMock = executeAgent$ as jest.MockedFunction<typeof executeAgent$>;
const resolveServicesMock = resolveServices as jest.MockedFunction<typeof resolveServices>;
const withConverseSpanMock = withConverseSpan as jest.MockedFunction<typeof withConverseSpan>;
const generateTitleMock = generateTitle as jest.MockedFunction<typeof generateTitle>;

const createModelProviderMock = () => ({
  getDefaultModel: jest.fn().mockResolvedValue({
    chatModel: { getConnector: () => ({ type: '.gen-ai' }) },
  }),
  selectModel: jest.fn().mockResolvedValue({
    chatModel: { getConnector: () => ({ type: '.gen-ai' }) },
  }),
});

const createDeps = ({
  conversationClient,
  getConversationRoundAuthor = jest.fn().mockResolvedValue(undefined),
}: {
  conversationClient: ReturnType<typeof createConversationClientMock>;
  getConversationRoundAuthor?: jest.Mock;
}) =>
  ({
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
  } as never);

describe('handleAgentExecution', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    generateTitleMock.mockReturnValue(of('Generated title'));
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
      modelProvider: createModelProviderMock(),
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
        modelProvider: createModelProviderMock(),
      } as never);

      const deps = createDeps({ conversationClient });

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
        modelProvider: createModelProviderMock(),
      } as never);

      const getConversationRoundAuthor = jest.fn().mockResolvedValue(author);
      const deps = createDeps({ conversationClient, getConversationRoundAuthor });

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

  describe('converse span user identity', () => {
    it('sets the round author on the span for public UPDATE', async () => {
      const author = { id: 'author-id', username: 'author' };
      const conversation = createEmptyConversation({
        id: 'conversation-1',
        agent_id: 'test-agent',
        user: { id: 'owner-id', username: 'owner' },
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
        modelProvider: createModelProviderMock(),
      } as never);

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
        deps: createDeps({
          conversationClient,
          getConversationRoundAuthor: jest.fn().mockResolvedValue(author),
        }),
        request: { headers: {} } as never,
        abortSignal: new AbortController().signal,
      });

      await lastValueFrom(events$.pipe(toArray()));

      expect(withConverseSpanMock).toHaveBeenCalled();
      expect(mockSpanSetAttribute).toHaveBeenCalledWith(UserAttributes.UserId, 'author-id');
      expect(mockSpanSetAttribute).toHaveBeenCalledWith(UserAttributes.UserName, 'author');
      expect(mockSpanSetAttribute).not.toHaveBeenCalledWith(UserAttributes.UserId, 'owner-id');
    });

    it('defers private CREATE identity until ConversationCreatedEvent', async () => {
      const createdUser = { id: 'created-user-id', username: 'created_user' };
      const createdConversation = createEmptyConversation({
        id: 'new-conversation',
        agent_id: 'test-agent',
        user: createdUser,
      });
      const conversationClient = createConversationClientMock();
      conversationClient.create.mockResolvedValue(createdConversation);

      executeAgentMock.mockReturnValue(
        of({
          type: ChatEventType.roundComplete,
          data: { round: createRound({}) },
        } as RoundCompleteEvent)
      );
      resolveServicesMock.mockResolvedValue({
        conversationClient,
        selectedConnectorId: 'connector-1',
        modelProvider: createModelProviderMock(),
      } as never);

      const events$ = await handleAgentExecution({
        execution: {
          executionId: 'execution-1',
          executionMode: AgentExecutionMode.conversation,
          agentParams: {
            agentId: 'test-agent',
            nextInput: { message: 'Hello' },
          },
        } as never,
        deps: createDeps({ conversationClient }),
        request: { headers: {} } as never,
        abortSignal: new AbortController().signal,
      });

      await lastValueFrom(events$.pipe(toArray()));

      expect(mockSpanSetAttribute).not.toHaveBeenCalledWith(UserAttributes.UserId, 'unknown');
      expect(mockSpanSetAttribute).not.toHaveBeenCalledWith(UserAttributes.UserName, 'unknown');
      expect(mockSpanSetAttribute).toHaveBeenCalledWith(UserAttributes.UserId, 'created-user-id');
      expect(mockSpanSetAttribute).toHaveBeenCalledWith(UserAttributes.UserName, 'created_user');
    });
  });
});

describe('setUserAttributes', () => {
  it('sets user.id and user.name when both are present', () => {
    const span = { setAttribute: jest.fn() } as unknown as Span;

    setUserAttributes(span, { id: 'profile-1', username: 'jane' });

    expect(span.setAttribute).toHaveBeenCalledWith(UserAttributes.UserId, 'profile-1');
    expect(span.setAttribute).toHaveBeenCalledWith(UserAttributes.UserName, 'jane');
  });

  it('sets only the fields that are present', () => {
    const span = { setAttribute: jest.fn() } as unknown as Span;

    setUserAttributes(span, { username: 'jane' });

    expect(span.setAttribute).toHaveBeenCalledTimes(1);
    expect(span.setAttribute).toHaveBeenCalledWith(UserAttributes.UserName, 'jane');
  });

  it('is a no-op when span is undefined', () => {
    expect(() => setUserAttributes(undefined, { id: 'profile-1', username: 'jane' })).not.toThrow();
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

  it('appends the events to the execution document and resolves once flushed', async () => {
    const executionClient = createExecutionClient();

    await expect(
      collectAndWriteEvents({
        events$: of(event),
        execution: execution as never,
        executionClient: executionClient as never,
        logger: loggingSystemMock.createLogger(),
      })
    ).resolves.toBeUndefined();

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
