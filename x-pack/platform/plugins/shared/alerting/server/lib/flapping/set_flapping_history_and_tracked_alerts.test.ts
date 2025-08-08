/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import sinon from 'sinon';
import { cloneDeep } from 'lodash';
import {
  updateAlertFlappingHistory,
  setFlappingHistoryAndTrackedAlerts,
} from './set_flapping_history_and_tracked_alerts';
import { Alert } from '../../alert';
import type { AlertInstanceState, AlertInstanceContext } from '../../types';
import {
  DEFAULT_FLAPPING_SETTINGS,
  DISABLE_FLAPPING_SETTINGS,
} from '../../../common/rules_settings';

describe('setFlappingHistoryAndTrackedAlerts', () => {
  let clock: sinon.SinonFakeTimers;

  beforeAll(() => {
    clock = sinon.useFakeTimers();
  });

  beforeEach(() => {
    clock.reset();
  });

  afterAll(() => clock.restore());

  test('if new alert, set flapping state to true', () => {
    const activeAlert = new Alert<AlertInstanceState, AlertInstanceContext>('1', {
      meta: { uuid: 'uuid-1' },
      state: {
        duration: '0',
        start: '1970-01-01T00:00:00.000Z',
      },
    });

    const alerts = cloneDeep({ '1': activeAlert });
    alerts['1'].scheduleActions('default' as never, { foo: '1' });

    const { activeAlerts, newAlerts, trackedActiveAlerts, recoveredAlerts } =
      setFlappingHistoryAndTrackedAlerts(
        DEFAULT_FLAPPING_SETTINGS,
        alerts, // new alerts
        alerts, // active alerts
        {}, // recovered alerts
        {} // previously recovered alerts
      );

    expect(activeAlerts).toMatchInlineSnapshot(`
        Object {
          "1": Object {
            "meta": Object {
              "flappingHistory": Array [
                true,
              ],
              "maintenanceWindowIds": Array [],
              "uuid": "uuid-1",
            },
            "state": Object {
              "duration": "0",
              "start": "1970-01-01T00:00:00.000Z",
            },
          },
        }
      `);
    expect(newAlerts).toMatchInlineSnapshot(`
        Object {
          "1": Object {
            "meta": Object {
              "flappingHistory": Array [
                true,
              ],
              "maintenanceWindowIds": Array [],
              "uuid": "uuid-1",
            },
            "state": Object {
              "duration": "0",
              "start": "1970-01-01T00:00:00.000Z",
            },
          },
        }
      `);
    expect(trackedActiveAlerts).toMatchInlineSnapshot(`
      Object {
        "1": Object {
          "meta": Object {
            "flappingHistory": Array [
              true,
            ],
            "maintenanceWindowIds": Array [],
            "uuid": "uuid-1",
          },
          "state": Object {
            "duration": "0",
            "start": "1970-01-01T00:00:00.000Z",
          },
        },
      }
    `);
    expect(recoveredAlerts).toMatchInlineSnapshot(`Object {}`);
  });

  test('if alert is still active, set flapping state to false', () => {
    const activeAlert = new Alert<AlertInstanceState, AlertInstanceContext>('1', {
      meta: { flappingHistory: [false], uuid: 'uuid-1' },
    });

    const alerts = cloneDeep({ '1': activeAlert });
    alerts['1'].scheduleActions('default' as never, { foo: '1' });

    const { activeAlerts, newAlerts, trackedActiveAlerts, recoveredAlerts } =
      setFlappingHistoryAndTrackedAlerts(
        DEFAULT_FLAPPING_SETTINGS,
        {}, // new alerts
        alerts, // active alerts
        {}, // recovered alerts
        {} // previously recovered alerts
      );

    expect(activeAlerts).toMatchInlineSnapshot(`
        Object {
          "1": Object {
            "meta": Object {
              "flappingHistory": Array [
                false,
                false,
              ],
              "maintenanceWindowIds": Array [],
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
            "flappingHistory": Array [
              false,
              false,
            ],
            "maintenanceWindowIds": Array [],
            "uuid": "uuid-1",
          },
          "state": Object {},
        },
      }
    `);
    expect(newAlerts).toMatchInlineSnapshot(`Object {}`);
    expect(recoveredAlerts).toMatchInlineSnapshot(`Object {}`);
  });

  test('if alert is active and previously recovered, set flapping state to true', () => {
    const activeAlert = new Alert<AlertInstanceState, AlertInstanceContext>('1', {
      meta: { uuid: 'uuid-1' },
      state: {
        duration: '0',
        start: '1970-01-01T00:00:00.000Z',
      },
    });
    const recoveredAlert = new Alert<AlertInstanceState, AlertInstanceContext>('1', {
      meta: { flappingHistory: [false], uuid: 'uuid-2' },
    });

    const alerts = cloneDeep({ '1': activeAlert });
    alerts['1'].scheduleActions('default' as never, { foo: '1' });
    alerts['1'].setFlappingHistory([false]);

    const { activeAlerts, newAlerts, trackedActiveAlerts, recoveredAlerts } =
      setFlappingHistoryAndTrackedAlerts(
        DEFAULT_FLAPPING_SETTINGS,
        alerts, // new alerts
        alerts, // active alerts
        {}, // recovered alerts
        { '1': recoveredAlert } // previously recovered alerts
      );

    expect(activeAlerts).toMatchInlineSnapshot(`
        Object {
          "1": Object {
            "meta": Object {
              "flappingHistory": Array [
                false,
                true,
              ],
              "maintenanceWindowIds": Array [],
              "uuid": "uuid-1",
            },
            "state": Object {
              "duration": "0",
              "start": "1970-01-01T00:00:00.000Z",
            },
          },
        }
      `);
    expect(newAlerts).toMatchInlineSnapshot(`
        Object {
          "1": Object {
            "meta": Object {
              "flappingHistory": Array [
                false,
                true,
              ],
              "maintenanceWindowIds": Array [],
              "uuid": "uuid-1",
            },
            "state": Object {
              "duration": "0",
              "start": "1970-01-01T00:00:00.000Z",
            },
          },
        }
      `);
    expect(trackedActiveAlerts).toMatchInlineSnapshot(`
      Object {
        "1": Object {
          "meta": Object {
            "flappingHistory": Array [
              false,
              true,
            ],
            "maintenanceWindowIds": Array [],
            "uuid": "uuid-1",
          },
          "state": Object {
            "duration": "0",
            "start": "1970-01-01T00:00:00.000Z",
          },
        },
      }
    `);
    expect(recoveredAlerts).toMatchInlineSnapshot(`Object {}`);
  });

  test('if alert is recovered and previously active, set flapping state to true', () => {
    const activeAlert = new Alert<AlertInstanceState, AlertInstanceContext>('1', {
      meta: { flappingHistory: [false], uuid: 'uuid-1' },
    });
    activeAlert.scheduleActions('default' as never, { foo: '1' });
    const recoveredAlert = new Alert<AlertInstanceState, AlertInstanceContext>('1', {
      meta: { flappingHistory: [false], uuid: 'uuid-1' },
    });

    const alerts = cloneDeep({ '1': recoveredAlert });

    const { activeAlerts, newAlerts, recoveredAlerts, trackedRecoveredAlerts } =
      setFlappingHistoryAndTrackedAlerts(
        DEFAULT_FLAPPING_SETTINGS,
        {}, // new alerts
        {}, // active alerts
        alerts, // recovered alerts
        {} // previously recovered alerts
      );

    expect(activeAlerts).toMatchInlineSnapshot(`Object {}`);
    expect(newAlerts).toMatchInlineSnapshot(`Object {}`);
    expect(recoveredAlerts).toMatchInlineSnapshot(`
        Object {
          "1": Object {
            "meta": Object {
              "flappingHistory": Array [
                false,
                true,
              ],
              "maintenanceWindowIds": Array [],
              "uuid": "uuid-1",
            },
            "state": Object {},
          },
        }
      `);
    expect(trackedRecoveredAlerts).toMatchInlineSnapshot(`
      Object {
        "1": Object {
          "meta": Object {
            "flappingHistory": Array [
              false,
              true,
            ],
            "maintenanceWindowIds": Array [],
            "uuid": "uuid-1",
          },
          "state": Object {},
        },
      }
    `);
  });

  test('if alert is still recovered, set flapping state to false', () => {
    const recoveredAlert = new Alert<AlertInstanceState, AlertInstanceContext>('1', {
      meta: { flappingHistory: [false], uuid: 'uuid-1' },
    });

    const alerts = cloneDeep({ '1': recoveredAlert });

    const { activeAlerts, newAlerts, recoveredAlerts, trackedRecoveredAlerts } =
      setFlappingHistoryAndTrackedAlerts(
        DEFAULT_FLAPPING_SETTINGS,
        {}, // new alerts
        {}, // active alerts
        {}, // recovered alerts
        alerts // previously recovered alerts
      );

    expect(activeAlerts).toMatchInlineSnapshot(`Object {}`);
    expect(newAlerts).toMatchInlineSnapshot(`Object {}`);
    expect(recoveredAlerts).toMatchInlineSnapshot(`Object {}`);
    expect(trackedRecoveredAlerts).toMatchInlineSnapshot(`
        Object {
          "1": Object {
            "meta": Object {
              "flappingHistory": Array [
                false,
                false,
              ],
              "maintenanceWindowIds": Array [],
              "uuid": "uuid-1",
            },
            "state": Object {},
          },
        }
      `);
  });

  test('if setFlapping is false should not update flappingHistory', () => {
    const activeAlert1 = new Alert<AlertInstanceState, AlertInstanceContext>('1', {
      meta: { uuid: 'uuid-1' },
      state: {
        duration: '0',
        start: '1970-01-01T00:00:00.000Z',
      },
    });
    activeAlert1.scheduleActions('default' as never, { foo: '1' });
    const activeAlert2 = new Alert<AlertInstanceState, AlertInstanceContext>('2', {
      meta: { flappingHistory: [false], uuid: 'uuid-2' },
    });
    activeAlert2.scheduleActions('default' as never, { foo: '1' });
    const recoveredAlert = new Alert<AlertInstanceState, AlertInstanceContext>('3', {
      meta: { flappingHistory: [false], uuid: 'uuid-3' },
    });

    const previouslyRecoveredAlerts = cloneDeep({ '3': recoveredAlert });
    const alerts = cloneDeep({ '1': activeAlert1, '2': activeAlert2 });

    const {
      newAlerts,
      activeAlerts,
      trackedActiveAlerts,
      recoveredAlerts,
      trackedRecoveredAlerts,
    } = setFlappingHistoryAndTrackedAlerts(
      DISABLE_FLAPPING_SETTINGS,
      cloneDeep({ '1': activeAlert1 }), // new alerts
      alerts, // active alerts
      {}, // recovered alerts
      previouslyRecoveredAlerts
    );

    expect(activeAlerts).toMatchInlineSnapshot(`
        Object {
          "1": Object {
            "meta": Object {
              "flappingHistory": Array [],
              "maintenanceWindowIds": Array [],
              "uuid": "uuid-1",
            },
            "state": Object {
              "duration": "0",
              "start": "1970-01-01T00:00:00.000Z",
            },
          },
          "2": Object {
            "meta": Object {
              "flappingHistory": Array [
                false,
              ],
              "maintenanceWindowIds": Array [],
              "uuid": "uuid-2",
            },
            "state": Object {},
          },
        }
      `);
    expect(newAlerts).toMatchInlineSnapshot(`
        Object {
          "1": Object {
            "meta": Object {
              "flappingHistory": Array [],
              "maintenanceWindowIds": Array [],
              "uuid": "uuid-1",
            },
            "state": Object {
              "duration": "0",
              "start": "1970-01-01T00:00:00.000Z",
            },
          },
        }
      `);
    expect(trackedActiveAlerts).toMatchInlineSnapshot(`
      Object {
        "1": Object {
          "meta": Object {
            "flappingHistory": Array [],
            "maintenanceWindowIds": Array [],
            "uuid": "uuid-1",
          },
          "state": Object {
            "duration": "0",
            "start": "1970-01-01T00:00:00.000Z",
          },
        },
        "2": Object {
          "meta": Object {
            "flappingHistory": Array [
              false,
            ],
            "maintenanceWindowIds": Array [],
            "uuid": "uuid-2",
          },
          "state": Object {},
        },
      }
    `);
    expect(recoveredAlerts).toMatchInlineSnapshot(`Object {}`);
    expect(trackedRecoveredAlerts).toMatchInlineSnapshot(`
      Object {
        "3": Object {
          "meta": Object {
            "flappingHistory": Array [
              false,
            ],
            "maintenanceWindowIds": Array [],
            "uuid": "uuid-3",
          },
          "state": Object {},
        },
      }
    `);
  });

  describe('updateAlertFlappingHistory', () => {
    test('correctly updates flappingHistory', () => {
      const alert = new Alert<AlertInstanceState, AlertInstanceContext>('1', {
        meta: { flappingHistory: [false, false] },
      });
      updateAlertFlappingHistory(DEFAULT_FLAPPING_SETTINGS, alert, true);
      expect(alert.getFlappingHistory()).toEqual([false, false, true]);
    });

    test('correctly updates flappingHistory while maintaining a fixed size', () => {
      const flappingHistory = new Array(20).fill(false);
      const alert = new Alert<AlertInstanceState, AlertInstanceContext>('1', {
        meta: { flappingHistory },
      });
      updateAlertFlappingHistory(DEFAULT_FLAPPING_SETTINGS, alert, true);
      const fh = alert.getFlappingHistory() || [];
      expect(fh.length).toEqual(20);
      const result = new Array(19).fill(false);
      expect(fh).toEqual(result.concat(true));
    });

    test('correctly updates flappingHistory while maintaining if array is larger than fixed size', () => {
      const flappingHistory = new Array(23).fill(false);
      const alert = new Alert<AlertInstanceState, AlertInstanceContext>('1', {
        meta: { flappingHistory },
      });
      updateAlertFlappingHistory(DEFAULT_FLAPPING_SETTINGS, alert, true);
      const fh = alert.getFlappingHistory() || [];
      expect(fh.length).toEqual(20);
      const result = new Array(19).fill(false);
      expect(fh).toEqual(result.concat(true));
    });
  });
});
