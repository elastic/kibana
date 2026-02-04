/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BasicPrettyPrinter } from '@kbn/esql-language';
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
        expect(prettyPrint(condition)).toBe('status == "active"');
      });

      it('should handle neq (not equals)', () => {
        const condition: Condition = { field: 'status', neq: 'inactive' };
        expect(prettyPrint(condition)).toBe('status != "inactive"');
      });
    });

    describe('comparison operators', () => {
      it('should handle gt (greater than)', () => {
        const condition: Condition = { field: 'count', gt: 100 };
        expect(prettyPrint(condition)).toBe('count > 100');
      });

      it('should handle gte (greater than or equal)', () => {
        const condition: Condition = { field: 'count', gte: 100 };
        expect(prettyPrint(condition)).toBe('count >= 100');
      });

      it('should handle lt (less than)', () => {
        const condition: Condition = { field: 'count', lt: 50 };
        expect(prettyPrint(condition)).toBe('count < 50');
      });

      it('should handle lte (less than or equal)', () => {
        const condition: Condition = { field: 'count', lte: 50 };
        expect(prettyPrint(condition)).toBe('count <= 50');
      });
    });

    describe('existence checks', () => {
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
        expect(prettyPrint(condition)).toBe('age > 18');
      });

      it('should handle single range boundary (gte)', () => {
        const condition: Condition = { field: 'age', range: { gte: 18 } };
        expect(prettyPrint(condition)).toBe('age >= 18');
      });

      it('should handle single range boundary (lt)', () => {
        const condition: Condition = { field: 'age', range: { lt: 65 } };
        expect(prettyPrint(condition)).toBe('age < 65');
      });

      it('should handle single range boundary (lte)', () => {
        const condition: Condition = { field: 'age', range: { lte: 65 } };
        expect(prettyPrint(condition)).toBe('age <= 65');
      });

      it('should handle range with both boundaries (gte and lt)', () => {
        const condition: Condition = { field: 'age', range: { gte: 18, lt: 65 } };
        expect(prettyPrint(condition)).toBe('age >= 18 AND age < 65');
      });

      it('should handle range with all boundaries', () => {
        const condition: Condition = { field: 'value', range: { gt: 0, gte: 1, lt: 100, lte: 99 } };
        expect(prettyPrint(condition)).toBe(
          'value > 0 AND value >= 1 AND value < 100 AND value <= 99'
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
          'CONTAINS(TO_LOWER(`resource.attributes.service.name`), "synth-service-2")'
        ); // CONTAINS should be applied with both sides lowercased
        expect(result).not.toContain('LIKE(');
        expect(result).not.toContain('%');
      });

      it('should handle startsWith with trailing wildcard', () => {
        const condition: Condition = { field: 'message', startsWith: 'Error:' };
        const result = prettyPrint(condition);
        expect(result).toBe('STARTS_WITH(message, "Error:")');
        expect(result).not.toContain('LIKE(');
        expect(result).not.toContain('%');
      });

      it('should handle endsWith with leading wildcard', () => {
        const condition: Condition = { field: 'filename', endsWith: '.log' };
        const result = prettyPrint(condition);
        expect(result).toBe('ENDS_WITH(filename, ".log")');
        expect(result).not.toContain('LIKE(');
        expect(result).not.toContain('%');
      });

      it('should handle contains with special characters', () => {
        const condition: Condition = { field: 'path', contains: '/api/v1/' };
        expect(prettyPrint(condition)).toBe('CONTAINS(TO_LOWER(path), "/api/v1/")');
      });

      it('should handle startsWith with numbers', () => {
        const condition: Condition = { field: 'code', startsWith: '404' };
        expect(prettyPrint(condition)).toBe('STARTS_WITH(code, "404")');
      });

      it('should handle endsWith with spaces', () => {
        const condition: Condition = { field: 'message', endsWith: ' failed' };
        expect(prettyPrint(condition)).toBe('ENDS_WITH(message, " failed")');
      });
    });

    describe('multivalue contains (includes)', () => {
      it('should handle includes with string value', () => {
        const condition: Condition = { field: 'tags', includes: 'error' };
        expect(prettyPrint(condition)).toBe('MV_CONTAINS(tags, "error")');
      });

      it('should handle includes with numeric value', () => {
        const condition: Condition = { field: 'status_codes', includes: 200 };
        expect(prettyPrint(condition)).toBe('MV_CONTAINS(status_codes, 200)');
      });

      it('should handle includes with boolean value', () => {
        const condition: Condition = { field: 'flags', includes: true };
        expect(prettyPrint(condition)).toBe('MV_CONTAINS(flags, TRUE)');
      });

      it('should handle includes with nested field name', () => {
        const condition: Condition = { field: 'user.roles', includes: 'admin' };
        expect(prettyPrint(condition)).toBe('MV_CONTAINS(`user.roles`, "admin")');
      });
    });

    describe('type handling', () => {
      it('should handle string values', () => {
        const condition: Condition = { field: 'name', eq: 'test' };
        expect(prettyPrint(condition)).toBe('name == "test"');
      });

      it('should handle integer values', () => {
        const condition: Condition = { field: 'count', eq: 42 };
        expect(prettyPrint(condition)).toBe('count == 42');
      });

      it('should handle decimal values', () => {
        const condition: Condition = { field: 'price', eq: 19.99 };
        expect(prettyPrint(condition)).toBe('price == 19.99');
      });

      it('should handle boolean values', () => {
        const condition: Condition = { field: 'active', eq: true };
        expect(prettyPrint(condition)).toBe('active == TRUE');
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
        expect(prettyPrint(condition)).toBe('status == "active" AND count > 10');
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
          'status == "active" AND count > 10 AND CONTAINS(TO_LOWER(name), "test")'
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
        expect(prettyPrint(condition)).toBe('status == "active" OR status == "pending"');
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
          'level == "error" OR level == "critical" OR level == "fatal"'
        );
      });
    });

    describe('NOT conditions', () => {
      it('should handle NOT with simple condition', () => {
        const condition: Condition = {
          not: { field: 'status', eq: 'inactive' },
        };
        expect(prettyPrint(condition)).toBe('NOT status == "inactive"');
      });

      it('should handle NOT with LIKE condition', () => {
        const condition: Condition = {
          not: { field: 'message', contains: 'debug' },
        };
        expect(prettyPrint(condition)).toBe('NOT CONTAINS(TO_LOWER(message), "debug")');
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
          'active == TRUE AND (role == "admin" OR role == "moderator")'
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
          'status == "active" AND verified == TRUE OR admin == TRUE'
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
        expect(prettyPrint(condition)).toBe('NOT (status == "deleted" AND archived == TRUE)');
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
          'active == TRUE AND (role == "admin" AND CONTAINS(TO_LOWER(department), "engineering") OR NOT suspended == TRUE)'
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
      expect(prettyPrint(condition)).toBe('CONTAINS(TO_LOWER(message), "")');
    });

    it('should handle nested field names with dots', () => {
      const condition: Condition = { field: 'user.profile.email', eq: 'test@example.com' };
      expect(prettyPrint(condition)).toBe('`user.profile.email` == "test@example.com"');
    });

    it('should handle field names with special characters', () => {
      const condition: Condition = { field: '@timestamp', exists: true };
      expect(prettyPrint(condition)).toBe('NOT(@timestamp IS NULL)');
    });
  });
});
