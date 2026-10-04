/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { CaseTaskCommentService } from '.';
import { CASE_TASK_COMMENT_SAVED_OBJECT, MAX_COMMENTS_PER_TASK } from '../../../common/constants';

const user = { username: 'elastic', full_name: null, email: null, profile_uid: 'u1' };

const commentSO = (id: string, taskId = 'task-1') => ({
  id,
  type: CASE_TASK_COMMENT_SAVED_OBJECT,
  references: [],
  version: 'v1',
  score: 1,
  attributes: {
    task_id: taskId,
    case_id: 'case-1',
    comment: 'Checked the gateway logs.',
    owner: 'securitySolution',
    created_at: '2026-01-01T00:00:00.000Z',
    created_by: user,
  },
});

describe('CaseTaskCommentService', () => {
  const soClient = savedObjectsClientMock.create();
  const service = new CaseTaskCommentService({
    log: loggingSystemMock.createLogger(),
    unsecuredSavedObjectsClient: soClient,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    soClient.find.mockResolvedValue({ saved_objects: [], total: 0, per_page: 100, page: 1 });
  });

  it('creates a comment referencing both the case and the task', async () => {
    soClient.create.mockResolvedValue(commentSO('c-1'));

    const comment = await service.create({
      caseId: 'case-1',
      taskId: 'task-1',
      comment: 'Checked the gateway logs.',
      owner: 'securitySolution',
      user,
    });

    expect(soClient.create).toHaveBeenCalledWith(
      CASE_TASK_COMMENT_SAVED_OBJECT,
      expect.objectContaining({ task_id: 'task-1', case_id: 'case-1', created_by: user }),
      expect.objectContaining({
        references: [
          { type: 'cases', id: 'case-1', name: 'parentCase' },
          { type: 'cases-tasks', id: 'task-1', name: 'parentTask' },
        ],
      })
    );
    expect(comment).toMatchObject({
      id: 'c-1',
      version: 'v1',
      comment: 'Checked the gateway logs.',
    });
  });

  it('lists a task thread oldest first, capped per task', async () => {
    soClient.find.mockResolvedValue({
      saved_objects: [commentSO('c-1'), commentSO('c-2')],
      total: 2,
      per_page: 100,
      page: 1,
    });

    const { comments, total } = await service.getByTask('task-1');

    expect(soClient.find).toHaveBeenCalledWith(
      expect.objectContaining({
        type: CASE_TASK_COMMENT_SAVED_OBJECT,
        sortField: 'created_at',
        sortOrder: 'asc',
        perPage: MAX_COMMENTS_PER_TASK,
      })
    );
    expect(comments.map((c) => c.id)).toEqual(['c-1', 'c-2']);
    expect(total).toBe(2);
  });

  it('counts comments per task from the aggregation', async () => {
    soClient.find.mockResolvedValue({
      saved_objects: [],
      total: 5,
      per_page: 0,
      page: 1,
      aggregations: {
        byTask: {
          buckets: [
            { key: 'task-1', doc_count: 3 },
            { key: 'task-2', doc_count: 2 },
          ],
        },
      },
    } as never);

    await expect(service.countByCase('case-1')).resolves.toEqual({ 'task-1': 3, 'task-2': 2 });
    expect(soClient.find.mock.calls[0][0]).toMatchObject({ perPage: 0 });
  });

  it('deletes the comments of the given tasks and skips the write when there are none', async () => {
    await service.deleteBy({ taskIds: [] });
    expect(soClient.find).not.toHaveBeenCalled();

    await service.deleteBy({ taskIds: ['task-1'] });
    expect(soClient.bulkDelete).not.toHaveBeenCalled();

    soClient.find.mockResolvedValue({
      saved_objects: [commentSO('c-1'), commentSO('c-2')],
      total: 2,
      per_page: 100,
      page: 1,
    });
    await service.deleteBy({ caseId: 'case-1' });
    expect(soClient.bulkDelete).toHaveBeenCalledWith([
      { type: CASE_TASK_COMMENT_SAVED_OBJECT, id: 'c-1' },
      { type: CASE_TASK_COMMENT_SAVED_OBJECT, id: 'c-2' },
    ]);
  });

  it('wraps saved object failures in a CaseError', async () => {
    // Failure scenario: the comment was already removed.
    soClient.delete.mockRejectedValue(new Error('not found'));
    await expect(service.delete('missing')).rejects.toThrow(
      'Failed to delete task comment missing: Error: not found'
    );
  });
});
