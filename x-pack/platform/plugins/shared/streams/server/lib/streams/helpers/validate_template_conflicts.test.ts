/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  indexPatternToRegex,
  matchesPattern,
  findConflictingTemplates,
} from './validate_template_conflicts';

describe('index_template_matching', () => {
  describe('indexPatternToRegex', () => {
    it('converts simple wildcard patterns', () => {
      const regex = indexPatternToRegex('logs-*');
      expect(regex.test('logs-app')).toBe(true);
      expect(regex.test('logs-test')).toBe(true);
      expect(regex.test('metrics-app')).toBe(false);
    });

    it('converts multi-wildcard patterns', () => {
      const regex = indexPatternToRegex('logs-*-*');
      expect(regex.test('logs-app-default')).toBe(true);
      expect(regex.test('logs-test-prod')).toBe(true);
      expect(regex.test('logs-app')).toBe(false);
    });

    it('escapes special regex characters', () => {
      const regex = indexPatternToRegex('foo-logs-bar-*');
      expect(regex.test('foo-logs-bar-baz')).toBe(true);
      expect(regex.test('fooXlogsXbarXbaz')).toBe(false);
    });

    it('escapes dots correctly', () => {
      const regex = indexPatternToRegex('.kibana-*');
      expect(regex.test('.kibana-test')).toBe(true);
      expect(regex.test('Xkibana-test')).toBe(false);
    });
  });

  describe('matchesPattern', () => {
    it('matches simple patterns', () => {
      expect(matchesPattern('logs-app-default', 'logs-*-*')).toBe(true);
      expect(matchesPattern('metrics-app-default', 'logs-*-*')).toBe(false);
    });

    it('matches exact patterns (no wildcards)', () => {
      expect(matchesPattern('exact-name', 'exact-name')).toBe(true);
      expect(matchesPattern('exact-name-suffix', 'exact-name')).toBe(false);
    });
  });

  describe('findConflictingTemplates', () => {
    const mockTemplates = [
      {
        name: 'lower_priority',
        index_template: {
          priority: 1,
          index_patterns: ['*-logs-*-*'],
        },
      },
      {
        name: 'higher_priority',
        index_template: {
          priority: 2,
          index_patterns: ['foo-logs-bar-*'],
        },
      },
      {
        name: 'even_higher_priority',
        index_template: {
          priority: 3,
          index_patterns: ['foo-logs-*'],
        },
      },
      {
        name: 'non_matching',
        index_template: {
          priority: 100,
          index_patterns: ['metrics-*-*'],
        },
      },
    ];

    it('finds templates with higher priority that match the index name', () => {
      const conflicts = findConflictingTemplates(
        'foo-logs-bar-baz',
        'lower_priority',
        1,
        mockTemplates
      );

      expect(conflicts).toHaveLength(2);
      expect(conflicts[0].name).toBe('even_higher_priority');
      expect(conflicts[0].priority).toBe(3);
      expect(conflicts[1].name).toBe('higher_priority');
      expect(conflicts[1].priority).toBe(2);
    });

    it('excludes the selected template', () => {
      const conflicts = findConflictingTemplates(
        'foo-logs-bar-baz',
        'higher_priority',
        2,
        mockTemplates
      );

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].name).toBe('even_higher_priority');
    });

    it('excludes templates with lower or equal priority', () => {
      const conflicts = findConflictingTemplates(
        'foo-logs-bar-baz',
        'even_higher_priority',
        3,
        mockTemplates
      );

      expect(conflicts).toHaveLength(0);
    });

    it('excludes non-matching templates', () => {
      const conflicts = findConflictingTemplates(
        'foo-logs-bar-baz',
        'lower_priority',
        1,
        mockTemplates
      );

      // Should find higher_priority and even_higher_priority (both match the pattern)
      expect(conflicts).toHaveLength(2);
      // Should NOT include non_matching (pattern is 'metrics-*-*', doesn't match 'foo-logs-bar-baz')
      expect(conflicts.some((c) => c.name === 'non_matching')).toBe(false);
      expect(conflicts.some((c) => c.name === 'higher_priority')).toBe(true);
      expect(conflicts.some((c) => c.name === 'even_higher_priority')).toBe(true);
    });

    it('returns empty array when no conflicts', () => {
      const conflicts = findConflictingTemplates(
        'completely-different-pattern',
        'lower_priority',
        1,
        mockTemplates
      );

      expect(conflicts).toHaveLength(0);
    });

    it('handles templates with no priority (defaults to 0)', () => {
      const templatesWithoutPriority = [
        {
          name: 'no_priority',
          index_template: {
            index_patterns: ['*-logs-*-*'],
          },
        },
      ];

      const conflicts = findConflictingTemplates(
        'foo-logs-bar-baz',
        'lower_priority',
        1,
        templatesWithoutPriority
      );

      expect(conflicts).toHaveLength(0); // Priority 0 < 1
    });
  });
});
