/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import {
  ChatEventType,
  ConversationAccessControlMode,
  ConversationRoundStatus,
  ExecutionStatus,
  createRequestAbortedError,
  type ChatEvent,
} from '@kbn/agent-builder-common';
import { AgentExecutionMode } from '@kbn/agent-builder-common/agents';
import { createTaskHandler } from './task_handler';
import type { CallbackDeliveryService } from '../callback_delivery_service';
import {
  collectAndWriteEvents,
  handleAgentExecution,
  serializeExecutionError,
} from '../execution_runner';
import { createAgentExecutionClient } from '../persistence';

jest.mock('../execution_runner');
jest.mock('../persistence');

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
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let callbackDeliveryService: jest.Mocked<CallbackDeliveryService>;

  beforeEach(() => {
    jest.clearAllMocks();
    logger = loggingSystemMock.createLogger();
    callbackDeliveryService = {
      validateCallbackUrl: jest.fn(),
      makeSuccessCallbackRequestIfConfigured: jest.fn().mockResolvedValue(undefined),
      makeFailureCallbackRequestIfConfigured: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<CallbackDeliveryService>;
    executionClient = {
      get: jest.fn().mockResolvedValue(execution),
      updateStatus: jest.fn().mockResolvedValue(undefined),
    };
    createAgentExecutionClientMock.mockReturnValue(executionClient as never);
    handleAgentExecutionMock.mockResolvedValue(of(...events));
    collectAndWriteEventsMock.mockResolvedValue(events);
    serializeExecutionErrorMock.mockImplementation((error: unknown) => ({
      code: 'internal_error' as never,
      message: error instanceof Error ? error.message : String(error),
    }));
  });

  const createHandler = () =>
    createTaskHandler({
      logger,
      elasticsearch: { client: { asInternalUser: {} } },
      callbackDeliveryService,
    } as never);

  it('delivers a success callback before marking the execution completed', async () => {
    await createHandler().run({
      executionId: 'execution-1',
      fakeRequest: httpServerMock.createKibanaRequest(),
    });

    expect(callbackDeliveryService.makeSuccessCallbackRequestIfConfigured).toHaveBeenCalledWith({
      callbackUrl: 'https://relay.example.com/events?token=abc',
      executionId: 'execution-1',
      events,
    });
    expect(callbackDeliveryService.makeFailureCallbackRequestIfConfigured).not.toHaveBeenCalled();
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

    expect(callbackDeliveryService.makeFailureCallbackRequestIfConfigured).toHaveBeenCalledWith({
      callbackUrl: 'https://relay.example.com/events?token=abc',
      payload: {
        execution_id: 'execution-1',
        error: { code: 'internal_error', message: 'agent failed' },
        status: ExecutionStatus.failed,
      },
    });
    expect(executionClient.updateStatus).toHaveBeenLastCalledWith(
      'execution-1',
      ExecutionStatus.failed,
      { code: 'internal_error', message: 'agent failed' }
    );
  });

  it('omits the conversation id from source-based failure callbacks', async () => {
    const sourceBasedExecution = {
      ...execution,
      agentParams: {
        nextInput: { message: 'hello' },
        source: {
          type: 'slack',
          external_conversation_id: 'team:T123/channel:C123/thread:callback-continuation',
        },
      },
    };
    executionClient.get.mockResolvedValue(sourceBasedExecution);
    handleAgentExecutionMock.mockResolvedValue(of());
    collectAndWriteEventsMock.mockRejectedValue(new Error('agent failed'));

    await createHandler().run({
      executionId: 'execution-1',
      fakeRequest: httpServerMock.createKibanaRequest(),
    });

    expect(callbackDeliveryService.makeFailureCallbackRequestIfConfigured).toHaveBeenCalledWith({
      callbackUrl: 'https://relay.example.com/events?token=abc',
      payload: {
        execution_id: 'execution-1',
        error: { code: 'internal_error', message: 'agent failed' },
        status: ExecutionStatus.failed,
      },
    });
  });

  it('delivers an aborted callback before marking the execution aborted', async () => {
    handleAgentExecutionMock.mockRejectedValue(
      createRequestAbortedError('Converse request was aborted')
    );

    await createHandler().run({
      executionId: 'execution-1',
      fakeRequest: httpServerMock.createKibanaRequest(),
    });

    expect(callbackDeliveryService.makeFailureCallbackRequestIfConfigured).toHaveBeenCalledWith({
      callbackUrl: 'https://relay.example.com/events?token=abc',
      payload: {
        execution_id: 'execution-1',
        error: { code: 'internal_error', message: 'Converse request was aborted' },
        status: ExecutionStatus.aborted,
      },
    });
    expect(executionClient.updateStatus).toHaveBeenLastCalledWith(
      'execution-1',
      ExecutionStatus.aborted,
      { code: 'internal_error', message: 'Converse request was aborted' }
    );
  });

  it('omits error from failure callbacks when no error value was thrown', async () => {
    handleAgentExecutionMock.mockRejectedValue(undefined);

    await createHandler().run({
      executionId: 'execution-1',
      fakeRequest: httpServerMock.createKibanaRequest(),
    });

    expect(callbackDeliveryService.makeFailureCallbackRequestIfConfigured).toHaveBeenCalledWith({
      callbackUrl: 'https://relay.example.com/events?token=abc',
      payload: {
        execution_id: 'execution-1',
        status: ExecutionStatus.failed,
      },
    });
    expect(executionClient.updateStatus).toHaveBeenLastCalledWith(
      'execution-1',
      ExecutionStatus.failed,
      undefined
    );
  });

  it('marks an aborted execution failed when aborted callback delivery fails', async () => {
    handleAgentExecutionMock.mockRejectedValue(
      createRequestAbortedError('Converse request was aborted')
    );
    callbackDeliveryService.makeFailureCallbackRequestIfConfigured.mockRejectedValue(
      new Error('callback failed')
    );
    serializeExecutionErrorMock
      .mockReturnValueOnce({
        code: 'internal_error' as never,
        message: 'Converse request was aborted',
      })
      .mockReturnValueOnce({
        code: 'internal_error' as never,
        message: 'callback failed',
      });

    await createHandler().run({
      executionId: 'execution-1',
      fakeRequest: httpServerMock.createKibanaRequest(),
    });

    expect(callbackDeliveryService.makeFailureCallbackRequestIfConfigured).toHaveBeenCalledWith({
      callbackUrl: 'https://relay.example.com/events?token=abc',
      payload: {
        execution_id: 'execution-1',
        error: { code: 'internal_error', message: 'Converse request was aborted' },
        status: ExecutionStatus.aborted,
      },
    });
    expect(executionClient.updateStatus).toHaveBeenLastCalledWith(
      'execution-1',
      ExecutionStatus.failed,
      { code: 'internal_error', message: 'callback failed' }
    );
  });

  it('omits the conversation id for standalone execution failure callbacks', async () => {
    executionClient.get.mockResolvedValue({
      ...execution,
      executionMode: AgentExecutionMode.standalone,
      agentParams: {
        nextInput: { message: 'hello' },
        telemetryMetadata: undefined,
      },
    });
    handleAgentExecutionMock.mockRejectedValue(new Error('agent failed'));

    await createHandler().run({
      executionId: 'execution-1',
      fakeRequest: httpServerMock.createKibanaRequest(),
    });

    expect(callbackDeliveryService.makeFailureCallbackRequestIfConfigured).toHaveBeenCalledWith({
      callbackUrl: 'https://relay.example.com/events?token=abc',
      payload: {
        execution_id: 'execution-1',
        error: { code: 'internal_error', message: 'agent failed' },
        status: ExecutionStatus.failed,
      },
    });
  });

  it('logs when persisting the failure status fails', async () => {
    handleAgentExecutionMock.mockRejectedValue(new Error('agent failed'));
    executionClient.updateStatus
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('status update failed'));

    await createHandler().run({
      executionId: 'execution-1',
      fakeRequest: httpServerMock.createKibanaRequest(),
    });

    expect(logger.error).toHaveBeenCalledWith(
      'Failed to update status for execution execution-1: status update failed'
    );
  });

  it('marks the execution failed when success callback delivery fails', async () => {
    callbackDeliveryService.makeSuccessCallbackRequestIfConfigured.mockRejectedValue(
      new Error('callback failed')
    );

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
