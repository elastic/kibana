/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AD_HOC_RUN_SAVED_OBJECT_TYPE,
  RULE_SAVED_OBJECT_TYPE,
  GAP_AUTO_FILL_SCHEDULER_SAVED_OBJECT_TYPE,
} from '../../saved_objects';
import {
  RuleAuditAction,
  ruleAuditEvent,
  AdHocRunAuditAction,
  adHocRunAuditEvent,
  GapAutoFillSchedulerAuditAction,
  gapAutoFillSchedulerAuditEvent,
} from './audit_events';

describe('#ruleAuditEvent', () => {
  test('creates event with `unknown` outcome', () => {
    expect(
      ruleAuditEvent({
        action: RuleAuditAction.CREATE,
        outcome: 'unknown',
        savedObject: { type: RULE_SAVED_OBJECT_TYPE, id: 'ALERT_ID', name: 'fake_name' },
      })
    ).toMatchInlineSnapshot(`
      Object {
        "error": undefined,
        "event": Object {
          "action": "rule_create",
          "category": Array [
            "database",
          ],
          "outcome": "unknown",
          "type": Array [
            "creation",
          ],
        },
        "kibana": Object {
          "saved_object": Object {
            "id": "ALERT_ID",
            "name": "fake_name",
            "type": "alert",
          },
        },
        "message": "User is creating rule [id=ALERT_ID] [name=fake_name]",
      }
    `);
  });

  test('creates event with `success` outcome', () => {
    expect(
      ruleAuditEvent({
        action: RuleAuditAction.CREATE,
        savedObject: { type: RULE_SAVED_OBJECT_TYPE, id: 'ALERT_ID', name: 'fake_name' },
      })
    ).toMatchInlineSnapshot(`
      Object {
        "error": undefined,
        "event": Object {
          "action": "rule_create",
          "category": Array [
            "database",
          ],
          "outcome": "success",
          "type": Array [
            "creation",
          ],
        },
        "kibana": Object {
          "saved_object": Object {
            "id": "ALERT_ID",
            "name": "fake_name",
            "type": "alert",
          },
        },
        "message": "User has created rule [id=ALERT_ID] [name=fake_name]",
      }
    `);
  });

  test('creates event with `failure` outcome', () => {
    expect(
      ruleAuditEvent({
        action: RuleAuditAction.CREATE,
        savedObject: { type: RULE_SAVED_OBJECT_TYPE, id: 'ALERT_ID', name: 'fake_name' },
        error: new Error('ERROR_MESSAGE'),
      })
    ).toMatchInlineSnapshot(`
      Object {
        "error": Object {
          "code": "Error",
          "message": "ERROR_MESSAGE",
        },
        "event": Object {
          "action": "rule_create",
          "category": Array [
            "database",
          ],
          "outcome": "failure",
          "type": Array [
            "creation",
          ],
        },
        "kibana": Object {
          "saved_object": Object {
            "id": "ALERT_ID",
            "name": "fake_name",
            "type": "alert",
          },
        },
        "message": "Failed attempt to create rule [id=ALERT_ID] [name=fake_name]",
      }
    `);
  });

  test('creates event without known name', () => {
    expect(
      ruleAuditEvent({
        action: RuleAuditAction.CREATE,
        savedObject: { type: RULE_SAVED_OBJECT_TYPE, id: 'ALERT_ID' },
        error: new Error('ERROR_MESSAGE'),
      })
    ).toMatchInlineSnapshot(`
      Object {
        "error": Object {
          "code": "Error",
          "message": "ERROR_MESSAGE",
        },
        "event": Object {
          "action": "rule_create",
          "category": Array [
            "database",
          ],
          "outcome": "failure",
          "type": Array [
            "creation",
          ],
        },
        "kibana": Object {
          "saved_object": Object {
            "id": "ALERT_ID",
            "type": "alert",
          },
        },
        "message": "Failed attempt to create rule [id=ALERT_ID]",
      }
    `);
  });

  test('ACKNOWLEDGE_ALERT creates correct event', () => {
    expect(
      ruleAuditEvent({
        action: RuleAuditAction.ACKNOWLEDGE_ALERT,
        outcome: 'unknown',
        savedObject: { type: RULE_SAVED_OBJECT_TYPE, id: 'RULE_ID', name: 'my_rule' },
      })
    ).toMatchInlineSnapshot(`
      Object {
        "error": undefined,
        "event": Object {
          "action": "rule_alert_acknowledge",
          "category": Array [
            "database",
          ],
          "outcome": "unknown",
          "type": Array [
            "change",
          ],
        },
        "kibana": Object {
          "saved_object": Object {
            "id": "RULE_ID",
            "name": "my_rule",
            "type": "alert",
          },
        },
        "message": "User is acknowledging alert of rule [id=RULE_ID] [name=my_rule]",
      }
    `);
  });

  test('UNACKNOWLEDGE_ALERT creates correct event', () => {
    expect(
      ruleAuditEvent({
        action: RuleAuditAction.UNACKNOWLEDGE_ALERT,
        savedObject: { type: RULE_SAVED_OBJECT_TYPE, id: 'RULE_ID', name: 'my_rule' },
      })
    ).toMatchInlineSnapshot(`
      Object {
        "error": undefined,
        "event": Object {
          "action": "rule_alert_unacknowledge",
          "category": Array [
            "database",
          ],
          "outcome": "success",
          "type": Array [
            "change",
          ],
        },
        "kibana": Object {
          "saved_object": Object {
            "id": "RULE_ID",
            "name": "my_rule",
            "type": "alert",
          },
        },
        "message": "User has unacknowledged alert of rule [id=RULE_ID] [name=my_rule]",
      }
    `);
  });
});

describe('#gapAutoFillSchedulerAuditEvent', () => {
  test('creates event with `unknown` outcome', () => {
    expect(
      gapAutoFillSchedulerAuditEvent({
        action: GapAutoFillSchedulerAuditAction.CREATE,
        outcome: 'unknown',
        savedObject: {
          type: GAP_AUTO_FILL_SCHEDULER_SAVED_OBJECT_TYPE,
          id: 'SCHEDULER_ID',
          name: 'fake_name',
        },
      })
    ).toMatchInlineSnapshot(`
      Object {
        "error": undefined,
        "event": Object {
          "action": "gap_auto_fill_scheduler_create",
          "category": Array [
            "database",
          ],
          "outcome": "unknown",
          "type": Array [
            "creation",
          ],
        },
        "kibana": Object {
          "saved_object": Object {
            "id": "SCHEDULER_ID",
            "name": "fake_name",
            "type": "gap_auto_fill_scheduler",
          },
        },
        "message": "User is creating gap auto fill scheduler gap_auto_fill_scheduler [id=SCHEDULER_ID] [name=fake_name]",
      }
    `);
  });

  test('creates event with `success` outcome', () => {
    expect(
      gapAutoFillSchedulerAuditEvent({
        action: GapAutoFillSchedulerAuditAction.GET,
        savedObject: {
          type: GAP_AUTO_FILL_SCHEDULER_SAVED_OBJECT_TYPE,
          id: 'SCHEDULER_ID',
          name: 'fake_name',
        },
      })
    ).toMatchInlineSnapshot(`
      Object {
        "error": undefined,
        "event": Object {
          "action": "gap_auto_fill_scheduler_get",
          "category": Array [
            "database",
          ],
          "outcome": "success",
          "type": Array [
            "access",
          ],
        },
        "kibana": Object {
          "saved_object": Object {
            "id": "SCHEDULER_ID",
            "name": "fake_name",
            "type": "gap_auto_fill_scheduler",
          },
        },
        "message": "User has got gap auto fill scheduler gap_auto_fill_scheduler [id=SCHEDULER_ID] [name=fake_name]",
      }
    `);
  });

  test('creates event with `failure` outcome', () => {
    expect(
      gapAutoFillSchedulerAuditEvent({
        action: GapAutoFillSchedulerAuditAction.DELETE,
        savedObject: {
          type: GAP_AUTO_FILL_SCHEDULER_SAVED_OBJECT_TYPE,
          id: 'SCHEDULER_ID',
          name: 'fake_name',
        },
        error: new Error('ERROR_MESSAGE'),
      })
    ).toMatchInlineSnapshot(`
      Object {
        "error": Object {
          "code": "Error",
          "message": "ERROR_MESSAGE",
        },
        "event": Object {
          "action": "gap_auto_fill_scheduler_delete",
          "category": Array [
            "database",
          ],
          "outcome": "failure",
          "type": Array [
            "deletion",
          ],
        },
        "kibana": Object {
          "saved_object": Object {
            "id": "SCHEDULER_ID",
            "name": "fake_name",
            "type": "gap_auto_fill_scheduler",
          },
        },
        "message": "Failed attempt to delete gap auto fill scheduler gap_auto_fill_scheduler [id=SCHEDULER_ID] [name=fake_name]",
      }
    `);
  });

  test('creates event without known name', () => {
    expect(
      gapAutoFillSchedulerAuditEvent({
        action: GapAutoFillSchedulerAuditAction.UPDATE,
        savedObject: { type: GAP_AUTO_FILL_SCHEDULER_SAVED_OBJECT_TYPE, id: 'SCHEDULER_ID' },
      })
    ).toMatchInlineSnapshot(`
      Object {
        "error": undefined,
        "event": Object {
          "action": "gap_auto_fill_scheduler_update",
          "category": Array [
            "database",
          ],
          "outcome": "success",
          "type": Array [
            "change",
          ],
        },
        "kibana": Object {
          "saved_object": Object {
            "id": "SCHEDULER_ID",
            "type": "gap_auto_fill_scheduler",
          },
        },
        "message": "User has updated gap auto fill scheduler gap_auto_fill_scheduler [id=SCHEDULER_ID]",
      }
    `);
  });
});

describe('#adHocRunAuditEvent', () => {
  test('creates event with `unknown` outcome', () => {
    expect(
      adHocRunAuditEvent({
        action: AdHocRunAuditAction.GET,
        outcome: 'unknown',
        savedObject: {
          type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
          id: 'AD_HOC_RUN_ID',
          name: `backfill for rule "fake_name"`,
        },
      })
    ).toMatchInlineSnapshot(`
      Object {
        "error": undefined,
        "event": Object {
          "action": "ad_hoc_run_get",
          "category": Array [
            "database",
          ],
          "outcome": "unknown",
          "type": Array [
            "access",
          ],
        },
        "kibana": Object {
          "saved_object": Object {
            "id": "AD_HOC_RUN_ID",
            "name": "backfill for rule \\"fake_name\\"",
            "type": "ad_hoc_run_params",
          },
        },
        "message": "User is getting ad hoc run for ad_hoc_run_params [id=AD_HOC_RUN_ID] backfill for rule \\"fake_name\\"",
      }
    `);
  });

  test('creates event with `success` outcome', () => {
    expect(
      adHocRunAuditEvent({
        action: AdHocRunAuditAction.FIND,
        savedObject: {
          type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
          id: 'AD_HOC_RUN_ID',
          name: `backfill for rule "fake_name"`,
        },
      })
    ).toMatchInlineSnapshot(`
      Object {
        "error": undefined,
        "event": Object {
          "action": "ad_hoc_run_find",
          "category": Array [
            "database",
          ],
          "outcome": "success",
          "type": Array [
            "access",
          ],
        },
        "kibana": Object {
          "saved_object": Object {
            "id": "AD_HOC_RUN_ID",
            "name": "backfill for rule \\"fake_name\\"",
            "type": "ad_hoc_run_params",
          },
        },
        "message": "User has found ad hoc run for ad_hoc_run_params [id=AD_HOC_RUN_ID] backfill for rule \\"fake_name\\"",
      }
    `);
  });

  test('creates event with `failure` outcome', () => {
    expect(
      adHocRunAuditEvent({
        action: AdHocRunAuditAction.DELETE,
        savedObject: {
          type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
          id: 'AD_HOC_RUN_ID',
          name: `backfill for rule "fake_name"`,
        },
        error: new Error('ERROR_MESSAGE'),
      })
    ).toMatchInlineSnapshot(`
      Object {
        "error": Object {
          "code": "Error",
          "message": "ERROR_MESSAGE",
        },
        "event": Object {
          "action": "ad_hoc_run_delete",
          "category": Array [
            "database",
          ],
          "outcome": "failure",
          "type": Array [
            "deletion",
          ],
        },
        "kibana": Object {
          "saved_object": Object {
            "id": "AD_HOC_RUN_ID",
            "name": "backfill for rule \\"fake_name\\"",
            "type": "ad_hoc_run_params",
          },
        },
        "message": "Failed attempt to delete ad hoc run for ad_hoc_run_params [id=AD_HOC_RUN_ID] backfill for rule \\"fake_name\\"",
      }
    `);
  });

  test('creates event without known name', () => {
    expect(
      adHocRunAuditEvent({
        action: AdHocRunAuditAction.FIND,
        savedObject: { type: AD_HOC_RUN_SAVED_OBJECT_TYPE, id: 'AD_HOC_RUN_ID' },
      })
    ).toMatchInlineSnapshot(`
      Object {
        "error": undefined,
        "event": Object {
          "action": "ad_hoc_run_find",
          "category": Array [
            "database",
          ],
          "outcome": "success",
          "type": Array [
            "access",
          ],
        },
        "kibana": Object {
          "saved_object": Object {
            "id": "AD_HOC_RUN_ID",
            "type": "ad_hoc_run_params",
          },
        },
        "message": "User has found ad hoc run for ad_hoc_run_params [id=AD_HOC_RUN_ID]",
      }
    `);
  });
});
