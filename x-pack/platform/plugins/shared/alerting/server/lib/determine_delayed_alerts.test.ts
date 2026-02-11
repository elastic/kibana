/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { determineDelayedAlerts } from './determine_delayed_alerts';
import { Alert } from '../alert';
import { alertsWithAnyUUID } from '../test_utils';
import { ruleRunMetricsStoreMock } from './rule_run_metrics_store.mock';

describe('determineDelayedAlerts', () => {
  const ruleRunMetricsStore = ruleRunMetricsStoreMock.create();

  test('should increment activeCount for all active alerts', () => {
    const alert1 = new Alert('1', {
      meta: { activeCount: 1, uuid: 'uuid-1' },
    });
    const alert2 = new Alert('2', { meta: { uuid: 'uuid-2' } });

    const { newAlerts, activeAlerts, trackedActiveAlerts, delayedAlerts } = determineDelayedAlerts({
      newAlerts: {
        '1': alert1,
      },
      activeAlerts: {
        '1': alert1,
        '2': alert2,
      },
      trackedActiveAlerts: {
        '1': alert1,
        '2': alert2,
      },
      recoveredAlerts: {},
      trackedRecoveredAlerts: {},
      delayedAlerts: {},
      alertDelay: 0,
      startedAt: null,
      ruleRunMetricsStore,
    });
    expect(newAlerts).toMatchInlineSnapshot(`
      Object {
        "1": Object {
          "meta": Object {
            "activeCount": 2,
            "flappingHistory": Array [],
            "maintenanceWindowIds": Array [],
            "maintenanceWindowNames": Array [],
            "uuid": "uuid-1",
          },
          "state": Object {},
        },
      }
    `);
    expect(trackedActiveAlerts).toMatchInlineSnapshot(`
      Object {
        "1": Object {
          "meta": Object {
            "activeCount": 2,
            "flappingHistory": Array [],
            "maintenanceWindowIds": Array [],
            "maintenanceWindowNames": Array [],
            "uuid": "uuid-1",
          },
          "state": Object {},
        },
        "2": Object {
          "meta": Object {
            "activeCount": 1,
            "flappingHistory": Array [],
            "maintenanceWindowIds": Array [],
            "maintenanceWindowNames": Array [],
            "uuid": "uuid-2",
          },
          "state": Object {},
        },
      }
    `);
    expect(activeAlerts).toMatchInlineSnapshot(`
      Object {
        "1": Object {
          "meta": Object {
            "activeCount": 2,
            "flappingHistory": Array [],
            "maintenanceWindowIds": Array [],
            "maintenanceWindowNames": Array [],
            "uuid": "uuid-1",
          },
          "state": Object {},
        },
        "2": Object {
          "meta": Object {
            "activeCount": 1,
            "flappingHistory": Array [],
            "maintenanceWindowIds": Array [],
            "maintenanceWindowNames": Array [],
            "uuid": "uuid-2",
          },
          "state": Object {},
        },
      }
    `);

    expect(delayedAlerts).toMatchInlineSnapshot(`Object {}`);
  });

  test('should reset activeCount for all recovered alerts', () => {
    const alert1 = new Alert('1', { meta: { activeCount: 3 } });
    const alert3 = new Alert('3');

    const { recoveredAlerts, trackedRecoveredAlerts, delayedAlerts } = determineDelayedAlerts({
      newAlerts: {},
      activeAlerts: {},
      trackedActiveAlerts: {},
      recoveredAlerts: { '1': alert1, '3': alert3 },
      trackedRecoveredAlerts: { '1': alert1, '3': alert3 },
      delayedAlerts: {},
      alertDelay: 1,
      startedAt: null,
      ruleRunMetricsStore,
    });

    expect(alertsWithAnyUUID(trackedRecoveredAlerts)).toMatchInlineSnapshot(`
      Object {
        "1": Object {
          "meta": Object {
            "activeCount": 0,
            "flappingHistory": Array [],
            "maintenanceWindowIds": Array [],
            "maintenanceWindowNames": Array [],
            "uuid": Any<String>,
          },
          "state": Object {},
        },
        "3": Object {
          "meta": Object {
            "activeCount": 0,
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
            "activeCount": 0,
            "flappingHistory": Array [],
            "maintenanceWindowIds": Array [],
            "maintenanceWindowNames": Array [],
            "uuid": Any<String>,
          },
          "state": Object {},
        },
        "3": Object {
          "meta": Object {
            "activeCount": 0,
            "flappingHistory": Array [],
            "maintenanceWindowIds": Array [],
            "maintenanceWindowNames": Array [],
            "uuid": Any<String>,
          },
          "state": Object {},
        },
      }
    `);

    expect(delayedAlerts).toMatchInlineSnapshot(`Object {}`);
  });

  test('should set the alert status "delayed" if the activeCount is less than the rule alertDelay', () => {
    const alert1 = new Alert('1', {
      meta: { activeCount: 1, uuid: 'uuid-1' },
    });

    const { newAlerts, activeAlerts, delayedAlerts, trackedActiveAlerts } = determineDelayedAlerts({
      newAlerts: { '1': alert1 },
      activeAlerts: { '1': alert1 },
      trackedActiveAlerts: { '1': alert1 },
      recoveredAlerts: {},
      trackedRecoveredAlerts: {},
      delayedAlerts: {},
      alertDelay: 5,
      startedAt: null,
      ruleRunMetricsStore,
    });
    expect(newAlerts).toMatchInlineSnapshot(`Object {}`);
    expect(activeAlerts).toMatchInlineSnapshot(`Object {}`);
    expect(trackedActiveAlerts).toMatchInlineSnapshot(`
      Object {
        "1": Object {
          "meta": Object {
            "activeCount": 2,
            "flappingHistory": Array [],
            "maintenanceWindowIds": Array [],
            "maintenanceWindowNames": Array [],
            "uuid": "uuid-1",
          },
          "state": Object {},
        },
      }
    `);
    expect(delayedAlerts).toMatchInlineSnapshot(`
      Object {
        "1": Object {
          "meta": Object {
            "activeCount": 2,
            "flappingHistory": Array [],
            "maintenanceWindowIds": Array [],
            "maintenanceWindowNames": Array [],
            "uuid": "uuid-1",
          },
          "state": Object {},
        },
      }
    `);
    expect(delayedAlerts['1'].isDelayed()).toBe(true);
  });

  test('should remove the alert from recoveredAlerts and should not return the alert in trackedRecoveredAlerts if the activeCount is less than the rule alertDelay greater and than 0', () => {
    const alert1 = new Alert('1', {
      meta: { activeCount: 1, uuid: 'uuid-1' },
    });
    const alert2 = new Alert('2', { meta: { uuid: 'uuid-2' } });

    const { recoveredAlerts, trackedRecoveredAlerts } = determineDelayedAlerts({
      newAlerts: {},
      activeAlerts: {},
      trackedActiveAlerts: {},
      recoveredAlerts: { '1': alert1, '2': alert2 },
      trackedRecoveredAlerts: { '1': alert1, '2': alert2 },
      delayedAlerts: { '1': alert1 },
      alertDelay: 5,
      startedAt: null,
      ruleRunMetricsStore,
    });
    expect(recoveredAlerts).toMatchInlineSnapshot(`
      Object {
        "2": Object {
          "meta": Object {
            "activeCount": 0,
            "flappingHistory": Array [],
            "maintenanceWindowIds": Array [],
            "maintenanceWindowNames": Array [],
            "uuid": "uuid-2",
          },
          "state": Object {},
        },
      }
    `);
    expect(trackedRecoveredAlerts).toMatchInlineSnapshot(`
      Object {
        "2": Object {
          "meta": Object {
            "activeCount": 0,
            "flappingHistory": Array [],
            "maintenanceWindowIds": Array [],
            "maintenanceWindowNames": Array [],
            "uuid": "uuid-2",
          },
          "state": Object {},
        },
      }
    `);
  });

  test('should update active alert to look like a new alert if the activeCount is equal to the rule alertDelay', () => {
    const alert2 = new Alert('2', { meta: { uuid: 'uuid-2' } });

    const { newAlerts, activeAlerts, trackedActiveAlerts } = determineDelayedAlerts({
      newAlerts: {},
      activeAlerts: { '2': alert2 },
      trackedActiveAlerts: { '2': alert2 },
      recoveredAlerts: {},
      trackedRecoveredAlerts: {},
      delayedAlerts: {},
      alertDelay: 1,
      startedAt: null,
      ruleRunMetricsStore,
    });
    expect(newAlerts['2'].getState().duration).toBe('0');
    expect(newAlerts['2'].getState().start).toBeTruthy();

    expect(trackedActiveAlerts['2'].getState().duration).toBe('0');
    expect(trackedActiveAlerts['2'].getState().start).toBeTruthy();

    expect(activeAlerts['2'].getState().duration).toBe('0');
    expect(activeAlerts['2'].getState().start).toBeTruthy();
  });
});
