/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describeSkip } from '.';

const formatTime = (isoTime: string) => `at ${isoTime}`;

describe('describeSkip', () => {
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
