/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_TAG_LENGTH } from '@kbn/alerting-v2-constants';
import {
  buildRuleNotificationTag,
  buildRuleScopedMatcher,
  resolveRuleNotificationTag,
} from './rule_scoped_action_policies';

const PREFIX = 'notify-';
const MAX_SLUG_LEN = MAX_TAG_LENGTH - PREFIX.length; // 121

describe('buildRuleNotificationTag', () => {
  it('slugifies a normal rule name', () => {
    expect(buildRuleNotificationTag('High CPU usage')).toBe('notify-high-cpu-usage');
  });

  it('handles leading/trailing whitespace', () => {
    expect(buildRuleNotificationTag('  My Rule  ')).toBe('notify-my-rule');
  });

  it('strips diacritics', () => {
    expect(buildRuleNotificationTag('Latência alta')).toBe('notify-latencia-alta');
  });

  it('collapses multiple separators', () => {
    expect(buildRuleNotificationTag('A--B  C')).toBe('notify-a-b-c');
  });

  it('keeps the result within MAX_TAG_LENGTH', () => {
    const longName = 'a'.repeat(300);
    const tag = buildRuleNotificationTag(longName);
    expect(tag.length).toBeLessThanOrEqual(MAX_TAG_LENGTH);
    expect(tag.startsWith(PREFIX)).toBe(true);
  });

  it('does not end with a hyphen when the name is exactly MAX_SLUG_LEN chars', () => {
    const longName = 'a'.repeat(MAX_SLUG_LEN);
    const tag = buildRuleNotificationTag(longName);
    expect(tag.endsWith('-')).toBe(false);
    expect(tag.length).toBeLessThanOrEqual(MAX_TAG_LENGTH);
  });

  it('falls back to a uuid suffix when the name slugifies to empty string', () => {
    // Names made entirely of punctuation / emoji slugify to ''
    const tag = buildRuleNotificationTag('!!!');
    expect(tag.startsWith(PREFIX)).toBe(true);
    // uuid part: 36 chars, prefix is 7 → total 43, well within 128
    const suffix = tag.slice(PREFIX.length);
    expect(suffix).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('produces a valid tag (min 1 char, max 128 chars)', () => {
    const cases = ['x', 'High CPU', '!!!', 'â'.repeat(200)];
    for (const name of cases) {
      const tag = buildRuleNotificationTag(name);
      expect(tag.length).toBeGreaterThanOrEqual(1);
      expect(tag.length).toBeLessThanOrEqual(MAX_TAG_LENGTH);
    }
  });
});

describe('resolveRuleNotificationTag', () => {
  it('returns the first existing tag when the rule has tags', () => {
    expect(resolveRuleNotificationTag({ name: 'My Rule', tags: ['prod', 'infra'] })).toBe('prod');
  });

  it('generates a tag when the rule has no tags', () => {
    expect(resolveRuleNotificationTag({ name: 'My Rule' })).toBe('notify-my-rule');
  });

  it('generates a tag when tags is an empty array', () => {
    expect(resolveRuleNotificationTag({ name: 'My Rule', tags: [] })).toBe('notify-my-rule');
  });

  it('generates a tag when the first tag is blank (all whitespace)', () => {
    expect(resolveRuleNotificationTag({ name: 'My Rule', tags: ['   ', 'real-tag'] })).toBe(
      'notify-my-rule'
    );
  });

  it('returns the first tag even if it looks like a generated tag', () => {
    expect(resolveRuleNotificationTag({ name: 'My Rule', tags: ['notify-my-rule', 'other'] })).toBe(
      'notify-my-rule'
    );
  });
});

describe('buildRuleScopedMatcher', () => {
  it('builds a PolicyMatcher with the tag in the tags array', () => {
    expect(buildRuleScopedMatcher('notify-high-cpu')).toEqual({ tags: ['notify-high-cpu'] });
  });

  it('wraps arbitrary tags', () => {
    expect(buildRuleScopedMatcher('prod')).toEqual({ tags: ['prod'] });
  });
});
