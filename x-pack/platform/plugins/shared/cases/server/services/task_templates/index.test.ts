/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { CaseTaskTemplateService } from './index';
import type { CaseTaskTemplateAttributes } from '../../../common/types/domain/task_template/v1';
import { CASE_TASK_TEMPLATE_SAVED_OBJECT, CASE_TASK_SAVED_OBJECT, CASE_SAVED_OBJECT } from '../../../common/constants';

const mockUser = {
  username: 'elastic',
  full_name: 'Elastic User',
  email: 'elastic@example.com',
  profile_uid: 'uid-1',
};

const makeTemplateSO = (overrides: Partial<CaseTaskTemplateAttributes> & { id?: string } = {}) => {
  const { id = 'tmpl-1', ...attrs } = overrides;
  return {
    id,
    type: CASE_TASK_TEMPLATE_SAVED_OBJECT,
    references: [],
    version: 'WzEsMV0=',
    attributes: {
      name: 'My Template',
      description: '',
      scope: 'space' as const,
      tags: [],
      tasks: [],
      owner: 'securitySolution',
      created_at: '2024-01-01T00:00:00.000Z',
      created_by: mockUser,
      updated_at: null,
      updated_by: null,
      ...attrs,
    },
  };
};

describe('CaseTaskTemplateService', () => {
  let soClient: ReturnType<typeof savedObjectsClientMock.create>;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let service: CaseTaskTemplateService;

  beforeEach(() => {
    soClient = savedObjectsClientMock.create();
    logger = loggingSystemMock.createLogger();
    service = new CaseTaskTemplateService({
      log: logger,
      unsecuredSavedObjectsClient: soClient,
    });

    soClient.find.mockResolvedValue({ saved_objects: [], total: 0, per_page: 50, page: 1 });
    soClient.get.mockImplementation(async (type, id) => {
      if (type === CASE_SAVED_OBJECT)
        return { id, type: CASE_SAVED_OBJECT, attributes: {}, references: [], version: 'v1' };
      return makeTemplateSO({ id });
    });
    soClient.update.mockResolvedValue({ id: 'tmpl-1', type: CASE_TASK_TEMPLATE_SAVED_OBJECT, attributes: {}, references: [] });
  });

  describe('createTemplate', () => {
    it('creates a template SO with correct attributes', async () => {
      soClient.create.mockResolvedValue(makeTemplateSO());

      const result = await service.createTemplate({
        name: 'My Template',
        tasks: [],
        owner: 'securitySolution',
        user: mockUser,
      });

      expect(soClient.create).toHaveBeenCalledWith(
        CASE_TASK_TEMPLATE_SAVED_OBJECT,
        expect.objectContaining({ name: 'My Template', scope: 'space', owner: 'securitySolution' }),
        expect.any(Object)
      );
      expect(result.name).toBe('My Template');
    });

    it('defaults scope to space', async () => {
      soClient.create.mockResolvedValue(makeTemplateSO());
      await service.createTemplate({ name: 'T', tasks: [], owner: 'o', user: mockUser });
      const attrs = soClient.create.mock.calls[0][1] as CaseTaskTemplateAttributes;
      expect(attrs.scope).toBe('space');
    });
  });

  describe('getTemplate', () => {
    it('fetches from SO client', async () => {
      soClient.get.mockResolvedValue(makeTemplateSO({ id: 'tmpl-42' }));
      const result = await service.getTemplate('tmpl-42');
      expect(result.id).toBe('tmpl-42');
    });

    it('returns cached result on second call', async () => {
      soClient.get.mockResolvedValue(makeTemplateSO({ id: 'tmpl-cached' }));
      await service.getTemplate('tmpl-cached');
      await service.getTemplate('tmpl-cached');
      expect(soClient.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('deleteTemplate', () => {
    it('calls SO delete', async () => {
      await service.deleteTemplate('tmpl-1');
      expect(soClient.delete).toHaveBeenCalledWith(CASE_TASK_TEMPLATE_SAVED_OBJECT, 'tmpl-1');
    });
  });

  describe('applyTemplate', () => {
    it('creates root tasks and subtasks with correct parent references', async () => {
      soClient.get.mockImplementation(async (type, id) => {
        if (type === CASE_TASK_TEMPLATE_SAVED_OBJECT) {
          return makeTemplateSO({
            id,
            tasks: [
              {
                title: 'Root 1',
                description: '',
                priority: 'medium',
                relative_due_days: 3,
                sort_order: 1000,
                subtasks: [
                  { title: 'Sub 1', description: '', priority: 'low', relative_due_days: null, sort_order: 1000 },
                ],
              },
            ],
          });
        }
        return { id, type: CASE_SAVED_OBJECT, attributes: {}, references: [], version: 'v1' };
      });

      const rootTaskId = 'root-task-1';
      soClient.bulkCreate = jest.fn()
        .mockResolvedValueOnce({
          // Root task bulk create
          saved_objects: [{
            id: rootTaskId,
            type: CASE_TASK_SAVED_OBJECT,
            references: [],
            version: 'v1',
            attributes: {
              title: 'Root 1', description: '', case_id: 'case-1',
              parent_task_id: null, status: 'open', priority: 'medium',
              assignees: [], due_date: null, started_at: null, completed_at: null,
              sort_order: 1000, template_id: 'tmpl-1', custom_fields: [],
              required_role: null, owner_team: null, owner: 'securitySolution',
              created_at: '2024-01-01T00:00:00.000Z', created_by: mockUser,
              updated_at: null, updated_by: null,
            },
          }],
        })
        .mockResolvedValueOnce({
          // Subtask bulk create
          saved_objects: [{
            id: 'sub-task-1',
            type: CASE_TASK_SAVED_OBJECT,
            references: [],
            version: 'v1',
            attributes: {
              title: 'Sub 1', description: '', case_id: 'case-1',
              parent_task_id: rootTaskId, status: 'open', priority: 'low',
              assignees: [], due_date: null, started_at: null, completed_at: null,
              sort_order: 1000, template_id: 'tmpl-1', custom_fields: [],
              required_role: null, owner_team: null, owner: 'securitySolution',
              created_at: '2024-01-01T00:00:00.000Z', created_by: mockUser,
              updated_at: null, updated_by: null,
            },
          }],
        });

      const result = await service.applyTemplate({
        templateId: 'tmpl-1',
        caseId: 'case-1',
        owner: 'securitySolution',
        user: mockUser,
        due_date_anchor: '2024-01-01T00:00:00.000Z',
      });

      // Should have called bulkCreate twice: once for roots, once for subtasks
      expect(soClient.bulkCreate).toHaveBeenCalledTimes(2);

      // The subtask call should reference the root task id
      const subtaskCall = soClient.bulkCreate.mock.calls[1][0] as Array<{ attributes: { parent_task_id: string } }>;
      expect(subtaskCall[0].attributes.parent_task_id).toBe(rootTaskId);

      expect(result).toHaveLength(2);
    });

    it('computes due_date correctly from relative_due_days', async () => {
      soClient.get.mockImplementation(async (type, id) => {
        if (type === CASE_TASK_TEMPLATE_SAVED_OBJECT) {
          return makeTemplateSO({
            id,
            tasks: [{
              title: 'T', description: '', priority: 'medium',
              relative_due_days: 7, sort_order: 1000, subtasks: [],
            }],
          });
        }
        return { id, type: CASE_SAVED_OBJECT, attributes: {}, references: [], version: 'v1' };
      });

      soClient.bulkCreate = jest.fn().mockResolvedValue({ saved_objects: [] });

      await service.applyTemplate({
        templateId: 'tmpl-1',
        caseId: 'case-1',
        owner: 'securitySolution',
        user: mockUser,
        due_date_anchor: '2024-01-01T00:00:00.000Z',
      });

      const rootArgs = soClient.bulkCreate.mock.calls[0][0] as Array<{ attributes: { due_date: string } }>;
      // Jan 1 + 7 days = Jan 8
      expect(rootArgs[0].attributes.due_date).toContain('2024-01-08');
    });
  });

  describe('findTemplates', () => {
    it('filters by scope', async () => {
      soClient.find.mockResolvedValue({ saved_objects: [], total: 0, per_page: 50, page: 1 });
      await service.findTemplates({ scope: 'global' });
      expect(soClient.find).toHaveBeenCalledWith(
        expect.objectContaining({ filter: expect.anything() })
      );
    });
  });
});
