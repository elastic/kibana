/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ApplyTaskTemplateUserActionBuilder,
  CreateTaskUserActionBuilder,
  DeleteTaskUserActionBuilder,
  UpdateTaskUserActionBuilder,
} from './tasks';

describe('task user action builders', () => {
  const baseArgs = {
    caseId: 'case-1',
    user: { email: null, full_name: null, username: 'elastic' },
    owner: 'securitySolution',
  };

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-09T22:00:00.000Z'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('persists the whole payload with the case reference and audit details', () => {
    const payload = {
      task: {
        id: 'task-1',
        title: 'Block sender',
        status: 'open',
        priority: 'high',
        assignees: [],
      },
    };
    const { parameters, eventDetails } = new CreateTaskUserActionBuilder().build({
      ...baseArgs,
      action: 'create',
      payload,
    });

    expect(parameters).toEqual({
      attributes: {
        action: 'create',
        created_at: '2026-01-09T22:00:00.000Z',
        created_by: baseArgs.user,
        owner: 'securitySolution',
        type: 'create_task',
        payload,
      },
      references: [{ id: 'case-1', name: 'associated-cases', type: 'cases' }],
    });
    expect(eventDetails).toMatchObject({
      action: 'create',
      descriptiveAction: 'case_user_action_create_task',
      savedObjectId: 'case-1',
      savedObjectType: 'cases',
    });
    expect(eventDetails.getMessage('ua-1')).toBe(
      'User added task task-1 for case id: case-1 - user action id: ua-1'
    );
  });

  it('maps each type to its action', () => {
    const update = new UpdateTaskUserActionBuilder().build({
      ...baseArgs,
      action: 'update',
      payload: { task_id: 'task-1', task_title: 'Block sender', changed_fields: [] },
    });
    const remove = new DeleteTaskUserActionBuilder().build({
      ...baseArgs,
      action: 'delete',
      payload: { task_id: 'task-1', task_title: 'Block sender', subtasks_deleted: 1 },
    });
    const apply = new ApplyTaskTemplateUserActionBuilder().build({
      ...baseArgs,
      action: 'create',
      payload: { template_id: 'tpl-1', template_name: 'Phishing', tasks_created: 3 },
    });

    expect(update.parameters.attributes).toMatchObject({ action: 'update', type: 'update_task' });
    expect(remove.parameters.attributes).toMatchObject({ action: 'delete', type: 'delete_task' });
    expect(apply.parameters.attributes).toMatchObject({
      action: 'create',
      type: 'apply_task_template',
    });
    expect(apply.eventDetails.descriptiveAction).toBe('case_user_action_apply_task_template');
  });
});
