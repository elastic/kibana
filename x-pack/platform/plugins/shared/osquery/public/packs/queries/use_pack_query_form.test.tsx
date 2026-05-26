/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';

import { usePackQueryForm } from './use_pack_query_form';
import type { PackQueryFormData, PackSOQueryFormData } from './use_pack_query_form';
import type { ScheduleFormData } from '../../components/schedule_section/types';
import {
  createDefaultScheduleFormData,
  createDefaultRecurrence,
} from '../../components/schedule_section/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeIntervalSchedule = (intervalSeconds: number): ScheduleFormData => ({
  ...createDefaultScheduleFormData('interval'),
  interval: intervalSeconds,
});

const makeRruleSchedule = (
  _unusedRrule: string = 'FREQ=DAILY',
  startDate: Date = new Date('2024-01-01T00:00:00.000Z')
): ScheduleFormData => ({
  ...createDefaultScheduleFormData('rrule'),
  scheduleType: 'rrule',
  startDate,
  recurrence: {
    ...createDefaultRecurrence(),
    frequency: 'daily',
  },
  splay: { enabled: false, value: 30, unit: 'seconds' },
  stopAfter: { enabled: false, date: startDate },
});

const makeBasePayload = (overrides: Partial<PackQueryFormData> = {}): PackQueryFormData => ({
  id: 'test-query',
  query: 'select * from processes;',
  interval: 3600,
  timeout: 60,
  snapshot: true,
  removed: false,
  ecs_mapping: {},
  override_pack_schedule: false,
  schedule: makeIntervalSchedule(3600),
  ...overrides,
});

// Render the hook and return the serializer closure.
const getSerializer = (props: Parameters<typeof usePackQueryForm>[0]) => {
  const { result } = renderHook(() => usePackQueryForm(props));

  return result.current.serializer;
};

// ---------------------------------------------------------------------------
// Category A: serializer unit tests via renderHook
// ---------------------------------------------------------------------------

describe('usePackQueryForm', () => {
  describe('serializer', () => {
    // A1 ──────────────────────────────────────────────────────────────────────
    it('A1: should strip schedule_type and interval from query when pack is rrule-scheduled and override is off', () => {
      const serialize = getSerializer({
        uniqueQueryIds: [],
        packSchedule: {
          schedule_type: 'rrule',
          rrule_schedule: {
            rrule: 'FREQ=DAILY',
            start_date: '2024-01-01T00:00:00.000Z',
          },
        },
      });

      const payload = makeBasePayload({
        // The query carries a stale interval from being uploaded/pre-existing
        interval: 3600,
        override_pack_schedule: false,
        schedule: makeRruleSchedule(),
      });

      const result = serialize(payload);

      // Wire-boundary guarantee: no interval or timeout on a query that inherits
      // an rrule pack schedule. Server rejects "Query carries interval but the
      // pack uses schedule_type 'rrule'".
      expect(result).not.toHaveProperty('interval');
      expect(result).not.toHaveProperty('timeout');
      expect(result).not.toHaveProperty('schedule_type');
      expect(result).not.toHaveProperty('rrule_schedule');
    });

    // A2 ──────────────────────────────────────────────────────────────────────
    it('A2: should emit rrule_schedule and schedule_type when pack is rrule and override is on with matching type', () => {
      const packSchedule = {
        schedule_type: 'rrule' as const,
        rrule_schedule: {
          rrule: 'FREQ=DAILY',
          start_date: '2024-01-01T00:00:00.000Z',
        },
      };

      const serialize = getSerializer({
        uniqueQueryIds: [],
        packSchedule,
      });

      const startDate = new Date('2024-06-01T00:00:00.000Z');
      const payload = makeBasePayload({
        override_pack_schedule: true,
        schedule: makeRruleSchedule('FREQ=DAILY', startDate),
      });

      const result = serialize(payload) as PackSOQueryFormData;

      expect(result.schedule_type).toBe('rrule');
      expect(result.rrule_schedule).toBeDefined();
      expect(result.rrule_schedule?.rrule).toMatch(/FREQ=DAILY/);
      // Interval must be stripped when rrule override is active
      expect(result).not.toHaveProperty('interval');
    });

    // A3 ──────────────────────────────────────────────────────────────────────
    it('A3: should return base (unmodified) when pack schedule_type mismatches override schedule_type', () => {
      // CURRENT BEHAVIOR: mode-mismatch guard (use_pack_query_form.tsx:176-178)
      // returns `base` without applying the override-off strip. That means
      // `base.interval` could still be present in the returned object.
      // The UI lockedScheduleType prop is the primary defense against this path
      // being reachable in practice.
      // See follow-up to tighten the serializer so the mismatch branch also
      // strips interval/timeout when packSchedule.schedule_type is 'rrule'.
      const serialize = getSerializer({
        uniqueQueryIds: [],
        packSchedule: {
          schedule_type: 'rrule' as const,
          rrule_schedule: {
            rrule: 'FREQ=DAILY',
            start_date: '2024-01-01T00:00:00.000Z',
          },
        },
      });

      // Programmatically craft a payload where override is on but the serialized
      // schedule_type is 'interval' — this is the mode-mismatch branch.
      const payload = makeBasePayload({
        interval: 7200,
        override_pack_schedule: true,
        schedule: makeIntervalSchedule(7200),
      });

      const result = serialize(payload) as PackSOQueryFormData;

      // CURRENT BEHAVIOR: the guard returns `base` which still carries
      // `interval` (stringified by the immer block) and no `schedule_type`.
      // This is a latent issue — see comment above.
      expect(result).not.toHaveProperty('schedule_type');
      // `base` has interval stringified by the immer block
      expect(result.interval).toBe('7200');
    });

    // A4 ──────────────────────────────────────────────────────────────────────
    it('A4: should emit interval string when pack is interval-scheduled and override is on', () => {
      const serialize = getSerializer({
        uniqueQueryIds: [],
        packSchedule: {
          schedule_type: 'interval' as const,
          interval: 3600,
        },
      });

      const payload = makeBasePayload({
        override_pack_schedule: true,
        schedule: makeIntervalSchedule(7200),
      });

      const result = serialize(payload) as PackSOQueryFormData;

      expect(result.schedule_type).toBe('interval');
      expect(result.interval).toBe('7200');
      expect(result).not.toHaveProperty('rrule_schedule');
    });

    // A5 ──────────────────────────────────────────────────────────────────────
    it('A5: should strip schedule fields when override is off and no pack schedule is set', () => {
      const serialize = getSerializer({
        uniqueQueryIds: [],
        // No packSchedule → legacy per-query interval mode
      });

      const payload = makeBasePayload({
        interval: 3600,
        override_pack_schedule: false,
        schedule: makeIntervalSchedule(3600),
      });

      const result = serialize(payload) as PackSOQueryFormData;

      // Without a pack schedule, the base is returned as-is: interval is set
      // but schedule_type is not emitted (the query inherits nothing from pack).
      expect(result).not.toHaveProperty('schedule_type');
      expect(result).not.toHaveProperty('rrule_schedule');
      // interval is still on the base because we are in legacy mode
      expect(result.interval).toBe('3600');
    });

    // A6 ──────────────────────────────────────────────────────────────────────
    it('A6: should strip both interval and rrule_schedule when pack is interval-scheduled and override is off', () => {
      const serialize = getSerializer({
        uniqueQueryIds: [],
        packSchedule: {
          schedule_type: 'interval' as const,
          interval: 3600,
        },
      });

      const payload = makeBasePayload({
        interval: 7200,
        override_pack_schedule: false,
        schedule: makeIntervalSchedule(7200),
      });

      const result = serialize(payload) as PackSOQueryFormData;

      // Query should emit no schedule fields when pack owns the schedule.
      expect(result).not.toHaveProperty('interval');
      expect(result).not.toHaveProperty('timeout');
      expect(result).not.toHaveProperty('schedule_type');
      expect(result).not.toHaveProperty('rrule_schedule');
    });

    // A7 ──────────────────────────────────────────────────────────────────────
    it('A7: should emit rrule_schedule with RFC 3339 start_date when override is on with rrule mode', () => {
      const RFC3339_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

      const serialize = getSerializer({
        uniqueQueryIds: [],
        packSchedule: {
          schedule_type: 'rrule' as const,
          rrule_schedule: {
            rrule: 'FREQ=DAILY',
            start_date: '2024-01-01T00:00:00.000Z',
          },
        },
      });

      const startDate = new Date('2024-06-15T12:00:00.000Z');
      const payload = makeBasePayload({
        override_pack_schedule: true,
        schedule: makeRruleSchedule('FREQ=DAILY', startDate),
      });

      const result = serialize(payload) as PackSOQueryFormData;

      expect(result.rrule_schedule?.start_date).toMatch(RFC3339_REGEX);
    });
  });
});
