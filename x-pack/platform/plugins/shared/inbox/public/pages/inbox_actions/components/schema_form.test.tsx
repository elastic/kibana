/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { extractSchemaDefaults, validateSchemaValues, type InboxJsonSchema } from './schema_form';

const SCHEMA: InboxJsonSchema = {
  type: 'object',
  properties: {
    approved: { type: 'boolean', title: 'Approved', default: true },
    reason: { type: 'string', title: 'Reason' },
    severity: { type: 'string', title: 'Severity', enum: ['low', 'high'], default: 'low' },
    count: { type: 'number', title: 'Count' },
    tags: { type: 'array', items: { type: 'string', enum: ['a', 'b'] } },
  },
  required: ['approved', 'reason', 'severity'],
};

describe('extractSchemaDefaults', () => {
  it('returns an empty object for null/empty schemas', () => {
    expect(extractSchemaDefaults(null)).toEqual({});
    expect(extractSchemaDefaults(undefined)).toEqual({});
    expect(extractSchemaDefaults({ type: 'object' })).toEqual({});
  });

  it('pulls declared defaults but ignores fields without a default', () => {
    expect(extractSchemaDefaults(SCHEMA)).toEqual({
      approved: true,
      severity: 'low',
    });
  });
});

describe('validateSchemaValues', () => {
  it('returns an empty error map when nothing is required', () => {
    expect(validateSchemaValues({ type: 'object', properties: {} }, {})).toEqual({});
  });

  it('flags missing required non-boolean fields', () => {
    const errors = validateSchemaValues(SCHEMA, { approved: true });
    expect(errors).toEqual({
      reason: expect.any(String),
      severity: expect.any(String),
    });
  });

  it('treats empty strings and empty arrays as missing', () => {
    const errors = validateSchemaValues(SCHEMA, {
      approved: true,
      reason: '',
      severity: '',
      tags: [],
    });
    expect(errors.reason).toBeDefined();
    expect(errors.severity).toBeDefined();
    // tags isn't required, so no error even though it's empty
    expect(errors.tags).toBeUndefined();
  });

  it('does not flag required booleans as missing when explicitly false', () => {
    // false is a legitimate value for a required boolean approval gate.
    const errors = validateSchemaValues(SCHEMA, {
      approved: false,
      reason: 'looks fine',
      severity: 'low',
    });
    expect(errors).toEqual({});
  });

  it('passes when all required fields are satisfied', () => {
    expect(
      validateSchemaValues(SCHEMA, {
        approved: true,
        reason: 'yes',
        severity: 'high',
      })
    ).toEqual({});
  });
});
