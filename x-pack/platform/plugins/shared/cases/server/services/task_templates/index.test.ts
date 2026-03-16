/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { CaseTaskTemplateService } from '.';
import type { CaseTaskTemplateAttributes } from '../../../common/types/domain/task_template/v1';
import {
  CASE_TASK_TEMPLATE_SAVED_OBJECT,
  MAX_TASK_TEMPLATES_PER_OWNER,
} from '../../../common/constants';

const user = { username: 'elastic', full_name: null, email: null, profile_uid: 'uid-1' };

const templateSO = (attrs: Partial<CaseTaskTemplateAttributes> = {}) => ({
  id: 'tpl-1',
  type: CASE_TASK_TEMPLATE_SAVED_OBJECT,
  references: [],
  version: 'v1',
  score: 1,
  attributes: {
    name: 'Phishing',
    description: '',
    tags: ['sop'],
    tasks: [
      {
        title: 'Block sender',
        description: '',
        priority: 'high' as const,
        relative_due_days: 1,
        subtasks: [],
      },
    ],
    owner: 'securitySolution',
    created_at: '2024-01-01T00:00:00.000Z',
    created_by: user,
    updated_at: null,
    updated_by: null,
    ...attrs,
  },
});

describe('CaseTaskTemplateService', () => {
  const soClient = savedObjectsClientMock.create();
  const service = new CaseTaskTemplateService({
    log: loggingSystemMock.createLogger(),
    unsecuredSavedObjectsClient: soClient,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    soClient.get.mockResolvedValue(templateSO());
    soClient.find.mockResolvedValue({
      saved_objects: [templateSO()],
      total: 1,
      per_page: 100,
      page: 1,
    });
  });

  it('creates a template with defaults and the creating user', async () => {
    soClient.create.mockResolvedValue(templateSO());

    const template = await service.createTemplate({
      name: 'Phishing',
      tasks: templateSO().attributes.tasks,
      owner: 'securitySolution',
      user,
    });

    expect(soClient.create).toHaveBeenCalledWith(
      CASE_TASK_TEMPLATE_SAVED_OBJECT,
      expect.objectContaining({
        name: 'Phishing',
        description: '',
        tags: [],
        created_by: user,
        updated_at: null,
      }),
      { refresh: undefined }
    );
    expect(template).toMatchObject({ id: 'tpl-1', version: 'v1', name: 'Phishing' });
  });

  it('finds templates by owner and tag, sorted by name and capped', async () => {
    await service.findTemplates({ owners: ['securitySolution'], tags: ['sop'], perPage: 999 });

    const [args] = soClient.find.mock.calls[0];
    expect(args).toMatchObject({
      type: CASE_TASK_TEMPLATE_SAVED_OBJECT,
      sortField: 'name',
      perPage: MAX_TASK_TEMPLATES_PER_OWNER,
    });
    expect(JSON.stringify(args.filter)).toContain('cases-task-templates.attributes.owner');
    expect(JSON.stringify(args.filter)).toContain('cases-task-templates.attributes.tags');
  });

  it('updates with the version and returns the merged template', async () => {
    soClient.update.mockResolvedValue({ ...templateSO(), version: 'v2', attributes: {} });

    const updated = await service.updateTemplate({
      templateId: 'tpl-1',
      version: 'v1',
      user,
      name: 'Phishing v2',
    });

    expect(soClient.update).toHaveBeenCalledWith(
      CASE_TASK_TEMPLATE_SAVED_OBJECT,
      'tpl-1',
      expect.objectContaining({ name: 'Phishing v2', updated_by: user }),
      { version: 'v1', refresh: undefined }
    );
    expect(updated).toMatchObject({ name: 'Phishing v2', version: 'v2', tags: ['sop'] });
  });

  it('wraps saved object failures in a CaseError', async () => {
    // Failure scenario: the template does not exist.
    soClient.delete.mockRejectedValue(new Error('not found'));
    await expect(service.deleteTemplate('missing')).rejects.toThrow(
      'Failed to delete task template missing: Error: not found'
    );
  });
});
