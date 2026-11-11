/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { SavedObjectsServiceStart } from '@kbn/core-saved-objects-server';
import type { UiSettingsServiceStart } from '@kbn/core-ui-settings-server';
import {
  AgentExecutionMode,
  ChatEventType,
  ChatTriggerMode,
  EventActorType,
  ExecutionStatus,
  createBackgroundExecutionAlreadyReportedError,
  createConversationBusyError,
  createConversationNotFoundError,
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
  agentParams: { nextInput: { message: 'go' }, parentTriggerMode: ChatTriggerMode.Always },
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

const chosenForParent = {
  connectorId: 'connector-9',
  projectRouting: 'project-a',
  reasoningLevel: 'high',
  configurationOverrides: { instructions: 'be brief' },
  maxContentLength: 4000,
  telemetryMetadata: { pluginId: 'security' },
  workflowExecutionId: 'workflow-run-1',
};

const parentInteractivity = {
  enabled: false,
  auto_approved_apis: [{ method: 'DELETE', path: '/api/x' }],
};

const parentRun = {
  executionId: 'parent-1',
  agentId: 'parent-agent',
  executionMode: AgentExecutionMode.conversation,
  interactivity: parentInteractivity,
  agentParams: {
    conversationId: 'conversation-1',
    nextInput: { message: 'start' },
    structuredOutput: true,
    browserApiTools: [{ id: 'browser-tool' }],
    callback: { url: 'https://example.test/hook' },
    ...chosenForParent,
  },
} as unknown as AgentExecution;

// The Agent Builder experimental features setting, read through a client scoped to the request;
// an `Error` stands for a read that fails.
let experimentalEnabled: boolean | Error = true;
const uiSettings = {
  asScopedToClient: () => ({
    get: async () => {
      if (experimentalEnabled instanceof Error) {
        throw experimentalEnabled;
      }
      return experimentalEnabled;
    },
  }),
} as unknown as UiSettingsServiceStart;
const savedObjects = { getScopedClient: () => ({}) } as unknown as SavedObjectsServiceStart;

// `null` stands for a missing parent record; `undefined` would select the default.
const executionById = (parent: AgentExecution | null = parentRun) =>
  jest
    .fn()
    .mockImplementation(async (id: string) =>
      id === 'parent-1' ? parent ?? undefined : finishedChild
    );

describe('wakeParent', () => {
  let maybeExecuteAgent: jest.Mock;
  let get: jest.Mock;
  let getScopedClientAsUser: jest.Mock;
  let conversationClient: ReturnType<typeof createConversationClientMock>;

  const wake = (signal?: AbortSignal) =>
    wakeParent({
      request,
      childExecutionId: 'child-1',
      executionClient: { get } as unknown as AgentExecutionClient,
      conversationService: {
        getScopedClientAsUser,
      } as unknown as ConversationService,
      executionService: { maybeExecuteAgent } as unknown as AgentExecutionService,
      uiSettings,
      savedObjects,
      signal,
    });

  beforeEach(() => {
    jest.clearAllMocks();
    experimentalEnabled = true;
    isPendingResumeConversationMock.mockReturnValue(false);
    maybeExecuteAgent = jest.fn().mockResolvedValue({ executionId: 'wake-1', events$: of() });
    get = executionById();
    getScopedClientAsUser = jest.fn().mockImplementation(async () => conversationClient);
    conversationClient = createConversationClientMock();
    conversationClient.get.mockResolvedValue({
      id: 'conversation-1',
      agent_id: 'creation-agent',
      state: { background_executions: pendingState },
    } as never);
  });

  it("reads the conversation as the owner and starts a run on the parent's agent, model and interactivity that carries the result", async () => {
    await expect(wake()).resolves.toBe('woken');

    expect(getScopedClientAsUser).toHaveBeenCalledWith({
      request,
      user: { id: 'profile-1', username: 'alice', isAdmin: false },
    });
    expect(maybeExecuteAgent).toHaveBeenCalledWith({
      mode: AgentExecutionMode.conversation,
      request,
      useTaskManager: true,
      requestImmediateClaim: true,
      interactive: parentInteractivity,
      params: {
        agentId: 'parent-agent',
        ...chosenForParent,
        conversationId: 'conversation-1',
        nextInput: { message: describeFinishedChild(finishedChild) },
        actor: { type: EventActorType.agent, id: 'child-agent', username: 'child-agent' },
        reportsBackgroundExecution: 'child-1',
        triggerMode: ChatTriggerMode.Always,
      },
    });
  });

  it('leaves the agent defaults in place when the run that spawned the child chose nothing', async () => {
    get = executionById({
      ...parentRun,
      interactivity: undefined,
      agentParams: { conversationId: 'conversation-1', nextInput: { message: 'start' } },
    } as AgentExecution);

    await expect(wake()).resolves.toBe('woken');
    expect(maybeExecuteAgent.mock.calls[0][0]).not.toHaveProperty('interactive');
    for (const key of Object.keys(chosenForParent)) {
      expect(maybeExecuteAgent.mock.calls[0][0].params).not.toHaveProperty(key);
    }
  });

  it('leaves the message for the next run when the sub-agent asked for never', async () => {
    get.mockResolvedValueOnce({
      ...finishedChild,
      agentParams: { ...finishedChild.agentParams, parentTriggerMode: ChatTriggerMode.Never },
    });

    await expect(wake()).resolves.toBe('queued');
    expect(maybeExecuteAgent).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({ triggerMode: ChatTriggerMode.Never }),
      })
    );
  });

  it('skips a child without a record, owner or parent run, and an idle parent that already reported or waits on a prompt', async () => {
    get.mockResolvedValueOnce({ ...finishedChild, owner: undefined });
    await expect(wake()).resolves.toBe('skipped');

    get.mockResolvedValueOnce(undefined);
    await expect(wake()).resolves.toBe('skipped');

    get.mockResolvedValueOnce({ ...finishedChild, parentExecutionId: undefined });
    await expect(wake()).resolves.toBe('skipped');

    get = executionById(null);
    await expect(wake()).resolves.toBe('skipped');

    get = executionById({
      ...parentRun,
      executionMode: AgentExecutionMode.standalone,
      agentParams: { nextInput: { message: 'start' } },
    } as AgentExecution);
    await expect(wake()).resolves.toBe('skipped');
    get = executionById();

    conversationClient.get.mockResolvedValueOnce({ id: 'conversation-1', state: {} } as never);
    await expect(wake()).resolves.toBe('skipped');

    conversationClient.get.mockRejectedValueOnce(
      createConversationNotFoundError({ conversationId: 'conversation-1' })
    );
    await expect(wake()).resolves.toBe('skipped');

    isPendingResumeConversationMock.mockReturnValueOnce(true);
    await expect(wake()).resolves.toBe('skipped');

    expect(maybeExecuteAgent).not.toHaveBeenCalled();
  });

  it('skips the wake when the experimental features setting is off, without reading anything', async () => {
    experimentalEnabled = false;

    await expect(wake()).resolves.toBe('skipped');
    expect(get).not.toHaveBeenCalled();
    expect(maybeExecuteAgent).not.toHaveBeenCalled();
  });

  it('propagates a failed read of the setting, so the attempt is retried instead of dropped', async () => {
    experimentalEnabled = new Error('settings unavailable');

    await expect(wake()).rejects.toThrow('settings unavailable');
    expect(maybeExecuteAgent).not.toHaveBeenCalled();
  });

  it("carries the task's signal into the execution reads and stops before a run once cancelled", async () => {
    const cancelledAfterSettings = new AbortController();
    cancelledAfterSettings.abort();
    await expect(wake(cancelledAfterSettings.signal)).rejects.toMatchObject({ name: 'AbortError' });
    expect(get).not.toHaveBeenCalled();

    const cancelledDuringConversationRead = new AbortController();
    conversationClient.get.mockImplementation(async () => {
      cancelledDuringConversationRead.abort();
      return { id: 'conversation-1', state: { background_executions: pendingState } } as never;
    });
    await expect(wake(cancelledDuringConversationRead.signal)).rejects.toMatchObject({
      name: 'AbortError',
    });
    const { signal } = cancelledDuringConversationRead;
    expect(get).toHaveBeenCalledWith('child-1', { signal });
    expect(get).toHaveBeenCalledWith('parent-1', { signal });
    expect(maybeExecuteAgent).not.toHaveBeenCalled();
  });

  it('tries a held parent even when its stored state does not list the child yet', async () => {
    conversationClient.get.mockResolvedValue({
      id: 'conversation-1',
      active_execution: { execution_id: 'parent-run' },
      state: {},
    } as never);
    maybeExecuteAgent.mockRejectedValue(
      createConversationBusyError({
        conversationId: 'conversation-1',
        activeExecutionId: 'parent-run',
      })
    );

    await expect(wake()).resolves.toBe('busy');
    expect(maybeExecuteAgent).toHaveBeenCalledTimes(1);
  });

  it('skips when the write finds the result already reported and propagates any other error', async () => {
    maybeExecuteAgent.mockRejectedValueOnce(
      createBackgroundExecutionAlreadyReportedError({
        conversationId: 'conversation-1',
        executionId: 'child-1',
      })
    );
    await expect(wake()).resolves.toBe('skipped');

    maybeExecuteAgent.mockRejectedValueOnce(new Error('boom'));
    await expect(wake()).rejects.toThrow('boom');
  });
});

describe('reportToParent', () => {
  let maybeExecuteAgent: jest.Mock;
  let get: jest.Mock;
  let ensureScheduled: jest.Mock;
  let removeIfExists: jest.Mock;
  let conversationClient: ReturnType<typeof createConversationClientMock>;

  const retryTask = [
    {
      id: 'agent-wake-child-1',
      taskType: 'agent-builder:wake-parent',
      params: { childExecutionId: 'child-1' },
      state: {},
      scope: ['agent-builder'],
      enabled: true,
      runAt: new Date('2026-01-01T00:00:05.000Z'),
    },
    { request, cloneApiKey: true },
  ];

  const report = (execution: AgentExecution = finishedChild) =>
    reportToParent({
      execution,
      request,
      executionClient: { get } as unknown as AgentExecutionClient,
      conversationService: {
        getScopedClientAsUser: jest.fn().mockResolvedValue(conversationClient),
      } as unknown as ConversationService,
      executionService: { maybeExecuteAgent } as unknown as AgentExecutionService,
      uiSettings,
      savedObjects,
      taskManager: { ensureScheduled, removeIfExists } as unknown as TaskManagerStartContract,
      logger: loggingSystemMock.createLogger(),
    });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    experimentalEnabled = true;
    isPendingResumeConversationMock.mockReturnValue(false);
    maybeExecuteAgent = jest.fn().mockResolvedValue({ executionId: 'wake-1', events$: of() });
    get = executionById();
    ensureScheduled = jest.fn().mockResolvedValue({});
    removeIfExists = jest.fn().mockResolvedValue(undefined);
    conversationClient = createConversationClientMock();
    conversationClient.get.mockResolvedValue({
      id: 'conversation-1',
      state: { background_executions: pendingState },
    } as never);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('does nothing for a child that is not reporting, and settles without a run when its parent is gone', async () => {
    await report({
      ...finishedChild,
      agentParams: { nextInput: { message: 'go' } },
    } as AgentExecution);
    expect(ensureScheduled).not.toHaveBeenCalled();
    expect(get).not.toHaveBeenCalled();

    get = executionById(null);
    await report();
    expect(ensureScheduled).toHaveBeenCalledTimes(1);
    expect(maybeExecuteAgent).not.toHaveBeenCalled();
    expect(removeIfExists).toHaveBeenCalledWith('agent-wake-child-1');
  });

  it('leaves the child for the next run, with no retry task, when the experimental features setting is off', async () => {
    experimentalEnabled = false;

    await report();

    expect(ensureScheduled).not.toHaveBeenCalled();
    expect(maybeExecuteAgent).not.toHaveBeenCalled();
    expect(removeIfExists).not.toHaveBeenCalled();
  });

  it('still leaves a retry task behind when the setting cannot be read', async () => {
    experimentalEnabled = new Error('settings unavailable');

    await report();

    expect(ensureScheduled).toHaveBeenCalledWith(...retryTask);
    expect(maybeExecuteAgent).not.toHaveBeenCalled();
    expect(removeIfExists).not.toHaveBeenCalled();
  });

  it('holds a retry task on its own credential across the wake and removes it once the report settled', async () => {
    await report();

    expect(ensureScheduled).toHaveBeenCalledWith(...retryTask);
    expect(ensureScheduled.mock.invocationCallOrder[0]).toBeLessThan(
      maybeExecuteAgent.mock.invocationCallOrder[0]
    );
    expect(removeIfExists).toHaveBeenCalledWith('agent-wake-child-1');

    removeIfExists.mockRejectedValueOnce(new Error('gone'));
    await expect(report()).resolves.toBeUndefined();
  });

  it('leaves the retry task when the parent is busy or the attempt fails', async () => {
    maybeExecuteAgent.mockRejectedValueOnce(
      createConversationBusyError({ conversationId: 'conversation-1', activeExecutionId: 'x' })
    );
    await report();

    conversationClient.get.mockRejectedValueOnce(new Error('ES timeout'));
    await report();

    expect(ensureScheduled.mock.calls).toEqual([retryTask, retryTask]);
    expect(removeIfExists).not.toHaveBeenCalled();
  });

  it('still attempts the wake when the retry task cannot be scheduled, and schedules again when it must be retried', async () => {
    ensureScheduled.mockRejectedValueOnce(new Error('task manager down'));
    await expect(report()).resolves.toBeUndefined();
    expect(maybeExecuteAgent).toHaveBeenCalledTimes(1);
    expect(ensureScheduled).toHaveBeenCalledTimes(1);
    expect(removeIfExists).not.toHaveBeenCalled();

    ensureScheduled.mockRejectedValueOnce(new Error('task manager down'));
    maybeExecuteAgent.mockRejectedValueOnce(
      createConversationBusyError({ conversationId: 'conversation-1', activeExecutionId: 'x' })
    );
    await report();
    expect(ensureScheduled).toHaveBeenCalledTimes(3);
    expect(removeIfExists).not.toHaveBeenCalled();
  });
});
