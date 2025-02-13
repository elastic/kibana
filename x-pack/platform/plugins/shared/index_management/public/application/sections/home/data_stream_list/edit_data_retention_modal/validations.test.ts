/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isBiggerThanGlobalMaxRetention } from './validations';

describe('isBiggerThanGlobalMaxRetention', () => {
  it('should return undefined if any argument is missing', () => {
    expect(isBiggerThanGlobalMaxRetention('', 'd', '30d')).toBeUndefined();
    expect(isBiggerThanGlobalMaxRetention(10, '', '30d')).toBeUndefined();
    expect(isBiggerThanGlobalMaxRetention(10, 'd', '')).toBeUndefined();
  });

  it('should return an error message if retention is bigger than global max retention (in days)', () => {
    const result = isBiggerThanGlobalMaxRetention(40, 'd', '30d');
    expect(result).toEqual({
      message: 'Maximum data retention period on this project is 30 days.',
    });
  });

  it('should return undefined if retention is smaller than or equal to global max retention (in days)', () => {
    expect(isBiggerThanGlobalMaxRetention(30, 'd', '30d')).toBeUndefined();
    expect(isBiggerThanGlobalMaxRetention(25, 'd', '30d')).toBeUndefined();
  });

  it('should correctly compare retention in different time units against days', () => {
    expect(isBiggerThanGlobalMaxRetention(24, 'h', '1d')).toBeUndefined();
    expect(isBiggerThanGlobalMaxRetention(23, 'h', '1d')).toBeUndefined();
    // 30 days = 720 hours
    expect(isBiggerThanGlobalMaxRetention(800, 'h', '30d')).toEqual({
      message: 'Maximum data retention period on this project is 30 days.',
    });

    // 1 day = 1440 minutes
    expect(isBiggerThanGlobalMaxRetention(1440, 'm', '1d')).toBeUndefined();
    expect(isBiggerThanGlobalMaxRetention(3000, 'm', '2d')).toEqual({
      message: 'Maximum data retention period on this project is 2 days.',
    });

    // 1 day = 86400 seconds
    expect(isBiggerThanGlobalMaxRetention(1000, 's', '1d')).toBeUndefined();
    expect(isBiggerThanGlobalMaxRetention(87000, 's', '1d')).toEqual({
      message: 'Maximum data retention period on this project is 1 days.',
    });
  });

  it('should correctly compare retention in all of the units that are accepted by es', () => {
    // 1000 milliseconds = 1 seconds
    expect(isBiggerThanGlobalMaxRetention(1, 's', '1000ms')).toBeUndefined();
    expect(isBiggerThanGlobalMaxRetention(2, 's', '1000ms')).toEqual({
      message: 'Maximum data retention period on this project is 1000 milliseconds.',
    });

    // 1000000 microseconds = 1 seconds
    expect(isBiggerThanGlobalMaxRetention(1, 's', '1000000micros')).toBeUndefined();
    expect(isBiggerThanGlobalMaxRetention(2, 'm', '1000000micros')).toEqual({
      message: 'Maximum data retention period on this project is 1000000 microseconds.',
    });

    // 1000000000 microseconds = 1 seconds
    expect(isBiggerThanGlobalMaxRetention(2, 's', '1000000000nanos'));
    expect(isBiggerThanGlobalMaxRetention(2, 'h', '1000000000nanos')).toEqual({
      message: 'Maximum data retention period on this project is 1000000000 nanoseconds.',
    });
  });

  it('should throw an error for unknown time units', () => {
    expect(() => isBiggerThanGlobalMaxRetention(10, 'x', '30d')).toThrow('Unknown unit: x');
  });
});
