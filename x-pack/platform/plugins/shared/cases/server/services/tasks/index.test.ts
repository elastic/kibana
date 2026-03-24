/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { CaseTaskService } from './index';
import type { CaseTaskAttributes } from '../../../common/types/domain/task/v1';
import { CASE_TASK_SAVED_OBJECT, CASE_SAVED_OBJECT } from '../../../common/constants';

const mockUser = {
  username: 'elastic',
  full_name: 'Elastic User',
  email: 'elastic@example.com',
  profile_uid: 'uid-1',
};

const makeTaskSO = (overrides: Partial<CaseTaskAttributes> & { id?: string } = {}) => {
  const { id = 'task-1', ...attrs } = overrides;
  return {
    id,
    score: 1,
    type: CASE_TASK_SAVED_OBJECT,
    references: [],
    version: 'WzEsMV0=',
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
      custom_fields: [],
      required_role: null,
      owner_team: null,
      owner: 'securitySolution',
      created_at: '2024-01-01T00:00:00.000Z',
      created_by: mockUser,
      updated_at: null,
      updated_by: null,
      ...attrs,
    },
  };
};

describe('CaseTaskService', () => {
  let soClient: ReturnType<typeof savedObjectsClientMock.create>;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let service: CaseTaskService;

  beforeEach(() => {
    soClient = savedObjectsClientMock.create();
    logger = loggingSystemMock.createLogger();
    service = new CaseTaskService({
      log: logger,
      unsecuredSavedObjectsClient: soClient,
    });

    // Default: find returns empty (for sort_order and descendant queries)
    soClient.find.mockResolvedValue({
      saved_objects: [],
      total: 0,
      per_page: 1,
      page: 1,
    });
    // Default: case update for task_summary succeeds
    soClient.get.mockImplementation(async (type, id) => {
      if (type === CASE_SAVED_OBJECT) {
        return { id, type, attributes: {}, references: [], version: 'Wzk5LDFd' };
      }
      return makeTaskSO({ id });
    });
    soClient.update.mockResolvedValue({ id: 'case-1', type: CASE_SAVED_OBJECT, attributes: {}, references: [] });
  });

  // ---- createTask -----------------------------------------------------------

  describe('createTask', () => {
    it('creates a task SO with correct attributes', async () => {
      soClient.create.mockResolvedValue(makeTaskSO());

      const result = await service.createTask({
        caseId: 'case-1',
        title: 'My task',
        owner: 'securitySolution',
        user: mockUser,
      });

      expect(soClient.create).toHaveBeenCalledWith(
        CASE_TASK_SAVED_OBJECT,
        expect.objectContaining({
          title: 'My task',
          case_id: 'case-1',
          status: 'open',
          priority: 'medium',
          parent_task_id: null,
          owner: 'securitySolution',
        }),
        expect.objectContaining({
          references: [expect.objectContaining({ id: 'case-1', type: CASE_SAVED_OBJECT })],
        })
      );

      expect(result.id).toBe('task-1');
      expect(result.title).toBe('Test task');
    });

    it('auto-sets started_at when status is in_progress', async () => {
      soClient.create.mockResolvedValue(makeTaskSO({ status: 'in_progress', started_at: '2024-01-01T00:00:00.000Z' }));

      await service.createTask({
        caseId: 'case-1',
        title: 'Task',
        status: 'in_progress',
        owner: 'securitySolution',
        user: mockUser,
      });

      const createdAttrs = soClient.create.mock.calls[0][1] as CaseTaskAttributes;
      expect(createdAttrs.started_at).not.toBeNull();
    });

    it('auto-sets completed_at when status is completed', async () => {
      soClient.create.mockResolvedValue(makeTaskSO({ status: 'completed', completed_at: '2024-01-01T00:00:00.000Z' }));

      await service.createTask({
        caseId: 'case-1',
        title: 'Task',
        status: 'completed',
        owner: 'securitySolution',
        user: mockUser,
      });

      const createdAttrs = soClient.create.mock.calls[0][1] as CaseTaskAttributes;
      expect(createdAttrs.completed_at).not.toBeNull();
    });

    it('calls syncTaskSummary after create', async () => {
      soClient.create.mockResolvedValue(makeTaskSO());

      await service.createTask({
        caseId: 'case-1',
        title: 'Task',
        owner: 'securitySolution',
        user: mockUser,
      });

      // syncTaskSummary issues a find + get + update on the case SO
      expect(soClient.find).toHaveBeenCalled();
      expect(soClient.update).toHaveBeenCalledWith(
        CASE_SAVED_OBJECT,
        'case-1',
        expect.objectContaining({ task_summary: expect.any(Object) }),
        expect.any(Object)
      );
    });

    it('uses sort_order gap = 1000 for first task', async () => {
      soClient.create.mockResolvedValue(makeTaskSO({ sort_order: 1000 }));

      await service.createTask({
        caseId: 'case-1',
        title: 'Task',
        owner: 'securitySolution',
        user: mockUser,
      });

      const createdAttrs = soClient.create.mock.calls[0][1] as CaseTaskAttributes;
      expect(createdAttrs.sort_order).toBe(1000);
    });

    it('uses max(existing) + 1000 for subsequent tasks', async () => {
      soClient.find.mockResolvedValueOnce({
        saved_objects: [makeTaskSO({ sort_order: 3000 })],
        total: 1,
        per_page: 1,
        page: 1,
      });
      soClient.create.mockResolvedValue(makeTaskSO({ sort_order: 4000 }));

      await service.createTask({
        caseId: 'case-1',
        title: 'Task',
        owner: 'securitySolution',
        user: mockUser,
      });

      const createdAttrs = soClient.create.mock.calls[0][1] as CaseTaskAttributes;
      expect(createdAttrs.sort_order).toBe(4000);
    });

    it('rejects subtask that would exceed depth 2', async () => {
      // parent chain: task-3 → task-2 → task-1 (root)
      soClient.get.mockImplementation(async (type, id) => {
        if (type === CASE_TASK_SAVED_OBJECT) {
          if (id === 'task-3') return makeTaskSO({ id: 'task-3', parent_task_id: 'task-2' });
          if (id === 'task-2') return makeTaskSO({ id: 'task-2', parent_task_id: 'task-1' });
          if (id === 'task-1') return makeTaskSO({ id: 'task-1', parent_task_id: null });
        }
        return { id, type: CASE_SAVED_OBJECT, attributes: {}, references: [], version: 'v1' };
      });

      await expect(
        service.createTask({
          caseId: 'case-1',
          title: 'Too deep',
          parent_task_id: 'task-3',
          owner: 'securitySolution',
          user: mockUser,
        })
      ).rejects.toThrow('Maximum subtask depth');
    });
  });

  // ---- getTask --------------------------------------------------------------

  describe('getTask', () => {
    it('fetches a single task by id', async () => {
      soClient.get.mockResolvedValue(makeTaskSO({ id: 'task-42' }));

      const result = await service.getTask('task-42');
      expect(result.id).toBe('task-42');
      expect(soClient.get).toHaveBeenCalledWith(CASE_TASK_SAVED_OBJECT, 'task-42');
    });

    it('throws a CaseError when SO client throws', async () => {
      soClient.get.mockRejectedValue(new Error('not found'));
      await expect(service.getTask('bad-id')).rejects.toThrow();
    });
  });

  // ---- findTasks ------------------------------------------------------------

  describe('findTasks', () => {
    it('passes correct sort/page params', async () => {
      soClient.find.mockResolvedValue({ saved_objects: [], total: 0, per_page: 50, page: 1 });

      await service.findTasks({ sort_field: 'due_date', sort_order: 'desc', page: 2, per_page: 25 });

      expect(soClient.find).toHaveBeenCalledWith(
        expect.objectContaining({
          type: CASE_TASK_SAVED_OBJECT,
          sortField: 'due_date',
          sortOrder: 'desc',
          page: 2,
          perPage: 25,
        })
      );
    });

    it('caps per_page at 200', async () => {
      soClient.find.mockResolvedValue({ saved_objects: [], total: 0, per_page: 200, page: 1 });

      await service.findTasks({ per_page: 9999 });

      expect(soClient.find).toHaveBeenCalledWith(
        expect.objectContaining({ perPage: 200 })
      );
    });
  });

  // ---- updateTask -----------------------------------------------------------

  describe('updateTask', () => {
    it('sets started_at on open→in_progress transition', async () => {
      soClient.get.mockImplementation(async (type, id) => {
        if (type === CASE_TASK_SAVED_OBJECT)
          return makeTaskSO({ id, status: 'open', started_at: null });
        return { id, type: CASE_SAVED_OBJECT, attributes: {}, references: [], version: 'v1' };
      });
      soClient.update.mockResolvedValue({
        id: 'task-1',
        type: CASE_TASK_SAVED_OBJECT,
        attributes: {},
        references: [],
      });

      await service.updateTask({
        taskId: 'task-1',
        status: 'in_progress',
        user: mockUser,
        version: 'WzEsMV0=',
      });

      const [, , updatedAttrs] = soClient.update.mock.calls[0];
      expect((updatedAttrs as CaseTaskAttributes).started_at).not.toBeNull();
    });

    it('sets completed_at on →completed transition', async () => {
      soClient.get.mockImplementation(async (type, id) => {
        if (type === CASE_TASK_SAVED_OBJECT)
          return makeTaskSO({ id, status: 'in_progress', completed_at: null });
        return { id, type: CASE_SAVED_OBJECT, attributes: {}, references: [], version: 'v1' };
      });
      soClient.update.mockResolvedValue({
        id: 'task-1',
        type: CASE_TASK_SAVED_OBJECT,
        attributes: {},
        references: [],
      });

      await service.updateTask({
        taskId: 'task-1',
        status: 'completed',
        user: mockUser,
        version: 'WzEsMV0=',
      });

      const [, , updatedAttrs] = soClient.update.mock.calls[0];
      expect((updatedAttrs as CaseTaskAttributes).completed_at).not.toBeNull();
    });

    it('does not overwrite started_at if already set', async () => {
      const existingStartedAt = '2024-01-01T00:00:00.000Z';
      soClient.get.mockImplementation(async (type, id) => {
        if (type === CASE_TASK_SAVED_OBJECT)
          return makeTaskSO({ id, status: 'in_progress', started_at: existingStartedAt });
        return { id, type: CASE_SAVED_OBJECT, attributes: {}, references: [], version: 'v1' };
      });
      soClient.update.mockResolvedValue({
        id: 'task-1',
        type: CASE_TASK_SAVED_OBJECT,
        attributes: {},
        references: [],
      });

      await service.updateTask({
        taskId: 'task-1',
        status: 'in_progress',
        user: mockUser,
        version: 'WzEsMV0=',
      });

      const [, , updatedAttrs] = soClient.update.mock.calls[0];
      expect((updatedAttrs as CaseTaskAttributes).started_at).toBeUndefined();
    });
  });

  // ---- deleteTask -----------------------------------------------------------

  describe('deleteTask', () => {
    it('deletes the task and all descendants', async () => {
      // task-1 has child task-2, task-2 has child task-3
      soClient.get.mockImplementation(async (type, id) => {
        if (type === CASE_TASK_SAVED_OBJECT)
          return makeTaskSO({ id, case_id: 'case-1' });
        return { id, type: CASE_SAVED_OBJECT, attributes: {}, references: [], version: 'v1' };
      });

      soClient.find.mockImplementation(async (options) => {
        const f = JSON.stringify((options as { filter?: unknown }).filter ?? '');
        if (f.includes('task-1'))
          return { saved_objects: [makeTaskSO({ id: 'task-2', parent_task_id: 'task-1' })], total: 1, per_page: 1000, page: 1 };
        if (f.includes('task-2'))
          return { saved_objects: [makeTaskSO({ id: 'task-3', parent_task_id: 'task-2' })], total: 1, per_page: 1000, page: 1 };
        return { saved_objects: [], total: 0, per_page: 1000, page: 1 };
      });

      soClient.bulkDelete = jest.fn().mockResolvedValue({});

      await service.deleteTask('task-1');

      expect(soClient.bulkDelete).toHaveBeenCalledWith(
        expect.arrayContaining([
          { type: CASE_TASK_SAVED_OBJECT, id: 'task-1' },
          { type: CASE_TASK_SAVED_OBJECT, id: 'task-2' },
          { type: CASE_TASK_SAVED_OBJECT, id: 'task-3' },
        ])
      );
    });

    it('syncs task_summary after delete', async () => {
      soClient.get.mockImplementation(async (type, id) => {
        if (type === CASE_TASK_SAVED_OBJECT)
          return makeTaskSO({ id, case_id: 'case-1' });
        return { id, type: CASE_SAVED_OBJECT, attributes: {}, references: [], version: 'v1' };
      });
      soClient.bulkDelete = jest.fn().mockResolvedValue({});

      await service.deleteTask('task-1');

      expect(soClient.update).toHaveBeenCalledWith(
        CASE_SAVED_OBJECT,
        'case-1',
        expect.objectContaining({ task_summary: expect.any(Object) }),
        expect.any(Object)
      );
    });
  });

  // ---- reorderTasks ---------------------------------------------------------

  describe('reorderTasks', () => {
    it('bulk updates sort_orders with 1000-gap spacing', async () => {
      soClient.bulkUpdate = jest.fn().mockResolvedValue({ saved_objects: [] });

      await service.reorderTasks({
        caseId: 'case-1',
        parentTaskId: null,
        orderedTaskIds: ['task-3', 'task-1', 'task-2'],
      });

      expect(soClient.bulkUpdate).toHaveBeenCalledWith(
        [
          { type: CASE_TASK_SAVED_OBJECT, id: 'task-3', attributes: { sort_order: 1000 } },
          { type: CASE_TASK_SAVED_OBJECT, id: 'task-1', attributes: { sort_order: 2000 } },
          { type: CASE_TASK_SAVED_OBJECT, id: 'task-2', attributes: { sort_order: 3000 } },
        ],
        expect.any(Object)
      );
    });
  });

  // ---- task_summary accuracy ------------------------------------------------

  describe('syncTaskSummary', () => {
    it('correctly counts tasks by status', async () => {
      // sort_order find fires first (returns empty → sort_order = 1000)
      soClient.find.mockResolvedValueOnce({ saved_objects: [], total: 0, per_page: 1, page: 1 });
      // syncTaskSummary find fires second (returns tasks by status)
      soClient.find.mockResolvedValueOnce({
        saved_objects: [
          makeTaskSO({ status: 'open' }),
          makeTaskSO({ id: 'task-2', status: 'open' }),
          makeTaskSO({ id: 'task-3', status: 'in_progress' }),
          makeTaskSO({ id: 'task-4', status: 'completed' }),
          makeTaskSO({ id: 'task-5', status: 'cancelled' }),
        ],
        total: 5,
        per_page: 10000,
        page: 1,
      });

      soClient.create.mockResolvedValue(makeTaskSO());

      await service.createTask({
        caseId: 'case-1',
        title: 'Task',
        owner: 'securitySolution',
        user: mockUser,
      });

      const updateCall = soClient.update.mock.calls.find(
        ([type]) => type === CASE_SAVED_OBJECT
      );
      const summary = (updateCall![2] as { task_summary: unknown }).task_summary as {
        open: number;
        in_progress: number;
        completed: number;
        cancelled: number;
        total: number;
      };

      expect(summary.open).toBe(2);
      expect(summary.in_progress).toBe(1);
      expect(summary.completed).toBe(1);
      expect(summary.cancelled).toBe(1);
      expect(summary.total).toBe(5);
    });

    it('computes next_due_date as the earliest uncompleted due date', async () => {
      // sort_order find fires first (returns empty → sort_order = 1000)
      soClient.find.mockResolvedValueOnce({ saved_objects: [], total: 0, per_page: 1, page: 1 });
      // syncTaskSummary find fires second
      soClient.find.mockResolvedValueOnce({
        saved_objects: [
          makeTaskSO({ status: 'open', due_date: '2024-03-10T00:00:00.000Z' }),
          makeTaskSO({ id: 't2', status: 'open', due_date: '2024-01-05T00:00:00.000Z' }),
          makeTaskSO({ id: 't3', status: 'completed', due_date: '2024-01-01T00:00:00.000Z' }),
        ],
        total: 3,
        per_page: 10000,
        page: 1,
      });

      soClient.create.mockResolvedValue(makeTaskSO());

      await service.createTask({
        caseId: 'case-1',
        title: 'Task',
        owner: 'securitySolution',
        user: mockUser,
      });

      const updateCall = soClient.update.mock.calls.find(([type]) => type === CASE_SAVED_OBJECT);
      const summary = (updateCall![2] as { task_summary: { next_due_date: string | null } })
        .task_summary;

      // completed task's due date should be excluded; earliest open = Jan 5
      expect(summary.next_due_date).toBe('2024-01-05T00:00:00.000Z');
    });
  });

  // ---- bulkCreateTasks ------------------------------------------------------

  describe('bulkCreateTasks', () => {
    it('uses bulkCreate in a single call', async () => {
      soClient.bulkCreate = jest.fn().mockResolvedValue({
        saved_objects: [makeTaskSO(), makeTaskSO({ id: 'task-2' })],
      });

      await service.bulkCreateTasks({
        tasks: [
          { caseId: 'case-1', title: 'T1', owner: 'securitySolution', user: mockUser },
          { caseId: 'case-1', title: 'T2', owner: 'securitySolution', user: mockUser },
        ],
      });

      expect(soClient.bulkCreate).toHaveBeenCalledTimes(1);
      expect(soClient.bulkCreate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ type: CASE_TASK_SAVED_OBJECT, attributes: expect.objectContaining({ title: 'T1' }) }),
          expect.objectContaining({ type: CASE_TASK_SAVED_OBJECT, attributes: expect.objectContaining({ title: 'T2' }) }),
        ]),
        expect.any(Object)
      );
    });
  });
});
