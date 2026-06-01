/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ObjectType } from '@kbn/config-schema';
import { packSavedObjectModelVersion3 } from './saved_object_model_versions';

describe('Pack saved object model version 3 forward compatibility', () => {
  const forwardCompatibility = packSavedObjectModelVersion3.schemas?.forwardCompatibility;

  it('exposes a forwardCompatibility schema', () => {
    expect(forwardCompatibility).toBeDefined();
  });

  it('accepts a V3 pack SO with `schedule_type: "rrule"` + `rrule_schedule`', () => {
    const v3Doc = {
      name: 'rrule-pack',
      description: 'pack scheduled by RRULE',
      enabled: true,
      created_at: '2026-05-01T00:00:00.000Z',
      created_by: 'elastic',
      updated_at: '2026-05-01T00:00:00.000Z',
      updated_by: 'elastic',
      schedule_type: 'rrule',
      rrule_schedule: {
        rrule: 'FREQ=DAILY',
        start_date: '2026-05-01T00:00:00.000Z',
      },
      queries: [
        {
          id: 'q1',
          query: 'SELECT * FROM users;',
        },
      ],
    };

    expect(() => (forwardCompatibility as ObjectType).validate(v3Doc)).not.toThrow();
  });

  it('accepts a V3 pack SO with `schedule_type: "interval"` + pack-level `interval`', () => {
    const v3Doc = {
      name: 'interval-pack',
      enabled: true,
      created_at: '2026-05-01T00:00:00.000Z',
      created_by: 'elastic',
      updated_at: '2026-05-01T00:00:00.000Z',
      updated_by: 'elastic',
      schedule_type: 'interval',
      interval: 3600,
      queries: [],
    };

    expect(() => (forwardCompatibility as ObjectType).validate(v3Doc)).not.toThrow();
  });

  it('accepts a pack SO with per-query rrule override (no per-query interval)', () => {
    const perQueryRruleDoc = {
      name: 'per-query-rrule-pack',
      enabled: true,
      created_at: '2026-05-01T00:00:00.000Z',
      created_by: 'elastic',
      updated_at: '2026-05-01T00:00:00.000Z',
      updated_by: 'elastic',
      queries: [
        {
          id: 'q1',
          query: 'SELECT * FROM users;',
          schedule_type: 'rrule',
          rrule_schedule: {
            rrule: 'FREQ=DAILY',
            start_date: '2026-05-01T00:00:00.000Z',
          },
        },
      ],
    };

    expect(() => (forwardCompatibility as ObjectType).validate(perQueryRruleDoc)).not.toThrow();
  });

  it('accepts a legacy pack SO without `schedule_type`', () => {
    const legacyDoc = {
      name: 'legacy-pack',
      enabled: true,
      created_at: '2026-05-01T00:00:00.000Z',
      created_by: 'elastic',
      updated_at: '2026-05-01T00:00:00.000Z',
      updated_by: 'elastic',
      queries: [
        {
          id: 'q1',
          query: 'SELECT * FROM users;',
          interval: 60,
        },
      ],
    };

    expect(() => (forwardCompatibility as ObjectType).validate(legacyDoc)).not.toThrow();
  });

  it('accepts `null` for `schedule_type` / `interval` / `rrule_schedule` (mode-transition clear)', () => {
    const transitioningDoc = {
      name: 'transitioning-pack',
      enabled: true,
      created_at: '2026-05-01T00:00:00.000Z',
      created_by: 'elastic',
      updated_at: '2026-05-01T00:00:00.000Z',
      updated_by: 'elastic',
      schedule_type: null,
      interval: null,
      rrule_schedule: null,
      queries: [],
    };

    expect(() => (forwardCompatibility as ObjectType).validate(transitioningDoc)).not.toThrow();
  });

  // Phase 9 / D29–D32 introduces V4 fields (pack-level osquery `version` +
  // `snapshot` boolean + per-query `enabled` flag). A pack SO migrated forward
  // to V4 in a future Kibana must still load through the V3 forward-compat
  // schema on this Kibana. The forward-compat schema uses `unknowns: 'ignore'`
  // so unrecognized future fields MUST NOT cause it to throw — they just get
  // dropped (the V4 Kibana will see them on subsequent loads).
  //
  // Note: V3 already declares a `version` field on the pack root as
  // `schema.number()` (prebuilt-pack version). The V4 "min osquery version"
  // field uses a different name (kept as `min_osquery_version` in this test)
  // to avoid the type collision; the actual V4 migration is free to pick its
  // own naming when it lands.
  it('accepts a synthetic V4 pack SO with fictitious future root fields', () => {
    const syntheticV4Doc = {
      name: 'forward-compat-pack',
      description: 'pretends to come from a future V4 migration',
      enabled: true,
      created_at: '2026-05-01T00:00:00.000Z',
      created_by: 'elastic',
      updated_at: '2026-05-01T00:00:00.000Z',
      updated_by: 'elastic',
      schedule_type: 'rrule',
      rrule_schedule: {
        rrule: 'FREQ=DAILY',
        start_date: '2026-05-01T00:00:00.000Z',
      },
      min_osquery_version: '5.10.0',
      snapshot: true,
      queries: [
        {
          id: 'q1',
          query: 'SELECT * FROM users;',
          enabled: true,
        },
      ],
    };

    expect(() => (forwardCompatibility as ObjectType).validate(syntheticV4Doc)).not.toThrow();
  });
});
