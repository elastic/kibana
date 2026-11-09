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

  it('writes a field name as a resource attribute and reads it back by name', () => {
    const when = serializeCondition({ field: 'service.name', operator: 'equals', value: 'api' });
    expect(when).toBe('resource.attributes["service.name"] == "api"');
    expect(parseWhen(when)).toEqual({ field: 'service.name', operator: 'equals', value: 'api' });
  });

  it('round-trips a field that does not equal a value', () => {
    const when = serializeCondition({ field: 'env', operator: 'notEquals', value: 'x' });
    expect(when).toBe('resource.attributes["env"] != "x"');
    expect(parseWhen(when)).toEqual({ field: 'env', operator: 'notEquals', value: 'x' });
  });

  it('trims the field name', () => {
    expect(serializeCondition({ field: ' env ', operator: 'equals', value: 'prod' })).toBe(
      'resource.attributes["env"] == "prod"'
    );
  });

  it('escapes quotes and backslashes in the field name and value', () => {
    const condition = { field: 'a"b\\c', operator: 'equals' as const, value: 'say "hi" \\o/' };
    const when = serializeCondition(condition);
    expect(when).toBe('resource.attributes["a\\"b\\\\c"] == "say \\"hi\\" \\\\o/"');
    expect(parseWhen(when)).toEqual(condition);
  });

  it('keeps comparisons with other escapes as written', () => {
    for (const when of [
      'resource.attributes["env"] == "a\\tb"',
      'resource.attributes["a\\nb"] != "x"',
      'resource.attributes["env"] == "\\u00e9"',
    ]) {
      expect(parseWhen(when)).toEqual({ raw: when });
      expect(serializeCondition(parseWhen(when))).toBe(when);
    }
  });

  it('keeps other OTTL conditions as written', () => {
    for (const when of [
      'severity_number >= 17 and IsMatch(body, "error")',
      'attributes["team"] == "a"',
      'body == "x"',
    ]) {
      expect(parseWhen(when)).toEqual({ raw: when });
      expect(serializeCondition({ raw: when })).toBe(when);
    }
  });

  it('leaves a rule with an empty field without a condition', () => {
    expect(serializeCondition({ field: '  ', operator: 'notEquals', value: 'x' })).toBeUndefined();
  });
});
