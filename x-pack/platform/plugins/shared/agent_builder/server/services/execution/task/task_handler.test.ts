/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defer, firstValueFrom, of, toArray } from 'rxjs';
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
import type { CallbackDeliveryService } from '../callback/callback_delivery_service';
import { deliverCallbackEvents } from '../callback/deliver_callback_events';
import {
  collectAndWriteEvents,
  handleAgentExecution,
  serializeExecutionError,
} from '../execution_runner';
import { createAgentExecutionClient } from '../persistence';

jest.mock('../execution_runner');
jest.mock('../persistence');
jest.mock('../callback/deliver_callback_events');

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
const deliverCallbackEventsMock = deliverCallbackEvents as jest.MockedFunction<
  typeof deliverCallbackEvents
>;

describe('TaskHandler event streaming and finalization', () => {
  const events: ChatEvent[] = [
    {
      type: ChatEventType.conversationUpdated,
      data: {
        conversation_id: 'conversation-1',
        title: 'Conversation',
        access_control: { access_mode: ConversationAccessControlMode.Public, entries: [] },
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
    executionMode: AgentExecutionMode.conversation,
    agentParams: {
      conversationId: 'conversation-1',
      nextInput: { message: 'hello' },
      callback: {
        url: 'https://callback.example.com/events?token=abc',
      },
    },
  } as const;

  let executionClient: {
    get: jest.Mock;
    updateStatus: jest.Mock;
    updateHeartbeat: jest.Mock;
  };
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let callbackDeliveryService: jest.Mocked<CallbackDeliveryService>;

  beforeEach(() => {
    jest.clearAllMocks();
    logger = loggingSystemMock.createLogger();
    callbackDeliveryService = {} as unknown as jest.Mocked<CallbackDeliveryService>;
    deliverCallbackEventsMock.mockResolvedValue(undefined);
    executionClient = {
      get: jest.fn().mockResolvedValue(execution),
      updateStatus: jest.fn().mockResolvedValue(undefined),
      updateHeartbeat: jest.fn().mockResolvedValue(undefined),
    };
    createAgentExecutionClientMock.mockReturnValue(executionClient as never);
    handleAgentExecutionMock.mockResolvedValue(of(...events));
    collectAndWriteEventsMock.mockImplementation(async ({ events$ }) => {
      await firstValueFrom(events$.pipe(toArray()));
    });
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

  const run = () =>
    createHandler().run({
      executionId: 'execution-1',
      fakeRequest: httpServerMock.createKibanaRequest(),
    });

  /**
   * The stream is connectable (no replay): events flow only while `run()` is in flight,
   * so the mock must subscribe when it is called, like the real `deliverCallbackEvents` does.
   */
  const observeDeliveredStream = () => {
    const seen: ChatEvent[] = [];
    let error: unknown;
    deliverCallbackEventsMock.mockImplementation(
      ({ events$ }) =>
        new Promise((resolve) => {
          events$.subscribe({
            next: (event) => seen.push(event),
            complete: () => resolve(),
            error: (err) => {
              error = err;
              resolve();
            },
          });
        })
    );
    return {
      seen,
      getError: () => error,
    };
  };

  it('passes the same shared event stream to persistence and callback delivery', async () => {
    await run();

    expect(deliverCallbackEventsMock).toHaveBeenCalledTimes(1);
    expect(deliverCallbackEventsMock).toHaveBeenCalledWith({
      execution,
      events$: expect.anything(),
      callbackDeliveryService,
      logger: expect.anything(),
    });
    expect(collectAndWriteEventsMock).toHaveBeenCalledTimes(1);
    expect(collectAndWriteEventsMock.mock.calls[0][0].events$).toBe(
      deliverCallbackEventsMock.mock.calls[0][0].events$
    );
  });

  it('emits the agent events through the delivered stream', async () => {
    const { seen } = observeDeliveredStream();

    await run();

    expect(seen).toEqual(events);
  });

  it('subscribes the underlying agent stream only once across both consumers', async () => {
    let subscriptions = 0;
    handleAgentExecutionMock.mockResolvedValue(
      defer(() => {
        subscriptions++;
        return of(...events);
      })
    );
    observeDeliveredStream();

    await run();

    expect(subscriptions).toBe(1);
  });

  it('drains callback delivery before marking the execution completed', async () => {
    const order: string[] = [];
    deliverCallbackEventsMock.mockImplementation(
      () =>
        new Promise((resolve) =>
          setImmediate(() => {
            order.push('delivered');
            resolve();
          })
        )
    );
    executionClient.updateStatus.mockImplementation(async (_id: string, status: string) => {
      order.push(`status:${status}`);
    });

    await run();

    expect(order).toEqual(['status:running', 'delivered', 'status:completed']);
  });

  it('turns errors thrown before the stream exists into a delivered stream error', async () => {
    handleAgentExecutionMock.mockRejectedValue(new Error('setup failed'));
    const { getError } = observeDeliveredStream();

    await run();

    expect(deliverCallbackEventsMock).toHaveBeenCalledTimes(1);
    expect(getError()).toEqual(new Error('setup failed'));
    expect(executionClient.updateStatus).toHaveBeenLastCalledWith(
      'execution-1',
      ExecutionStatus.failed,
      { code: 'internal_error', message: 'setup failed' }
    );
  });

  it('marks the execution failed when persistence rejects', async () => {
    collectAndWriteEventsMock.mockRejectedValue(new Error('agent failed'));

    await run();

    expect(executionClient.updateStatus).toHaveBeenLastCalledWith(
      'execution-1',
      ExecutionStatus.failed,
      { code: 'internal_error', message: 'agent failed' }
    );
  });

  it('marks the execution aborted for request-aborted errors', async () => {
    collectAndWriteEventsMock.mockRejectedValue(
      createRequestAbortedError('Converse request was aborted')
    );

    await run();

    expect(executionClient.updateStatus).toHaveBeenLastCalledWith(
      'execution-1',
      ExecutionStatus.aborted,
      { code: 'internal_error', message: 'Converse request was aborted' }
    );
  });

  it('omits the error from the status update when no error value was thrown', async () => {
    collectAndWriteEventsMock.mockRejectedValue(undefined);

    await run();

    expect(executionClient.updateStatus).toHaveBeenLastCalledWith(
      'execution-1',
      ExecutionStatus.failed,
      undefined
    );
  });

  it('drains callback delivery before finalizing a failed execution', async () => {
    const order: string[] = [];
    collectAndWriteEventsMock.mockRejectedValue(new Error('agent failed'));
    deliverCallbackEventsMock.mockImplementation(
      () =>
        new Promise((resolve) =>
          setImmediate(() => {
            order.push('delivered');
            resolve();
          })
        )
    );
    executionClient.updateStatus.mockImplementation(async (_id: string, status: string) => {
      order.push(`status:${status}`);
    });

    await run();

    expect(order).toEqual(['status:running', 'delivered', 'status:failed']);
  });

  it('logs when persisting the failure status fails', async () => {
    collectAndWriteEventsMock.mockRejectedValue(new Error('agent failed'));
    executionClient.updateStatus
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('status update failed'));

    await run();

    expect(logger.error).toHaveBeenCalledWith(
      'Failed to update status for execution execution-1: status update failed'
    );
  });
});
