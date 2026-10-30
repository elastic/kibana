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
import { collectAndWriteEvents, handleAgentExecution } from '../execution_runner';
import { serializeExecutionError } from '../utils/serialize_execution_error';
import { createAgentExecutionClient } from '../persistence';
import { createConversationClientMock } from '../../../test_utils/conversations';

jest.mock('../execution_runner');
jest.mock('../utils/serialize_execution_error');
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
  const surfacesService = {};
  const conversationClient = createConversationClientMock();
  const conversationService = {
    getScopedClientAsUser: jest.fn().mockResolvedValue(conversationClient),
  };

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
    conversationService.getScopedClientAsUser.mockResolvedValue(conversationClient);
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
      surfacesService,
      conversationService,
    } as never);

  const fakeRequest = httpServerMock.createKibanaRequest();

  const run = () =>
    createHandler().run({
      executionId: 'execution-1',
      fakeRequest,
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

  it('records a task_manager abort reason when Task Manager cancels the task', async () => {
    await createHandler().cancel({ executionId: 'execution-1' });

    expect(executionClient.updateStatus).toHaveBeenCalledWith(
      'execution-1',
      ExecutionStatus.aborted,
      { abortReason: { source: 'task_manager' } }
    );
  });

  it('passes the same shared event stream to persistence and callback delivery', async () => {
    await run();

    expect(deliverCallbackEventsMock).toHaveBeenCalledTimes(1);
    expect(deliverCallbackEventsMock).toHaveBeenCalledWith({
      execution,
      events$: expect.anything(),
      request: fakeRequest,
      callbackDeliveryService,
      surfacesService,
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
      { error: { code: 'internal_error', message: 'setup failed' } }
    );
  });

  it('marks the execution failed when persistence rejects', async () => {
    collectAndWriteEventsMock.mockRejectedValue(new Error('agent failed'));

    await run();

    expect(executionClient.updateStatus).toHaveBeenLastCalledWith(
      'execution-1',
      ExecutionStatus.failed,
      { error: { code: 'internal_error', message: 'agent failed' } }
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
      { error: { code: 'internal_error', message: 'Converse request was aborted' } }
    );
  });

  it('omits the error from the status update when no error value was thrown', async () => {
    collectAndWriteEventsMock.mockRejectedValue(undefined);

    await run();

    expect(executionClient.updateStatus).toHaveBeenLastCalledWith(
      'execution-1',
      ExecutionStatus.failed,
      { error: undefined }
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

  describe('an execution aborted before it started', () => {
    const owner = { id: 'user-1', username: 'elastic' };

    const runAborted = (overrides: Record<string, unknown> = {}) => {
      executionClient.get.mockResolvedValue({
        ...execution,
        status: ExecutionStatus.aborted,
        owner,
        ...overrides,
      });

      return run();
    };

    it('releases the conversation without running the agent', async () => {
      await runAborted();

      expect(handleAgentExecutionMock).not.toHaveBeenCalled();
      expect(conversationService.getScopedClientAsUser).toHaveBeenCalledWith({
        request: fakeRequest,
        user: { ...owner, isAdmin: false },
      });
      expect(conversationClient.update).toHaveBeenCalledWith(
        { id: 'conversation-1' },
        {
          source: 'execution',
          access: 'converse',
          retryOnConflict: true,
          activeExecution: { action: 'release', executionId: 'execution-1' },
        }
      );
    });

    it('releases nothing when the execution stores no conversation', async () => {
      await runAborted({
        agentParams: { ...execution.agentParams, storeConversation: false },
      });

      expect(conversationClient.update).not.toHaveBeenCalled();
    });

    it('releases nothing for a standalone execution', async () => {
      await runAborted({
        executionMode: AgentExecutionMode.standalone,
        agentParams: { nextInput: { message: 'hello' } },
      });

      expect(conversationClient.update).not.toHaveBeenCalled();
    });

    it('logs and still skips the run when the release fails', async () => {
      conversationClient.update.mockRejectedValueOnce(new Error('boom'));

      await expect(runAborted()).resolves.toBeUndefined();

      expect(handleAgentExecutionMock).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(
        'Failed to release conversation conversation-1 after execution execution-1 was aborted before it started: boom'
      );
    });
  });
});

describe('TaskHandler running as a bound service account', () => {
  const boundExecution = {
    executionId: 'execution-1',
    '@timestamp': '2026-01-01T00:00:00.000Z',
    status: ExecutionStatus.scheduled,
    agentId: 'agent-1',
    spaceId: 'default',
    eventCount: 0,
    events: [],
    executionMode: AgentExecutionMode.conversation,
    runAs: { type: 'service_account', serviceAccountId: 'sa-1' },
    agentParams: { conversationId: 'conversation-1', nextInput: { message: 'hello' } },
  } as const;
  let executionClient: { get: jest.Mock; updateStatus: jest.Mock; updateHeartbeat: jest.Mock };
  const scopedRequest = httpServerMock.createKibanaRequest();
  const boundConversationClient = createConversationClientMock();
  const boundConversationService = {
    getScopedClientAsUser: jest.fn().mockResolvedValue(boundConversationClient),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    deliverCallbackEventsMock.mockResolvedValue(undefined);
    executionClient = {
      get: jest.fn().mockResolvedValue(boundExecution),
      updateStatus: jest.fn().mockResolvedValue(undefined),
      updateHeartbeat: jest.fn().mockResolvedValue(undefined),
    };
    createAgentExecutionClientMock.mockReturnValue(executionClient as never);
    handleAgentExecutionMock.mockResolvedValue(of());
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
      logger: loggingSystemMock.createLogger(),
      elasticsearch: { client: { asInternalUser: {} } },
      callbackDeliveryService: {} as never,
      surfacesService: {},
      conversationService: boundConversationService,
    } as never);

  it('releases an execution aborted before it started through the account credential', async () => {
    const owner = { id: 'user-1', username: 'elastic' };
    executionClient.get.mockResolvedValue({
      ...boundExecution,
      status: ExecutionStatus.aborted,
      owner,
    });
    const withScopedRequest = jest.fn(async (fn: (request: unknown) => Promise<unknown>) =>
      fn(scopedRequest)
    );

    await createHandler().run({
      executionId: 'execution-1',
      runAs: { withScopedRequest } as never,
    });

    expect(handleAgentExecutionMock).not.toHaveBeenCalled();
    expect(withScopedRequest).toHaveBeenCalledWith(expect.any(Function), {
      expectedServiceAccountId: 'sa-1',
    });
    expect(boundConversationService.getScopedClientAsUser).toHaveBeenCalledWith({
      request: scopedRequest,
      user: { ...owner, isAdmin: false },
      runAs: 'sa-1',
    });
    expect(boundConversationClient.update).toHaveBeenCalledWith(
      { id: 'conversation-1' },
      expect.objectContaining({
        activeExecution: { action: 'release', executionId: 'execution-1' },
      })
    );
  });

  it('runs the whole execution inside the service account credential, pinned to the account', async () => {
    const withScopedRequest = jest.fn(async (fn: (request: unknown) => Promise<unknown>) =>
      fn(scopedRequest)
    );

    await createHandler().run({
      executionId: 'execution-1',
      runAs: { withScopedRequest } as never,
    });

    expect(withScopedRequest).toHaveBeenCalledWith(expect.any(Function), {
      expectedServiceAccountId: 'sa-1',
    });
    expect(handleAgentExecutionMock).toHaveBeenCalledWith(
      expect.objectContaining({ request: scopedRequest, execution: boundExecution })
    );
    expect(executionClient.updateStatus).toHaveBeenLastCalledWith(
      'execution-1',
      ExecutionStatus.completed
    );
  });

  it('records a credential failure that names the agent and the account', async () => {
    const withScopedRequest = jest
      .fn()
      .mockRejectedValue(new Error('No service account is bound to workload [agent/agent-1]'));

    await createHandler().run({
      executionId: 'execution-1',
      runAs: { withScopedRequest } as never,
    });

    expect(handleAgentExecutionMock).not.toHaveBeenCalled();
    expect(executionClient.updateStatus).toHaveBeenLastCalledWith(
      'execution-1',
      ExecutionStatus.failed,
      {
        error: {
          code: 'internal_error',
          message:
            'Agent "agent-1" cannot run as service account "sa-1": No service account is bound to workload [agent/agent-1]',
        },
      }
    );
  });

  it('fails a bound execution whose task carries no service account credential', async () => {
    await createHandler().run({
      executionId: 'execution-1',
      fakeRequest: httpServerMock.createKibanaRequest(),
    });

    expect(handleAgentExecutionMock).not.toHaveBeenCalled();
    expect(executionClient.updateStatus).toHaveBeenCalledWith(
      'execution-1',
      ExecutionStatus.failed,
      { error: expect.objectContaining({ message: expect.stringContaining('sa-1') }) }
    );
  });
});
