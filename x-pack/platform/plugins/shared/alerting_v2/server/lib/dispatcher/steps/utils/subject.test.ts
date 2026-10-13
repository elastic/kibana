/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { alertSubject } from './subject';

describe('alertSubject', () => {
  it('returns rule_id for internal alerts', () => {
    expect(alertSubject({ source: 'internal', rule_id: 'rule-1', space_id: 'default' })).toBe(
      'rule-1'
    );
  });

  it('returns a space-scoped source for external alerts', () => {
    expect(alertSubject({ source: 'pagerduty', rule_id: null, space_id: 'default' })).toBe(
      'default::pagerduty'
    );
  });

  it('returns different subjects for the same vendor in different spaces', () => {
    expect(alertSubject({ source: 'pagerduty', rule_id: null, space_id: 'space-a' })).not.toBe(
      alertSubject({ source: 'pagerduty', rule_id: null, space_id: 'space-b' })
    );
  });

  it('throws when an external alert has no space_id', () => {
    expect(() => alertSubject({ source: 'pagerduty', rule_id: null, space_id: null })).toThrow(
      'alertSubject: external alert has no space_id'
    );
  });

  it('returns rule_id when source is null (treated as internal)', () => {
    expect(alertSubject({ source: null, rule_id: 'rule-1' })).toBe('rule-1');
  });

  it('returns rule_id when source is undefined (treated as internal)', () => {
    expect(alertSubject({ source: undefined, rule_id: 'rule-1' })).toBe('rule-1');
  });

  it('throws when source is null/internal and rule_id is also null (malformed data)', () => {
    expect(() => alertSubject({ source: null, rule_id: null })).toThrow(
      'alertSubject: alert has neither a valid source nor a rule_id'
    );
    expect(() => alertSubject({ source: 'internal', rule_id: null })).toThrow(
      'alertSubject: alert has neither a valid source nor a rule_id'
    );
  });
});
