/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rruleStringSchema } from './v1';
import { RRULE_STRING_MAX_LENGTH } from '../constants';

describe('rruleStringSchema', () => {
  it('accepts a valid rrule string as is', () => {
    const value = 'DTSTART;TZID=Europe/Rome:20261117T090000\nRRULE:FREQ=DAILY;BYHOUR=9';
    expect(rruleStringSchema.validate(value)).toBe(value);
  });

  it('rejects an invalid rrule string with the parser error', () => {
    expect(() => rruleStringSchema.validate('RRULE:FREQ=YEARLY')).toThrow(
      'Unsupported FREQ "YEARLY"'
    );
  });

  it('rejects an empty string', () => {
    expect(() => rruleStringSchema.validate('')).toThrow();
  });

  it('rejects strings longer than the max length', () => {
    expect(() =>
      rruleStringSchema.validate(`RRULE:FREQ=DAILY;${'BYHOUR=1;'.repeat(RRULE_STRING_MAX_LENGTH)}`)
    ).toThrow(
      `value has length [${
        17 + 9 * RRULE_STRING_MAX_LENGTH
      }] but it must have a maximum length of [${RRULE_STRING_MAX_LENGTH}]`
    );
  });
});
