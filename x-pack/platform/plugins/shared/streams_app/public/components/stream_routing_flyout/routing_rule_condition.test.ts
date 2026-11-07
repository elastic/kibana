/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseWhen, serializeCondition } from './routing_rule_condition';

describe('routing rule conditions', () => {
  it('treats a missing condition as a catch-all', () => {
    expect(parseWhen(undefined)).toBeUndefined();
    expect(serializeCondition(undefined)).toBeUndefined();
  });

  it('round-trips a field matched against a value', () => {
    const when = serializeCondition({
      field: 'attributes["service.name"]',
      operator: 'equals',
      value: 'api',
    });
    expect(when).toBe('attributes["service.name"] == "api"');
    expect(parseWhen(when)).toEqual({
      field: 'attributes["service.name"]',
      operator: 'equals',
      value: 'api',
    });
  });

  it('round-trips a field that does not equal a value', () => {
    const when = serializeCondition({ field: 'body', operator: 'notEquals', value: 'x' });
    expect(when).toBe('body != "x"');
    expect(parseWhen(when)).toEqual({ field: 'body', operator: 'notEquals', value: 'x' });
  });

  it('escapes quotes and backslashes in the value', () => {
    const when = serializeCondition({ field: 'body', operator: 'equals', value: 'say "hi" \\o/' });
    expect(when).toBe('body == "say \\"hi\\" \\\\o/"');
    expect(parseWhen(when)).toEqual({ field: 'body', operator: 'equals', value: 'say "hi" \\o/' });
  });

  it('keeps other OTTL conditions as written', () => {
    const when = 'severity_number >= 17 and IsMatch(body, "error")';
    expect(parseWhen(when)).toEqual({ raw: when });
    expect(serializeCondition({ raw: when })).toBe(when);
  });

  it('leaves a rule with an empty field without a condition', () => {
    expect(serializeCondition({ field: '  ', operator: 'notEquals', value: 'x' })).toBeUndefined();
  });
});
