/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { templatePacks } from './helpers';
import type { PackSavedObject } from '../../common/types';

const basePack: PackSavedObject = {
  saved_object_id: 'pack-1',
  name: 'pack-1',
  description: undefined,
  queries: [
    {
      id: 'q1',
      name: 'q1',
      query: 'SELECT 1;',
      interval: 60,
    },
  ],
  enabled: true,
  created_at: '2026-05-01T00:00:00.000Z',
  created_by: 'elastic',
  updated_at: '2026-05-01T00:00:00.000Z',
  updated_by: 'elastic',
  shards: [],
  references: [],
};

describe('templatePacks', () => {
  it('drops packs that have no queries', () => {
    const result = templatePacks([{ ...basePack, queries: [] }]);
    expect(result).toEqual([]);
  });

  it('emits `schedule_type: null` for packs without a pack-level schedule_type', () => {
    const result = templatePacks([basePack]);
    expect(result[0]).toMatchObject({
      name: 'pack-1',
      schedule_type: null,
      queries_with_override: 0,
    });
  });

  it('emits `schedule_type: "interval"` for packs with pack-level interval', () => {
    const result = templatePacks([
      {
        ...basePack,
        schedule_type: 'interval',
        interval: 3600,
      },
    ]);
    expect(result[0].schedule_type).toBe('interval');
    expect(result[0].queries_with_override).toBe(0);
  });

  it('emits `schedule_type: "rrule"` for packs with pack-level RRULE', () => {
    const result = templatePacks([
      {
        ...basePack,
        schedule_type: 'rrule',
        rrule_schedule: { rrule: 'FREQ=DAILY', start_date: '2026-05-01T00:00:00.000Z' },
      },
    ]);
    expect(result[0].schedule_type).toBe('rrule');
  });

  it('counts queries whose schedule_type differs from the pack', () => {
    const result = templatePacks([
      {
        ...basePack,
        schedule_type: 'rrule',
        rrule_schedule: { rrule: 'FREQ=DAILY', start_date: '2026-05-01T00:00:00.000Z' },
        queries: [
          { id: 'q1', name: 'q1', query: 'SELECT 1;', schedule_type: 'rrule' },
          { id: 'q2', name: 'q2', query: 'SELECT 2;', schedule_type: 'interval', interval: 60 },
          { id: 'q3', name: 'q3', query: 'SELECT 3;' /* no override */ },
        ],
      },
    ]);
    expect(result[0].queries_with_override).toBe(1);
  });

  it('returns 0 query overrides when the pack has no schedule_type, even if queries carry one', () => {
    const result = templatePacks([
      {
        ...basePack,
        // Pack-level schedule_type is unspecified.
        queries: [
          { id: 'q1', name: 'q1', query: 'SELECT 1;', schedule_type: 'interval', interval: 60 },
        ],
      },
    ]);
    expect(result[0].queries_with_override).toBe(0);
  });

  // PR-A telemetry baseline expansion (design.md D37). See openspec
  // `rrule-schedule-config/spec.md` for the canonical scenarios.
  describe('baseline expansion', () => {
    it('emits the full baseline with null/false defaults for a pack without schedule_type', () => {
      const result = templatePacks([basePack]);
      expect(result[0]).toMatchObject({
        schedule_type: null,
        queries_count: 1,
        queries_with_override: 0,
        has_splay: false,
        splay_seconds_bucket: 'none',
        rrule_freq: null,
        has_unknown_rrule_parts: false,
      });
    });

    it('emits rrule_freq: null for interval-mode packs', () => {
      const result = templatePacks([{ ...basePack, schedule_type: 'interval', interval: 3600 }]);
      expect(result[0].rrule_freq).toBeNull();
    });

    it('emits rrule_freq and splay bucket for an RRULE pack with splay', () => {
      const result = templatePacks([
        {
          ...basePack,
          schedule_type: 'rrule',
          rrule_schedule: {
            rrule: 'FREQ=DAILY',
            start_date: '2026-05-01T00:00:00.000Z',
            splay: '5m',
          },
        },
      ]);
      expect(result[0]).toMatchObject({
        schedule_type: 'rrule',
        rrule_freq: 'DAILY',
        has_splay: true,
        splay_seconds_bucket: 'lt_1h',
        has_unknown_rrule_parts: false,
      });
    });

    it('flags has_unknown_rrule_parts when the RRULE carries non-Kibana parts', () => {
      const result = templatePacks([
        {
          ...basePack,
          schedule_type: 'rrule',
          rrule_schedule: {
            rrule: 'FREQ=DAILY;BYHOUR=9;WKST=MO',
            start_date: '2026-05-01T00:00:00.000Z',
          },
        },
      ]);
      expect(result[0]).toMatchObject({
        rrule_freq: 'DAILY',
        has_unknown_rrule_parts: true,
      });
    });

    it('does not throw on unparseable RRULE strings (rrule_freq → null)', () => {
      const result = templatePacks([
        {
          ...basePack,
          schedule_type: 'rrule',
          // Missing FREQ — parseRRule throws; telemetry must absorb the error.
          rrule_schedule: { rrule: 'INTERVAL=2', start_date: '2026-05-01T00:00:00.000Z' },
        },
      ]);
      expect(result[0]).toMatchObject({
        schedule_type: 'rrule',
        rrule_freq: null,
        has_unknown_rrule_parts: false,
      });
    });

    it('buckets splay durations correctly', () => {
      const cases: Array<[string, string]> = [
        ['30s', 'lt_60s'],
        ['1m', 'lt_5m'],
        ['10m', 'lt_1h'],
        ['2h', 'lt_12h'],
        ['12h', 'lt_12h'],
      ];
      for (const [splay, bucket] of cases) {
        const result = templatePacks([
          {
            ...basePack,
            schedule_type: 'rrule',
            rrule_schedule: {
              rrule: 'FREQ=DAILY',
              start_date: '2026-05-01T00:00:00.000Z',
              splay,
            },
          },
        ]);
        expect(result[0].splay_seconds_bucket).toBe(bucket);
      }
    });

    it('buckets compound splay durations conservatively as lt_12h', () => {
      const result = templatePacks([
        {
          ...basePack,
          schedule_type: 'rrule',
          rrule_schedule: {
            rrule: 'FREQ=DAILY',
            start_date: '2026-05-01T00:00:00.000Z',
            splay: '1h30m',
          },
        },
      ]);
      expect(result[0].splay_seconds_bucket).toBe('lt_12h');
    });

    it('counts queries_count from the queries array', () => {
      const result = templatePacks([
        {
          ...basePack,
          queries: [
            { id: 'q1', name: 'q1', query: 'SELECT 1;', interval: 60 },
            { id: 'q2', name: 'q2', query: 'SELECT 2;', interval: 60 },
            { id: 'q3', name: 'q3', query: 'SELECT 3;', interval: 60 },
          ],
        },
      ]);
      expect(result[0].queries_count).toBe(3);
    });
  });
});
