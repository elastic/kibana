/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_EPISODE_STATUS } from '@kbn/alerting-v2-schemas';
import { describeSegmentSpan, formatDuration } from './alert_timeline_format';

const GTE = Date.UTC(2026, 5, 10, 0, 0, 0);
const LTE = Date.UTC(2026, 5, 11, 0, 0, 0);
const HOUR = 60 * 60 * 1000;

describe('describeSegmentSpan', () => {
  it('flags a start clipped at (or before) the window edge as outside the window', () => {
    expect(
      describeSegmentSpan({
        x0Ms: GTE,
        x1Ms: GTE + 6 * HOUR,
        status: ALERT_EPISODE_STATUS.ACTIVE,
        gteMs: GTE,
        lteMs: LTE,
      }).startsBeforeWindow
    ).toBe(true);
  });

  it('does not flag a start that falls inside the window', () => {
    expect(
      describeSegmentSpan({
        x0Ms: GTE + HOUR,
        x1Ms: GTE + 6 * HOUR,
        status: ALERT_EPISODE_STATUS.ACTIVE,
        gteMs: GTE,
        lteMs: LTE,
      }).startsBeforeWindow
    ).toBe(false);
  });

  it('flags a span running to the window edge with a non-inactive status as ongoing', () => {
    expect(
      describeSegmentSpan({
        x0Ms: GTE + HOUR,
        x1Ms: LTE,
        status: ALERT_EPISODE_STATUS.ACTIVE,
        gteMs: GTE,
        lteMs: LTE,
      }).isOngoing
    ).toBe(true);
  });

  it('does not treat a recovered (inactive) span at the window edge as ongoing', () => {
    expect(
      describeSegmentSpan({
        x0Ms: GTE + HOUR,
        x1Ms: LTE,
        status: ALERT_EPISODE_STATUS.INACTIVE,
        gteMs: GTE,
        lteMs: LTE,
      }).isOngoing
    ).toBe(false);
  });

  it('does not flag a span that ends inside the window as ongoing', () => {
    expect(
      describeSegmentSpan({
        x0Ms: GTE + HOUR,
        x1Ms: LTE - HOUR,
        status: ALERT_EPISODE_STATUS.ACTIVE,
        gteMs: GTE,
        lteMs: LTE,
      }).isOngoing
    ).toBe(false);
  });

  it('flags both edges for a long-running episode that fills the whole window', () => {
    const flags = describeSegmentSpan({
      x0Ms: GTE,
      x1Ms: LTE,
      status: ALERT_EPISODE_STATUS.ACTIVE,
      gteMs: GTE,
      lteMs: LTE,
    });
    expect(flags).toEqual({ startsBeforeWindow: true, isOngoing: true });
  });
});

describe('formatDuration', () => {
  it('formats hours and minutes and falls back for non-positive input', () => {
    expect(formatDuration(2 * HOUR + 15 * 60 * 1000)).toBe('2h 15m');
    expect(formatDuration(45 * 60 * 1000)).toBe('45m');
    expect(formatDuration(0)).toBe('0m');
  });
});
