/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { calculateAuto } from '../calculate_auto.js';
import expect from '@kbn/expect';
import _ from 'lodash';
import moment from 'moment';

describe('Calculating Time Intervals Based on Size of Buckets', () => {
  it('Empty Arguments', () => {
    const nearDuration = calculateAuto();
    expect(nearDuration.milliseconds()).to.be.eql(0);
  });

  const duration = moment.duration(1456964549657 - 1456964538365, 'ms'); // about 11 seconds

  describe('Calculating Near Intervals with Ranging bucket sizes', () => {
    const tuples = [[10, 0], [24, 470], [40, 282], [200, 56], [800, 14], [10000, 1]];

    _.each(tuples, t => {
      it(`Bucket Size: ${t[0]} - Time Interval: ${t[1]}`, () => {
        const result = calculateAuto(t[0], duration);
        expect(result.milliseconds()).to.be.eql(t[1]);
      });
    });
  });
});
