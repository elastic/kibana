/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { CaseTask } from '../../../common/types/domain/task/v1';
import { UserActionTypes } from '../../../common/types/domain/user_action/action/v1';
import { Operations } from '../../authorization';
import { createCaseEntity } from '../../authorization/utils';
import { mockCases } from '../../mocks';
import { createCasesClientMockArgs } from '../mocks';
import type { CasesClientArgs } from '../types';
import { createTasksSubClient } from './client';

const theCase = mockCases[0];

const task: CaseTask = {
  id: 'task-1',
  version: 'v1',
  title: 'Isolate the host',
  description: '',
  case_id: theCase.id,
  parent_task_id: null,
  status: 'open',
  priority: 'medium',
  assignees: [],
  due_date: null,
  required: true,
  started_at: null,
  completed_at: null,
  sort_order: 1000,
  template_id: null,
  workflow_id: 'wf-isolate',
  workflow_run: null,
  owner: theCase.attributes.owner,
  created_at: '2026-11-06T00:00:00.000Z',
  created_by: { username: 'elastic', full_name: null, email: null, profile_uid: 'uid-1' },
  updated_at: null,
  updated_by: null,
};

const running = {
  execution_id: 'exec-1',
  status: 'running' as const,
  started_at: '2026-11-06T00:00:01.000Z',
  finished_at: null,
  error: null,
};

const buildManagement = () => ({
  isWorkflowsAvailable: true,
  getWorkflow: jest.fn().mockResolvedValue({
    id: 'wf-isolate',
    name: 'Isolate host',
    valid: true,
    enabled: true,
    yaml: 'name: Isolate host',
    definition: { name: 'Isolate host', triggers: [{ type: 'manual' }], steps: [] },
  }),
  runWorkflow: jest.fn().mockResolvedValue('exec-1'),
  getWorkflowExecution: jest.fn(),
});

describe('TasksSubClient workflow runs', () => {
  const baseArgs = createCasesClientMockArgs();
  const management = buildManagement();
  const clientArgs = {
    ...baseArgs,
    workflowsManagement: management,
  } as unknown as CasesClientArgs;
  const { taskService, caseService, userActionService, licensingService } = baseArgs.services;
  const client = createTasksSubClient(clientArgs);

  beforeEach(() => {
    jest.clearAllMocks();
    licensingService.isAtLeastPlatinum.mockResolvedValue(true);
    licensingService.isAtLeastEnterprise.mockResolvedValue(true);
    caseService.getCase.mockResolvedValue(theCase);
    taskService.getTask.mockResolvedValue(task);
    taskService.updateTask.mockImplementation(async ({ workflow_run: run, status }) => ({
      ...task,
      ...(status ? { status } : {}),
      workflow_run: run ?? null,
    }));
  });

  it("starts the task's workflow as the caller with the case fields, and records it", async () => {
    const updated = await client.runWorkflow(task.id);

    expect(clientArgs.authorization.ensureAuthorized).toHaveBeenCalledWith({
      operation: Operations.updateTask,
      entities: [createCaseEntity(theCase)],
    });
    const [, , inputs, request, , metadata] = management.runWorkflow.mock.calls[0];
    expect(inputs.event).toMatchObject({
      caseId: theCase.id,
      owner: theCase.attributes.owner,
      title: theCase.attributes.title,
      severity: theCase.attributes.severity,
      status: theCase.attributes.status,
      tags: theCase.attributes.tags,
      taskId: task.id,
    });
    expect(request).toBe(clientArgs.request);
    expect(metadata).toMatchObject({ caseIds: [theCase.id] });
    // Running is not done: the task only moves to in progress.
    expect(updated.status).toBe('in_progress');
    expect(updated.workflow_run).toMatchObject({ execution_id: 'exec-1', status: 'running' });
    expect(userActionService.creator.createUserAction).toHaveBeenCalledWith({
      userAction: expect.objectContaining({ type: UserActionTypes.update_task }),
    });
  });

  it('completes the task only when the run succeeds', async () => {
    taskService.getTask.mockResolvedValue({ ...task, status: 'in_progress', workflow_run: running });

    management.getWorkflowExecution.mockResolvedValueOnce({ status: 'running' });
    const stillRunning = await client.refreshWorkflowRun(task.id);
    expect(taskService.updateTask).not.toHaveBeenCalled();
    expect(stillRunning.workflow_run?.status).toBe('running');

    management.getWorkflowExecution.mockResolvedValueOnce({
      status: 'failed',
      finishedAt: '2026-11-06T00:01:00.000Z',
      error: { message: 'Host not found', type: 'Error' },
    });
    const failed = await client.refreshWorkflowRun(task.id);
    expect(taskService.updateTask).toHaveBeenLastCalledWith(
      expect.not.objectContaining({ status: 'completed' })
    );
    expect(failed.workflow_run).toMatchObject({ status: 'failed', error: 'Host not found' });

    management.getWorkflowExecution.mockResolvedValueOnce({
      status: 'completed',
      finishedAt: '2026-11-06T00:02:00.000Z',
      error: null,
    });
    const succeeded = await client.refreshWorkflowRun(task.id);
    expect(taskService.updateTask).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 'completed' })
    );
    expect(succeeded.status).toBe('completed');
  });

  it('refuses a task without a workflow, a running one, and a manual completion mid-run', async () => {
    taskService.getTask.mockResolvedValueOnce({ ...task, workflow_id: null });
    await expect(client.runWorkflow(task.id)).rejects.toThrow('has no workflow to run');

    taskService.getTask.mockResolvedValueOnce({ ...task, workflow_run: running });
    await expect(client.runWorkflow(task.id)).rejects.toThrow('is already running');

    taskService.getTask.mockResolvedValueOnce({ ...task, workflow_run: running });
    await expect(client.update(task.id, { version: 'v1', status: 'completed' })).rejects.toThrow(
      'completes when its workflow run succeeds'
    );
    expect(management.runWorkflow).not.toHaveBeenCalled();
  });

  it('runs nothing for a task of a case the caller cannot see', async () => {
    (clientArgs.authorization.ensureAuthorized as jest.Mock).mockRejectedValueOnce(
      Boom.notFound()
    );
    await expect(client.runWorkflow(task.id)).rejects.toThrow();
    expect(management.runWorkflow).not.toHaveBeenCalled();
  });

  it('needs the workflows execute and read privileges, whichever path calls it', async () => {
    const checkPrivileges = jest.fn().mockResolvedValue({ hasAllRequested: false });
    const withoutWorkflowPrivileges = createTasksSubClient({
      ...clientArgs,
      securityStartPlugin: {
        authz: {
          mode: { useRbacForRequest: () => true },
          actions: { api: { get: (name: string) => `api:${name}` } },
          checkPrivilegesDynamicallyWithRequest: () => checkPrivileges,
        },
      },
    } as unknown as CasesClientArgs);

    await expect(withoutWorkflowPrivileges.runWorkflow(task.id)).rejects.toThrow(
      'needs the Workflows execute and read privileges'
    );
    expect(checkPrivileges).toHaveBeenCalledWith({
      kibana: ['api:workflowsManagement:execute', 'api:workflowsManagement:read'],
    });
    expect(management.runWorkflow).not.toHaveBeenCalled();
  });

  it('settles a finished run when the case tasks are read, without anyone polling', async () => {
    taskService.getTasksByCase.mockResolvedValue([
      { ...task, status: 'in_progress', workflow_run: running },
    ]);
    baseArgs.services.taskCommentService.countByCase.mockResolvedValue({});
    management.getWorkflowExecution.mockResolvedValueOnce({
      status: 'completed',
      finishedAt: '2026-11-06T00:02:00.000Z',
    });

    const { tasks } = await client.getByCase(theCase.id);

    expect(tasks[0].status).toBe('completed');
    expect(tasks[0].workflow_run?.status).toBe('succeeded');
  });

  it('is not found when running workflows from cases is off', async () => {
    const withoutWorkflows = createTasksSubClient({
      ...clientArgs,
      workflowsManagement: undefined,
    });
    await expect(withoutWorkflows.runWorkflow(task.id)).rejects.toThrow(
      'Running workflows from cases is not enabled.'
    );
  });
});
