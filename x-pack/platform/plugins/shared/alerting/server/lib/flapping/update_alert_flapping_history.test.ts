/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { updateAlertFlappingHistory } from './update_alert_flapping_history';
import { Alert } from '../../alert';
import type { AlertInstanceState, AlertInstanceContext } from '../../types';
import { DEFAULT_FLAPPING_SETTINGS } from '../../../common/rules_settings';

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
