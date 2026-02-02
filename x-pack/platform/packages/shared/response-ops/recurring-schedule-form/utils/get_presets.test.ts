/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { getPresets } from './get_presets';

describe('getPresets', () => {
  test('should return presets', () => {
    expect(getPresets(moment('2023-03-23'))).toEqual({
      '0': {
        interval: 1,
      },
      '1': {
        bymonth: 'weekday',
        interval: 1,
      },
      '2': {
        byweekday: {
          '1': false,
          '2': false,
          '3': false,
          '4': true,
          '5': false,
          '6': false,
          '7': false,
        },
        interval: 1,
      },
      '3': {
        interval: 1,
      },
      '4': {
        interval: 1,
      },
    });
  });
});
