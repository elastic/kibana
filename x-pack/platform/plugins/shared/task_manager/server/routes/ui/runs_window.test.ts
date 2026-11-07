/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { runsWindowFields, toRunsWindow, validateRunsWindow } from './runs_window';

const runsWindowSchema = schema.object(runsWindowFields, { validate: validateRunsWindow });

describe('runs window', () => {
  it('accepts no window, or a window of up to 30 days', () => {
    expect(runsWindowSchema.validate({})).toEqual({});
    expect(
      runsWindowSchema.validate({
        start: '2026-10-05T12:00:00.000Z',
        end: '2026-11-04T12:00:00.000Z',
      })
    ).toEqual({ start: '2026-10-05T12:00:00.000Z', end: '2026-11-04T12:00:00.000Z' });
  });

  it.each([
    [{ start: 'now-24h', end: 'now' }, 'must be an ISO 8601 date in UTC'],
    [{ start: '2026-11-04', end: '2026-11-05T12:00:00.000Z' }, 'must be an ISO 8601 date in UTC'],
    [{ start: '2026-11-04T12:00:00.000Z' }, 'start and end must be set together'],
    [
      { start: '2026-11-04T12:00:00.000Z', end: '2026-11-04T12:00:00.000Z' },
      'end must be after start',
    ],
    [
      { start: '2026-10-05T11:59:59.999Z', end: '2026-11-04T12:00:00.000Z' },
      'start and end must be at most 30 days apart',
    ],
  ])('rejects %j', (query, message) => {
    expect(() => runsWindowSchema.validate(query)).toThrow(message);
  });

  it('defaults to the last 24 hours', () => {
    const { start, end } = toRunsWindow({});

    expect(Date.parse(end) - Date.parse(start)).toBe(24 * 60 * 60 * 1000);
    expect(Date.parse(end)).toBeLessThanOrEqual(Date.now());
  });

  it('keeps a requested window', () => {
    const window = { start: '2026-11-03T12:00:00.000Z', end: '2026-11-04T12:00:00.000Z' };

    expect(toRunsWindow(window)).toEqual(window);
  });
});
