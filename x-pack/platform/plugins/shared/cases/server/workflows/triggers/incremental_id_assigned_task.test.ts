/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  coreMock,
  httpServerMock,
  loggingSystemMock,
  savedObjectsRepositoryMock,
} from '@kbn/core/server/mocks';
import type { KibanaRequest } from '@kbn/core/server';
import { brandSpaceId } from '@kbn/core-spaces-common';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { TaskStatus } from '@kbn/task-manager-plugin/server';
import {
  getEventChainContext,
  setWorkflowEventChainContext,
} from '@kbn/workflows-extensions/server';
import {
  createWorkflowsClientMock,
  workflowsExtensionsMock,
} from '@kbn/workflows-extensions/server/mocks';
import { CaseUpdatedTriggerId } from '../../../common/workflows/triggers';
import { INCREMENTAL_ID_ASSIGNED_TRIGGER_TTL_MS } from '../../../common/constants/incremental_id';
import {
  getIncrementalIdAssignedTriggerTaskId,
  IncrementalIdAssignedTriggerTask,
  INCREMENTAL_ID_ASSIGNED_TRIGGER_TASK_TYPE,
} from './incremental_id_assigned_task';

const HOUR = 60 * 60 * 1000;

describe('IncrementalIdAssignedTriggerTask', () => {
  const logger = loggingSystemMock.createLogger();
  const request = httpServerMock.createKibanaRequest();
  const fakeRequest = httpServerMock.createKibanaRequest();
  const core = coreMock.createStart();
  const internalRepo = savedObjectsRepositoryMock.create();
  const workflowsExtensions = workflowsExtensionsMock.createStart();
  let taskManagerSetup: ReturnType<typeof taskManagerMock.createSetup>;
  let taskManager: ReturnType<typeof taskManagerMock.createStart>;
  let workflowsClient: ReturnType<typeof createWorkflowsClientMock>;
  let task: IncrementalIdAssignedTriggerTask;

  const params = (overrides = {}) => ({
    caseId: 'case-1',
    owner: 'securitySolution',
    spaceId: 'my-space',
    expiresAt: Date.now() + INCREMENTAL_ID_ASSIGNED_TRIGGER_TTL_MS,
    ...overrides,
  });

  const run = (
    taskParams = params(),
    state = {},
    requestForRun: KibanaRequest | null = fakeRequest
  ) => {
    const { createTaskRunner } =
      taskManagerSetup.registerTaskDefinitions.mock.calls[0][0][
        INCREMENTAL_ID_ASSIGNED_TRIGGER_TASK_TYPE
      ];
    return createTaskRunner({
      taskInstance: { params: taskParams, state },
      fakeRequest: requestForRun ?? undefined,
    } as never).run();
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers({ now: new Date('2026-10-16T12:00:00.000Z') });
    taskManagerSetup = taskManagerMock.createSetup();
    taskManager = taskManagerMock.createStart();
    workflowsClient = createWorkflowsClientMock();
    workflowsExtensions.getClient.mockResolvedValue(workflowsClient);
    core.savedObjects.createInternalRepository.mockReturnValue(internalRepo);
    task = new IncrementalIdAssignedTriggerTask(taskManagerSetup, 10, logger);
    task.start({ core, taskManager, workflowsExtensions });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('schedule', () => {
    it('schedules a one-off task with the request and a deadline', async () => {
      await task.schedule(
        { ...request, spaceId: brandSpaceId('my-space') },
        { caseId: 'case-1', owner: 'cases' }
      );

      expect(taskManager.schedule).toHaveBeenCalledWith(
        {
          id: getIncrementalIdAssignedTriggerTaskId('case-1'),
          taskType: INCREMENTAL_ID_ASSIGNED_TRIGGER_TASK_TYPE,
          runAt: new Date(Date.now() + 11 * 60 * 1000),
          params: {
            caseId: 'case-1',
            owner: 'cases',
            spaceId: 'my-space',
            expiresAt: Date.now() + INCREMENTAL_ID_ASSIGNED_TRIGGER_TTL_MS,
          },
          state: {},
          scope: ['cases'],
        },
        { request: expect.objectContaining({ spaceId: 'my-space' }) }
      );
    });

    it('keeps the workflow event-chain context of the request in the task params', async () => {
      const eventChainContext = {
        depth: 2,
        visitedWorkflowIds: ['workflow-1'],
        sourceExecutionId: 'execution-1',
      };
      const workflowRequest = httpServerMock.createKibanaRequest();
      setWorkflowEventChainContext(workflowRequest, eventChainContext);

      await task.schedule(
        { ...workflowRequest, spaceId: brandSpaceId('my-space') },
        { caseId: 'case-1', owner: 'cases' }
      );

      expect(taskManager.schedule).toHaveBeenCalledWith(
        expect.objectContaining({ params: expect.objectContaining({ eventChainContext }) }),
        expect.anything()
      );
    });

    it('does not add an event-chain context when the request has none', async () => {
      await task.schedule(
        { ...request, spaceId: brandSpaceId('my-space') },
        { caseId: 'case-1', owner: 'cases' }
      );

      const { params: scheduledParams } = taskManager.schedule.mock.calls[0][0];
      expect(scheduledParams).not.toHaveProperty('eventChainContext');
    });

    it('does not schedule when workflows are not available', async () => {
      workflowsExtensions.getClient.mockResolvedValue(
        createWorkflowsClientMock({ isWorkflowsAvailable: false })
      );

      await task.schedule(request, { caseId: 'case-1', owner: 'cases' });

      expect(taskManager.schedule).not.toHaveBeenCalled();
    });

    it('does not schedule without the workflows plugin', async () => {
      task.start({ core, taskManager });

      await task.schedule(request, { caseId: 'case-1', owner: 'cases' });

      expect(taskManager.schedule).not.toHaveBeenCalled();
    });

    it('does not throw when scheduling fails', async () => {
      taskManager.schedule.mockRejectedValue(new Error('no api key'));

      await expect(
        task.schedule(request, { caseId: 'case-1', owner: 'cases' })
      ).resolves.toBeUndefined();
      expect(logger.get().warn).toHaveBeenCalled();
    });

    it('ignores a task that already exists', async () => {
      taskManager.schedule.mockRejectedValue({ statusCode: 409 });

      await expect(
        task.schedule(request, { caseId: 'case-1', owner: 'cases' })
      ).resolves.toBeUndefined();
    });
  });

  describe('runSoon', () => {
    const found = (caseId: string, status = TaskStatus.Idle) => ({
      tag: 'ok' as const,
      value: { id: getIncrementalIdAssignedTriggerTaskId(caseId), status },
    });

    it('does not talk to Task Manager when there are no cases', async () => {
      await task.runSoon({ caseIds: [] });

      expect(taskManager.bulkGet).not.toHaveBeenCalled();
      expect(taskManager.runSoon).not.toHaveBeenCalled();
    });

    it('only runs the existing idle tasks', async () => {
      taskManager.bulkGet.mockResolvedValue([
        found('recent-idle'),
        found('recent-running', TaskStatus.Running),
        {
          tag: 'err',
          error: { id: getIncrementalIdAssignedTriggerTaskId('recent-missing') },
        },
      ] as never);

      await task.runSoon({
        caseIds: ['recent-idle', 'recent-running', 'recent-missing'],
      });

      expect(taskManager.bulkGet).toHaveBeenCalledTimes(1);
      expect(taskManager.bulkGet).toHaveBeenCalledWith([
        getIncrementalIdAssignedTriggerTaskId('recent-idle'),
        getIncrementalIdAssignedTriggerTaskId('recent-running'),
        getIncrementalIdAssignedTriggerTaskId('recent-missing'),
      ]);
      expect(taskManager.runSoon).toHaveBeenCalledTimes(1);
      expect(taskManager.runSoon).toHaveBeenCalledWith(
        getIncrementalIdAssignedTriggerTaskId('recent-idle')
      );
    });

    it('chunks the lookups', async () => {
      taskManager.bulkGet.mockResolvedValue([]);
      const caseIds = Array.from({ length: 250 }, (_, i) => `case-${i}`);

      await task.runSoon({ caseIds });

      expect(taskManager.bulkGet).toHaveBeenCalledTimes(3);
    });

    it('swallows errors of runSoon and bulkGet', async () => {
      taskManager.bulkGet.mockResolvedValueOnce([found('a'), found('b')] as never);
      taskManager.runSoon.mockRejectedValue(new Error('already running'));

      await expect(task.runSoon({ caseIds: ['a', 'b'] })).resolves.toBeUndefined();
      expect(taskManager.runSoon).toHaveBeenCalledTimes(2);

      taskManager.bulkGet.mockRejectedValueOnce(new Error('es down'));
      await expect(task.runSoon({ caseIds: ['a'] })).resolves.toBeUndefined();
    });
  });

  describe('run', () => {
    const mockCase = (attributes: Record<string, unknown>) =>
      internalRepo.get.mockResolvedValue({ id: 'case-1', attributes } as never);

    it('emits the trigger with the request of the task when the case has an id', async () => {
      mockCase({ incremental_id: 44994 });

      const result = await run();

      expect(internalRepo.get).toHaveBeenCalledWith('cases', 'case-1', { namespace: 'my-space' });
      expect(workflowsExtensions.getClient).toHaveBeenCalledWith(fakeRequest);
      expect(workflowsClient.emitEvent).toHaveBeenCalledWith(CaseUpdatedTriggerId, {
        caseId: 'case-1',
        owner: 'securitySolution',
        updatedFields: ['incremental_id'],
      });
      expect(result).toEqual({ state: {}, shouldDeleteTask: true });
    });

    it('restores the event-chain context on the request used to emit the trigger', async () => {
      mockCase({ incremental_id: 44994 });
      const eventChainContext = {
        depth: 2,
        visitedWorkflowIds: ['workflow-1'],
        sourceExecutionId: 'execution-1',
      };
      const taskRequest = httpServerMock.createKibanaRequest();

      await run(params({ eventChainContext }), {}, taskRequest);

      const requestForClient = workflowsExtensions.getClient.mock.calls[0][0];
      expect(getEventChainContext(requestForClient)).toEqual(eventChainContext);
    });

    it('does not set an event-chain context when the task has none', async () => {
      mockCase({ incremental_id: 44994 });
      const taskRequest = httpServerMock.createKibanaRequest();

      await run(params(), {}, taskRequest);

      const requestForClient = workflowsExtensions.getClient.mock.calls[0][0];
      expect(getEventChainContext(requestForClient)).toBeUndefined();
    });

    it('checks again later with a growing delay while the case has no id', async () => {
      mockCase({});

      expect(await run(params(), {})).toEqual({
        runAt: new Date(Date.now() + 10 * 60 * 1000),
        state: { checks: 1 },
      });
      expect(await run(params(), { checks: 1 })).toEqual({
        runAt: new Date(Date.now() + HOUR),
        state: { checks: 2 },
      });
      expect(await run(params(), { checks: 2 })).toEqual({
        runAt: new Date(Date.now() + 6 * HOUR),
        state: { checks: 3 },
      });
      expect(await run(params(), { checks: 10 })).toEqual({
        runAt: new Date(Date.now() + 6 * HOUR),
        state: { checks: 11 },
      });
      expect(workflowsClient.emitEvent).not.toHaveBeenCalled();
    });

    it('never schedules the next check after the deadline', async () => {
      mockCase({});
      const expiresAt = Date.now() + 2 * HOUR;

      const result = await run(params({ expiresAt }), { checks: 2 });

      expect(result).toEqual({ runAt: new Date(expiresAt), state: { checks: 3 } });
    });

    it('gives up and cleans up when the deadline passed without an id', async () => {
      mockCase({});

      const result = await run(params({ expiresAt: Date.now() - 1 }));

      expect(result).toEqual({ state: {}, shouldDeleteTask: true });
      expect(workflowsClient.emitEvent).not.toHaveBeenCalled();
    });

    it('cleans up when the case does not exist anymore', async () => {
      internalRepo.get.mockRejectedValue({ output: { statusCode: 404 } });

      const result = await run();

      expect(result).toEqual({ state: {}, shouldDeleteTask: true });
      expect(workflowsClient.emitEvent).not.toHaveBeenCalled();
    });

    it('cleans up when the task has no request to emit with', async () => {
      mockCase({ incremental_id: 1 });

      const result = await run(params(), {}, null);

      expect(result).toEqual({ state: {}, shouldDeleteTask: true });
      expect(workflowsClient.emitEvent).not.toHaveBeenCalled();
    });

    it('does not throw when reading the case fails, it checks again instead', async () => {
      internalRepo.get.mockRejectedValue(new Error('es down'));

      const result = await run();

      expect(result).toEqual({
        runAt: new Date(Date.now() + 10 * 60 * 1000),
        state: { checks: 1 },
      });
    });

    it('does not throw when emitting the trigger fails', async () => {
      mockCase({ incremental_id: 1 });
      jest.mocked(workflowsClient.emitEvent).mockRejectedValue(new Error('workflows down'));

      // the forwarder swallows the error, the trigger is not retried
      await expect(run()).resolves.toEqual({ state: {}, shouldDeleteTask: true });
    });
  });
});
