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
  ConversationSourceType,
  createBadRequestError,
  type ChatEvent,
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
import { executeAgent$, resolveServices } from './utils';

jest.mock('./utils', () => {
  const actual = jest.requireActual('./utils');

  return {
    ...actual,
    executeAgent$: jest.fn(),
    resolveServices: jest.fn(),
  };
});

const executeAgentMock = executeAgent$ as jest.MockedFunction<typeof executeAgent$>;
const resolveServicesMock = resolveServices as jest.MockedFunction<typeof resolveServices>;

describe('handleAgentExecution', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reports metering with the resolved conversation id when continuing by source', async () => {
    const source = {
      type: ConversationSourceType.Slack,
      external_conversation_id: 'team:T123/channel:C123/thread:callback-continuation',
    };
    const conversation = createEmptyConversation({
      id: 'conversation-from-source',
      title: 'Existing conversation',
      agent_id: 'test-agent',
      source,
    });
    const conversationClient = createConversationClientMock();
    conversationClient.getBySource.mockResolvedValue(conversation);
    conversationClient.update.mockResolvedValue(conversation);

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
        source,
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
      } as never,
      request: { headers: {} } as never,
      abortSignal: new AbortController().signal,
    });

    await lastValueFrom(events$.pipe(toArray()));

    expect(reportExecution).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: 'conversation-from-source',
      })
    );
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
