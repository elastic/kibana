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

  it('emits `schedule_type: null` for legacy packs without pack-level schedule_type', () => {
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

  it('returns 0 query overrides for legacy packs even if queries carry schedule_type', () => {
    const result = templatePacks([
      {
        ...basePack,
        // No pack-level schedule_type — legacy pack.
        queries: [
          { id: 'q1', name: 'q1', query: 'SELECT 1;', schedule_type: 'interval', interval: 60 },
        ],
      },
    ]);
    expect(result[0].queries_with_override).toBe(0);
  });
});
