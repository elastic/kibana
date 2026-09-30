/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { CaseTaskTemplate } from '../../../common/types/domain/task_template/v1';
import { createCasesClientMockArgs } from '../mocks';
import { seedTaskListsFromTemplate } from './apply_task_list';

const user = { username: 'elastic', full_name: null, email: null, profile_uid: 'u1' };

const template = (overrides: Partial<CaseTaskTemplate> = {}): CaseTaskTemplate => ({
  id: 'tpl-1',
  version: 'v1',
  name: 'Phishing',
  description: '',
  tags: [],
  owner: 'securitySolution',
  created_at: '2024-01-01T00:00:00.000Z',
  created_by: user,
  updated_at: null,
  updated_by: null,
  tasks: [
    {
      title: 'Block sender',
      description: '',
      priority: 'high',
      relative_due_days: null,
      subtasks: [],
    },
  ],
  ...overrides,
});

describe('seedTaskListsFromTemplate', () => {
  const { services } = createCasesClientMockArgs();
  const { taskService, taskTemplateService, userActionService } = services;
  const logger = loggingSystemMock.createLogger();

  const seed = (taskListIds: string[]) =>
    seedTaskListsFromTemplate({
      caseId: 'case-1',
      owner: 'securitySolution',
      taskListIds,
      user,
      logger,
      taskService,
      taskTemplateService,
      userActionService,
    });

  beforeEach(() => {
    jest.clearAllMocks();
    taskService.findTasks.mockResolvedValue({ tasks: [], total: 0 });
    taskService.bulkCreateTasks.mockResolvedValue([]);
  });

  it('applies every referenced task list and records a user action per list', async () => {
    taskTemplateService.getTemplate
      .mockResolvedValueOnce(template())
      .mockResolvedValueOnce(template({ id: 'tpl-2', name: 'Containment' }));

    await seed(['tpl-1', 'tpl-2']);

    expect(taskService.bulkCreateTasks).toHaveBeenCalledTimes(4);
    expect(taskService.bulkCreateTasks.mock.calls[0][0].tasks[0]).toMatchObject({
      title: 'Block sender',
      template_id: 'tpl-1',
    });
    expect(userActionService.creator.createUserAction).toHaveBeenCalledTimes(2);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('skips a task list from another solution and keeps going', async () => {
    // Failure scenario: a template YAML references a task list owned by observability.
    taskTemplateService.getTemplate
      .mockResolvedValueOnce(template({ owner: 'observability' }))
      .mockResolvedValueOnce(template({ id: 'tpl-2' }));

    await seed(['tpl-1', 'tpl-2']);

    expect(taskService.bulkCreateTasks).toHaveBeenCalledTimes(2);
    expect(logger.warn).toHaveBeenCalledWith(
      'Failed to add task list tpl-1 to case case-1: Error: task list belongs to observability'
    );
  });

  it('does not fail case creation when a task list cannot be read', async () => {
    // Failure scenario: the referenced task list was deleted.
    taskTemplateService.getTemplate.mockRejectedValue(new Error('not found'));

    await expect(seed(['missing'])).resolves.toBeUndefined();
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Failed to add task list missing to case case-1')
    );
  });
});
