/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildEpisodeStatusClause,
  mergeEpisodeStatusIntoMatcher,
  mergeRuleIdsIntoMatcher,
  parseEpisodeStatusesFromMatcher,
  parseRuleIdsFromMatcher,
  stripEpisodeStatusClauses,
  stripRuleIdClauses,
} from './matcher_quick_filter_utils';

describe('matcher_quick_filter_utils', () => {
  describe('stripEpisodeStatusClauses', () => {
    it('removes episode_status clauses', () => {
      expect(stripEpisodeStatusClauses('foo : "a" AND episode_status : "active"')).toBe(
        'foo : "a"'
      );
    });
  });

  describe('buildEpisodeStatusClause', () => {
    it('returns null for empty', () => {
      expect(buildEpisodeStatusClause([])).toBeNull();
    });

    it('builds single-value clause', () => {
      expect(buildEpisodeStatusClause(['active'])).toBe('episode_status : "active"');
    });

    it('builds OR group for multiple values', () => {
      expect(buildEpisodeStatusClause(['active', 'pending'])).toBe(
        '(episode_status : "active" or episode_status : "pending")'
      );
    });
  });

  describe('mergeEpisodeStatusIntoMatcher', () => {
    it('appends when base empty', () => {
      expect(mergeEpisodeStatusIntoMatcher('', ['inactive'])).toBe('episode_status : "inactive"');
    });

    it('merges with existing non-status clauses', () => {
      expect(
        mergeEpisodeStatusIntoMatcher('rule.id : "x"', ['active', 'recovering'])
      ).toBe(
        'rule.id : "x" AND (episode_status : "active" or episode_status : "recovering")'
      );
    });
  });

  describe('parseEpisodeStatusesFromMatcher', () => {
    it('parses quoted episode_status values', () => {
      expect(
        parseEpisodeStatusesFromMatcher('episode_status : "active" AND episode_status : "pending"')
      ).toEqual(['active', 'pending']);
    });
  });

  describe('rule id helpers', () => {
    it('stripRuleIdClauses removes rule.id segments', () => {
      expect(stripRuleIdClauses('episode_status : "a" AND rule.id : "x"')).toBe(
        'episode_status : "a"'
      );
    });

    it('parseRuleIdsFromMatcher collects ids', () => {
      expect(parseRuleIdsFromMatcher('rule.id : "a" AND rule.id : "b"')).toEqual(['a', 'b']);
    });

    it('mergeRuleIdsIntoMatcher builds OR group', () => {
      expect(mergeRuleIdsIntoMatcher('', ['u1', 'u2'])).toBe(
        '(rule.id : "u1" or rule.id : "u2")'
      );
    });
  });
});
