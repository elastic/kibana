/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ruleScheduleRequestSchema, ruleScheduleResponseSchema } from './v1';

describe('ruleScheduleRequestSchema', () => {
  it('accepts an interval schedule', () => {
    expect(ruleScheduleRequestSchema.validate({ interval: '5m' })).toEqual({ interval: '5m' });
  });

  it('accepts an rrule string schedule', () => {
    const rrule = 'DTSTART;TZID=Europe/Rome:20261117T090000\nRRULE:FREQ=DAILY;BYHOUR=9';
    expect(ruleScheduleRequestSchema.validate({ rrule })).toEqual({ rrule });
  });

  it('rejects an invalid interval', () => {
    expect(() => ruleScheduleRequestSchema.validate({ interval: '5 minutes' })).toThrow(
      'string is not a valid duration: 5 minutes'
    );
  });

  it('rejects an invalid rrule string', () => {
    expect(() => ruleScheduleRequestSchema.validate({ rrule: 'RRULE:FREQ=YEARLY' })).toThrow(
      'Unsupported FREQ "YEARLY"'
    );
  });

  it('rejects an rrule object', () => {
    expect(() =>
      ruleScheduleRequestSchema.validate({ rrule: { freq: 3, interval: 1, tzid: 'UTC' } })
    ).toThrow();
  });

  it('rejects both interval and rrule', () => {
    expect(() =>
      ruleScheduleRequestSchema.validate({ interval: '5m', rrule: 'RRULE:FREQ=DAILY' })
    ).toThrow();
  });

  it('rejects an empty schedule', () => {
    expect(() => ruleScheduleRequestSchema.validate({})).toThrow();
  });
});

describe('ruleScheduleResponseSchema', () => {
  it('accepts interval and rrule string schedules', () => {
    expect(ruleScheduleResponseSchema.validate({ interval: '5m' })).toEqual({ interval: '5m' });
    expect(ruleScheduleResponseSchema.validate({ rrule: 'RRULE:FREQ=DAILY;INTERVAL=1' })).toEqual({
      rrule: 'RRULE:FREQ=DAILY;INTERVAL=1',
    });
  });
});
