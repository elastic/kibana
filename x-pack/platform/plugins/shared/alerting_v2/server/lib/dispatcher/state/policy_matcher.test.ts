/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PolicyMatcher } from './policy_matcher';

describe('PolicyMatcher.isCatchAll()', () => {
  it('returns true for null', () => {
    expect(PolicyMatcher.of(null).isCatchAll()).toBe(true);
  });

  it('returns true for undefined', () => {
    expect(PolicyMatcher.of(undefined).isCatchAll()).toBe(true);
  });

  it('returns true for empty object', () => {
    expect(PolicyMatcher.of({}).isCatchAll()).toBe(true);
  });

  it('returns true when all fields are null', () => {
    expect(PolicyMatcher.of({ tags: null, expression: null }).isCatchAll()).toBe(true);
  });

  it('returns true when tags array is empty', () => {
    expect(PolicyMatcher.of({ tags: [] }).isCatchAll()).toBe(true);
  });

  it('returns true when expression is empty string', () => {
    expect(PolicyMatcher.of({ expression: '' }).isCatchAll()).toBe(true);
  });

  it('returns true when expression is whitespace only', () => {
    expect(PolicyMatcher.of({ expression: '   ' }).isCatchAll()).toBe(true);
  });

  it('returns false when tags has values', () => {
    expect(PolicyMatcher.of({ tags: ['sev1'] }).isCatchAll()).toBe(false);
  });

  it('returns false when expression is non-empty', () => {
    expect(PolicyMatcher.of({ expression: 'data.env:"prod"' }).isCatchAll()).toBe(false);
  });
});

describe('PolicyMatcher.hasTags()', () => {
  it('returns false for null matcher', () => {
    expect(PolicyMatcher.of(null).hasTags()).toBe(false);
  });

  it('returns false when tags is empty array', () => {
    expect(PolicyMatcher.of({ tags: [] }).hasTags()).toBe(false);
  });

  it('returns false when tags is null', () => {
    expect(PolicyMatcher.of({ tags: null }).hasTags()).toBe(false);
  });

  it('returns true when tags has at least one value', () => {
    expect(PolicyMatcher.of({ tags: ['prod'] }).hasTags()).toBe(true);
  });
});

describe('PolicyMatcher.matchesTags()', () => {
  it('returns true (vacuous) when matcher has no tags', () => {
    expect(PolicyMatcher.of(null).matchesTags(['prod'])).toBe(true);
  });

  it('returns true (vacuous) when matcher has empty tags array', () => {
    expect(PolicyMatcher.of({ tags: [] }).matchesTags(['prod'])).toBe(true);
  });

  it('returns false when matcher has tags but rule has no tags', () => {
    expect(PolicyMatcher.of({ tags: ['prod'] }).matchesTags(undefined)).toBe(false);
  });

  it('returns false when matcher has tags but rule tags array is empty', () => {
    expect(PolicyMatcher.of({ tags: ['prod'] }).matchesTags([])).toBe(false);
  });

  it('returns true when there is a matching tag', () => {
    expect(PolicyMatcher.of({ tags: ['prod'] }).matchesTags(['prod', 'infra'])).toBe(true);
  });

  it('returns true when the first matching tag is anywhere in the rule tags', () => {
    expect(PolicyMatcher.of({ tags: ['infra'] }).matchesTags(['prod', 'infra'])).toBe(true);
  });

  it('returns false when there is no matching tag', () => {
    expect(PolicyMatcher.of({ tags: ['staging'] }).matchesTags(['prod', 'infra'])).toBe(false);
  });

  it('is case-sensitive', () => {
    expect(PolicyMatcher.of({ tags: ['Prod'] }).matchesTags(['prod'])).toBe(false);
  });

  it('matches exact strings including those that look like datemath', () => {
    expect(PolicyMatcher.of({ tags: ['now'] }).matchesTags(['now'])).toBe(true);
  });

  it('returns true for tag with double-quotes in the value (exact compare)', () => {
    expect(PolicyMatcher.of({ tags: ['tag"val'] }).matchesTags(['tag"val'])).toBe(true);
  });

  it('returns true for tag with asterisk (no wildcard expansion)', () => {
    expect(PolicyMatcher.of({ tags: ['prod*'] }).matchesTags(['prod-west'])).toBe(false);
    expect(PolicyMatcher.of({ tags: ['prod*'] }).matchesTags(['prod*'])).toBe(true);
  });

  it('returns false for bare rule.id literal term (value, not a field)', () => {
    // 'rule.id' is a value in context of tags — exact string compare
    expect(PolicyMatcher.of({ tags: ['rule.id'] }).matchesTags(['rule.id'])).toBe(true);
    expect(PolicyMatcher.of({ tags: ['rule.id'] }).matchesTags(['other'])).toBe(false);
  });
});

describe('PolicyMatcher.expressionKql()', () => {
  it('returns null for null data', () => {
    expect(PolicyMatcher.of(null).expressionKql()).toBeNull();
  });

  it('returns null for undefined data', () => {
    expect(PolicyMatcher.of(undefined).expressionKql()).toBeNull();
  });

  it('returns null for empty object', () => {
    expect(PolicyMatcher.of({}).expressionKql()).toBeNull();
  });

  it('returns null when expression is null', () => {
    expect(PolicyMatcher.of({ tags: null, expression: null }).expressionKql()).toBeNull();
  });

  it('returns null when expression is empty string', () => {
    expect(PolicyMatcher.of({ expression: '' }).expressionKql()).toBeNull();
  });

  it('returns null when expression is whitespace only', () => {
    expect(PolicyMatcher.of({ expression: '   ' }).expressionKql()).toBeNull();
  });

  it('returns null when only tags are set', () => {
    expect(PolicyMatcher.of({ tags: ['sev1'] }).expressionKql()).toBeNull();
  });

  it('returns the trimmed expression string', () => {
    expect(
      PolicyMatcher.of({ expression: 'data.env:"prod" OR severity:"low"' }).expressionKql()
    ).toBe('data.env:"prod" OR severity:"low"');
  });

  it('trims whitespace from the expression', () => {
    expect(PolicyMatcher.of({ expression: '  data.env:"prod"  ' }).expressionKql()).toBe(
      'data.env:"prod"'
    );
  });

  it('returns the expression even when tags are also present', () => {
    expect(
      PolicyMatcher.of({ tags: ['prod'], expression: 'data.region:"us-east-1"' }).expressionKql()
    ).toBe('data.region:"us-east-1"');
  });
});
