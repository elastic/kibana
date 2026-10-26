/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SKIP_REASONS, describeSkip, skipMarkerSchema } from '.';

const formatTime = (isoTime: string) => `at ${isoTime}`;

describe('describeSkip', () => {
  it('says when the agent reviewed the rule for an already_reviewed skip, not what an event records', () => {
    expect(
      describeSkip(
        {
          reason: 'already_reviewed',
          reviewed_at: '2026-10-23T03:37:00.000Z',
          absorbed_reason: 'series_too_old',
          event_title: 'Checkout — request failures',
          stored_verdict: 'confirms',
          checked_at: '2026-10-23T05:00:00.000Z',
        },
        formatTime
      )
    ).toEqual([
      'The agent reviewed this rule at 2026-10-23T03:37:00.000Z; its match count has not changed since.',
      'Checked at 2026-10-23T05:00:00.000Z',
    ]);
  });

  it('still explains an already_reviewed skip that has no review time', () => {
    expect(describeSkip({ reason: 'already_reviewed' }, formatTime)).toEqual([
      'The agent reviewed this rule recently; its match count has not changed since.',
    ]);
  });

  it('shows an unknown reason as stored, whatever verdict the marker carries', () => {
    expect(
      describeSkip({ reason: 'a_newer_reason' as never, stored_verdict: 'confirms' }, formatTime)
    ).toEqual(['a_newer_reason']);
  });

  it('says what the query returned and what the event already records', () => {
    expect(
      describeSkip(
        {
          reason: 'still_breaching',
          probe_has_rows: true,
          probe_window_minutes: 20,
          event_title: 'Checkout — request failures',
          stored_verdict: 'confirms',
        },
        formatTime
      )
    ).toEqual([
      'The rule still matches (last 20 min).',
      '"Checkout — request failures" already records it as breaching, so nothing changed.',
    ]);
  });

  it('explains a healthy skip where the query returns nothing', () => {
    expect(
      describeSkip(
        {
          reason: 'still_healthy',
          probe_has_rows: false,
          probe_window_minutes: 20,
          stored_verdict: 'refutes',
        },
        formatTime
      )
    ).toEqual([
      'The rule matches nothing (last 20 min).',
      'A live event already records it as healthy, so nothing changed.',
    ]);
  });

  it('gives a marker written before the context was stored the line it can', () => {
    expect(describeSkip({ reason: 'still_breaching' }, formatTime)).toEqual([
      'A live event already records it as breaching, so nothing changed.',
    ]);
  });

  it('returns a reason it does not know as stored', () => {
    expect(describeSkip({ reason: 'some_new_reason' }, formatTime)).toEqual(['some_new_reason']);
  });

  it('ends with when the classifier checked, whatever it said before', () => {
    expect(
      describeSkip(
        { reason: 'some_new_reason', checked_at: '2026-10-19T10:00:00.000Z' },
        formatTime
      )
    ).toEqual(['some_new_reason', 'Checked at 2026-10-19T10:00:00.000Z']);
  });
});

describe('skipMarkerSchema', () => {
  // The discovery workflow tells a classifier skip from an agent review by `skip.event_id`.
  it.each(SKIP_REASONS)('requires the live event id for a %s marker', (reason) => {
    expect(skipMarkerSchema.safeParse({ reason }).success).toBe(false);
    expect(skipMarkerSchema.safeParse({ reason, event_id: 'event-1' }).success).toBe(true);
  });

  it('accepts what an already_reviewed skip absorbed, and only a known reason', () => {
    const marker = {
      reason: 'already_reviewed',
      event_id: 'event-1',
      reviewed_at: '2026-10-23T03:37:00.000Z',
    };

    expect(skipMarkerSchema.safeParse({ ...marker, absorbed_reason: 'above_normal' }).success).toBe(
      true
    );
    expect(skipMarkerSchema.safeParse({ ...marker, absorbed_reason: 'made_up' }).success).toBe(
      false
    );
  });
});
