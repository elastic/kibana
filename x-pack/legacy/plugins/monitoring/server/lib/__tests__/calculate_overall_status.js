/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { calculateOverallStatus } from '../calculate_overall_status';

describe('Calculate Kibana Cluster Helath', () => {
  it('health status combined from multiple instances', () => {
    const greens = [
      ['green', 'green', null],
      ['green', 'green'],
      ['green']
    ];
    const yellows = [
      ['yellow', 'green', null],
      ['yellow', 'green'],
      ['green', 'yellow'],
      ['yellow']
    ];
    const reds = [
      ['green', 'red', 'green', null],
      ['green', 'red', 'green'],
      ['red', 'yellow', 'green'],
      ['yellow', 'red', 'yellow'],
      ['red']
    ];

    greens.forEach(set => {
      expect(calculateOverallStatus(set)).to.be('green');
    });
    yellows.forEach(set => {
      expect(calculateOverallStatus(set)).to.be('yellow');
    });
    reds.forEach(set => {
      expect(calculateOverallStatus(set)).to.be('red');
    });
  });
});
