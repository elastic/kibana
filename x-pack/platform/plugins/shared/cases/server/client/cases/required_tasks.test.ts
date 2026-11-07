/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CasesClientArgs } from '../types';
import { hasOpenRequiredTasks, throwIfClosingWithOpenRequiredTasks } from './required_tasks';

const task = (title: string, required: boolean) => ({ title, required, status: 'open' });

const buildArgs = (tasks: Array<{ title: string; required: boolean }>, tasksEnabled = true) => {
  const findTasks = jest.fn().mockResolvedValue({ tasks, total: tasks.length });
  const clientArgs = {
    config: { tasks: { enabled: tasksEnabled } },
    services: {
      taskService: { findTasks },
      licensingService: { isAtLeastPlatinum: jest.fn().mockResolvedValue(true) },
    },
  } as unknown as CasesClientArgs;
  return { clientArgs, findTasks };
};

const closing = (status = 'open') => [
  {
    updateReq: { id: 'case-1', status: 'closed' },
    originalCase: { id: 'case-1', attributes: { status, title: 'Credential dumping' } },
  },
];

describe('throwIfClosingWithOpenRequiredTasks', () => {
  it('refuses to close while a required task is open, naming the tasks', async () => {
    const { clientArgs, findTasks } = buildArgs([task('Record the outcome', true)]);

    await expect(
      throwIfClosingWithOpenRequiredTasks({
        casesToUpdate: closing(),
        clientArgs,
        hasPlatinumLicense: true,
      })
    ).rejects.toThrow(
      'Finish the required tasks before closing the case "Credential dumping": Record the outcome.'
    );
    // Only unfinished tasks are read: completed and cancelled ones never block a close.
    expect(findTasks).toHaveBeenCalledWith({
      caseIds: ['case-1'],
      status: ['open', 'in_progress'],
    });
  });

  it('ignores open tasks that are not required', async () => {
    const { clientArgs } = buildArgs([task('Review the linked investigations', false)]);

    await expect(
      throwIfClosingWithOpenRequiredTasks({
        casesToUpdate: closing(),
        clientArgs,
        hasPlatinumLicense: true,
      })
    ).resolves.toBeUndefined();
  });

  it('checks nothing for a case that is not being closed, or without tasks', async () => {
    const { clientArgs, findTasks } = buildArgs([task('Record the outcome', true)]);
    await throwIfClosingWithOpenRequiredTasks({
      casesToUpdate: closing('closed'),
      clientArgs,
      hasPlatinumLicense: true,
    });
    await throwIfClosingWithOpenRequiredTasks({
      casesToUpdate: closing(),
      clientArgs,
      hasPlatinumLicense: false,
    });
    const disabled = buildArgs([task('Record the outcome', true)], false);
    await throwIfClosingWithOpenRequiredTasks({
      casesToUpdate: closing(),
      clientArgs: disabled.clientArgs,
      hasPlatinumLicense: true,
    });

    expect(findTasks).not.toHaveBeenCalled();
    expect(disabled.findTasks).not.toHaveBeenCalled();
  });
});

describe('a required task whose workflow already succeeded', () => {
  it('completes at the close check, so the case closes without anyone polling', async () => {
    const running = {
      ...task('Record the outcome', true),
      id: 'task-1',
      version: 'v1',
      status: 'in_progress',
      case_id: 'case-1',
      owner: 'securitySolution',
      workflow_run: {
        execution_id: 'exec-1',
        status: 'running',
        started_at: '2026-11-06T00:00:00.000Z',
        finished_at: null,
      },
    };
    const { clientArgs } = buildArgs([running as unknown as { title: string; required: boolean }]);
    const updateTask = jest.fn(async (patch) => ({ ...running, ...patch }));
    const createUserAction = jest.fn();
    const args = {
      ...clientArgs,
      user: { username: 'elastic' },
      logger: { debug: jest.fn() },
      services: {
        ...clientArgs.services,
        taskService: { ...clientArgs.services.taskService, updateTask },
        userActionService: { creator: { createUserAction } },
      },
      workflowsManagement: {
        isWorkflowsAvailable: true,
        getWorkflowExecution: jest
          .fn()
          .mockResolvedValue({ status: 'completed', finishedAt: '2026-11-06T00:01:00.000Z' }),
      },
    } as unknown as CasesClientArgs;

    await expect(
      throwIfClosingWithOpenRequiredTasks({
        casesToUpdate: closing(),
        clientArgs: args,
        hasPlatinumLicense: true,
      })
    ).resolves.toBeUndefined();
    expect(updateTask).toHaveBeenCalledWith(expect.objectContaining({ status: 'completed' }));
    expect(createUserAction).toHaveBeenCalled();
  });
});

describe('hasOpenRequiredTasks', () => {
  it('reports open required tasks so close by pushing leaves the case open', async () => {
    expect(
      await hasOpenRequiredTasks({
        caseId: 'case-1',
        clientArgs: buildArgs([task('Record the outcome', true)]).clientArgs,
      })
    ).toBe(true);
    expect(
      await hasOpenRequiredTasks({
        caseId: 'case-1',
        clientArgs: buildArgs([task('Verify the AI verdict', false)]).clientArgs,
      })
    ).toBe(false);
  });
});
