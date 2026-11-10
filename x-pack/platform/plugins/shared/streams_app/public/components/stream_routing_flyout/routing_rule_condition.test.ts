/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { normalizeWhen } from './routing_rule_condition';

describe('normalizeWhen', () => {
  it('keeps an OTTL condition as written, without surrounding whitespace', () => {
    expect(normalizeWhen('  resource.attributes["env"] == "prod"  ')).toBe(
      'resource.attributes["env"] == "prod"'
    );
    expect(normalizeWhen('severity_number >= 17 and IsMatch(body, "a\\tb")')).toBe(
      'severity_number >= 17 and IsMatch(body, "a\\tb")'
    );
  });

  it('leaves a blank condition unset', () => {
    expect(normalizeWhen(undefined)).toBeUndefined();
    expect(normalizeWhen('')).toBeUndefined();
    expect(normalizeWhen('   ')).toBeUndefined();
  });
});
