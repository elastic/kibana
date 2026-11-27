/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { olsAuditEvent } from './audit';

describe('olsAuditEvent', () => {
  it('describes a single object without its title', () => {
    expect(
      olsAuditEvent({
        action: 'ols_access',
        type: 'action',
        id: 'connector-1',
        spaceId: 'space-a',
        operation: 'use',
      })
    ).toEqual({
      message: 'User has accessed a restricted action [id=connector-1] (operation: use)',
      event: {
        action: 'ols_access',
        category: ['database'],
        type: ['access'],
        outcome: 'success',
      },
      kibana: { space_id: 'space-a', saved_object: { type: 'action', id: 'connector-1' } },
    });
  });

  it('records the object name with the object, but not in the message', () => {
    const event = olsAuditEvent({
      action: 'ols_update',
      type: 'action',
      id: 'connector-1',
      name: 'Production Slack',
      spaceId: 'space-a',
      operation: 'manage_access',
    });

    expect(event.message).toBe(
      'User has changed access to action [id=connector-1] (operation: manage_access)'
    );
    expect(event.kibana?.saved_object).toEqual({
      type: 'action',
      id: 'connector-1',
      name: 'Production Slack',
    });
  });

  it('describes a list that relied on recovery without an object', () => {
    const event = olsAuditEvent({
      action: 'ols_admin_override',
      type: 'action',
      spaceId: 'default',
      operation: 'find',
    });

    expect(event.message).toBe(
      'User relied on recovery authority to access action objects (operation: find)'
    );
    expect(event.kibana).toEqual({ space_id: 'default' });
  });

  it('reports a denial as a failure', () => {
    const event = olsAuditEvent({
      action: 'ols_denied',
      type: 'action',
      id: 'connector-1',
      spaceId: 'default',
      operation: 'view',
    });

    expect(event.event).toEqual(expect.objectContaining({ type: ['access'], outcome: 'failure' }));
  });

  it('reports access changes as changes and appends details', () => {
    const event = olsAuditEvent({
      action: 'ols_transfer',
      type: 'action',
      id: 'connector-1',
      spaceId: 'default',
      operation: 'transfer',
      details: '(owner: user:u_1 -> user:u_2)',
    });

    expect(event.message).toBe(
      'User has changed the owner of action [id=connector-1] (operation: transfer) (owner: user:u_1 -> user:u_2)'
    );
    expect(event.event).toEqual(expect.objectContaining({ type: ['change'], outcome: 'success' }));
  });

  it('reports a new object with initial access as a creation with an unknown outcome', () => {
    const event = olsAuditEvent({
      action: 'ols_create',
      type: 'action',
      id: 'connector-1',
      spaceId: 'default',
      operation: 'create',
      details: '(general access: default -> none; entries: none -> none)',
    });

    expect(event.message).toBe(
      'User is creating action [id=connector-1] (operation: create) (general access: default -> none; entries: none -> none)'
    );
    expect(event.event).toEqual(
      expect.objectContaining({ type: ['creation'], outcome: 'unknown' })
    );
  });

  it('sets the user ID and the principal type only when a principal is passed', () => {
    const params = {
      action: 'ols_access' as const,
      type: 'action',
      id: 'connector-1',
      spaceId: 'default',
      operation: 'use',
    };

    expect(olsAuditEvent(params)).not.toHaveProperty('user');
    expect(
      olsAuditEvent({
        ...params,
        principal: { type: 'service_account', id: 'elastic/kibana' },
      }).user
    ).toEqual({ id: 'elastic/kibana', entity: { type: 'service_account' } });
    expect(olsAuditEvent({ ...params, principal: { type: 'user', id: 'u_1' } }).user).toEqual({
      id: 'u_1',
      entity: { type: 'user' },
    });
  });
});
