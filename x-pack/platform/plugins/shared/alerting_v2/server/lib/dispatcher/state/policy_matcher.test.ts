/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PolicyMatcher } from './policy_matcher';

describe('PolicyMatcher.toKql()', () => {
  describe('catch-all cases', () => {
    it('returns null for null data', () => {
      expect(PolicyMatcher.of(null).toKql()).toBeNull();
    });

    it('returns null for undefined data', () => {
      expect(PolicyMatcher.of(undefined).toKql()).toBeNull();
    });

    it('returns null for empty object', () => {
      expect(PolicyMatcher.of({}).toKql()).toBeNull();
    });

    it('returns null when all fields are null', () => {
      expect(PolicyMatcher.of({ tags: null, rules: null, statuses: null, expression: null }).toKql()).toBeNull();
    });

    it('returns null when all arrays are empty', () => {
      expect(PolicyMatcher.of({ tags: [], rules: [], statuses: [] }).toKql()).toBeNull();
    });

    it('returns null when expression is empty string', () => {
      expect(PolicyMatcher.of({ expression: '' }).toKql()).toBeNull();
    });

    it('returns null when expression is whitespace only', () => {
      expect(PolicyMatcher.of({ expression: '   ' }).toKql()).toBeNull();
    });
  });

  describe('single-field clauses (no outer parentheses for single value)', () => {
    it('single tag produces bare clause', () => {
      expect(PolicyMatcher.of({ tags: ['sev1'] }).toKql()).toBe('rule.tags : "sev1"');
    });

    it('single rule id produces bare clause', () => {
      expect(PolicyMatcher.of({ rules: ['uuid-1'] }).toKql()).toBe('rule.id : "uuid-1"');
    });

    it('single status produces bare clause', () => {
      expect(PolicyMatcher.of({ statuses: ['active'] }).toKql()).toBe('episode_status : "active"');
    });
  });

  describe('multi-value clauses (wrapped in parentheses)', () => {
    it('two tags', () => {
      expect(PolicyMatcher.of({ tags: ['sev1', 'prod'] }).toKql()).toBe(
        '(rule.tags : "sev1" OR rule.tags : "prod")'
      );
    });

    it('two rules', () => {
      expect(PolicyMatcher.of({ rules: ['uuid-1', 'uuid-2'] }).toKql()).toBe(
        '(rule.id : "uuid-1" OR rule.id : "uuid-2")'
      );
    });

    it('two statuses', () => {
      expect(PolicyMatcher.of({ statuses: ['active', 'recovering'] }).toKql()).toBe(
        '(episode_status : "active" OR episode_status : "recovering")'
      );
    });
  });

  describe('expression field', () => {
    it('wraps expression in parentheses', () => {
      expect(PolicyMatcher.of({ expression: 'data.env:"prod" OR severity:"low"' }).toKql()).toBe(
        '(data.env:"prod" OR severity:"low")'
      );
    });

    it('trims whitespace from expression before wrapping', () => {
      expect(PolicyMatcher.of({ expression: '  data.env:"prod"  ' }).toKql()).toBe(
        '(data.env:"prod")'
      );
    });
  });

  describe('combined fields (AND-joined in order: tags → rules → statuses → expression)', () => {
    it('all four fields combined', () => {
      expect(
        PolicyMatcher.of({
          tags: ['sev1'],
          rules: ['uuid-1'],
          statuses: ['active'],
          expression: 'data.env:"prod"',
        }).toKql()
      ).toBe('rule.tags : "sev1" AND rule.id : "uuid-1" AND episode_status : "active" AND (data.env:"prod")');
    });

    it('tags and expression only', () => {
      expect(
        PolicyMatcher.of({ tags: ['prod'], expression: 'data.region:"us-east-1"' }).toKql()
      ).toBe('rule.tags : "prod" AND (data.region:"us-east-1")');
    });

    it('null field within a non-null object is skipped', () => {
      expect(PolicyMatcher.of({ tags: null, rules: ['uuid-1'] }).toKql()).toBe('rule.id : "uuid-1"');
    });
  });

  describe('KQL value escaping', () => {
    it('escapes double quotes in values', () => {
      expect(PolicyMatcher.of({ tags: ['tag"with"quotes'] }).toKql()).toBe(
        'rule.tags : "tag\\"with\\"quotes"'
      );
    });

    it('escapes backslashes in values', () => {
      expect(PolicyMatcher.of({ tags: ['tag\\backslash'] }).toKql()).toBe(
        'rule.tags : "tag\\\\backslash"'
      );
    });
  });

  describe('isCatchAll()', () => {
    it('returns true for null', () => {
      expect(PolicyMatcher.of(null).isCatchAll()).toBe(true);
    });

    it('returns false when tags has values', () => {
      expect(PolicyMatcher.of({ tags: ['sev1'] }).isCatchAll()).toBe(false);
    });

    it('returns false when expression is non-empty', () => {
      expect(PolicyMatcher.of({ expression: 'data.env:"prod"' }).isCatchAll()).toBe(false);
    });
  });
});
