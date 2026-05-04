/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { Weekday } from '@kbn/rrule';

import {
  usePackQueryForm,
  type PackQueryFormData,
  type PackSOQueryFormData,
} from './use_pack_query_form';
import type { ScheduleFormData } from '../../components/schedule_section';
import { DEFAULT_SCHEDULE_FORM_VALUES } from '../../components/schedule_section';

const buildPackDefaultSchedule = (overrides: Partial<ScheduleFormData> = {}): ScheduleFormData => ({
  ...DEFAULT_SCHEDULE_FORM_VALUES,
  start_date: '2024-01-01T00:00:00.000Z',
  ...overrides,
});

const setup = (defaultValue?: PackSOQueryFormData, packDefaultSchedule?: ScheduleFormData) =>
  renderHook(() =>
    usePackQueryForm({
      uniqueQueryIds: [],
      defaultValue,
      packDefaultSchedule,
    })
  );

describe('usePackQueryForm — schedule deserializer', () => {
  it('marks override_pack_schedule false when no per-query schedule fields are present', () => {
    const { result } = setup(
      {
        id: 'q1',
        query: 'SELECT 1',
        interval: '60',
        shards: {},
      },
      buildPackDefaultSchedule()
    );

    const values = result.current.getValues();
    expect(values.override_pack_schedule).toBe(false);
    expect(values.interval).toBe(60);
  });

  it('seeds form state from the pack default schedule when no override exists', () => {
    const packDefault = buildPackDefaultSchedule({
      schedule_type: 'rrule',
      frequency: 'custom',
      byweekday: [Weekday.MO, Weekday.WE],
    });
    const { result } = setup(
      {
        id: 'q1',
        query: 'SELECT 1',
        interval: '60',
        shards: {},
      },
      packDefault
    );

    const values = result.current.getValues();
    expect(values.override_pack_schedule).toBe(false);
    expect(values.schedule_type).toBe('rrule');
    expect(values.frequency).toBe('custom');
    expect(values.byweekday).toEqual([Weekday.MO, Weekday.WE]);
  });

  it('flips override_pack_schedule true and parses RRULE when payload has an override', () => {
    const { result } = setup(
      {
        id: 'q1',
        query: 'SELECT 1',
        interval: '60',
        shards: {},
        schedule_type: 'rrule',
        rrule_schedule: {
          rrule: 'FREQ=WEEKLY;BYDAY=MO,WE,FR;INTERVAL=2',
          start_date: '2024-02-01T00:00:00.000Z',
        },
      },
      buildPackDefaultSchedule()
    );

    const values = result.current.getValues();
    expect(values.override_pack_schedule).toBe(true);
    expect(values.schedule_type).toBe('rrule');
    expect(values.frequency).toBe('custom');
    expect(values.byweekday).toEqual([Weekday.MO, Weekday.WE, Weekday.FR]);
    expect(values.repeat_every).toBe(2);
    expect(values.start_date).toBe('2024-02-01T00:00:00.000Z');
  });

  it('flips override_pack_schedule true when payload has interval-mode schedule_type', () => {
    const { result } = setup(
      {
        id: 'q1',
        query: 'SELECT 1',
        interval: '900',
        shards: {},
        schedule_type: 'interval',
      },
      buildPackDefaultSchedule({ schedule_type: 'rrule' })
    );

    const values = result.current.getValues();
    expect(values.override_pack_schedule).toBe(true);
    expect(values.schedule_type).toBe('interval');
    expect(values.interval).toBe(900);
  });
});

describe('usePackQueryForm — serializer', () => {
  it('strips schedule fields when override_pack_schedule is false (legacy interval preserved)', () => {
    const { result } = setup();

    const payload: PackQueryFormData = {
      ...DEFAULT_SCHEDULE_FORM_VALUES,
      id: 'q1',
      query: 'SELECT 1',
      ecs_mapping: {},
      override_pack_schedule: false,
      interval: 600,
    };

    const serialized = result.current.serializer(payload);

    expect(serialized).toMatchObject({
      id: 'q1',
      query: 'SELECT 1',
      interval: '600',
    });
    expect(serialized).not.toHaveProperty('schedule_type');
    expect(serialized).not.toHaveProperty('rrule_schedule');
    // UI-only fields should never leak into the SO payload.
    expect(serialized).not.toHaveProperty('frequency');
    expect(serialized).not.toHaveProperty('byweekday');
    expect(serialized).not.toHaveProperty('start_date');
    expect(serialized).not.toHaveProperty('end_date');
    expect(serialized).not.toHaveProperty('end_date_enabled');
    expect(serialized).not.toHaveProperty('splay_enabled');
    expect(serialized).not.toHaveProperty('splay_value');
    expect(serialized).not.toHaveProperty('splay_unit');
    expect(serialized).not.toHaveProperty('override_pack_schedule');
  });

  it('emits schedule_type=interval and the active interval when override_pack_schedule is true', () => {
    const { result } = setup();

    const payload: PackQueryFormData = {
      ...DEFAULT_SCHEDULE_FORM_VALUES,
      id: 'q1',
      query: 'SELECT 1',
      ecs_mapping: {},
      override_pack_schedule: true,
      schedule_type: 'interval',
      interval: 900,
    };

    const serialized = result.current.serializer(payload);

    expect(serialized).toMatchObject({
      schedule_type: 'interval',
      interval: '900',
    });
    expect(serialized).not.toHaveProperty('rrule_schedule');
  });

  it('emits schedule_type=rrule with rrule_schedule and strips interval when override_pack_schedule is true', () => {
    const { result } = setup();

    const payload: PackQueryFormData = {
      ...DEFAULT_SCHEDULE_FORM_VALUES,
      id: 'q1',
      query: 'SELECT 1',
      ecs_mapping: {},
      override_pack_schedule: true,
      schedule_type: 'rrule',
      frequency: 'custom',
      byweekday: [Weekday.MO, Weekday.FR],
      start_date: '2024-04-01T00:00:00.000Z',
    };

    const serialized = result.current.serializer(payload);

    expect(serialized.schedule_type).toBe('rrule');
    expect(serialized.rrule_schedule).toMatchObject({
      rrule: 'FREQ=WEEKLY;BYDAY=MO,FR',
      start_date: '2024-04-01T00:00:00.000Z',
    });
    expect(serialized).not.toHaveProperty('interval');
  });
});
