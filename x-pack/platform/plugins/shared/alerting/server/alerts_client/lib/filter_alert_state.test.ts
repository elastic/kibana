/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { filterAlertState } from './filter_alert_state';

describe('filterAlertState', () => {
  test('should remove start, end and duration fields', () => {
    const alertState = {
      triggerdOnCycle: 2,
      start: '2025-10-30T13:33:47.665Z',
      duration: '0',
      end: '2025-10-30T13:33:47.665Z',
      monitoring: {
        cpu: { usage: 75 },
      },
      nested: {
        start: 'should stay',
      },
    };

    const filteredState = filterAlertState(alertState);
    expect(filteredState).toEqual({
      triggerdOnCycle: 2,
      monitoring: {
        cpu: { usage: 75 },
      },
      nested: {
        start: 'should stay',
      },
    });
  });
});
