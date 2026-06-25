/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertAuditAction, alertAuditEvent, alertAuditSystemEvent } from './alert_audit_events';

describe('#alertAuditEvent', () => {
  test('creates event with `unknown` outcome', () => {
    expect(
      alertAuditEvent({
        action: AlertAuditAction.GET,
        outcome: 'unknown',
        id: '123',
      })
    ).toMatchInlineSnapshot(`
      Object {
        "error": undefined,
        "event": Object {
          "action": "alert_get",
          "category": Array [
            "database",
          ],
          "outcome": "unknown",
          "type": Array [
            "access",
          ],
        },
        "message": "User is accessing alert [id=123]",
      }
    `);
  });

  test('creates event with `success` outcome', () => {
    expect(
      alertAuditEvent({
        action: AlertAuditAction.GET,
        id: '123',
      })
    ).toMatchInlineSnapshot(`
      Object {
        "error": undefined,
        "event": Object {
          "action": "alert_get",
          "category": Array [
            "database",
          ],
          "outcome": "success",
          "type": Array [
            "access",
          ],
        },
        "message": "User has accessed alert [id=123]",
      }
    `);
  });

  test('creates system event with `success` outcome', () => {
    expect(
      alertAuditSystemEvent({
        action: AlertAuditAction.DELETE,
        id: '123',
      })
    ).toMatchInlineSnapshot(`
      Object {
        "error": undefined,
        "event": Object {
          "action": "alert_delete",
          "category": Array [
            "database",
          ],
          "outcome": "success",
          "type": Array [
            "deletion",
          ],
        },
        "message": "System has deleted alert [id=123]",
      }
    `);
  });

  test('creates bulk event with `success` outcome', () => {
    expect(
      alertAuditEvent({
        action: AlertAuditAction.SCHEDULE_DELETE,
        bulk: true,
        actor: 'elastic',
      })
    ).toMatchInlineSnapshot(`
      Object {
        "error": undefined,
        "event": Object {
          "action": "alert_schedule_delete",
          "category": Array [
            "database",
          ],
          "outcome": "success",
          "type": Array [
            "deletion",
          ],
        },
        "message": "elastic has scheduled deletion task for alerts",
      }
    `);
  });

  test('creates event with `failure` outcome', () => {
    expect(
      alertAuditEvent({
        action: AlertAuditAction.GET,
        id: '123',
        error: new Error('ERROR_MESSAGE'),
      })
    ).toMatchInlineSnapshot(`
      Object {
        "error": Object {
          "code": "Error",
          "message": "ERROR_MESSAGE",
        },
        "event": Object {
          "action": "alert_get",
          "category": Array [
            "database",
          ],
          "outcome": "failure",
          "type": Array [
            "access",
          ],
        },
        "message": "Failed attempt to access alert [id=123]",
      }
    `);
  });
});

describe('#alertAuditEvent - acknowledge/unacknowledge', () => {
  test('creates acknowledge event with `success` outcome', () => {
    expect(
      alertAuditEvent({
        action: AlertAuditAction.ACKNOWLEDGE,
        id: '123',
      })
    ).toMatchInlineSnapshot(`
      Object {
        "error": undefined,
        "event": Object {
          "action": "alert_acknowledge",
          "category": Array [
            "database",
          ],
          "outcome": "success",
          "type": Array [
            "change",
          ],
        },
        "message": "User has acknowledged alert [id=123]",
      }
    `);
  });

  test('creates unacknowledge event with `success` outcome', () => {
    expect(
      alertAuditEvent({
        action: AlertAuditAction.UNACKNOWLEDGE,
        id: '456',
      })
    ).toMatchInlineSnapshot(`
      Object {
        "error": undefined,
        "event": Object {
          "action": "alert_unacknowledge",
          "category": Array [
            "database",
          ],
          "outcome": "success",
          "type": Array [
            "change",
          ],
        },
        "message": "User has unacknowledged alert [id=456]",
      }
    `);
  });

  test('creates bulk acknowledge event', () => {
    expect(
      alertAuditEvent({
        action: AlertAuditAction.ACKNOWLEDGE,
        bulk: true,
      })
    ).toMatchInlineSnapshot(`
      Object {
        "error": undefined,
        "event": Object {
          "action": "alert_acknowledge",
          "category": Array [
            "database",
          ],
          "outcome": "success",
          "type": Array [
            "change",
          ],
        },
        "message": "User has acknowledged alerts",
      }
    `);
  });
});
