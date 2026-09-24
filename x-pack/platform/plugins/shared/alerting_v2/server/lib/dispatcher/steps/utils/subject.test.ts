/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { episodeSubject } from './subject';

describe('episodeSubject', () => {
  it('returns rule_id for internal episodes', () => {
    expect(episodeSubject({ source: 'internal', rule_id: 'rule-1', space_id: 'default' })).toBe(
      'rule-1'
    );
  });

  it('returns a space-scoped source for external episodes', () => {
    expect(episodeSubject({ source: 'pagerduty', rule_id: null, space_id: 'default' })).toBe(
      'default::pagerduty'
    );
  });

  it('returns different subjects for the same vendor in different spaces', () => {
    expect(episodeSubject({ source: 'pagerduty', rule_id: null, space_id: 'space-a' })).not.toBe(
      episodeSubject({ source: 'pagerduty', rule_id: null, space_id: 'space-b' })
    );
  });

  it('throws when an external episode has no space_id', () => {
    expect(() => episodeSubject({ source: 'pagerduty', rule_id: null, space_id: null })).toThrow(
      'episodeSubject: external episode has no space_id'
    );
  });

  it('returns rule_id when source is null (treated as internal)', () => {
    expect(episodeSubject({ source: null, rule_id: 'rule-1' })).toBe('rule-1');
  });

  it('returns rule_id when source is undefined (treated as internal)', () => {
    expect(episodeSubject({ source: undefined, rule_id: 'rule-1' })).toBe('rule-1');
  });

  it('throws when source is null/internal and rule_id is also null (malformed data)', () => {
    expect(() => episodeSubject({ source: null, rule_id: null })).toThrow(
      'episodeSubject: episode has neither a valid source nor a rule_id'
    );
    expect(() => episodeSubject({ source: 'internal', rule_id: null })).toThrow(
      'episodeSubject: episode has neither a valid source nor a rule_id'
    );
  });
});
