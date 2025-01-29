/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import type { MaintenanceWindow } from '../../../../common';

import { Frequency } from '@kbn/rrule';
import { convertFromMaintenanceWindowToForm } from './convert_from_maintenance_window_to_form';

describe('convertFromMaintenanceWindowToForm', () => {
  const title = 'test';
  const today = '2023-03-22';
  const startDate = moment(today);
  const endDate = moment(today).add(2, 'days');
  const duration = endDate.diff(startDate);

  test('should convert a maintenance window that is not recurring', () => {
    const maintenanceWindow = convertFromMaintenanceWindowToForm({
      title,
      duration,
      rRule: {
        dtstart: startDate.toISOString(),
        tzid: 'UTC',
        freq: Frequency.YEARLY,
        count: 1,
      },
    } as MaintenanceWindow);

    expect(maintenanceWindow).toEqual({
      title,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      timezone: ['UTC'],
      recurring: false,
      categoryIds: [],
    });
  });

  test('should convert a maintenance window that is recurring on a daily schedule', () => {
    const maintenanceWindow = convertFromMaintenanceWindowToForm({
      title,
      duration,
      rRule: {
        dtstart: startDate.toISOString(),
        tzid: 'UTC',
        freq: Frequency.DAILY,
        interval: 1,
        byweekday: ['WE'],
      },
    } as MaintenanceWindow);

    expect(maintenanceWindow).toEqual({
      title,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      timezone: ['UTC'],
      recurring: true,
      recurringSchedule: {
        byweekday: { 1: false, 2: false, 3: true, 4: false, 5: false, 6: false, 7: false },
        ends: 'never',
        frequency: Frequency.DAILY,
        interval: 1,
      },
      categoryIds: [],
    });
  });

  test('should convert a maintenance window that is recurring on a daily schedule until', () => {
    const until = moment(today).add(1, 'month').toISOString();

    const maintenanceWindow = convertFromMaintenanceWindowToForm({
      title,
      duration,
      rRule: {
        dtstart: startDate.toISOString(),
        tzid: 'UTC',
        freq: Frequency.DAILY,
        interval: 1,
        byweekday: ['WE'],
        until,
      },
    } as MaintenanceWindow);

    expect(maintenanceWindow).toEqual({
      title,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      timezone: ['UTC'],
      recurring: true,
      recurringSchedule: {
        byweekday: { 1: false, 2: false, 3: true, 4: false, 5: false, 6: false, 7: false },
        ends: 'ondate',
        until,
        frequency: Frequency.DAILY,
        interval: 1,
      },
      categoryIds: [],
    });
  });

  test('should convert a maintenance window that is recurring on a daily schedule after x', () => {
    const maintenanceWindow = convertFromMaintenanceWindowToForm({
      title,
      duration,
      rRule: {
        dtstart: startDate.toISOString(),
        tzid: 'UTC',
        freq: Frequency.DAILY,
        interval: 1,
        byweekday: ['WE'],
        count: 3,
      },
    } as MaintenanceWindow);

    expect(maintenanceWindow).toEqual({
      title,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      timezone: ['UTC'],
      recurring: true,
      recurringSchedule: {
        byweekday: { 1: false, 2: false, 3: true, 4: false, 5: false, 6: false, 7: false },
        ends: 'afterx',
        count: 3,
        frequency: Frequency.DAILY,
        interval: 1,
      },
      categoryIds: [],
    });
  });

  test('should convert a maintenance window that is recurring on a weekly schedule', () => {
    const maintenanceWindow = convertFromMaintenanceWindowToForm({
      title,
      duration,
      rRule: {
        dtstart: startDate.toISOString(),
        tzid: 'UTC',
        freq: Frequency.WEEKLY,
        interval: 1,
        byweekday: ['WE'],
      },
    } as MaintenanceWindow);

    expect(maintenanceWindow).toEqual({
      title,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      timezone: ['UTC'],
      recurring: true,
      recurringSchedule: {
        ends: 'never',
        frequency: Frequency.WEEKLY,
        byweekday: { 1: false, 2: false, 3: true, 4: false, 5: false, 6: false, 7: false },
        interval: 1,
      },
      categoryIds: [],
    });
  });

  test('should convert a maintenance window that is recurring on a monthly schedule', () => {
    const maintenanceWindow = convertFromMaintenanceWindowToForm({
      title,
      duration,
      rRule: {
        dtstart: startDate.toISOString(),
        tzid: 'UTC',
        freq: Frequency.MONTHLY,
        interval: 1,
        byweekday: ['+4WE'],
      },
    } as MaintenanceWindow);

    expect(maintenanceWindow).toEqual({
      title,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      timezone: ['UTC'],
      recurring: true,
      recurringSchedule: {
        ends: 'never',
        frequency: Frequency.MONTHLY,
        bymonth: 'weekday',
        interval: 1,
      },
      categoryIds: [],
    });
  });

  test('should convert a maintenance window that is recurring on a yearly schedule', () => {
    const maintenanceWindow = convertFromMaintenanceWindowToForm({
      title,
      duration,
      rRule: {
        dtstart: startDate.toISOString(),
        tzid: 'UTC',
        freq: Frequency.YEARLY,
        interval: 1,
        bymonth: [3],
        bymonthday: [22],
      },
    } as MaintenanceWindow);

    expect(maintenanceWindow).toEqual({
      title,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      timezone: ['UTC'],
      recurring: true,
      recurringSchedule: {
        ends: 'never',
        frequency: Frequency.YEARLY,
        interval: 1,
      },
      categoryIds: [],
    });
  });

  test('should convert a maintenance window that is recurring on a custom daily schedule', () => {
    const maintenanceWindow = convertFromMaintenanceWindowToForm({
      title,
      duration,
      rRule: {
        dtstart: startDate.toISOString(),
        tzid: 'UTC',
        freq: Frequency.DAILY,
        interval: 1,
      },
    } as MaintenanceWindow);

    expect(maintenanceWindow).toEqual({
      title,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      timezone: ['UTC'],
      recurring: true,
      recurringSchedule: {
        customFrequency: Frequency.DAILY,
        ends: 'never',
        frequency: 'CUSTOM',
        interval: 1,
      },
      categoryIds: [],
    });
  });

  test('should convert a maintenance window that is recurring on a custom weekly schedule', () => {
    const maintenanceWindow = convertFromMaintenanceWindowToForm({
      title,
      duration,
      rRule: {
        dtstart: startDate.toISOString(),
        tzid: 'UTC',
        freq: Frequency.WEEKLY,
        interval: 1,
        byweekday: ['WE', 'TH'],
      },
    } as MaintenanceWindow);

    expect(maintenanceWindow).toEqual({
      title,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      timezone: ['UTC'],
      recurring: true,
      recurringSchedule: {
        byweekday: { 1: false, 2: false, 3: true, 4: true, 5: false, 6: false, 7: false },
        customFrequency: Frequency.WEEKLY,
        ends: 'never',
        frequency: 'CUSTOM',
        interval: 1,
      },
      categoryIds: [],
    });
  });

  test('should convert a maintenance window that is recurring on a custom monthly by day schedule', () => {
    const maintenanceWindow = convertFromMaintenanceWindowToForm({
      title,
      duration,
      rRule: {
        dtstart: startDate.toISOString(),
        tzid: 'UTC',
        freq: Frequency.MONTHLY,
        interval: 1,
        bymonthday: [22],
      },
    } as MaintenanceWindow);

    expect(maintenanceWindow).toEqual({
      title,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      timezone: ['UTC'],
      recurring: true,
      recurringSchedule: {
        bymonth: 'day',
        customFrequency: Frequency.MONTHLY,
        ends: 'never',
        frequency: 'CUSTOM',
        interval: 1,
      },
      categoryIds: [],
    });
  });

  test('should convert a maintenance window that is recurring on a custom yearly schedule', () => {
    const maintenanceWindow = convertFromMaintenanceWindowToForm({
      title,
      duration,
      rRule: {
        dtstart: startDate.toISOString(),
        tzid: 'UTC',
        freq: Frequency.YEARLY,
        interval: 3,
        bymonth: [3],
        bymonthday: [22],
      },
    } as MaintenanceWindow);

    expect(maintenanceWindow).toEqual({
      title,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      timezone: ['UTC'],
      recurring: true,
      recurringSchedule: {
        customFrequency: Frequency.YEARLY,
        ends: 'never',
        frequency: 'CUSTOM',
        interval: 3,
      },
      categoryIds: [],
    });
  });
});
