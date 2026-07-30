/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isValidTimeZone, resolveDailyWindow } from './window';

describe('resolveDailyWindow', () => {
  it('anchors the window to midnight in the configured time zone', () => {
    const window = resolveDailyWindow('Europe/Zurich', new Date('2026-07-30T09:30:00.000Z'));

    // Zurich is UTC+2 in July, so the local day started at 22:00 UTC the day before.
    expect(window.start).toBe('2026-07-29T22:00:00.000Z');
    expect(window.resetsAt).toBe('2026-07-30T22:00:00.000Z');
    expect(window.timezone).toBe('Europe/Zurich');
  });

  it('defaults to UTC when the stored time zone is not a real zone', () => {
    const window = resolveDailyWindow('Mars/Olympus', new Date('2026-07-30T09:30:00.000Z'));

    expect(window.start).toBe('2026-07-30T00:00:00.000Z');
    expect(window.resetsAt).toBe('2026-07-31T00:00:00.000Z');
    expect(window.timezone).toBe('UTC');
  });

  it('keeps the reset exactly one day after the start across a DST transition', () => {
    // Europe/Zurich springs forward on 2026-03-29, so that local day is 23h long.
    const window = resolveDailyWindow('Europe/Zurich', new Date('2026-03-29T10:00:00.000Z'));

    expect(window.start).toBe('2026-03-28T23:00:00.000Z');
    expect(window.resetsAt).toBe('2026-03-29T22:00:00.000Z');
  });
});

describe('isValidTimeZone', () => {
  it('accepts IANA zones and rejects anything else', () => {
    expect(isValidTimeZone('UTC')).toBe(true);
    expect(isValidTimeZone('America/New_York')).toBe(true);
    expect(isValidTimeZone('not-a-zone')).toBe(false);
    expect(isValidTimeZone('')).toBe(false);
  });
});
