/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_TASK_TEMPLATES_PER_OWNER } from '../../../common/constants';
import type { CaseTaskTemplate } from '../../../common/types/domain/task_template/v1';
import { Operations } from '../../authorization';
import { createCasesClientMockArgs } from '../mocks';
import { createTaskTemplatesSubClient } from './client';

const template: CaseTaskTemplate = {
  id: 'tpl-1',
  version: 'v1',
  name: 'Phishing',
  description: '',
  tags: [],
  tasks: [
    {
      title: 'Block sender',
      description: '',
      priority: 'high', required: false,
      due_within: { value: 1, unit: 'days' },
      subtasks: [],
    },
  ],
  owner: 'securitySolution',
  created_at: '2024-01-01T00:00:00.000Z',
  created_by: { username: 'elastic', full_name: null, email: null, profile_uid: 'uid-1' },
  updated_at: null,
  updated_by: null,
};

describe('TaskTemplatesSubClient', () => {
  const clientArgs = createCasesClientMockArgs();
  const { taskTemplateService, licensingService } = clientArgs.services;
  const client = createTaskTemplatesSubClient(clientArgs);

  beforeEach(() => {
    jest.clearAllMocks();
    licensingService.isAtLeastPlatinum.mockResolvedValue(true);
    taskTemplateService.getTemplate.mockResolvedValue(template);
    taskTemplateService.findTemplates.mockResolvedValue({ templates: [], total: 0 });
    taskTemplateService.createTemplate.mockResolvedValue(template);
  });

  it('is unavailable below Platinum', async () => {
    // Failure scenario: basic license.
    licensingService.isAtLeastPlatinum.mockResolvedValue(false);
    await expect(client.get('tpl-1')).rejects.toThrow('Elastic Platinum license');
    expect(taskTemplateService.getTemplate).not.toHaveBeenCalled();
  });

  it('creates with the settings privilege of the requested owner and enforces the limit', async () => {
    await client.create({ name: 'Phishing', owner: 'securitySolution', tasks: template.tasks });
    expect(clientArgs.authorization.ensureAuthorized).toHaveBeenCalledWith({
      operation: Operations.createTaskTemplate,
      entities: [{ id: 'securitySolution', owner: 'securitySolution' }],
    });
    expect(taskTemplateService.createTemplate).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Phishing', user: clientArgs.user })
    );

    taskTemplateService.findTemplates.mockResolvedValue({
      templates: [],
      total: MAX_TASK_TEMPLATES_PER_OWNER,
    });
    await expect(
      client.create({ name: 'One more', owner: 'securitySolution', tasks: template.tasks })
    ).rejects.toThrow(`At most ${MAX_TASK_TEMPLATES_PER_OWNER} task lists`);
  });

  it('rejects an empty task list', async () => {
    await expect(
      client.create({ name: 'Empty', owner: 'securitySolution', tasks: [] })
    ).rejects.toThrow('The length of the field tasks is too short');
  });

  it('authorizes updates and deletes against the stored owner', async () => {
    taskTemplateService.updateTemplate.mockResolvedValue({ ...template, name: 'Renamed' });

    await client.update('tpl-1', { version: 'v1', name: 'Renamed' });
    await client.delete('tpl-1');

    expect(clientArgs.authorization.ensureAuthorized).toHaveBeenCalledWith({
      operation: Operations.updateTaskTemplate,
      entities: [{ id: 'tpl-1', owner: 'securitySolution' }],
    });
    expect(clientArgs.authorization.ensureAuthorized).toHaveBeenCalledWith({
      operation: Operations.deleteTaskTemplate,
      entities: [{ id: 'tpl-1', owner: 'securitySolution' }],
    });
    expect(taskTemplateService.deleteTemplate).toHaveBeenCalledWith('tpl-1');
  });

  it('limits find to authorized owners', async () => {
    clientArgs.authorization.getAuthorizationFilter.mockResolvedValue({
      authorizedOwners: ['observability'],
      filter: undefined,
      ensureSavedObjectsAreAuthorized: jest.fn(),
    });

    await client.find({ tags: 'sop' });
    expect(taskTemplateService.findTemplates).toHaveBeenCalledWith({
      owners: ['observability'],
      tags: ['sop'],
      search: undefined,
    });

    const empty = await client.find({ owner: 'securitySolution' });
    expect(empty).toEqual({ templates: [], total: 0 });
    expect(taskTemplateService.findTemplates).toHaveBeenCalledTimes(1);
  });
});
