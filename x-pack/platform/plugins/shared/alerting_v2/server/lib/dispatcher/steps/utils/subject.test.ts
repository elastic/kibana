/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { episodeSubject } from './subject';

describe('episodeSubject', () => {
  it('returns rule_id for internal episodes', () => {
    expect(episodeSubject({ source: 'internal', rule_id: 'rule-1' })).toBe('rule-1');
  });

  it('returns source for external episodes', () => {
    expect(episodeSubject({ source: 'pagerduty', rule_id: null })).toBe('pagerduty');
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
