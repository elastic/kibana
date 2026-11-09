/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { changePointWindow } from './change_point_window';

describe('changePointWindow', () => {
  const end = '2026-11-02T12:00:00.000Z';

  it('widens a short alert window to six hours ending at the anchor', () => {
    const window = changePointWindow('2026-11-02T11:45:00.000Z', end);

    expect(window.end).toBe(end);
    expect(Date.parse(window.end) - Date.parse(window.start)).toBe(6 * 60 * 60 * 1000);
  });

  it('keeps a window that is already long enough, including one past 1000 minutes', () => {
    const eightHours = changePointWindow('2026-11-02T04:00:00.000Z', end);
    expect(Date.parse(eightHours.end) - Date.parse(eightHours.start)).toBe(8 * 60 * 60 * 1000);

    const twoDays = changePointWindow('2026-10-31T12:00:00.000Z', end);
    expect(twoDays).toEqual({ start: '2026-10-31T12:00:00.000Z', end });
  });

  it('returns the original strings when they are not timestamps', () => {
    expect(changePointWindow('now-15m', 'now')).toEqual({ start: 'now-15m', end: 'now' });
  });
});
