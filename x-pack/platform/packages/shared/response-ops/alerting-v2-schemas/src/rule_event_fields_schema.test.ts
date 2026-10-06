/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_KQL_LENGTH } from './constants';
import { ruleEventFieldsQuerySchema } from './rule_event_fields_schema';

describe('ruleEventFieldsQuerySchema', () => {
  it('accepts an empty object', () => {
    expect(ruleEventFieldsQuerySchema.parse({})).toEqual({});
  });

  it('accepts a valid matcher', () => {
    expect(ruleEventFieldsQuerySchema.parse({ matcher: 'kind: alert' })).toEqual({
      matcher: 'kind: alert',
    });
  });

  it('rejects an empty matcher', () => {
    expect(() => ruleEventFieldsQuerySchema.parse({ matcher: '' })).toThrow();
  });

  it('accepts a matcher as long as the one a policy can store', () => {
    expect(() =>
      ruleEventFieldsQuerySchema.parse({ matcher: 'a'.repeat(MAX_KQL_LENGTH) })
    ).not.toThrow();
  });

  it('rejects a matcher longer than the policy matcher bound', () => {
    expect(() =>
      ruleEventFieldsQuerySchema.parse({ matcher: 'a'.repeat(MAX_KQL_LENGTH + 1) })
    ).toThrow();
  });

  it('rejects unknown keys', () => {
    expect(() => ruleEventFieldsQuerySchema.parse({ unknown_field: 'x' })).toThrow();
  });
});
