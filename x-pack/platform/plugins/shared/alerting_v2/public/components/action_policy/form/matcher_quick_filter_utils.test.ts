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

    it('does not match a field that ends with the target field name', () => {
      expect(parseRuleIdsFromMatcher('my_rule.id : "abc"')).toEqual([]);
    });

    it('parses unquoted values', () => {
      expect(parseRuleIdsFromMatcher('rule.id : abc-123')).toEqual(['abc-123']);
    });

    it('parses unquoted values alongside quoted values', () => {
      expect(parseRuleIdsFromMatcher('rule.id : abc AND rule.id : "def"')).toEqual(['def', 'abc']);
    });
  });

  describe('mergeRuleIdsIntoMatcher', () => {
    it('builds clause from empty matcher', () => {
      expect(mergeRuleIdsIntoMatcher('', ['u1'])).toBe('rule.id : "u1"');
    });

    it('builds OR group for multiple ids', () => {
      expect(mergeRuleIdsIntoMatcher('', ['u1', 'u2'])).toBe('(rule.id : "u1" OR rule.id : "u2")');
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

    it('does not strip a field whose name ends with the target field name', () => {
      expect(mergeRuleIdsIntoMatcher('my_rule.id : "abc" AND rule.id : "old"', ['new'])).toBe(
        'my_rule.id : "abc" AND rule.id : "new"'
      );
    });

    it('strips unquoted rule.id clauses when replacing', () => {
      expect(mergeRuleIdsIntoMatcher('rule.id : old-id', ['new-id'])).toBe('rule.id : "new-id"');
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

    it('parses unquoted status values', () => {
      expect(parseEpisodeStatusesFromMatcher('episode_status : active')).toEqual(['active']);
    });
  });

  describe('mergeEpisodeStatusIntoMatcher', () => {
    it('builds clause from empty matcher', () => {
      expect(mergeEpisodeStatusIntoMatcher('', ['inactive'])).toBe('episode_status : "inactive"');
    });

    it('merges with existing non-status clauses', () => {
      expect(mergeEpisodeStatusIntoMatcher('rule.id : "x"', ['active', 'recovering'])).toBe(
        'rule.id : "x" AND (episode_status : "active" OR episode_status : "recovering")'
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
        '(rule.tags : "prod" OR rule.tags : "staging")'
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

  describe('values containing AND keyword', () => {
    it('preserves unrelated clause when tag value contains AND', () => {
      const base = 'rule.id : "x" AND rule.tags : "Dev AND Staging"';
      expect(mergeRuleTagsIntoMatcher(base, ['Prod'])).toBe('rule.id : "x" AND rule.tags : "Prod"');
    });

    it('parses tag value containing AND without corruption', () => {
      const matcher = 'rule.tags : "Dev AND Staging" AND rule.id : "x"';
      expect(parseRuleTagsFromMatcher(matcher)).toEqual(['Dev AND Staging']);
    });

    it('preserves clause with AND in value when stripping a different field', () => {
      const matcher = 'rule.name : "CPU AND Memory" AND rule.id : "abc"';
      expect(mergeRuleIdsIntoMatcher(matcher, [])).toBe('rule.name : "CPU AND Memory"');
    });

    it('round-trips a tag containing AND through merge and parse', () => {
      const tags = ['Dev AND Staging'];
      const merged = mergeRuleTagsIntoMatcher('', tags);
      expect(parseRuleTagsFromMatcher(merged)).toEqual(tags);
    });

    it('handles multiple clauses where one value contains AND', () => {
      const matcher = 'rule.tags : "A AND B" AND episode_status : "active" AND rule.id : "id-1"';
      expect(mergeEpisodeStatusIntoMatcher(matcher, ['pending'])).toBe(
        'rule.tags : "A AND B" AND rule.id : "id-1" AND episode_status : "pending"'
      );
    });
  });

  describe('field name inside quoted values', () => {
    it('does not strip a clause whose value contains the target field name', () => {
      const matcher = 'other.field : "rule.id : test" AND rule.id : "abc"';
      expect(mergeRuleIdsIntoMatcher(matcher, ['xyz'])).toBe(
        'other.field : "rule.id : test" AND rule.id : "xyz"'
      );
    });

    it('preserves clause with target field pattern in value when clearing', () => {
      const matcher = 'rule.name : "check rule.tags : something" AND rule.tags : "prod"';
      expect(mergeRuleTagsIntoMatcher(matcher, [])).toBe(
        'rule.name : "check rule.tags : something"'
      );
    });

    it('preserves clause with episode_status pattern in value', () => {
      const matcher = 'rule.name : "episode_status : active alert" AND episode_status : "active"';
      expect(mergeEpisodeStatusIntoMatcher(matcher, ['pending'])).toBe(
        'rule.name : "episode_status : active alert" AND episode_status : "pending"'
      );
    });
  });

  describe('escaping', () => {
    it('escapes double quotes in values', () => {
      expect(mergeRuleIdsIntoMatcher('', ['foo"bar'])).toBe('rule.id : "foo\\"bar"');
    });

    it('escapes backslashes in values', () => {
      expect(mergeRuleTagsIntoMatcher('', ['C:\\path'])).toBe('rule.tags : "C:\\\\path"');
    });

    it('round-trips values with double quotes', () => {
      const ids = ['id-with-"quotes"'];
      const merged = mergeRuleIdsIntoMatcher('', ids);
      expect(parseRuleIdsFromMatcher(merged)).toEqual(ids);
    });

    it('round-trips values with backslashes', () => {
      const tags = ['path\\to\\thing'];
      const merged = mergeRuleTagsIntoMatcher('', tags);
      expect(parseRuleTagsFromMatcher(merged)).toEqual(tags);
    });

    it('round-trips values with both quotes and backslashes', () => {
      const ids = ['val\\"complex'];
      const merged = mergeRuleIdsIntoMatcher('', ids);
      expect(parseRuleIdsFromMatcher(merged)).toEqual(ids);
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
