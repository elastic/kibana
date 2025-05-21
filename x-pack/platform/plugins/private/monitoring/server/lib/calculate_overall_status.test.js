/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { calculateOverallStatus } from './calculate_overall_status';

describe('Calculate Kibana Cluster Helath', () => {
  it('health status combined from multiple instances', () => {
    const greens = [['green', 'green', null], ['green', 'green'], ['green']];
    const yellows = [
      ['yellow', 'green', null],
      ['yellow', 'green'],
      ['green', 'yellow'],
      ['yellow'],
    ];
    const reds = [
      ['green', 'red', 'green', null],
      ['green', 'red', 'green'],
      ['red', 'yellow', 'green'],
      ['yellow', 'red', 'yellow'],
      ['red'],
    ];

    greens.forEach((set) => {
      expect(calculateOverallStatus(set)).toBe('green');
    });
    yellows.forEach((set) => {
      expect(calculateOverallStatus(set)).toBe('yellow');
    });
    reds.forEach((set) => {
      expect(calculateOverallStatus(set)).toBe('red');
    });
  });
});
