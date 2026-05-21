/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BasicPrettyPrinter } from '@elastic/esql';
import { conditionToESQLAst } from './condition_to_esql';
import type { Condition } from '../../../types/conditions';

describe('conditionToESQLAst', () => {
  const prettyPrint = (condition: Condition): string => {
    const ast = conditionToESQLAst(condition);
    return BasicPrettyPrinter.print(ast);
  };

  describe('filter conditions', () => {
    describe('equality operators', () => {
      it('should handle eq (equals)', () => {
        const condition: Condition = { field: 'status', eq: 'active' };
        expect(prettyPrint(condition)).toBe('COALESCE(status == "active", FALSE)');
      });

      it('should handle neq (not equals)', () => {
        const condition: Condition = { field: 'status', neq: 'inactive' };
        expect(prettyPrint(condition)).toBe('COALESCE(status != "inactive", TRUE)');
      });
    });

    describe('comparison operators', () => {
      it('should handle gt (greater than)', () => {
        const condition: Condition = { field: 'count', gt: 100 };
        expect(prettyPrint(condition)).toBe('COALESCE(count > 100, FALSE)');
      });

      it('should handle gte (greater than or equal)', () => {
        const condition: Condition = { field: 'count', gte: 100 };
        expect(prettyPrint(condition)).toBe('COALESCE(count >= 100, FALSE)');
      });

      it('should handle lt (less than)', () => {
        const condition: Condition = { field: 'count', lt: 50 };
        expect(prettyPrint(condition)).toBe('COALESCE(count < 50, FALSE)');
      });

      it('should handle lte (less than or equal)', () => {
        const condition: Condition = { field: 'count', lte: 50 };
        expect(prettyPrint(condition)).toBe('COALESCE(count <= 50, FALSE)');
      });
    });

    describe('existence checks', () => {
      // `IS NULL` is total in ES|QL (never evaluates to NULL), so `exists` predicates
      // are not wrapped in `COALESCE(..., FALSE)`.
      it('should handle exists: true', () => {
        const condition: Condition = { field: 'user.name', exists: true };
        expect(prettyPrint(condition)).toBe('NOT(`user.name` IS NULL)');
      });

      it('should handle exists: false', () => {
        const condition: Condition = { field: 'user.name', exists: false };
        expect(prettyPrint(condition)).toBe('`user.name` IS NULL');
      });
    });

    describe('range conditions', () => {
      it('should handle single range boundary (gt)', () => {
        const condition: Condition = { field: 'age', range: { gt: 18 } };
        expect(prettyPrint(condition)).toBe('COALESCE(age > 18, FALSE)');
      });

      it('should handle single range boundary (gte)', () => {
        const condition: Condition = { field: 'age', range: { gte: 18 } };
        expect(prettyPrint(condition)).toBe('COALESCE(age >= 18, FALSE)');
      });

      it('should handle single range boundary (lt)', () => {
        const condition: Condition = { field: 'age', range: { lt: 65 } };
        expect(prettyPrint(condition)).toBe('COALESCE(age < 65, FALSE)');
      });

      it('should handle single range boundary (lte)', () => {
        const condition: Condition = { field: 'age', range: { lte: 65 } };
        expect(prettyPrint(condition)).toBe('COALESCE(age <= 65, FALSE)');
      });

      it('should handle range with both boundaries (gte and lt)', () => {
        const condition: Condition = { field: 'age', range: { gte: 18, lt: 65 } };
        expect(prettyPrint(condition)).toBe('COALESCE(age >= 18 AND age < 65, FALSE)');
      });

      it('should handle range with all boundaries', () => {
        const condition: Condition = { field: 'value', range: { gt: 0, gte: 1, lt: 100, lte: 99 } };
        expect(prettyPrint(condition)).toBe(
          'COALESCE(value > 0 AND value >= 1 AND value < 100 AND value <= 99, FALSE)'
        );
      });
    });

    describe('string pattern matching (LIKE)', () => {
      it('should handle contains with wildcards (*)', () => {
        const condition: Condition = {
          field: 'resource.attributes.service.name',
          contains: 'synth-SERVICE-2',
        };
        const result = prettyPrint(condition);
        expect(result).toBe(
          'COALESCE(CONTAINS(TO_LOWER(`resource.attributes.service.name`), "synth-service-2"), FALSE)'
        ); // CONTAINS should be applied with both sides lowercased
        expect(result).not.toContain('LIKE(');
        expect(result).not.toContain('%');
      });

      it('should handle startsWith with trailing wildcard', () => {
        const condition: Condition = { field: 'message', startsWith: 'Error:' };
        const result = prettyPrint(condition);
        expect(result).toBe('COALESCE(STARTS_WITH(message, "Error:"), FALSE)');
        expect(result).not.toContain('LIKE(');
        expect(result).not.toContain('%');
      });

      it('should handle endsWith with leading wildcard', () => {
        const condition: Condition = { field: 'filename', endsWith: '.log' };
        const result = prettyPrint(condition);
        expect(result).toBe('COALESCE(ENDS_WITH(filename, ".log"), FALSE)');
        expect(result).not.toContain('LIKE(');
        expect(result).not.toContain('%');
      });

      it('should handle contains with special characters', () => {
        const condition: Condition = { field: 'path', contains: '/api/v1/' };
        expect(prettyPrint(condition)).toBe(
          'COALESCE(CONTAINS(TO_LOWER(path), "/api/v1/"), FALSE)'
        );
      });

      it('should handle startsWith with numbers', () => {
        const condition: Condition = { field: 'code', startsWith: '404' };
        expect(prettyPrint(condition)).toBe('COALESCE(STARTS_WITH(code, "404"), FALSE)');
      });

      it('should handle endsWith with spaces', () => {
        const condition: Condition = { field: 'message', endsWith: ' failed' };
        expect(prettyPrint(condition)).toBe('COALESCE(ENDS_WITH(message, " failed"), FALSE)');
      });
    });

    describe('multivalue contains (includes)', () => {
      it('should handle includes with string value', () => {
        const condition: Condition = { field: 'tags', includes: 'error' };
        expect(prettyPrint(condition)).toBe('COALESCE(MV_CONTAINS(tags, "error"), FALSE)');
      });

      it('should handle includes with numeric value', () => {
        const condition: Condition = { field: 'status_codes', includes: 200 };
        expect(prettyPrint(condition)).toBe('COALESCE(MV_CONTAINS(status_codes, 200), FALSE)');
      });

      it('should handle includes with boolean value', () => {
        const condition: Condition = { field: 'flags', includes: true };
        expect(prettyPrint(condition)).toBe('COALESCE(MV_CONTAINS(flags, TRUE), FALSE)');
      });

      it('should handle includes with nested field name', () => {
        const condition: Condition = { field: 'user.roles', includes: 'admin' };
        expect(prettyPrint(condition)).toBe('COALESCE(MV_CONTAINS(`user.roles`, "admin"), FALSE)');
      });
    });

    describe('type handling', () => {
      it('should handle string values', () => {
        const condition: Condition = { field: 'name', eq: 'test' };
        expect(prettyPrint(condition)).toBe('COALESCE(name == "test", FALSE)');
      });

      it('should handle integer values', () => {
        const condition: Condition = { field: 'count', eq: 42 };
        expect(prettyPrint(condition)).toBe('COALESCE(count == 42, FALSE)');
      });

      it('should handle decimal values', () => {
        const condition: Condition = { field: 'price', eq: 19.99 };
        expect(prettyPrint(condition)).toBe('COALESCE(price == 19.99, FALSE)');
      });

      it('should handle boolean values', () => {
        const condition: Condition = { field: 'active', eq: true };
        expect(prettyPrint(condition)).toBe('COALESCE(active == TRUE, FALSE)');
      });
    });
  });

  describe('logical operators', () => {
    describe('AND conditions', () => {
      it('should handle simple AND with two conditions', () => {
        const condition: Condition = {
          and: [
            { field: 'status', eq: 'active' },
            { field: 'count', gt: 10 },
          ],
        };
        expect(prettyPrint(condition)).toBe(
          'COALESCE(status == "active", FALSE) AND COALESCE(count > 10, FALSE)'
        );
      });

      it('should handle AND with three conditions', () => {
        const condition: Condition = {
          and: [
            { field: 'status', eq: 'active' },
            { field: 'count', gt: 10 },
            { field: 'name', contains: 'test' },
          ],
        };
        expect(prettyPrint(condition)).toBe(
          'COALESCE(status == "active", FALSE) AND COALESCE(count > 10, FALSE) AND COALESCE(CONTAINS(TO_LOWER(name), "test"), FALSE)'
        );
      });
    });

    describe('OR conditions', () => {
      it('should handle simple OR with two conditions', () => {
        const condition: Condition = {
          or: [
            { field: 'status', eq: 'active' },
            { field: 'status', eq: 'pending' },
          ],
        };
        expect(prettyPrint(condition)).toBe(
          'COALESCE(status == "active", FALSE) OR COALESCE(status == "pending", FALSE)'
        );
      });

      it('should handle OR with three conditions', () => {
        const condition: Condition = {
          or: [
            { field: 'level', eq: 'error' },
            { field: 'level', eq: 'critical' },
            { field: 'level', eq: 'fatal' },
          ],
        };
        expect(prettyPrint(condition)).toBe(
          'COALESCE(level == "error", FALSE) OR COALESCE(level == "critical", FALSE) OR COALESCE(level == "fatal", FALSE)'
        );
      });
    });

    describe('NOT conditions', () => {
      it('should handle NOT with simple condition', () => {
        const condition: Condition = {
          not: { field: 'status', eq: 'inactive' },
        };
        expect(prettyPrint(condition)).toBe('NOT COALESCE(status == "inactive", FALSE)');
      });

      it('should handle NOT with LIKE condition', () => {
        const condition: Condition = {
          not: { field: 'message', contains: 'debug' },
        };
        expect(prettyPrint(condition)).toBe(
          'NOT COALESCE(CONTAINS(TO_LOWER(message), "debug"), FALSE)'
        );
      });
    });

    describe('complex nested conditions', () => {
      it('should handle AND with OR nested', () => {
        const condition: Condition = {
          and: [
            { field: 'active', eq: true },
            {
              or: [
                { field: 'role', eq: 'admin' },
                { field: 'role', eq: 'moderator' },
              ],
            },
          ],
        };
        expect(prettyPrint(condition)).toBe(
          'COALESCE(active == TRUE, FALSE) AND (COALESCE(role == "admin", FALSE) OR COALESCE(role == "moderator", FALSE))'
        );
      });

      it('should handle OR with AND nested', () => {
        const condition: Condition = {
          or: [
            {
              and: [
                { field: 'status', eq: 'active' },
                { field: 'verified', eq: true },
              ],
            },
            { field: 'admin', eq: true },
          ],
        };
        expect(prettyPrint(condition)).toBe(
          'COALESCE(status == "active", FALSE) AND COALESCE(verified == TRUE, FALSE) OR COALESCE(admin == TRUE, FALSE)'
        );
      });

      it('should handle NOT with nested AND', () => {
        const condition: Condition = {
          not: {
            and: [
              { field: 'status', eq: 'deleted' },
              { field: 'archived', eq: true },
            ],
          },
        };
        expect(prettyPrint(condition)).toBe(
          'NOT (COALESCE(status == "deleted", FALSE) AND COALESCE(archived == TRUE, FALSE))'
        );
      });

      it('should handle deeply nested conditions', () => {
        const condition: Condition = {
          and: [
            { field: 'active', eq: true },
            {
              or: [
                {
                  and: [
                    { field: 'role', eq: 'admin' },
                    { field: 'department', contains: 'engineering' },
                  ],
                },
                {
                  not: { field: 'suspended', eq: true },
                },
              ],
            },
          ],
        };
        expect(prettyPrint(condition)).toBe(
          'COALESCE(active == TRUE, FALSE) AND (COALESCE(role == "admin", FALSE) AND COALESCE(CONTAINS(TO_LOWER(department), "engineering"), FALSE) OR NOT COALESCE(suspended == TRUE, FALSE))'
        );
      });
    });
  });

  describe('always condition', () => {
    it('should handle always condition', () => {
      const condition: Condition = { always: {} };
      expect(prettyPrint(condition)).toBe('TRUE');
    });
  });

  describe('edge cases', () => {
    it('should handle empty string in contains', () => {
      const condition: Condition = { field: 'message', contains: '' };
      expect(prettyPrint(condition)).toBe('COALESCE(CONTAINS(TO_LOWER(message), ""), FALSE)');
    });

    it('should handle nested field names with dots', () => {
      const condition: Condition = { field: 'user.profile.email', eq: 'test@example.com' };
      expect(prettyPrint(condition)).toBe(
        'COALESCE(`user.profile.email` == "test@example.com", FALSE)'
      );
    });

    it('should handle field names with special characters', () => {
      const condition: Condition = { field: '@timestamp', exists: true };
      expect(prettyPrint(condition)).toBe('NOT(@timestamp IS NULL)');
    });
  });

  describe('null / missing field alignment with Painless', () => {
    it('leaves `exists` predicates unwrapped (they are already total)', () => {
      expect(prettyPrint({ field: 'f', exists: true })).toBe('NOT(f IS NULL)');
      expect(prettyPrint({ field: 'f', exists: false })).toBe('f IS NULL');
    });

    it('wraps each leaf inside NOT so `NOT leaf` on a missing field is TRUE, not NULL', () => {
      expect(prettyPrint({ not: { field: 'f', eq: 'x' } })).toBe('NOT COALESCE(f == "x", FALSE)');
    });

    it('uses TRUE as the COALESCE default for `neq` so missing fields satisfy "not equals"', () => {
      // `neq` is the only negative leaf: a missing field is "not equal to" any concrete
      // value, mirroring `not(eq)` and Query DSL semantics. Every other leaf keeps FALSE
      // as the default (a missing field "doesn't match" the predicate).
      expect(prettyPrint({ field: 'f', neq: 'x' })).toBe('COALESCE(f != "x", TRUE)');
    });

    it('keeps `neq` and `not(eq)` interchangeable on missing fields', () => {
      expect(prettyPrint({ field: 'f', neq: 'x' })).toBe('COALESCE(f != "x", TRUE)');
      expect(prettyPrint({ not: { field: 'f', eq: 'x' } })).toBe('NOT COALESCE(f == "x", FALSE)');
    });

    it('wraps each leaf inside AND/OR so 3VL can never leak past a branch boundary', () => {
      expect(
        prettyPrint({
          and: [
            { field: 'a', eq: 1 },
            { field: 'b', eq: 2 },
          ],
        })
      ).toBe('COALESCE(a == 1, FALSE) AND COALESCE(b == 2, FALSE)');
      expect(
        prettyPrint({
          or: [
            { field: 'a', eq: 1 },
            { field: 'b', eq: 2 },
          ],
        })
      ).toBe('COALESCE(a == 1, FALSE) OR COALESCE(b == 2, FALSE)');
    });
  });
});
