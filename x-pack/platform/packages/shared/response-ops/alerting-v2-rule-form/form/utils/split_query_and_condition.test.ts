/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { splitQueryAndCondition } from './split_query_and_condition';

describe('splitQueryAndCondition', () => {
  describe('basic functionality', () => {
    it('returns null for empty query', () => {
      expect(splitQueryAndCondition('')).toBeNull();
    });

    it('returns null for whitespace-only query', () => {
      expect(splitQueryAndCondition('   ')).toBeNull();
    });

    it('returns null for query without WHERE clause', () => {
      expect(splitQueryAndCondition('FROM logs-*')).toBeNull();
    });

    it('returns null for query with only STATS but no WHERE', () => {
      expect(splitQueryAndCondition('FROM logs-* | STATS count() BY host.name')).toBeNull();
    });

    it('returns null for invalid query syntax', () => {
      expect(splitQueryAndCondition('INVALID QUERY SYNTAX')).toBeNull();
    });
  });

  describe('query with STATS and trailing WHERE (threshold condition)', () => {
    it('extracts condition from query with STATS and WHERE', () => {
      const query = 'FROM logs-* | STATS count() BY host.name | WHERE count > 100';
      const result = splitQueryAndCondition(query);

      expect(result).not.toBeNull();
      expect(result!.baseQuery).toBe('FROM logs-* | STATS COUNT() BY host.name');
      expect(result!.condition).toBe('count > 100');
    });

    it('handles complex threshold conditions', () => {
      const query =
        'FROM logs-* | STATS avg(response_time) BY service | WHERE avg(response_time) >= 500';
      const result = splitQueryAndCondition(query);

      expect(result).not.toBeNull();
      expect(result!.baseQuery).toBe('FROM logs-* | STATS AVG(response_time) BY service');
      expect(result!.condition).toBe('AVG(response_time) >= 500');
    });
  });

  describe('query with only WHERE (document-level condition)', () => {
    it('extracts condition from simple WHERE query', () => {
      const query = 'FROM logs-* | WHERE status >= 500';
      const result = splitQueryAndCondition(query);

      expect(result).not.toBeNull();
      expect(result!.baseQuery).toBe('FROM logs-*');
      expect(result!.condition).toBe('status >= 500');
    });

    it('handles string comparisons in WHERE', () => {
      const query = 'FROM logs-* | WHERE level == "error"';
      const result = splitQueryAndCondition(query);

      expect(result).not.toBeNull();
      expect(result!.baseQuery).toBe('FROM logs-*');
      expect(result!.condition).toBe('level == "error"');
    });
  });

  describe('query with multiple WHERE clauses', () => {
    it('only extracts the last WHERE clause as condition', () => {
      const query =
        'FROM logs-* | WHERE service.name == "api" | STATS count() BY host | WHERE count > 100';
      const result = splitQueryAndCondition(query);

      expect(result).not.toBeNull();
      // Base query should include the first WHERE but not the last
      expect(result!.baseQuery).toBe(
        'FROM logs-* | WHERE service.name == "api" | STATS COUNT() BY host'
      );
      expect(result!.condition).toBe('count > 100');
    });

    it('handles multiple filtering WHEREs before the condition', () => {
      const query =
        'FROM logs-* | WHERE env == "prod" | WHERE region == "us-east" | WHERE error_count > 0';
      const result = splitQueryAndCondition(query);

      expect(result).not.toBeNull();
      expect(result!.baseQuery).toBe(
        'FROM logs-* | WHERE env == "prod" | WHERE region == "us-east"'
      );
      expect(result!.condition).toBe('error_count > 0');
    });
  });

  describe('complex conditions', () => {
    it('handles AND conditions', () => {
      const query = 'FROM logs-* | WHERE status >= 400 AND status < 500';
      const result = splitQueryAndCondition(query);

      expect(result).not.toBeNull();
      expect(result!.condition).toBe('status >= 400 AND status < 500');
    });

    it('handles OR conditions', () => {
      const query = 'FROM logs-* | WHERE status == 500 OR status == 503';
      const result = splitQueryAndCondition(query);

      expect(result).not.toBeNull();
      expect(result!.condition).toBe('status == 500 OR status == 503');
    });

    it('handles nested conditions with parentheses', () => {
      const query = 'FROM logs-* | WHERE (status >= 500 AND env == "prod") OR critical == true';
      const result = splitQueryAndCondition(query);

      expect(result).not.toBeNull();
      expect(result!.condition).toContain('status >= 500');
      expect(result!.condition).toContain('env == "prod"');
    });

    it('handles NOT conditions', () => {
      const query = 'FROM logs-* | WHERE NOT status == 200';
      const result = splitQueryAndCondition(query);

      expect(result).not.toBeNull();
      expect(result!.condition).toBe('NOT status == 200');
    });

    it('handles IS NULL conditions', () => {
      const query = 'FROM logs-* | WHERE error_message IS NOT NULL';
      const result = splitQueryAndCondition(query);

      expect(result).not.toBeNull();
      expect(result!.condition).toBe('error_message IS NOT NULL');
    });
  });

  describe('queries with other commands', () => {
    it('preserves LIMIT command in base query', () => {
      const query = 'FROM logs-* | LIMIT 1000 | WHERE status >= 500';
      const result = splitQueryAndCondition(query);

      expect(result).not.toBeNull();
      expect(result!.baseQuery).toBe('FROM logs-* | LIMIT 1000');
      expect(result!.condition).toBe('status >= 500');
    });

    it('preserves SORT command in base query', () => {
      const query = 'FROM logs-* | SORT @timestamp DESC | WHERE status >= 500';
      const result = splitQueryAndCondition(query);

      expect(result).not.toBeNull();
      expect(result!.baseQuery).toContain('SORT');
      expect(result!.condition).toBe('status >= 500');
    });

    it('preserves KEEP command in base query', () => {
      const query = 'FROM logs-* | KEEP status, message | WHERE status >= 500';
      const result = splitQueryAndCondition(query);

      expect(result).not.toBeNull();
      expect(result!.baseQuery).toContain('KEEP');
      expect(result!.condition).toBe('status >= 500');
    });
  });

  describe('queries with commands after WHERE (should not split)', () => {
    it('returns null when STATS comes after WHERE', () => {
      const query = 'FROM logs-* | WHERE status > 400 | STATS count() BY host.name';
      const result = splitQueryAndCondition(query);

      expect(result).toBeNull();
    });

    it('returns null when SORT comes after WHERE', () => {
      const query = 'FROM logs-* | WHERE status > 400 | SORT @timestamp DESC';
      const result = splitQueryAndCondition(query);

      expect(result).toBeNull();
    });

    it('returns null when LIMIT comes after WHERE', () => {
      const query = 'FROM logs-* | WHERE status > 400 | LIMIT 100';
      const result = splitQueryAndCondition(query);

      expect(result).toBeNull();
    });

    it('returns null when KEEP comes after WHERE', () => {
      const query = 'FROM logs-* | WHERE status > 400 | KEEP status, message';
      const result = splitQueryAndCondition(query);

      expect(result).toBeNull();
    });

    it('returns null when multiple commands come after WHERE', () => {
      const query = 'FROM logs-* | WHERE status > 400 | STATS count() BY host | SORT count DESC';
      const result = splitQueryAndCondition(query);

      expect(result).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('handles query with TS command instead of FROM', () => {
      const query = 'TS logs-* | WHERE status >= 500';
      const result = splitQueryAndCondition(query);

      expect(result).not.toBeNull();
      expect(result!.baseQuery).toBe('TS logs-*');
      expect(result!.condition).toBe('status >= 500');
    });

    it('handles field names with dots', () => {
      const query = 'FROM logs-* | WHERE host.name == "server1"';
      const result = splitQueryAndCondition(query);

      expect(result).not.toBeNull();
      expect(result!.condition).toBe('host.name == "server1"');
    });

    it('handles function calls in condition', () => {
      const query = 'FROM logs-* | WHERE LENGTH(message) > 100';
      const result = splitQueryAndCondition(query);

      expect(result).not.toBeNull();
      expect(result!.condition).toBe('LENGTH(message) > 100');
    });

    it('handles LIKE operator', () => {
      const query = 'FROM logs-* | WHERE message LIKE "*error*"';
      const result = splitQueryAndCondition(query);

      expect(result).not.toBeNull();
      expect(result!.condition).toBe('message LIKE "*error*"');
    });

    it('handles IN operator', () => {
      const query = 'FROM logs-* | WHERE status IN (500, 502, 503)';
      const result = splitQueryAndCondition(query);

      expect(result).not.toBeNull();
      expect(result!.condition).toContain('IN');
    });
  });
});
