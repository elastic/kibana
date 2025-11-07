/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_FLAPPING_SETTINGS } from '../../../common/rules_settings';
import { Alert } from '../../alert';
import { alertsWithAnyUUID } from '../../test_utils';
import { delayRecoveredFlappingAlerts } from './delay_recovered_flapping_alerts';

describe('delayRecoveredFlappingAlerts', () => {
  test('should set pendingRecoveredCount to zero for all active alerts', () => {
    const alert1 = new Alert('1', {
      meta: { flapping: true, pendingRecoveredCount: 3, uuid: 'uuid-1' },
    });
    const alert2 = new Alert('2', { meta: { flapping: false, uuid: 'uuid-2' } });

    const { newAlerts, activeAlerts, trackedActiveAlerts } = delayRecoveredFlappingAlerts(
      DEFAULT_FLAPPING_SETTINGS,
      'default',
      {
        // new alerts
        '1': alert1,
      },
      {
        // active alerts
        '1': alert1,
        '2': alert2,
      },
      {
        // tracked active alerts
        '1': alert1,
        '2': alert2,
      },
      {}, // recovered alerts
      {} // tracked recovered alerts
    );
    expect(newAlerts).toMatchInlineSnapshot(`
      Object {
        "1": Object {
          "meta": Object {
            "flapping": true,
            "flappingHistory": Array [],
            "maintenanceWindowIds": Array [],
            "maintenanceWindowNames": Array [],
            "pendingRecoveredCount": 0,
            "uuid": "uuid-1",
          },
          "state": Object {},
        },
      }
    `);
    expect(activeAlerts).toMatchInlineSnapshot(`
      Object {
        "1": Object {
          "meta": Object {
            "flapping": true,
            "flappingHistory": Array [],
            "maintenanceWindowIds": Array [],
            "maintenanceWindowNames": Array [],
            "pendingRecoveredCount": 0,
            "uuid": "uuid-1",
          },
          "state": Object {},
        },
        "2": Object {
          "meta": Object {
            "flapping": false,
            "flappingHistory": Array [],
            "maintenanceWindowIds": Array [],
            "maintenanceWindowNames": Array [],
            "pendingRecoveredCount": 0,
            "uuid": "uuid-2",
          },
          "state": Object {},
        },
      }
    `);
    expect(trackedActiveAlerts).toMatchInlineSnapshot(`
          Object {
            "1": Object {
              "meta": Object {
                "flapping": true,
                "flappingHistory": Array [],
                "maintenanceWindowIds": Array [],
                "maintenanceWindowNames": Array [],
                "pendingRecoveredCount": 0,
                "uuid": "uuid-1",
              },
              "state": Object {},
            },
            "2": Object {
              "meta": Object {
                "flapping": false,
                "flappingHistory": Array [],
                "maintenanceWindowIds": Array [],
                "maintenanceWindowNames": Array [],
                "pendingRecoveredCount": 0,
                "uuid": "uuid-2",
              },
              "state": Object {},
            },
          }
      `);
  });

  test('should return flapping pending recovered alerts as active alerts and current active alerts', () => {
    const alert1 = new Alert('1', { meta: { flapping: true, pendingRecoveredCount: 3 } });
    const alert2 = new Alert('2', { meta: { flapping: false } });
    const alert3 = new Alert('3', { meta: { flapping: true } });

    const {
      newAlerts,
      activeAlerts,
      trackedActiveAlerts,
      recoveredAlerts,
      trackedRecoveredAlerts,
    } = delayRecoveredFlappingAlerts(
      DEFAULT_FLAPPING_SETTINGS,
      'default',
      {}, // new alerts
      {}, // active alerts
      {}, // tracked active alerts
      {
        // recovered alerts
        '1': alert1,
        '2': alert2,
        '3': alert3,
      },
      {
        // tracked recovered alerts
        '1': alert1,
        '2': alert2,
        '3': alert3,
      }
    );

    expect(alertsWithAnyUUID(newAlerts)).toMatchInlineSnapshot(`Object {}`);
    expect(alertsWithAnyUUID(trackedActiveAlerts)).toMatchInlineSnapshot(`
      Object {
        "3": Object {
          "meta": Object {
            "flapping": true,
            "flappingHistory": Array [],
            "maintenanceWindowIds": Array [],
            "maintenanceWindowNames": Array [],
            "pendingRecoveredCount": 1,
            "uuid": Any<String>,
          },
          "state": Object {},
        },
      }
    `);
    expect(Object.values(trackedActiveAlerts).map((a) => a.getScheduledActionOptions()))
      .toMatchInlineSnapshot(`
      Array [
        Object {
          "actionGroup": "default",
          "context": Object {},
          "state": Object {},
        },
      ]
    `);
    expect(alertsWithAnyUUID(activeAlerts)).toMatchInlineSnapshot(`
      Object {
        "3": Object {
          "meta": Object {
            "flapping": true,
            "flappingHistory": Array [],
            "maintenanceWindowIds": Array [],
            "maintenanceWindowNames": Array [],
            "pendingRecoveredCount": 1,
            "uuid": Any<String>,
          },
          "state": Object {},
        },
      }
    `);
    expect(Object.values(activeAlerts).map((a) => a.getScheduledActionOptions()))
      .toMatchInlineSnapshot(`
      Array [
        Object {
          "actionGroup": "default",
          "context": Object {},
          "state": Object {},
        },
      ]
  `);
    expect(alertsWithAnyUUID(trackedRecoveredAlerts)).toMatchInlineSnapshot(`
      Object {
        "1": Object {
          "meta": Object {
            "flapping": true,
            "flappingHistory": Array [],
            "maintenanceWindowIds": Array [],
            "maintenanceWindowNames": Array [],
            "pendingRecoveredCount": 0,
            "uuid": Any<String>,
          },
          "state": Object {},
        },
        "2": Object {
          "meta": Object {
            "flapping": false,
            "flappingHistory": Array [],
            "maintenanceWindowIds": Array [],
            "maintenanceWindowNames": Array [],
            "uuid": Any<String>,
          },
          "state": Object {},
        },
      }
    `);
    expect(alertsWithAnyUUID(recoveredAlerts)).toMatchInlineSnapshot(`
      Object {
        "1": Object {
          "meta": Object {
            "flapping": true,
            "flappingHistory": Array [],
            "maintenanceWindowIds": Array [],
            "maintenanceWindowNames": Array [],
            "pendingRecoveredCount": 0,
            "uuid": Any<String>,
          },
          "state": Object {},
        },
        "2": Object {
          "meta": Object {
            "flapping": false,
            "flappingHistory": Array [],
            "maintenanceWindowIds": Array [],
            "maintenanceWindowNames": Array [],
            "uuid": Any<String>,
          },
          "state": Object {},
        },
      }
    `);
  });
});
