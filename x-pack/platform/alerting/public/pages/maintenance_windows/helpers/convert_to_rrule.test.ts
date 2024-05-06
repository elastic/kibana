/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { Frequency } from '@kbn/rrule';
import { convertToRRule } from './convert_to_rrule';

describe('convertToRRule', () => {
  const timezone = 'UTC';
  const today = '2023-03-22';
  const startDate = moment(today);

  test('should convert a maintenance window that is not recurring', () => {
    const rRule = convertToRRule(startDate, timezone, undefined);

    expect(rRule).toEqual({
      dtstart: startDate.toISOString(),
      tzid: 'UTC',
      freq: Frequency.YEARLY,
      count: 1,
    });
  });

  test('should convert a maintenance window that is recurring on a daily schedule', () => {
    const rRule = convertToRRule(startDate, timezone, {
      byweekday: { 1: false, 2: false, 3: true, 4: false, 5: false, 6: false, 7: false },
      ends: 'never',
      frequency: Frequency.DAILY,
    });

    expect(rRule).toEqual({
      dtstart: startDate.toISOString(),
      tzid: 'UTC',
      freq: Frequency.DAILY,
      interval: 1,
      byweekday: ['WE'],
    });
  });

  test('should convert a maintenance window that is recurring on a daily schedule until', () => {
    const until = moment(today).add(1, 'month').toISOString();
    const rRule = convertToRRule(startDate, timezone, {
      byweekday: { 1: false, 2: false, 3: true, 4: false, 5: false, 6: false, 7: false },
      ends: 'until',
      until,
      frequency: Frequency.DAILY,
    });

    expect(rRule).toEqual({
      dtstart: startDate.toISOString(),
      tzid: 'UTC',
      freq: Frequency.DAILY,
      interval: 1,
      byweekday: ['WE'],
      until,
    });
  });

  test('should convert a maintenance window that is recurring on a daily schedule after x', () => {
    const rRule = convertToRRule(startDate, timezone, {
      byweekday: { 1: false, 2: false, 3: true, 4: false, 5: false, 6: false, 7: false },
      ends: 'afterx',
      count: 3,
      frequency: Frequency.DAILY,
    });

    expect(rRule).toEqual({
      dtstart: startDate.toISOString(),
      tzid: 'UTC',
      freq: Frequency.DAILY,
      interval: 1,
      byweekday: ['WE'],
      count: 3,
    });
  });

  test('should convert a maintenance window that is recurring on a weekly schedule', () => {
    const rRule = convertToRRule(startDate, timezone, {
      ends: 'never',
      frequency: Frequency.WEEKLY,
    });

    expect(rRule).toEqual({
      dtstart: startDate.toISOString(),
      tzid: 'UTC',
      freq: Frequency.WEEKLY,
      interval: 1,
      byweekday: ['WE'],
    });
  });

  test('should convert a maintenance window that is recurring on a monthly schedule', () => {
    const rRule = convertToRRule(startDate, timezone, {
      ends: 'never',
      frequency: Frequency.MONTHLY,
    });

    expect(rRule).toEqual({
      dtstart: startDate.toISOString(),
      tzid: 'UTC',
      freq: Frequency.MONTHLY,
      interval: 1,
      byweekday: ['+4WE'],
    });
  });

  test('should convert a maintenance window that is recurring on a yearly schedule', () => {
    const rRule = convertToRRule(startDate, timezone, {
      ends: 'never',
      frequency: Frequency.YEARLY,
    });

    expect(rRule).toEqual({
      dtstart: startDate.toISOString(),
      tzid: 'UTC',
      freq: Frequency.YEARLY,
      interval: 1,
      bymonth: [3],
      bymonthday: [22],
    });
  });

  test('should convert a maintenance window that is recurring on a custom daily schedule', () => {
    const rRule = convertToRRule(startDate, timezone, {
      customFrequency: Frequency.DAILY,
      ends: 'never',
      frequency: 'CUSTOM',
      interval: 1,
    });

    expect(rRule).toEqual({
      dtstart: startDate.toISOString(),
      tzid: 'UTC',
      freq: Frequency.DAILY,
      interval: 1,
    });
  });

  test('should convert a maintenance window that is recurring on a custom weekly schedule', () => {
    const rRule = convertToRRule(startDate, timezone, {
      byweekday: { 1: false, 2: false, 3: true, 4: true, 5: false, 6: false, 7: false },
      customFrequency: Frequency.WEEKLY,
      ends: 'never',
      frequency: 'CUSTOM',
      interval: 1,
    });

    expect(rRule).toEqual({
      dtstart: startDate.toISOString(),
      tzid: 'UTC',
      freq: Frequency.WEEKLY,
      interval: 1,
      byweekday: ['WE', 'TH'],
    });
  });

  test('should convert a maintenance window that is recurring on a custom monthly by day schedule', () => {
    const rRule = convertToRRule(startDate, timezone, {
      bymonth: 'day',
      customFrequency: Frequency.MONTHLY,
      ends: 'never',
      frequency: 'CUSTOM',
      interval: 1,
    });

    expect(rRule).toEqual({
      dtstart: startDate.toISOString(),
      tzid: 'UTC',
      freq: Frequency.MONTHLY,
      interval: 1,
      bymonthday: [22],
    });
  });

  test('should convert a maintenance window that is recurring on a custom monthly by weekday schedule', () => {
    const rRule = convertToRRule(startDate, timezone, {
      bymonth: 'weekday',
      customFrequency: Frequency.MONTHLY,
      ends: 'never',
      frequency: 'CUSTOM',
      interval: 1,
    });

    expect(rRule).toEqual({
      dtstart: startDate.toISOString(),
      tzid: 'UTC',
      freq: Frequency.MONTHLY,
      interval: 1,
      byweekday: ['+4WE'],
    });
  });

  test('should convert a maintenance window that is recurring on a custom yearly schedule', () => {
    const rRule = convertToRRule(startDate, timezone, {
      customFrequency: Frequency.YEARLY,
      ends: 'never',
      frequency: 'CUSTOM',
      interval: 3,
    });

    expect(rRule).toEqual({
      dtstart: startDate.toISOString(),
      tzid: 'UTC',
      freq: Frequency.YEARLY,
      interval: 3,
      bymonth: [3],
      bymonthday: [22],
    });
  });
});
