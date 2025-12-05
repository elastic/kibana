/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  parseIndexPattern,
  createInputGroups,
  countWildcards,
  buildStreamName,
} from './stream_name_input_utils';

describe('stream_name_input_utils', () => {
  describe('parseIndexPattern', () => {
    it('returns empty array for empty pattern', () => {
      expect(parseIndexPattern('')).toEqual([]);
    });

    it('parses pattern with single wildcard at end', () => {
      expect(parseIndexPattern('logs-*')).toEqual([
        { type: 'static', value: 'logs-' },
        { type: 'wildcard', value: '*', index: 0 },
      ]);
    });

    it('parses pattern with single wildcard at start', () => {
      expect(parseIndexPattern('*-logs')).toEqual([
        { type: 'wildcard', value: '*', index: 0 },
        { type: 'static', value: '-logs' },
      ]);
    });

    it('parses pattern with wildcard in middle', () => {
      expect(parseIndexPattern('logs-*-data')).toEqual([
        { type: 'static', value: 'logs-' },
        { type: 'wildcard', value: '*', index: 0 },
        { type: 'static', value: '-data' },
      ]);
    });

    it('parses pattern with multiple wildcards', () => {
      expect(parseIndexPattern('logs-*-*-data')).toEqual([
        { type: 'static', value: 'logs-' },
        { type: 'wildcard', value: '*', index: 0 },
        { type: 'static', value: '-' },
        { type: 'wildcard', value: '*', index: 1 },
        { type: 'static', value: '-data' },
      ]);
    });

    it('parses pattern with consecutive wildcards', () => {
      expect(parseIndexPattern('logs-**')).toEqual([
        { type: 'static', value: 'logs-' },
        { type: 'wildcard', value: '*', index: 0 },
        { type: 'wildcard', value: '*', index: 1 },
      ]);
    });

    it('parses pattern with only wildcards', () => {
      expect(parseIndexPattern('***')).toEqual([
        { type: 'wildcard', value: '*', index: 0 },
        { type: 'wildcard', value: '*', index: 1 },
        { type: 'wildcard', value: '*', index: 2 },
      ]);
    });

    it('parses pattern with no wildcards', () => {
      expect(parseIndexPattern('logs-apache-access')).toEqual([
        { type: 'static', value: 'logs-apache-access' },
      ]);
    });

    it('parses complex pattern', () => {
      expect(parseIndexPattern('logs-*-data-*-region-*-env')).toEqual([
        { type: 'static', value: 'logs-' },
        { type: 'wildcard', value: '*', index: 0 },
        { type: 'static', value: '-data-' },
        { type: 'wildcard', value: '*', index: 1 },
        { type: 'static', value: '-region-' },
        { type: 'wildcard', value: '*', index: 2 },
        { type: 'static', value: '-env' },
      ]);
    });

    it('parses pattern with dots', () => {
      expect(parseIndexPattern('logs.apache-*')).toEqual([
        { type: 'static', value: 'logs.apache-' },
        { type: 'wildcard', value: '*', index: 0 },
      ]);
    });

    it('parses pattern with underscores and numbers', () => {
      expect(parseIndexPattern('metrics_system_v2-*')).toEqual([
        { type: 'static', value: 'metrics_system_v2-' },
        { type: 'wildcard', value: '*', index: 0 },
      ]);
    });
  });

  describe('createInputGroups', () => {
    it('returns empty array for empty segments', () => {
      expect(createInputGroups([])).toEqual([]);
    });

    it('creates group for single wildcard at end', () => {
      const segments = parseIndexPattern('logs-*');
      expect(createInputGroups(segments)).toEqual([
        { prepend: 'logs-', wildcardIndex: 0, isFirst: true, isLast: true },
      ]);
    });

    it('creates group for single wildcard at start with append', () => {
      const segments = parseIndexPattern('*-logs');
      expect(createInputGroups(segments)).toEqual([
        { prepend: undefined, wildcardIndex: 0, append: '-logs', isFirst: true, isLast: true },
      ]);
    });

    it('creates group for wildcard in middle', () => {
      const segments = parseIndexPattern('logs-*-data');
      expect(createInputGroups(segments)).toEqual([
        { prepend: 'logs-', wildcardIndex: 0, append: '-data', isFirst: true, isLast: true },
      ]);
    });

    it('creates groups for multiple wildcards', () => {
      const segments = parseIndexPattern('logs-*-*-data');
      expect(createInputGroups(segments)).toEqual([
        { prepend: 'logs-', wildcardIndex: 0, isFirst: true, isLast: false },
        { prepend: '-', wildcardIndex: 1, append: '-data', isFirst: false, isLast: true },
      ]);
    });

    it('creates groups for pattern starting with wildcard', () => {
      const segments = parseIndexPattern('*-logs-*');
      expect(createInputGroups(segments)).toEqual([
        { prepend: undefined, wildcardIndex: 0, isFirst: true, isLast: false },
        { prepend: '-logs-', wildcardIndex: 1, isFirst: false, isLast: true },
      ]);
    });

    it('creates groups for complex pattern', () => {
      const segments = parseIndexPattern('logs-*-data-*-region-*-env');
      expect(createInputGroups(segments)).toEqual([
        { prepend: 'logs-', wildcardIndex: 0, isFirst: true, isLast: false },
        { prepend: '-data-', wildcardIndex: 1, isFirst: false, isLast: false },
        { prepend: '-region-', wildcardIndex: 2, append: '-env', isFirst: false, isLast: true },
      ]);
    });

    it('handles consecutive wildcards', () => {
      const segments = parseIndexPattern('logs-**-data');
      expect(createInputGroups(segments)).toEqual([
        { prepend: 'logs-', wildcardIndex: 0, isFirst: true, isLast: false },
        { prepend: undefined, wildcardIndex: 1, append: '-data', isFirst: false, isLast: true },
      ]);
    });

    it('returns empty array for pattern with no wildcards', () => {
      const segments = parseIndexPattern('logs-apache-access');
      expect(createInputGroups(segments)).toEqual([]);
    });

    it('handles consecutive wildcards at start', () => {
      const segments = parseIndexPattern('**-logs');
      expect(createInputGroups(segments)).toEqual([
        { prepend: undefined, wildcardIndex: 0, isFirst: true, isLast: false },
        { prepend: undefined, wildcardIndex: 1, append: '-logs', isFirst: false, isLast: true },
      ]);
    });

    it('handles pattern with dots and underscores', () => {
      const segments = parseIndexPattern('logs.apache_access-*');
      expect(createInputGroups(segments)).toEqual([
        { prepend: 'logs.apache_access-', wildcardIndex: 0, isFirst: true, isLast: true },
      ]);
    });
  });

  describe('countWildcards', () => {
    it('returns 0 for empty string', () => {
      expect(countWildcards('')).toBe(0);
    });

    it('returns 0 for pattern with no wildcards', () => {
      expect(countWildcards('logs-apache-access')).toBe(0);
    });

    it('returns 1 for single wildcard', () => {
      expect(countWildcards('logs-*')).toBe(1);
    });

    it('returns 2 for two wildcards', () => {
      expect(countWildcards('logs-*-*')).toBe(2);
    });

    it('returns correct count for multiple wildcards', () => {
      expect(countWildcards('*-logs-*-data-*-env-*')).toBe(4);
    });

    it('returns correct count for consecutive wildcards', () => {
      expect(countWildcards('logs-***')).toBe(3);
    });
  });

  describe('buildStreamName', () => {
    it('returns pattern unchanged when no wildcards', () => {
      expect(buildStreamName('logs-apache-access', [])).toBe('logs-apache-access');
    });

    it('replaces single wildcard with value', () => {
      expect(buildStreamName('logs-*', ['myapp'])).toBe('logs-myapp');
    });

    it('replaces multiple wildcards in order', () => {
      expect(buildStreamName('logs-*-*', ['myapp', 'prod'])).toBe('logs-myapp-prod');
    });

    it('keeps * for empty parts', () => {
      expect(buildStreamName('logs-*', [''])).toBe('logs-*');
    });

    it('keeps * for undefined parts', () => {
      expect(buildStreamName('logs-*-*', ['myapp'])).toBe('logs-myapp-*');
    });

    it('handles complex pattern with mixed filled and empty parts', () => {
      expect(buildStreamName('logs-*-data-*-region-*-env', ['myapp', '', 'us-east'])).toBe(
        'logs-myapp-data-*-region-us-east-env'
      );
    });

    it('handles pattern starting with wildcard', () => {
      expect(buildStreamName('*-logs-*', ['prefix', 'suffix'])).toBe('prefix-logs-suffix');
    });

    it('handles consecutive wildcards', () => {
      expect(buildStreamName('logs-**', ['first', 'second'])).toBe('logs-firstsecond');
    });

    it('handles all empty parts', () => {
      expect(buildStreamName('logs-*-*-*', ['', '', ''])).toBe('logs-*-*-*');
    });

    it('trims whitespace and treats whitespace-only parts as empty', () => {
      expect(buildStreamName('logs-*', ['   '])).toBe('logs-*');
      expect(buildStreamName('logs-*', ['  myapp  '])).toBe('logs-myapp');
    });

    it('ignores extra parts beyond wildcard count', () => {
      expect(buildStreamName('logs-*', ['myapp', 'extra', 'parts'])).toBe('logs-myapp');
    });

    it('handles parts with special characters', () => {
      expect(buildStreamName('logs-*', ['my.app_v2'])).toBe('logs-my.app_v2');
    });

    it('returns pattern unchanged when parts is undefined', () => {
      expect(buildStreamName('logs-*', undefined as unknown as string[])).toBe('logs-*');
    });

    it('returns pattern unchanged when parts is null', () => {
      expect(buildStreamName('logs-*', null as unknown as string[])).toBe('logs-*');
    });
  });
});
