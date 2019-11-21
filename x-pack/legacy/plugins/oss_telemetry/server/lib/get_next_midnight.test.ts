/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { getNextMidnight } from './get_next_midnight';

describe('getNextMidnight', () => {
  test('Returns the next time and date of midnight as an iso string', () => {
    const nextMidnightMoment = moment()
      .add(1, 'days')
      .startOf('day')
      .toDate();

    expect(getNextMidnight()).toEqual(nextMidnightMoment);
  });
});
