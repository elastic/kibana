/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cursorFromEvent, cursorFromNow, fromStored, toStored } from './cursor';

describe('cursor', () => {
  it('cursorFromNow starts at the current time with an empty tiebreaker', () => {
    const before = Date.now();
    const [ts, id] = cursorFromNow();
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(id).toBe('');
  });

  it('round-trips through the stored (Task Manager state) form', () => {
    expect(toStored([123, 'abc'])).toEqual({ ts: 123, id: 'abc' });
    expect(fromStored({ ts: 123, id: 'abc' })).toEqual([123, 'abc']);
  });

  it('treats a null/undefined stored cursor as no position', () => {
    expect(toStored(null)).toBeNull();
    expect(fromStored(null)).toBeNull();
    expect(fromStored(undefined)).toBeNull();
  });

  it('builds a cursor from an event timestamp and id', () => {
    expect(cursorFromEvent('1970-01-01T00:00:01.000Z', 'evt-1')).toEqual([1000, 'evt-1']);
  });
});
