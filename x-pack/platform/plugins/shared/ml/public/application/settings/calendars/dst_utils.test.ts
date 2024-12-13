/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDSTChangeDates, createDstEvents } from './dst_utils';
import moment from 'moment-timezone';

describe('getDSTChangeDates', () => {
  it('should return correct DST change dates for a given timezone and year', () => {
    const timezone = 'America/New_York';
    const year = 2023;
    const { start, end } = getDSTChangeDates(timezone, year);

    expect(start).not.toBeNull();
    expect(end).not.toBeNull();

    expect(moment(start).isDST()).toBe(true);
    expect(moment(end).isDST()).toBe(false);
  });

  it('should return null for start and end if no DST changes are found', () => {
    const timezone = 'Asia/Tokyo';
    const year = 2023;
    const { start, end } = getDSTChangeDates(timezone, year);

    expect(start).toBeNull();
    expect(end).toBeNull();
  });

  it('should handle edge cases around the start and end of the year', () => {
    const timezone = 'Europe/London';
    const year = 2023;
    const { start, end } = getDSTChangeDates(timezone, year);

    expect(start).not.toBeNull();
    expect(end).not.toBeNull();

    if (start && end) {
      expect(moment(start).isDST()).toBe(true);
      expect(moment(end).isDST()).toBe(false);
    }
  });
});

describe('createDstEvents', () => {
  it('should create DST events for a given timezone', () => {
    const timezone = 'America/New_York';
    const events = createDstEvents(timezone);

    expect(events.length).toBeGreaterThan(0);
    events.forEach((event) => {
      expect(event).toHaveProperty('event_id');
      expect(event).toHaveProperty('description');
      expect(event).toHaveProperty('start_time');
      expect(event).toHaveProperty('end_time');
      expect(event).toHaveProperty('skip_result', false);
      expect(event).toHaveProperty('skip_model_update', false);
      expect(event).toHaveProperty('force_time_shift');
      expect(event.description).toMatch(/(Winter|Summer) \d{4}/);
    });
  });

  it('should create correct number of DST events', () => {
    const timezone = 'Europe/London';
    const events = createDstEvents(timezone);

    // Each year should have 2 events (start and end of DST)
    const expectedNumberOfEvents = 20 * 2;
    expect(events.length).toBe(expectedNumberOfEvents);
  });

  it('should handle timezones with no DST changes', () => {
    const timezone = 'Asia/Tokyo';
    const events = createDstEvents(timezone);

    expect(events.length).toBe(0);
  });
});
