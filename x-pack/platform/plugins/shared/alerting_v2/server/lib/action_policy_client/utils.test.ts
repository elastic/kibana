/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERTING_V2_ERROR_CODES } from '../errors/error_codes';
import { validateDateString } from './utils';

describe('validateDateString', () => {
  it('does not throw for a valid ISO 8601 datetime', () => {
    expect(() => validateDateString('2025-06-01T12:00:00.000Z')).not.toThrow();
  });

  it('throws Boom.badRequest with INVALID_DATE_STRING and the offending value as details', () => {
    let caught: unknown;
    try {
      validateDateString('not-a-date');
    } catch (e) {
      caught = e;
    }

    expect(caught).toMatchObject({
      isBoom: true,
      output: { statusCode: 400 },
      data: {
        code: ALERTING_V2_ERROR_CODES.INVALID_DATE_STRING,
        details: { value: 'not-a-date' },
      },
    });
  });

  it('throws for a date-only string with no time component', () => {
    let caught: unknown;
    try {
      validateDateString('2025-06-01');
    } catch (e) {
      caught = e;
    }

    expect(caught).toMatchObject({
      isBoom: true,
      output: { statusCode: 400 },
      data: {
        code: ALERTING_V2_ERROR_CODES.INVALID_DATE_STRING,
        details: { value: '2025-06-01' },
      },
    });
  });

  it('throws for an empty string', () => {
    let caught: unknown;
    try {
      validateDateString('');
    } catch (e) {
      caught = e;
    }

    expect(caught).toMatchObject({
      isBoom: true,
      output: { statusCode: 400 },
      data: {
        code: ALERTING_V2_ERROR_CODES.INVALID_DATE_STRING,
        details: { value: '' },
      },
    });
  });
});
