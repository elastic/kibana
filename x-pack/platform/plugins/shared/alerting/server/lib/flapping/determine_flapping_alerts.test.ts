/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Alert } from '../../alert';
import type { AlertInstanceState, AlertInstanceContext } from '../../types';
import { DEFAULT_FLAPPING_SETTINGS } from '../../../common/rules_settings';
import { determineFlappingAlerts } from './determine_flapping_alerts';
import { getRecoveredAlertIdsToStopTracking } from './optimize_task_state_for_flapping';

describe('determineFlappingAlerts', () => {
  const determineForOngoingRecoveredAlert = (meta: {
    flapping: boolean;
    flappingHistory: boolean[];
  }) =>
    determineFlappingAlerts({
      newAlerts: {},
      activeAlerts: {},
      recoveredAlerts: {},
      flappingSettings: DEFAULT_FLAPPING_SETTINGS,
      previouslyRecoveredAlerts: {
        '1': new Alert<AlertInstanceState, AlertInstanceContext>('1', { meta }),
      },
      actionGroupId: 'default',
    });

  test('should stop flapping and tracking an ongoing recovered alert once its look back window has no state changes', () => {
    const { trackedRecoveredAlerts } = determineForOngoingRecoveredAlert({
      flapping: true,
      flappingHistory: [true].concat(new Array(19).fill(false)),
    });

    expect(trackedRecoveredAlerts['1'].getFlappingHistory()).toEqual(new Array(20).fill(false));
    expect(trackedRecoveredAlerts['1'].getFlapping()).toBe(false);
    expect(getRecoveredAlertIdsToStopTracking(trackedRecoveredAlerts, 1000)).toEqual(['1']);
  });

  test('should keep flapping and tracking an ongoing recovered alert while its look back window has state changes', () => {
    const { trackedRecoveredAlerts } = determineForOngoingRecoveredAlert({
      flapping: true,
      flappingHistory: [false, true].concat(new Array(18).fill(false)),
    });

    expect(trackedRecoveredAlerts['1'].getFlappingHistory()).toEqual(
      [true].concat(new Array(19).fill(false))
    );
    expect(trackedRecoveredAlerts['1'].getFlapping()).toBe(true);
    expect(getRecoveredAlertIdsToStopTracking(trackedRecoveredAlerts, 1000)).toEqual([]);
  });

  test('should not start flapping on an ongoing recovered alert that recovered while not flapping', () => {
    const { trackedRecoveredAlerts } = determineForOngoingRecoveredAlert({
      flapping: false,
      flappingHistory: new Array(16).fill(false).concat([true, true, true, true]),
    });

    expect(trackedRecoveredAlerts['1'].getFlapping()).toBe(false);
  });
});
