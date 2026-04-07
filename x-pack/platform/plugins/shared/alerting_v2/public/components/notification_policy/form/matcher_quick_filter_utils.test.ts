/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  mergeEpisodeStatusIntoMatcher,
  mergeRuleIdsIntoMatcher,
  mergeRuleTagsIntoMatcher,
  parseEpisodeStatusesFromMatcher,
  parseRuleIdsFromMatcher,
  parseRuleTagsFromMatcher,
} from './matcher_quick_filter_utils';

describe('matcher_quick_filter_utils', () => {
  describe('parseRuleIdsFromMatcher', () => {
    it('returns empty array for empty string', () => {
      expect(parseRuleIdsFromMatcher('')).toEqual([]);
    });

    it('parses a single rule.id', () => {
      expect(parseRuleIdsFromMatcher('rule.id : "abc-123"')).toEqual(['abc-123']);
    });

    it('parses multiple rule.id values joined with or', () => {
      expect(parseRuleIdsFromMatcher('(rule.id : "abc" or rule.id : "def")')).toEqual([
        'abc',
        'def',
      ]);
    });

    it('parses rule.id mixed with other fields', () => {
      expect(parseRuleIdsFromMatcher('rule.id : "abc" AND episode_status : "active"')).toEqual([
        'abc',
      ]);
    });

    it('deduplicates repeated values', () => {
      expect(parseRuleIdsFromMatcher('rule.id : "abc" AND rule.id : "abc"')).toEqual(['abc']);
    });
  });

  describe('mergeRuleIdsIntoMatcher', () => {
    it('builds clause from empty matcher', () => {
      expect(mergeRuleIdsIntoMatcher('', ['u1'])).toBe('rule.id : "u1"');
    });

    it('builds OR group for multiple ids', () => {
      expect(mergeRuleIdsIntoMatcher('', ['u1', 'u2'])).toBe('(rule.id : "u1" or rule.id : "u2")');
    });

    it('appends to existing unrelated clauses', () => {
      expect(mergeRuleIdsIntoMatcher('episode_status : "active"', ['u1'])).toBe(
        'episode_status : "active" AND rule.id : "u1"'
      );
    });

    it('replaces existing rule.id clauses', () => {
      expect(mergeRuleIdsIntoMatcher('rule.id : "old"', ['new'])).toBe('rule.id : "new"');
    });

    it('replaces existing rule.id OR group', () => {
      expect(
        mergeRuleIdsIntoMatcher('(rule.id : "a" or rule.id : "b") AND episode_status : "active"', [
          'c',
        ])
      ).toBe('episode_status : "active" AND rule.id : "c"');
    });

    it('clears rule.id when empty array is passed', () => {
      expect(mergeRuleIdsIntoMatcher('rule.id : "abc" AND episode_status : "active"', [])).toBe(
        'episode_status : "active"'
      );
    });

    it('returns empty string when clearing the only clause', () => {
      expect(mergeRuleIdsIntoMatcher('rule.id : "abc"', [])).toBe('');
    });
  });

  describe('parseEpisodeStatusesFromMatcher', () => {
    it('returns empty array for empty string', () => {
      expect(parseEpisodeStatusesFromMatcher('')).toEqual([]);
    });

    it('parses single status', () => {
      expect(parseEpisodeStatusesFromMatcher('episode_status : "active"')).toEqual(['active']);
    });

    it('parses multiple statuses', () => {
      expect(
        parseEpisodeStatusesFromMatcher('(episode_status : "active" or episode_status : "pending")')
      ).toEqual(['active', 'pending']);
    });
  });

  describe('mergeEpisodeStatusIntoMatcher', () => {
    it('builds clause from empty matcher', () => {
      expect(mergeEpisodeStatusIntoMatcher('', ['inactive'])).toBe('episode_status : "inactive"');
    });

    it('merges with existing non-status clauses', () => {
      expect(mergeEpisodeStatusIntoMatcher('rule.id : "x"', ['active', 'recovering'])).toBe(
        'rule.id : "x" AND (episode_status : "active" or episode_status : "recovering")'
      );
    });

    it('replaces existing status clause', () => {
      expect(mergeEpisodeStatusIntoMatcher('episode_status : "active"', ['pending'])).toBe(
        'episode_status : "pending"'
      );
    });

    it('clears status when empty array is passed', () => {
      expect(mergeEpisodeStatusIntoMatcher('episode_status : "active"', [])).toBe('');
    });
  });

  describe('parseRuleTagsFromMatcher', () => {
    it('returns empty array for empty string', () => {
      expect(parseRuleTagsFromMatcher('')).toEqual([]);
    });

    it('parses single tag', () => {
      expect(parseRuleTagsFromMatcher('rule.tags : "production"')).toEqual(['production']);
    });

    it('parses multiple tags', () => {
      expect(parseRuleTagsFromMatcher('(rule.tags : "prod" or rule.tags : "staging")')).toEqual([
        'prod',
        'staging',
      ]);
    });

    it('parses tags mixed with other fields', () => {
      expect(parseRuleTagsFromMatcher('rule.id : "x" AND rule.tags : "prod"')).toEqual(['prod']);
    });
  });

  describe('mergeRuleTagsIntoMatcher', () => {
    it('builds clause from empty matcher', () => {
      expect(mergeRuleTagsIntoMatcher('', ['prod'])).toBe('rule.tags : "prod"');
    });

    it('builds OR group for multiple tags', () => {
      expect(mergeRuleTagsIntoMatcher('', ['prod', 'staging'])).toBe(
        '(rule.tags : "prod" or rule.tags : "staging")'
      );
    });

    it('appends to existing unrelated clauses', () => {
      expect(mergeRuleTagsIntoMatcher('rule.id : "x"', ['prod'])).toBe(
        'rule.id : "x" AND rule.tags : "prod"'
      );
    });

    it('replaces existing tags clause', () => {
      expect(mergeRuleTagsIntoMatcher('rule.tags : "old"', ['new'])).toBe('rule.tags : "new"');
    });

    it('clears tags when empty array is passed', () => {
      expect(mergeRuleTagsIntoMatcher('rule.tags : "prod"', [])).toBe('');
    });
  });

  describe('round-trip', () => {
    it('merge then parse returns the same rule ids', () => {
      const ids = ['id-1', 'id-2', 'id-3'];
      const merged = mergeRuleIdsIntoMatcher('', ids);
      expect(parseRuleIdsFromMatcher(merged).sort()).toEqual(ids.sort());
    });

    it('merge then parse returns the same statuses', () => {
      const statuses = ['active', 'recovering'];
      const merged = mergeEpisodeStatusIntoMatcher('', statuses);
      expect(parseEpisodeStatusesFromMatcher(merged).sort()).toEqual(statuses.sort());
    });

    it('merge then parse returns the same tags', () => {
      const tags = ['prod', 'us-east'];
      const merged = mergeRuleTagsIntoMatcher('', tags);
      expect(parseRuleTagsFromMatcher(merged).sort()).toEqual(tags.sort());
    });

    it('preserves unrelated clauses through merge cycles', () => {
      const base = 'data.host.name : "my-host" AND rule.name : "CPU Alert"';
      const withIds = mergeRuleIdsIntoMatcher(base, ['id-1']);
      const withStatuses = mergeEpisodeStatusIntoMatcher(withIds, ['active']);
      const withTags = mergeRuleTagsIntoMatcher(withStatuses, ['prod']);

      expect(withTags).toContain('data.host.name : "my-host"');
      expect(withTags).toContain('rule.name : "CPU Alert"');
      expect(parseRuleIdsFromMatcher(withTags)).toEqual(['id-1']);
      expect(parseEpisodeStatusesFromMatcher(withTags)).toEqual(['active']);
      expect(parseRuleTagsFromMatcher(withTags)).toEqual(['prod']);
    });
  });
});
