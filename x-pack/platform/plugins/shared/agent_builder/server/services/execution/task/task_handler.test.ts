/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import {
  AgentBuilderErrorCode,
  ChatEventType,
  ConversationAccessControlMode,
  ConversationRoundStatus,
  ExecutionStatus,
  createRequestAbortedError,
  type ChatEvent,
} from '@kbn/agent-builder-common';
import { AgentExecutionMode } from '@kbn/agent-builder-common/agents';
import { createTaskHandler } from './task_handler';
import { deliverCallback } from '../callback_delivery';
import {
  collectAndWriteEvents,
  handleAgentExecution,
  serializeExecutionError,
} from '../execution_runner';
import { createAgentExecutionClient } from '../persistence';

jest.mock('../callback_delivery');
jest.mock('../execution_runner');
jest.mock('../persistence');

const deliverCallbackMock = deliverCallback as jest.MockedFunction<typeof deliverCallback>;
const handleAgentExecutionMock = handleAgentExecution as jest.MockedFunction<
  typeof handleAgentExecution
>;
const collectAndWriteEventsMock = collectAndWriteEvents as jest.MockedFunction<
  typeof collectAndWriteEvents
>;
const serializeExecutionErrorMock = serializeExecutionError as jest.MockedFunction<
  typeof serializeExecutionError
>;
const createAgentExecutionClientMock = createAgentExecutionClient as jest.MockedFunction<
  typeof createAgentExecutionClient
>;

describe('TaskHandler callback finalization', () => {
  const events: ChatEvent[] = [
    {
      type: ChatEventType.conversationUpdated,
      data: {
        conversation_id: 'conversation-1',
        title: 'Conversation',
        access_control: { access_mode: ConversationAccessControlMode.Public },
      },
    },
    {
      type: ChatEventType.roundComplete,
      data: {
        round: {
          id: 'round-1',
          status: ConversationRoundStatus.completed,
          input: { message: 'hello' },
          steps: [],
          response: { message: 'world' },
          started_at: '2026-01-01T00:00:00.000Z',
          time_to_first_token: 1,
          time_to_last_token: 2,
          model_usage: {
            connector_id: 'connector-1',
            llm_calls: 1,
            input_tokens: 1,
            output_tokens: 1,
          },
        },
      },
    },
  ];

  const execution = {
    executionId: 'execution-1',
    '@timestamp': '2026-01-01T00:00:00.000Z',
    status: ExecutionStatus.scheduled,
    agentId: 'agent-1',
    spaceId: 'default',
    eventCount: 0,
    events: [],
    metadata: {
      callback_url: 'https://relay.example.com/events?token=abc',
      callback_signing_secret: 'secret-1',
    },
    executionMode: AgentExecutionMode.conversation,
    agentParams: {
      conversationId: 'conversation-1',
      nextInput: { message: 'hello' },
    },
  } as const;

  let executionClient: {
    get: jest.Mock;
    updateStatus: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    executionClient = {
      get: jest.fn().mockResolvedValue(execution),
      updateStatus: jest.fn().mockResolvedValue(undefined),
    };
    createAgentExecutionClientMock.mockReturnValue(executionClient as never);
    handleAgentExecutionMock.mockResolvedValue(of(...events));
    collectAndWriteEventsMock.mockResolvedValue(events);
    deliverCallbackMock.mockResolvedValue(undefined);
    serializeExecutionErrorMock.mockImplementation((error: unknown) => ({
      code: 'internal_error' as never,
      message: error instanceof Error ? error.message : String(error),
    }));
  });

  const createHandler = () =>
    createTaskHandler({
      logger: loggingSystemMock.createLogger(),
      elasticsearch: { client: { asInternalUser: {} } },
    } as never);

  it('delivers a success callback before marking the execution completed', async () => {
    await createHandler().run({
      executionId: 'execution-1',
      fakeRequest: httpServerMock.createKibanaRequest(),
    });

    expect(deliverCallbackMock).toHaveBeenCalledWith({
      url: 'https://relay.example.com/events?token=abc',
      secret: 'secret-1',
      payload: {
        execution_id: 'execution-1',
        status: ExecutionStatus.completed,
        response: expect.objectContaining({
          conversation_id: 'conversation-1',
          round_id: 'round-1',
          response: { message: 'world', prompts: undefined },
        }),
      },
    });
    expect(executionClient.updateStatus).toHaveBeenLastCalledWith(
      'execution-1',
      ExecutionStatus.completed
    );
  });

  it('delivers a failure callback before marking the execution failed', async () => {
    handleAgentExecutionMock.mockRejectedValue(new Error('agent failed'));

    await createHandler().run({
      executionId: 'execution-1',
      fakeRequest: httpServerMock.createKibanaRequest(),
    });

    expect(deliverCallbackMock).toHaveBeenCalledWith({
      url: 'https://relay.example.com/events?token=abc',
      secret: 'secret-1',
      payload: {
        execution_id: 'execution-1',
        conversation_id: 'conversation-1',
        status: ExecutionStatus.failed,
        error: { code: 'internal_error', message: 'agent failed' },
      },
    });
    expect(executionClient.updateStatus).toHaveBeenLastCalledWith(
      'execution-1',
      ExecutionStatus.failed,
      { code: 'internal_error', message: 'agent failed' }
    );
  });

  it('delivers an aborted callback before marking the execution aborted', async () => {
    handleAgentExecutionMock.mockRejectedValue(
      createRequestAbortedError('Converse request was aborted')
    );
    serializeExecutionErrorMock.mockReturnValueOnce({
      code: AgentBuilderErrorCode.requestAborted,
      message: 'Converse request was aborted',
      meta: {},
    });

    await createHandler().run({
      executionId: 'execution-1',
      fakeRequest: httpServerMock.createKibanaRequest(),
    });

    expect(deliverCallbackMock).toHaveBeenCalledWith({
      url: 'https://relay.example.com/events?token=abc',
      secret: 'secret-1',
      payload: {
        execution_id: 'execution-1',
        conversation_id: 'conversation-1',
        status: ExecutionStatus.aborted,
        error: {
          code: AgentBuilderErrorCode.requestAborted,
          message: 'Converse request was aborted',
          meta: {},
        },
      },
    });
    expect(executionClient.updateStatus).toHaveBeenLastCalledWith(
      'execution-1',
      ExecutionStatus.aborted
    );
  });

  it('marks the execution failed when success callback delivery fails', async () => {
    deliverCallbackMock.mockRejectedValue(new Error('callback failed'));

    await createHandler().run({
      executionId: 'execution-1',
      fakeRequest: httpServerMock.createKibanaRequest(),
    });

    expect(executionClient.updateStatus).toHaveBeenLastCalledWith(
      'execution-1',
      ExecutionStatus.failed,
      { code: 'internal_error', message: 'callback failed' }
    );
  });
});
