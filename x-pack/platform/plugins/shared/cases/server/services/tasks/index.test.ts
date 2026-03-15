/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { CaseTaskService } from '.';
import type { CaseTaskAttributes } from '../../../common/types/domain/task/v1';
import { CASE_TASK_SAVED_OBJECT, MAX_TASKS_PER_CASE } from '../../../common/constants';

const user = { username: 'elastic', full_name: null, email: null, profile_uid: 'uid-1' };

const taskSO = (overrides: Partial<CaseTaskAttributes> & { id?: string } = {}) => {
  const { id = 'task-1', ...attrs } = overrides;
  return {
    id,
    score: 1,
    type: CASE_TASK_SAVED_OBJECT,
    references: [],
    version: 'v1',
    attributes: {
      title: 'Test task',
      description: '',
      case_id: 'case-1',
      parent_task_id: null,
      status: 'open' as const,
      priority: 'medium' as const,
      assignees: [],
      due_date: null,
      started_at: null,
      completed_at: null,
      sort_order: 1000,
      template_id: null,
      owner: 'securitySolution',
      created_at: '2024-01-01T00:00:00.000Z',
      created_by: user,
      updated_at: null,
      updated_by: null,
      ...attrs,
    },
  };
};

const findResult = (saved_objects: Array<ReturnType<typeof taskSO>> = []) => ({
  saved_objects,
  total: saved_objects.length,
  per_page: 100,
  page: 1,
});

describe('CaseTaskService', () => {
  const soClient = savedObjectsClientMock.create();
  const service = new CaseTaskService({
    log: loggingSystemMock.createLogger(),
    unsecuredSavedObjectsClient: soClient,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    soClient.find.mockResolvedValue(findResult());
    soClient.get.mockImplementation(async (_type, id) => taskSO({ id }));
    soClient.bulkCreate.mockImplementation(
      async (objects) =>
        ({
          saved_objects: objects.map((o, i) => ({ ...o, id: `new-${i}`, version: 'v1' })),
        } as Awaited<ReturnType<typeof soClient.bulkCreate>>)
    );
  });

  describe('bulkCreateTasks', () => {
    it('creates root tasks with consecutive sort orders after the current max and a case reference', async () => {
      soClient.find.mockResolvedValue(findResult([taskSO({ sort_order: 3000 })]));

      const tasks = await service.bulkCreateTasks({
        caseId: 'case-1',
        owner: 'securitySolution',
        user,
        tasks: [{ title: 'A' }, { title: 'B', status: 'in_progress' }],
      });

      expect(soClient.find).toHaveBeenCalledTimes(1);
      const objects = soClient.bulkCreate.mock.calls[0][0] as Array<{
        attributes: CaseTaskAttributes;
        references: unknown;
      }>;
      expect(objects.map((o) => o.attributes.sort_order)).toEqual([4000, 5000]);
      expect(objects[0].references).toEqual([{ type: 'cases', id: 'case-1', name: 'parentCase' }]);
      expect(objects[0].attributes).toMatchObject({
        case_id: 'case-1',
        status: 'open',
        priority: 'medium',
        started_at: null,
        completed_at: null,
        created_by: user,
      });
      expect(objects[1].attributes.started_at).toEqual(expect.any(String));
      expect(tasks.map((t) => t.id)).toEqual(['new-0', 'new-1']);
    });

    it('rejects a sub-task under a task of another case', async () => {
      soClient.get.mockResolvedValue(taskSO({ id: 'parent', case_id: 'case-2' }));

      await expect(
        service.bulkCreateTasks({
          caseId: 'case-1',
          owner: 'securitySolution',
          user,
          tasks: [{ title: 'child', parent_task_id: 'parent' }],
        })
      ).rejects.toThrow('belongs to another case');
      expect(soClient.bulkCreate).not.toHaveBeenCalled();
    });

    it('rejects nesting deeper than one level', async () => {
      soClient.get.mockResolvedValue(taskSO({ id: 'child', parent_task_id: 'root' }));

      await expect(
        service.createTask({
          caseId: 'case-1',
          owner: 'securitySolution',
          user,
          title: 'grandchild',
          parent_task_id: 'child',
        })
      ).rejects.toThrow('Sub-tasks cannot have their own sub-tasks');
    });

    it('returns an empty array without writing when given no tasks', async () => {
      await expect(
        service.bulkCreateTasks({ caseId: 'case-1', owner: 'securitySolution', user, tasks: [] })
      ).resolves.toEqual([]);
      expect(soClient.bulkCreate).not.toHaveBeenCalled();
    });
  });

  describe('findTasks', () => {
    it('caps perPage at the per-case maximum and filters by case', async () => {
      await service.findTasks({ caseIds: ['case-1'], perPage: 5000 });

      expect(soClient.find).toHaveBeenCalledWith(
        expect.objectContaining({
          type: CASE_TASK_SAVED_OBJECT,
          perPage: MAX_TASKS_PER_CASE,
          sortField: 'sort_order',
          sortOrder: 'asc',
        })
      );
      expect(soClient.find.mock.calls[0][0].filter).toMatchObject({
        function: 'is',
        arguments: [{ value: 'cases-tasks.attributes.case_id' }, { value: 'case-1' }],
      });
    });

    it('wraps saved object errors in a CaseError', async () => {
      // Failure scenario: the saved objects client rejects (e.g. ES unavailable).
      soClient.find.mockRejectedValue(new Error('boom'));
      await expect(service.findTasks({})).rejects.toThrow('Failed to find tasks: Error: boom');
    });
  });

  describe('updateTask', () => {
    it('stamps started_at when moving to in_progress and keeps an existing value', async () => {
      soClient.update.mockResolvedValue({ ...taskSO(), attributes: {} });

      const first = await service.updateTask({
        taskId: 'task-1',
        version: 'v1',
        user,
        status: 'in_progress',
      });
      expect(first.started_at).toEqual(expect.any(String));

      soClient.get.mockResolvedValue(
        taskSO({ started_at: '2024-01-02T00:00:00.000Z', status: 'open' })
      );
      const second = await service.updateTask({
        taskId: 'task-1',
        version: 'v1',
        user,
        status: 'in_progress',
      });
      expect(second.started_at).toBe('2024-01-02T00:00:00.000Z');
    });

    it('sets completed_at on completion and clears it when reopened', async () => {
      soClient.update.mockResolvedValue({ ...taskSO(), attributes: {} });

      const completed = await service.updateTask({
        taskId: 'task-1',
        version: 'v1',
        user,
        status: 'completed',
      });
      expect(completed.completed_at).toEqual(expect.any(String));

      soClient.get.mockResolvedValue(
        taskSO({ status: 'completed', completed_at: '2024-01-02T00:00:00.000Z' })
      );
      const reopened = await service.updateTask({
        taskId: 'task-1',
        version: 'v1',
        user,
        status: 'open',
      });
      expect(reopened.completed_at).toBeNull();
      expect(soClient.update).toHaveBeenLastCalledWith(
        CASE_TASK_SAVED_OBJECT,
        'task-1',
        expect.objectContaining({ status: 'open', completed_at: null, updated_by: user }),
        { version: 'v1', refresh: undefined }
      );
    });
  });

  describe('deleteTask', () => {
    it('deletes the task together with its sub-tasks', async () => {
      soClient.find.mockResolvedValue(
        findResult([
          taskSO({ id: 'child-1', parent_task_id: 'task-1' }),
          taskSO({ id: 'child-2', parent_task_id: 'task-1' }),
        ])
      );

      await expect(service.deleteTask('task-1')).resolves.toBe(2);

      expect(soClient.find.mock.calls[0][0].filter).toMatchObject({
        arguments: [{ value: 'cases-tasks.attributes.parent_task_id' }, { value: 'task-1' }],
      });
      expect(soClient.bulkDelete).toHaveBeenCalledWith(
        [
          { type: CASE_TASK_SAVED_OBJECT, id: 'task-1' },
          { type: CASE_TASK_SAVED_OBJECT, id: 'child-1' },
          { type: CASE_TASK_SAVED_OBJECT, id: 'child-2' },
        ],
        { refresh: undefined }
      );
    });
  });

  describe('deleteTasksByCase', () => {
    it('deletes every task of the case and skips the write when there are none', async () => {
      await service.deleteTasksByCase('case-1');
      expect(soClient.bulkDelete).not.toHaveBeenCalled();

      soClient.find.mockResolvedValue(findResult([taskSO({ id: 'a' }), taskSO({ id: 'b' })]));
      await service.deleteTasksByCase('case-1');
      expect(soClient.bulkDelete).toHaveBeenCalledWith([
        { type: CASE_TASK_SAVED_OBJECT, id: 'a' },
        { type: CASE_TASK_SAVED_OBJECT, id: 'b' },
      ]);
    });
  });

  describe('reorderTasks', () => {
    it('rewrites sort orders with a fixed gap', async () => {
      await service.reorderTasks({ orderedTaskIds: ['b', 'a'] });

      expect(soClient.bulkUpdate).toHaveBeenCalledWith(
        [
          { type: CASE_TASK_SAVED_OBJECT, id: 'b', attributes: { sort_order: 1000 } },
          { type: CASE_TASK_SAVED_OBJECT, id: 'a', attributes: { sort_order: 2000 } },
        ],
        { refresh: undefined }
      );
    });
  });
});
