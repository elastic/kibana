/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import {
  AgentExecutionMode,
  ChatEventType,
  EventActorType,
  ExecutionStatus,
  createBackgroundExecutionAlreadyReportedError,
  createConversationBusyError,
} from '@kbn/agent-builder-common';
import type { AgentExecution, AgentExecutionService } from '@kbn/agent-builder-server/execution';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import { createConversationClientMock } from '../../../test_utils/conversations';
import type { ConversationService } from '../../conversation';
import type { AgentExecutionClient } from '../persistence';
import { isPendingResumeConversation } from './conversations';
import { describeFinishedChild, reportToParent, wakeParent } from './wake_parent';

jest.mock('./conversations', () => ({
  ...jest.requireActual('./conversations'),
  isPendingResumeConversation: jest.fn(),
}));

const isPendingResumeConversationMock = isPendingResumeConversation as jest.MockedFunction<
  typeof isPendingResumeConversation
>;

const request = httpServerMock.createKibanaRequest();
const pendingState = { 'child-1': { execution_id: 'child-1', status: ExecutionStatus.running } };

const finishedChild = {
  executionId: 'child-1',
  agentId: 'child-agent',
  status: ExecutionStatus.completed,
  parentExecutionId: 'parent-1',
  owner: { id: 'profile-1', username: 'alice' },
  agentParams: { nextInput: { message: 'go' }, wakeParentOnCompletion: true },
  events: [
    {
      type: ChatEventType.roundComplete,
      data: { round: { response: { message: 'APPLE' } } },
    },
  ],
} as unknown as AgentExecution;

describe('describeFinishedChild', () => {
  it('reports the result of a completed sub-agent and the error of a failed one', () => {
    expect(describeFinishedChild(finishedChild)).toBe(
      'Background sub-agent execution child-1 (agent child-agent) finished with status completed.\n\nResult:\nAPPLE'
    );
    expect(
      describeFinishedChild({
        ...finishedChild,
        status: ExecutionStatus.failed,
        events: [],
        error: { code: 'internalError', message: 'boom' },
      } as unknown as AgentExecution)
    ).toBe(
      'Background sub-agent execution child-1 (agent child-agent) finished with status failed.\n\nError: boom'
    );
  });
});

describe('wakeParent', () => {
  let executeAgent: jest.Mock;
  let get: jest.Mock;
  let getScopedClientAsUser: jest.Mock;
  let conversationClient: ReturnType<typeof createConversationClientMock>;

  const wake = () =>
    wakeParent({
      request,
      conversationId: 'conversation-1',
      childExecutionId: 'child-1',
      executionClient: { get } as unknown as AgentExecutionClient,
      conversationService: {
        getScopedClientAsUser,
      } as unknown as ConversationService,
      executionService: { executeAgent } as unknown as AgentExecutionService,
    });

  beforeEach(() => {
    jest.clearAllMocks();
    isPendingResumeConversationMock.mockReturnValue(false);
    executeAgent = jest.fn().mockResolvedValue({ executionId: 'wake-1', events$: of() });
    get = jest.fn().mockResolvedValue(finishedChild);
    getScopedClientAsUser = jest.fn().mockImplementation(async () => conversationClient);
    conversationClient = createConversationClientMock();
    conversationClient.get.mockResolvedValue({
      id: 'conversation-1',
      state: { background_executions: pendingState },
    } as never);
  });

  it('reads the conversation as the owner and starts a run on the parent that carries the result', async () => {
    await expect(wake()).resolves.toBe('woken');

    expect(getScopedClientAsUser).toHaveBeenCalledWith({
      request,
      user: { id: 'profile-1', username: 'alice', isAdmin: false },
    });
    expect(executeAgent).toHaveBeenCalledWith({
      mode: AgentExecutionMode.conversation,
      request,
      useTaskManager: true,
      requestImmediateClaim: true,
      params: {
        conversationId: 'conversation-1',
        nextInput: { message: describeFinishedChild(finishedChild) },
        actor: { type: EventActorType.agent, id: 'child-agent', username: 'child-agent' },
        reportsBackgroundExecution: 'child-1',
      },
    });
  });

  it('skips a child without a record or owner, and an idle parent that already reported or waits on a prompt', async () => {
    get.mockResolvedValueOnce({ ...finishedChild, owner: undefined });
    await expect(wake()).resolves.toBe('skipped');

    get.mockResolvedValueOnce(undefined);
    await expect(wake()).resolves.toBe('skipped');

    conversationClient.get.mockResolvedValueOnce({ id: 'conversation-1', state: {} } as never);
    await expect(wake()).resolves.toBe('skipped');

    isPendingResumeConversationMock.mockReturnValueOnce(true);
    await expect(wake()).resolves.toBe('skipped');

    expect(executeAgent).not.toHaveBeenCalled();
  });

  it('tries a held parent even when its stored state does not list the child yet', async () => {
    conversationClient.get.mockResolvedValue({
      id: 'conversation-1',
      active_execution: { execution_id: 'parent-run' },
      state: {},
    } as never);
    executeAgent.mockRejectedValue(
      createConversationBusyError({
        conversationId: 'conversation-1',
        activeExecutionId: 'parent-run',
      })
    );

    await expect(wake()).resolves.toBe('busy');
    expect(executeAgent).toHaveBeenCalledTimes(1);
  });

  it('skips when the write finds the result already reported and propagates any other error', async () => {
    executeAgent.mockRejectedValueOnce(
      createBackgroundExecutionAlreadyReportedError({
        conversationId: 'conversation-1',
        executionId: 'child-1',
      })
    );
    await expect(wake()).resolves.toBe('skipped');

    executeAgent.mockRejectedValueOnce(new Error('boom'));
    await expect(wake()).rejects.toThrow('boom');
  });
});

describe('reportToParent', () => {
  let executeAgent: jest.Mock;
  let peek: jest.Mock;
  let schedule: jest.Mock;
  let conversationClient: ReturnType<typeof createConversationClientMock>;

  const report = (execution: AgentExecution = finishedChild) =>
    reportToParent({
      execution,
      request,
      executionClient: {
        peek,
        get: jest.fn().mockResolvedValue(finishedChild),
      } as unknown as AgentExecutionClient,
      conversationService: {
        getScopedClientAsUser: jest.fn().mockResolvedValue(conversationClient),
      } as unknown as ConversationService,
      executionService: { executeAgent } as unknown as AgentExecutionService,
      taskManager: { schedule } as unknown as TaskManagerStartContract,
      logger: loggingSystemMock.createLogger(),
    });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    isPendingResumeConversationMock.mockReturnValue(false);
    executeAgent = jest.fn().mockResolvedValue({ executionId: 'wake-1', events$: of() });
    peek = jest.fn().mockResolvedValue({ conversationId: 'conversation-1' });
    schedule = jest.fn().mockResolvedValue({});
    conversationClient = createConversationClientMock();
    conversationClient.get.mockResolvedValue({
      id: 'conversation-1',
      state: { background_executions: pendingState },
    } as never);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('wakes the parent of a background sub-agent and schedules nothing', async () => {
    await report({
      ...finishedChild,
      agentParams: { nextInput: { message: 'go' } },
    } as AgentExecution);
    expect(peek).not.toHaveBeenCalled();

    peek.mockResolvedValueOnce({});
    await report();
    expect(executeAgent).not.toHaveBeenCalled();

    await report();
    expect(executeAgent).toHaveBeenCalledTimes(1);
    expect(schedule).not.toHaveBeenCalled();
  });

  it('leaves a retry task on its own credential when the parent is busy or the attempt fails', async () => {
    executeAgent.mockRejectedValueOnce(
      createConversationBusyError({ conversationId: 'conversation-1', activeExecutionId: 'x' })
    );
    await report();

    conversationClient.get.mockRejectedValueOnce(new Error('ES timeout'));
    await report();

    const retryTask = [
      {
        id: 'agent-wake-child-1',
        taskType: 'agent-builder:wake-parent',
        params: { conversationId: 'conversation-1', childExecutionId: 'child-1' },
        state: {},
        scope: ['agent-builder'],
        enabled: true,
        runAt: new Date('2026-01-01T00:00:05.000Z'),
      },
      { request, cloneApiKey: true },
    ];
    expect(schedule.mock.calls).toEqual([retryTask, retryTask]);
  });
});
