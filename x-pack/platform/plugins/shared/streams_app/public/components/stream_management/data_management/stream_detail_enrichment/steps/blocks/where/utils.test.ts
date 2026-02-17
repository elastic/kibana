/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getNestedMessage } from './utils';

describe('getNestedMessage', () => {
  it('should return singular message for steps only', () => {
    const statusCounts = { skipped: 1 };
    const stepsCount = 1;
    const conditionsCount = 0;
    const msg = getNestedMessage(statusCounts, stepsCount, conditionsCount);
    expect(msg).toEqual('1 skipped step');
  });

  it('should return plural message for steps only', () => {
    const statusCounts = { pending: 1, successful: 2 };
    const stepsCount = 3;
    const conditionsCount = 0;
    const msg = getNestedMessage(statusCounts, stepsCount, conditionsCount);
    expect(msg).toEqual('1 pending, 2 successful steps');
  });

  it('should return singular message for conditions only', () => {
    const statusCounts = {};
    const stepsCount = 0;
    const conditionsCount = 1;
    const msg = getNestedMessage(statusCounts, stepsCount, conditionsCount);
    expect(msg).toEqual('1 nested condition');
  });

  it('should return plural message for conditions only', () => {
    const statusCounts = {};
    const stepsCount = 0;
    const conditionsCount = 2;
    const msg = getNestedMessage(statusCounts, stepsCount, conditionsCount);
    expect(msg).toEqual('2 nested conditions');
  });

  it('should return singular message for steps and conditions', () => {
    const statusCounts = { running: 1 };
    const stepsCount = 1;
    const conditionsCount = 1;
    const msg = getNestedMessage(statusCounts, stepsCount, conditionsCount);

    expect(msg).toEqual('1 running step and 1 nested condition');
  });

  it('should return plural message for steps and conditions', () => {
    const statusCounts = { running: 5 };
    const stepsCount = 5;
    const conditionsCount = 2;
    const msg = getNestedMessage(statusCounts, stepsCount, conditionsCount);
    expect(msg).toEqual('5 running steps and 2 nested conditions');
  });

  it('should return singular message for steps and plural message for conditions', () => {
    const statusCounts = { running: 1 };
    const stepsCount = 1;
    const conditionsCount = 2;
    const msg = getNestedMessage(statusCounts, stepsCount, conditionsCount);
    expect(msg).toEqual('1 running step and 2 nested conditions');
  });

  it('should return plural message for steps and singular message for conditions', () => {
    const statusCounts = { running: 5 };
    const stepsCount = 5;
    const conditionsCount = 1;
    const msg = getNestedMessage(statusCounts, stepsCount, conditionsCount);
    expect(msg).toEqual('5 running steps and 1 nested condition');
  });

  it('should return empty string if no steps and no conditions', () => {
    const statusCounts = {};
    const stepsCount = 0;
    const conditionsCount = 0;
    expect(getNestedMessage(statusCounts, stepsCount, conditionsCount)).toEqual('');
  });

  it('should fallback to status key if status label is missing', () => {
    const statusCounts = { foo: 7 };
    const stepsCount = 7;
    const conditionsCount = 0;
    const msg = getNestedMessage(statusCounts, stepsCount, conditionsCount);
    expect(msg).toContain('foo');
  });
});
