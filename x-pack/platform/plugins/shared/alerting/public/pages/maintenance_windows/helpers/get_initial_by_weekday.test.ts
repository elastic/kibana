/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { getInitialByWeekday } from './get_initial_by_weekday';

describe('getInitialByWeekday', () => {
  test('when passed empty recurring params, should return the day of the week of the passed in startDate', () => {
    expect(getInitialByWeekday([], moment('2021-11-23'))).toEqual({
      '1': false,
      '2': true,
      '3': false,
      '4': false,
      '5': false,
      '6': false,
      '7': false,
    });
  });

  test('when passed recurring params, should return the passed in days of the week and ignore the startDate', () => {
    expect(getInitialByWeekday(['+2MO', '-1FR'], moment('2021-11-23'))).toEqual({
      '1': true,
      '2': false,
      '3': false,
      '4': false,
      '5': true,
      '6': false,
      '7': false,
    });
  });

  test('when passed a null date, should return only Monday', () => {
    expect(getInitialByWeekday([], null)).toEqual({
      '1': true,
      '2': false,
      '3': false,
      '4': false,
      '5': false,
      '6': false,
      '7': false,
    });
  });
});
