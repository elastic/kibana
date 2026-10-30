/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuditEvent, AuditLogger } from '@kbn/security-plugin-types-server';

import {
  accessControlAuditEvent,
  createScopedAuditLogger,
  recordDeniedObject,
  runInAuditScope,
} from './audit';
import { auditLoggerMock } from '../audit/mocks';

const savedObjectEvent = (action: string, type: string, id: string): AuditEvent => ({
  message: `${action} ${type}:${id}`,
  event: { action },
  kibana: { saved_object: { type, id } },
});

describe('accessControlAuditEvent', () => {
  it('describes a single object without its title', () => {
    expect(
      accessControlAuditEvent({
        action: 'access_control_access',
        type: 'action',
        id: 'connector-1',
        spaceId: 'space-a',
        operation: 'use',
      })
    ).toEqual({
      message: 'User has accessed a restricted action [id=connector-1] (operation: use)',
      event: {
        action: 'access_control_access',
        category: ['database'],
        type: ['access'],
        outcome: 'success',
      },
      kibana: { space_id: 'space-a', saved_object: { type: 'action', id: 'connector-1' } },
    });
  });

  it('describes a list that relied on recovery without an object', () => {
    const event = accessControlAuditEvent({
      action: 'access_control_admin_override',
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
    const event = accessControlAuditEvent({
      action: 'access_control_denied',
      type: 'action',
      id: 'connector-1',
      spaceId: 'default',
      operation: 'view',
    });

    expect(event.event).toEqual(expect.objectContaining({ type: ['access'], outcome: 'failure' }));
  });

  it('reports access changes as changes and appends details', () => {
    const event = accessControlAuditEvent({
      action: 'access_control_transfer',
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

  it('sets the user ID only when a principal is passed', () => {
    const params = {
      action: 'access_control_access' as const,
      type: 'action',
      id: 'connector-1',
      spaceId: 'default',
      operation: 'use',
    };

    expect(accessControlAuditEvent(params)).not.toHaveProperty('user');
    expect(
      accessControlAuditEvent({
        ...params,
        principal: { type: 'service_account', id: 'elastic/kibana' },
      }).user
    ).toEqual({ id: 'elastic/kibana' });
  });
});

describe('runInAuditScope', () => {
  let auditLogger: jest.Mocked<AuditLogger>;
  let scopedLogger: AuditLogger;
  beforeEach(() => {
    auditLogger = auditLoggerMock.create();
    scopedLogger = createScopedAuditLogger(auditLogger);
  });

  it('holds events until the operation completes', async () => {
    const event = savedObjectEvent('saved_object_get', 'action', '1');

    await runInAuditScope(async () => {
      scopedLogger.log(event);
      expect(auditLogger.log).not.toHaveBeenCalled();
    });

    expect(auditLogger.log).toHaveBeenCalledTimes(1);
    expect(auditLogger.log).toHaveBeenCalledWith(event);
  });

  it('returns the result of the operation', async () => {
    await expect(runInAuditScope(async () => 'result')).resolves.toBe('result');
  });

  it('drops saved object events about a denied object and keeps every other event', async () => {
    const deniedGet = savedObjectEvent('saved_object_get', 'action', 'hidden');
    const denial = savedObjectEvent('access_control_denied', 'action', 'hidden');
    const visibleGet = savedObjectEvent('saved_object_get', 'action', 'visible');
    const otherTypeGet = savedObjectEvent('saved_object_get', 'dashboard', 'hidden');

    await runInAuditScope(async () => {
      scopedLogger.log(deniedGet);
      scopedLogger.log(visibleGet);
      scopedLogger.log(otherTypeGet);
      recordDeniedObject('action', 'hidden');
      scopedLogger.log(denial);
    });

    expect(auditLogger.log.mock.calls.map(([event]) => event)).toEqual([
      visibleGet,
      otherTypeGet,
      denial,
    ]);
  });

  it('writes held events when the operation throws', async () => {
    const event = savedObjectEvent('saved_object_get', 'action', '1');

    await expect(
      runInAuditScope(async () => {
        scopedLogger.log(event);
        throw new Error('boom');
      })
    ).rejects.toThrow('boom');

    expect(auditLogger.log).toHaveBeenCalledWith(event);
  });

  it('joins the scope of the caller when nested', async () => {
    const event = savedObjectEvent('saved_object_get', 'action', 'hidden');

    await runInAuditScope(async () => {
      await runInAuditScope(async () => {
        scopedLogger.log(event);
      });
      // The inner scope did not flush on its own.
      expect(auditLogger.log).not.toHaveBeenCalled();
      recordDeniedObject('action', 'hidden');
    });

    expect(auditLogger.log).not.toHaveBeenCalled();
  });

  it('keeps concurrent scopes apart', async () => {
    const eventA = savedObjectEvent('saved_object_get', 'action', 'shared');
    const eventB = savedObjectEvent('saved_object_update', 'action', 'shared');

    let releaseA!: () => void;
    const aBlocked = new Promise<void>((resolve) => (releaseA = resolve));

    const scopeA = runInAuditScope(async () => {
      scopedLogger.log(eventA);
      await aBlocked;
    });
    const scopeB = runInAuditScope(async () => {
      scopedLogger.log(eventB);
      // A denial recorded in this scope must not drop the event held by the other one.
      recordDeniedObject('action', 'shared');
    });

    await scopeB;
    expect(auditLogger.log).not.toHaveBeenCalled();

    releaseA();
    await scopeA;
    expect(auditLogger.log).toHaveBeenCalledTimes(1);
    expect(auditLogger.log).toHaveBeenCalledWith(eventA);
  });

  it('ignores denials recorded outside a scope', async () => {
    recordDeniedObject('action', '1');
    const event = savedObjectEvent('saved_object_get', 'action', '1');

    await runInAuditScope(async () => scopedLogger.log(event));

    expect(auditLogger.log).toHaveBeenCalledWith(event);
  });
});

describe('createScopedAuditLogger', () => {
  it('logs immediately outside a scope', () => {
    const auditLogger = auditLoggerMock.create();
    const event = savedObjectEvent('saved_object_get', 'action', '1');

    createScopedAuditLogger(auditLogger).log(event);

    expect(auditLogger.log).toHaveBeenCalledWith(event);
  });

  it('reflects the settings of the wrapped logger', () => {
    const auditLogger = auditLoggerMock.create();
    const scopedLogger = createScopedAuditLogger(auditLogger);

    expect(scopedLogger.enabled).toBe(true);
    expect(scopedLogger.includeSavedObjectNames).toBe(false);
  });
});
