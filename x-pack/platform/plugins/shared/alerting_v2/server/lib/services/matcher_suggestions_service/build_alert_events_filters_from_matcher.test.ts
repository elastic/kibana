/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildAlertEventsFiltersFromMatcher } from './build_alert_events_filters_from_matcher';

const stringify = (filters: unknown): string => JSON.stringify(filters);

describe('buildAlertEventsFiltersFromMatcher', () => {
  describe('empty / invalid input', () => {
    it('returns [] for empty string', () => {
      expect(buildAlertEventsFiltersFromMatcher('')).toEqual([]);
    });

    it('returns [] for whitespace-only string', () => {
      expect(buildAlertEventsFiltersFromMatcher('   ')).toEqual([]);
    });

    it('returns [] for malformed KQL without throwing', () => {
      expect(() => buildAlertEventsFiltersFromMatcher('rule.id :')).not.toThrow();
      expect(buildAlertEventsFiltersFromMatcher('rule.id :')).toEqual([]);
    });
  });

  describe('supported fields (kept as-is)', () => {
    it('keeps rule.id', () => {
      const filters = buildAlertEventsFiltersFromMatcher('rule.id : "abc"');
      expect(filters).toHaveLength(1);
      expect(stringify(filters)).toContain('rule.id');
      expect(stringify(filters)).toContain('abc');
    });

    it('keeps group_hash', () => {
      const filters = buildAlertEventsFiltersFromMatcher('group_hash : "h"');
      expect(filters).toHaveLength(1);
      expect(stringify(filters)).toContain('group_hash');
      expect(stringify(filters)).toContain('"h"');
    });

    it('passes through data.* fields', () => {
      const filters = buildAlertEventsFiltersFromMatcher('data.host.name : "my-host"');
      expect(filters).toHaveLength(1);
      expect(stringify(filters)).toContain('data.host.name');
      expect(stringify(filters)).toContain('my-host');
    });
  });

  describe('field translation', () => {
    it('translates episode_status to episode.status', () => {
      const filters = buildAlertEventsFiltersFromMatcher('episode_status : pending');
      const json = stringify(filters);
      expect(filters).toHaveLength(1);
      expect(json).toContain('episode.status');
      expect(json).not.toContain('episode_status');
    });

    it('translates episode_id to episode.id', () => {
      const filters = buildAlertEventsFiltersFromMatcher('episode_id : "ep-1"');
      const json = stringify(filters);
      expect(filters).toHaveLength(1);
      expect(json).toContain('episode.id');
      expect(json).not.toContain('episode_id');
      expect(json).toContain('ep-1');
    });
  });

  describe('unsupported fields (dropped)', () => {
    it('drops rule.name', () => {
      expect(buildAlertEventsFiltersFromMatcher('rule.name : "my rule"')).toEqual([]);
    });

    it('drops rule.tags', () => {
      expect(buildAlertEventsFiltersFromMatcher('rule.tags : "production"')).toEqual([]);
    });

    it('drops rule.description', () => {
      expect(buildAlertEventsFiltersFromMatcher('rule.description : "x"')).toEqual([]);
    });

    it('drops rule.enabled', () => {
      expect(buildAlertEventsFiltersFromMatcher('rule.enabled : true')).toEqual([]);
    });

    it('drops last_event_timestamp', () => {
      expect(buildAlertEventsFiltersFromMatcher('last_event_timestamp : "2026-05-01"')).toEqual([]);
    });
  });

  describe('compound expressions', () => {
    it('keeps only the supported clause in AND when one side is unsupported', () => {
      const filters = buildAlertEventsFiltersFromMatcher(
        'rule.description : "x" AND rule.id : "abc"'
      );
      const json = stringify(filters);
      expect(filters).toHaveLength(1);
      expect(json).toContain('rule.id');
      expect(json).toContain('abc');
      expect(json).not.toContain('rule.description');
    });

    it('keeps only the supported clause in OR when one side is unsupported', () => {
      const filters = buildAlertEventsFiltersFromMatcher('rule.tags : "x" OR rule.id : "abc"');
      const json = stringify(filters);
      expect(filters).toHaveLength(1);
      expect(json).toContain('rule.id');
      expect(json).toContain('abc');
      expect(json).not.toContain('rule.tags');
    });

    it('drops a NOT whose inner clause is unsupported', () => {
      expect(buildAlertEventsFiltersFromMatcher('NOT rule.tags : "x"')).toEqual([]);
    });

    it('preserves both arms of an OR over the same supported field', () => {
      const filters = buildAlertEventsFiltersFromMatcher('rule.id : "a" OR rule.id : "b"');
      const json = stringify(filters);
      expect(filters).toHaveLength(1);
      expect(json).toContain('"a"');
      expect(json).toContain('"b"');
    });

    it('preserves AND across two supported clauses', () => {
      const filters = buildAlertEventsFiltersFromMatcher(
        'rule.id : "abc" AND episode_status : active'
      );
      const json = stringify(filters);
      expect(filters).toHaveLength(1);
      expect(json).toContain('rule.id');
      expect(json).toContain('episode.status');
      expect(json).toContain('active');
    });

    it('returns [] when every clause references an unsupported field', () => {
      expect(buildAlertEventsFiltersFromMatcher('rule.name : "n" AND rule.tags : "t"')).toEqual([]);
    });
  });
});
