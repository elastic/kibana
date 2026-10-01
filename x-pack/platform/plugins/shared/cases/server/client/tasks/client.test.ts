/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_COMMENTS_PER_TASK, MAX_TASKS_PER_CASE } from '../../../common/constants';
import type { CaseTask } from '../../../common/types/domain/task/v1';
import { Operations } from '../../authorization';
import { mockCases } from '../../mocks';
import { createCasesClientMockArgs } from '../mocks';
import { createTasksSubClient } from './client';

const theCase = mockCases[0];

const task: CaseTask = {
  id: 'task-1',
  version: 'v1',
  title: 'Block sender',
  description: '',
  case_id: theCase.id,
  parent_task_id: null,
  status: 'open',
  priority: 'medium',
  assignees: [],
  due_date: null,
  started_at: null,
  completed_at: null,
  sort_order: 1000,
  template_id: null,
  owner: theCase.attributes.owner,
  created_at: '2024-01-01T00:00:00.000Z',
  created_by: { username: 'elastic', full_name: null, email: null, profile_uid: 'uid-1' },
  updated_at: null,
  updated_by: null,
};

describe('TasksSubClient', () => {
  const clientArgs = createCasesClientMockArgs();
  const {
    taskService,
    taskTemplateService,
    taskCommentService,
    caseService,
    userActionService,
    licensingService,
  } = clientArgs.services;
  const client = createTasksSubClient(clientArgs);

  beforeEach(() => {
    jest.clearAllMocks();
    licensingService.isAtLeastPlatinum.mockResolvedValue(true);
    caseService.getCase.mockResolvedValue(theCase);
    taskService.getTask.mockResolvedValue(task);
    taskService.findTasks.mockResolvedValue({ tasks: [], total: 0 });
    taskService.getTasksByCase.mockResolvedValue([task]);
    taskService.createTask.mockResolvedValue(task);
    taskService.updateTask.mockResolvedValue({ ...task, status: 'completed' });
    taskService.deleteTask.mockResolvedValue(['task-1', 'child-1', 'child-2']);
    taskCommentService.countByCase.mockResolvedValue({});
    taskCommentService.getByTask.mockResolvedValue({ comments: [], total: 0 });
    taskService.bulkCreateTasks.mockResolvedValue([task]);
  });

  describe('gates', () => {
    it('is not found when the feature is disabled', async () => {
      const disabledClient = createTasksSubClient({
        ...clientArgs,
        config: { ...clientArgs.config, tasks: { enabled: false } },
      });
      await expect(disabledClient.getByCase(theCase.id)).rejects.toThrow(
        'Case tasks are not enabled'
      );
      expect(caseService.getCase).not.toHaveBeenCalled();
    });

    it('returns 403 below Platinum', async () => {
      // Failure scenario: basic license.
      licensingService.isAtLeastPlatinum.mockResolvedValue(false);
      await expect(client.create(theCase.id, { title: 'x' })).rejects.toThrow(
        'subscribed to an Elastic Platinum license'
      );
      expect(taskService.createTask).not.toHaveBeenCalled();
    });

    it('authorizes against the case owner, not a caller-supplied one', async () => {
      await client.create(theCase.id, { title: 'x' });
      expect(clientArgs.authorization.ensureAuthorized).toHaveBeenCalledWith({
        operation: Operations.createTask,
        entities: [{ id: theCase.id, owner: theCase.attributes.owner }],
      });
    });

    it('propagates authorization failures without writing', async () => {
      clientArgs.authorization.ensureAuthorized.mockRejectedValueOnce(new Error('Unauthorized'));
      await expect(client.create(theCase.id, { title: 'x' })).rejects.toThrow('Unauthorized');
      expect(taskService.createTask).not.toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('rejects invalid input', async () => {
      await expect(client.create(theCase.id, { title: '' })).rejects.toThrow(
        'The title field cannot be an empty string.'
      );
    });

    it('requires the assign privilege when assignees are provided', async () => {
      await client.create(theCase.id, { title: 'x', assignees: [{ uid: 'u1' }] });
      expect(clientArgs.authorization.ensureAuthorized).toHaveBeenCalledWith(
        expect.objectContaining({ operation: Operations.assignCase })
      );
    });

    it('does not check the assign privilege for unassigned tasks', async () => {
      await client.create(theCase.id, { title: 'x' });
      expect(clientArgs.authorization.ensureAuthorized).not.toHaveBeenCalledWith(
        expect.objectContaining({ operation: Operations.assignCase })
      );
    });

    it('enforces the per-case limit', async () => {
      taskService.findTasks.mockResolvedValue({ tasks: [], total: MAX_TASKS_PER_CASE });
      await expect(client.create(theCase.id, { title: 'x' })).rejects.toThrow(
        `at most ${MAX_TASKS_PER_CASE} tasks`
      );
    });

    it('creates the task with the case owner and records a user action', async () => {
      await client.create(theCase.id, { title: 'Block sender', priority: 'high' });

      expect(taskService.createTask).toHaveBeenCalledWith(
        expect.objectContaining({
          caseId: theCase.id,
          owner: theCase.attributes.owner,
          title: 'Block sender',
          priority: 'high',
          user: clientArgs.user,
        })
      );
      expect(userActionService.creator.createUserAction).toHaveBeenCalledWith({
        userAction: expect.objectContaining({
          type: 'create_task',
          caseId: theCase.id,
          payload: { task: expect.objectContaining({ id: 'task-1', title: 'Block sender' }) },
        }),
      });
    });
  });

  describe('update', () => {
    it('records the changed fields and requires the assign privilege for assignee changes', async () => {
      await client.update('task-1', {
        version: 'v1',
        status: 'completed',
        assignees: [{ uid: 'u1' }],
      });

      expect(clientArgs.authorization.ensureAuthorized).toHaveBeenCalledWith(
        expect.objectContaining({ operation: Operations.assignCase })
      );
      expect(userActionService.creator.createUserAction).toHaveBeenCalledWith({
        userAction: expect.objectContaining({
          type: 'update_task',
          payload: {
            task_id: 'task-1',
            task_title: 'Block sender',
            changed_fields: expect.arrayContaining([
              { field: 'status', old_value: 'open', new_value: 'completed' },
            ]),
          },
        }),
      });
    });
  });

  describe('delete', () => {
    it('records how many sub-tasks were removed', async () => {
      await client.delete('task-1');

      expect(taskService.deleteTask).toHaveBeenCalledWith('task-1', { refresh: true });
      expect(userActionService.creator.createUserAction).toHaveBeenCalledWith({
        userAction: expect.objectContaining({
          type: 'delete_task',
          payload: { task_id: 'task-1', task_title: 'Block sender', subtasks_deleted: 2 },
        }),
      });
    });
  });

  describe('comments', () => {
    const comment = {
      id: 'c-1',
      version: 'v1',
      task_id: 'task-1',
      case_id: theCase.id,
      comment: 'Checked the logs.',
      owner: theCase.attributes.owner,
      created_at: '2026-01-01T00:00:00.000Z',
      created_by: task.created_by,
    };

    it('returns tasks with their comment counts', async () => {
      taskCommentService.countByCase.mockResolvedValue({ 'task-1': 2 });
      await expect(client.getByCase(theCase.id)).resolves.toEqual({
        tasks: [task],
        comment_counts: { 'task-1': 2 },
      });
    });

    it('adds a comment with the comment privilege and the task owner, without a case user action', async () => {
      taskCommentService.create.mockResolvedValue(comment);

      await expect(client.addComment('task-1', { comment: 'Checked the logs.' })).resolves.toEqual(
        comment
      );
      expect(clientArgs.authorization.ensureAuthorized).toHaveBeenCalledWith({
        operation: Operations.createTaskComment,
        entities: [{ id: theCase.id, owner: theCase.attributes.owner }],
      });
      expect(taskCommentService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          taskId: 'task-1',
          caseId: theCase.id,
          comment: 'Checked the logs.',
        })
      );
      expect(userActionService.creator.createUserAction).not.toHaveBeenCalled();
    });

    it('rejects an empty comment and enforces the per-task limit', async () => {
      await expect(client.addComment('task-1', { comment: '   ' })).rejects.toThrow(
        'The comment field cannot be an empty string.'
      );

      taskCommentService.getByTask.mockResolvedValue({
        comments: [],
        total: MAX_COMMENTS_PER_TASK,
      });
      await expect(client.addComment('task-1', { comment: 'one more' })).rejects.toThrow(
        `at most ${MAX_COMMENTS_PER_TASK} comments`
      );
    });

    it('deletes a comment only when it belongs to the task', async () => {
      taskCommentService.get.mockResolvedValue({ ...comment, task_id: 'other' });
      await expect(client.deleteComment('task-1', 'c-1')).rejects.toThrow(
        'does not belong to task'
      );
      expect(taskCommentService.delete).not.toHaveBeenCalled();

      taskCommentService.get.mockResolvedValue(comment);
      await client.deleteComment('task-1', 'c-1');
      expect(taskCommentService.delete).toHaveBeenCalledWith('c-1', { refresh: 'wait_for' });
    });

    it('removes the comments of a deleted task and its sub-tasks', async () => {
      await client.delete('task-1');
      expect(taskCommentService.deleteBy).toHaveBeenCalledWith({
        taskIds: ['task-1', 'child-1', 'child-2'],
      });
    });
  });

  describe('reorder', () => {
    it('rejects ids that do not belong to the case', async () => {
      await expect(client.reorder(theCase.id, ['task-1', 'other'])).rejects.toThrow(
        `Tasks other do not belong to case ${theCase.id}`
      );
      expect(taskService.reorderTasks).not.toHaveBeenCalled();
    });
  });

  describe('find', () => {
    it('restricts owners to the authorized ones and returns pagination', async () => {
      clientArgs.authorization.getAuthorizationFilter.mockResolvedValue({
        authorizedOwners: ['securitySolution'],
        filter: undefined,
        ensureSavedObjectsAreAuthorized: jest.fn(),
      });

      const result = await client.find({
        owner: ['securitySolution', 'observability'],
        assignees: 'u1',
      });

      expect(taskService.findTasks).toHaveBeenCalledWith(
        expect.objectContaining({ owners: ['securitySolution'], assignees: ['u1'] })
      );
      expect(result).toEqual({ tasks: [], page: 1, per_page: MAX_TASKS_PER_CASE, total: 0 });
    });

    it('returns nothing when no requested owner is authorized', async () => {
      clientArgs.authorization.getAuthorizationFilter.mockResolvedValue({
        authorizedOwners: ['securitySolution'],
        filter: undefined,
        ensureSavedObjectsAreAuthorized: jest.fn(),
      });

      await client.find({ owner: 'observability' });
      expect(taskService.findTasks).not.toHaveBeenCalled();
    });
  });

  describe('applyTemplate', () => {
    it('creates roots then sub-tasks with parent ids, resolves due dates, and records a user action', async () => {
      taskTemplateService.getTemplate.mockResolvedValue({
        id: 'tpl-1',
        version: 'v1',
        name: 'Phishing',
        description: '',
        tags: [],
        owner: theCase.attributes.owner,
        created_at: '2024-01-01T00:00:00.000Z',
        created_by: task.created_by,
        updated_at: null,
        updated_by: null,
        tasks: [
          {
            title: 'Root',
            description: '',
            priority: 'high',
            relative_due_days: 2,
            subtasks: [
              { title: 'Child', description: '', priority: 'low', relative_due_days: null },
            ],
          },
        ],
      });
      taskService.bulkCreateTasks
        .mockResolvedValueOnce([{ ...task, id: 'root-1' }])
        .mockResolvedValueOnce([{ ...task, id: 'child-1', parent_task_id: 'root-1' }]);

      const created = await client.applyTemplate(theCase.id, 'tpl-1');

      expect(created.map((t) => t.id)).toEqual(['root-1', 'child-1']);
      const [rootCall, childCall] = taskService.bulkCreateTasks.mock.calls;
      expect(rootCall[0].tasks[0]).toMatchObject({
        title: 'Root',
        priority: 'high',
        template_id: 'tpl-1',
        due_date: expect.any(String),
      });
      expect(childCall[0].tasks[0]).toMatchObject({
        title: 'Child',
        parent_task_id: 'root-1',
        due_date: null,
      });
      expect(userActionService.creator.createUserAction).toHaveBeenCalledWith({
        userAction: expect.objectContaining({
          type: 'apply_task_template',
          payload: { template_id: 'tpl-1', template_name: 'Phishing', tasks_created: 2 },
        }),
      });
    });

    it('enforces the per-case limit across the whole list', async () => {
      taskService.findTasks.mockResolvedValue({ tasks: [], total: MAX_TASKS_PER_CASE - 1 });
      taskTemplateService.getTemplate.mockResolvedValue({
        id: 'tpl-1',
        version: 'v1',
        name: 'Two',
        description: '',
        tags: [],
        owner: theCase.attributes.owner,
        created_at: '2024-01-01T00:00:00.000Z',
        created_by: task.created_by,
        updated_at: null,
        updated_by: null,
        tasks: [
          {
            title: 'A',
            description: '',
            priority: 'medium',
            relative_due_days: null,
            subtasks: [],
          },
          {
            title: 'B',
            description: '',
            priority: 'medium',
            relative_due_days: null,
            subtasks: [],
          },
        ],
      });

      await expect(client.applyTemplate(theCase.id, 'tpl-1')).rejects.toThrow(
        `at most ${MAX_TASKS_PER_CASE} tasks`
      );
      expect(taskService.bulkCreateTasks).not.toHaveBeenCalled();
    });
  });
});
