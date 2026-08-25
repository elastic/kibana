/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Repro for "every scheduled execution collapses into Execution #0".
 *
 * Reported by Elastic InfoSec alongside the inflated agent count. Observed in
 * production: response documents carrying
 *   schedule_id: "pack_shadow-ai-discovery-windows_ai_docker_containers"
 *   schedule_execution_count: 0
 * for every run since 2026-05-06 — 226,140 documents in a single bucket.
 *
 * Mechanism (agent side, elastic/beats, identical v9.4.0 → main):
 *   - `nativeScheduleExecutionCount(start_date, interval, runTime)` in
 *     `x-pack/osquerybeat/beater/osquerybeat.go` returns 0 when `start_date`
 *     is absent, unparseable, or later than the run time.
 *   - `scheduleID` falls back to the query NAME when the policy carries no
 *     `schedule_id`, producing the `pack_<pack>_<query>` shape seen above.
 * Both fields are emitted together by `convertSOQueriesToPackConfig`, so a
 * fallback-shaped schedule_id in the data implies `start_date` is missing from
 * the wire too.
 *
 * This file pins the WIRE CONTRACT: whatever else changes, an interval-mode
 * pack query must reach the Fleet package policy carrying both `start_date`
 * and `schedule_id`. Tests marked "GAP" encode paths that currently drop
 * `start_date` and are expected to fail until the emission rules are fixed.
 *
 * NOTE: this is not an agent bug. Upgrading agents to 9.5.1 does not change
 * the behaviour — the missing metadata originates in what Kibana writes.
 */

import { convertSOQueriesToPackConfig, START_DATE_EPOCH_FALLBACK } from './utils';

const VALID_START_DATE = '2026-08-24T10:00:00.000Z';

const intervalQuery = (overrides: Record<string, unknown> = {}) => [
  {
    id: 'ai_docker_containers',
    query: 'SELECT * FROM docker_containers;',
    interval: 60,
    schedule_id: 'b3f1c2d4-0000-4000-8000-000000000001',
    start_date: VALID_START_DATE,
    ...overrides,
  },
];

/** Reads the single emitted query block out of the conversion result. */
const emittedQuery = (queries: any, options: Record<string, unknown> = {}) => {
  const { queries: out } = convertSOQueriesToPackConfig(queries, {
    isRruleFeatureEnabled: true,
    ...options,
  } as any);

  return Object.values(out)[0] as Record<string, unknown>;
};

describe('pack wire contract — schedule metadata reaching the agent', () => {
  describe('healthy interval pack (the working case)', () => {
    it('should emit both start_date and schedule_id so the agent can compute execution counts', () => {
      const query = emittedQuery(intervalQuery());

      // Without BOTH of these the agent stamps schedule_execution_count: 0
      // and falls back to the query name for schedule_id.
      expect(query.start_date).toBe(VALID_START_DATE);
      expect(query.schedule_id).toBe('b3f1c2d4-0000-4000-8000-000000000001');
      expect(query.interval).toBe(60);
    });

    it('should emit schedule_id even when the rrule feature flag is disabled', () => {
      // schedule_id is a results-join key, not an rrule concept — it must not
      // be gated behind the flag.
      const query = emittedQuery(intervalQuery(), { isRruleFeatureEnabled: false });

      expect(query.schedule_id).toBe('b3f1c2d4-0000-4000-8000-000000000001');
      expect(query.start_date).toBe(VALID_START_DATE);
    });
  });

  describe('epoch sentinel is replaced, not stripped', () => {
    it('should not leave an interval query without start_date when the backfill produced the epoch sentinel', () => {
      // The V4 backfill resolves start_date to START_DATE_EPOCH_FALLBACK when
      // the pack saved object has no `created_at` (NDJSON import, degenerate
      // asset packs). `convertSOQueriesToPackConfig` used to suppress the field
      // entirely, so the agent received an interval query with NO start_date
      // and pinned every execution to 0.
      //
      // Suppressing the bogus 1970 value is right; emitting nothing was not.
      // The pack's own created_at is now substituted so the agent always has
      // an anchor.
      const query = emittedQuery(intervalQuery({ start_date: START_DATE_EPOCH_FALLBACK }));

      expect(query.start_date).toBeDefined();
      expect(query.start_date).not.toBe(START_DATE_EPOCH_FALLBACK);
    });
  });

  describe('a query with no start_date still gets an anchor', () => {
    it('should never emit an interval query without a start_date anchor', () => {
      // Any pack saved object predating the V4 backfill that is written to a
      // policy without passing through a backfilled read lands here. This was
      // the exact production shape: interval present, start_date absent.
      const query = emittedQuery(intervalQuery({ start_date: undefined }));

      expect(query.interval).toBe(60);
      expect(query.start_date).toBeDefined();
    });
  });

  describe('rrule mode — start_date suppression is intentional', () => {
    it('should omit the legacy start_date but still carry the rrule anchor', () => {
      // Correct by design: osquerybeat reads rrule_schedule.start_date on this
      // path and would otherwise honour a stale legacy value. Pinned so the
      // fix for the interval gaps above does not accidentally re-add it here.
      const query = emittedQuery(
        intervalQuery({
          schedule_type: 'rrule',
          interval: undefined,
          rrule_schedule: { rrule: 'FREQ=HOURLY', start_date: VALID_START_DATE },
        }),
        { packSchedule: { schedule_type: 'rrule' } }
      );

      expect(query.start_date).toBeUndefined();
      expect((query.rrule_schedule as any)?.start_date).toBe(VALID_START_DATE);
      expect(query.schedule_id).toBe('b3f1c2d4-0000-4000-8000-000000000001');
    });
  });
});
