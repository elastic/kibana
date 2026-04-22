/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { conditionToOttl } from './condition_to_ottl';
import type { Condition } from '../../../types/conditions';

describe('conditionToOttl', () => {
  describe('binary operators', () => {
    it('renders eq', () => {
      const cond: Condition = { field: 'status', eq: 'active' };
      expect(conditionToOttl(cond)).toBe('log.attributes["status"] == "active"');
    });

    it('renders neq', () => {
      const cond: Condition = { field: 'status', neq: 'inactive' };
      expect(conditionToOttl(cond)).toBe('log.attributes["status"] != "inactive"');
    });

    it('renders gt / gte / lt / lte against numbers', () => {
      expect(conditionToOttl({ field: 'n', gt: 1 })).toBe('log.attributes["n"] > 1');
      expect(conditionToOttl({ field: 'n', gte: 2 })).toBe('log.attributes["n"] >= 2');
      expect(conditionToOttl({ field: 'n', lt: 3 })).toBe('log.attributes["n"] < 3');
      expect(conditionToOttl({ field: 'n', lte: 4 })).toBe('log.attributes["n"] <= 4');
    });

    it('renders booleans and numbers as unquoted literals', () => {
      expect(conditionToOttl({ field: 'enabled', eq: true })).toBe(
        'log.attributes["enabled"] == true'
      );
      expect(conditionToOttl({ field: 'count', eq: 42 })).toBe('log.attributes["count"] == 42');
    });
  });

  describe('unary operators', () => {
    it('renders exists: true as != nil', () => {
      expect(conditionToOttl({ field: 'user.name', exists: true })).toBe(
        'log.attributes["user.name"] != nil'
      );
    });

    it('renders exists: false as == nil', () => {
      expect(conditionToOttl({ field: 'user.name', exists: false })).toBe(
        'log.attributes["user.name"] == nil'
      );
    });
  });

  describe('string operators', () => {
    it('renders contains using IsMatch with escaped regex', () => {
      // OTTL string literals use Go-style escapes; a regex `\.` needs `\\.` in the literal
      // so the OTTL parser yields the 2-char sequence `\.` for the regex engine.
      expect(conditionToOttl({ field: 'msg', contains: 'a.b' })).toBe(
        'IsMatch(log.attributes["msg"], "a\\\\.b")'
      );
    });

    it('renders startsWith via HasPrefix with String() wrapping', () => {
      expect(conditionToOttl({ field: 'msg', startsWith: 'hello' })).toBe(
        'HasPrefix(String(log.attributes["msg"]), "hello")'
      );
    });

    it('renders endsWith via HasSuffix with String() wrapping', () => {
      expect(conditionToOttl({ field: 'msg', endsWith: 'world' })).toBe(
        'HasSuffix(String(log.attributes["msg"]), "world")'
      );
    });
  });

  describe('range', () => {
    it('renders a single bound', () => {
      expect(conditionToOttl({ field: 'age', range: { gt: 18 } })).toBe(
        'log.attributes["age"] > 18'
      );
    });

    it('renders multiple bounds joined with and', () => {
      expect(conditionToOttl({ field: 'age', range: { gte: 18, lt: 65 } })).toBe(
        '(log.attributes["age"] >= 18) and (log.attributes["age"] < 65)'
      );
    });
  });

  describe('includes (lossy)', () => {
    it('renders includes via String() + IsMatch on JSON-encoded value', () => {
      expect(conditionToOttl({ field: 'tags', includes: 'error' })).toBe(
        'IsMatch(String(log.attributes["tags"]), "\\"error\\"")'
      );
    });
  });

  describe('compound operators', () => {
    it('renders and', () => {
      expect(
        conditionToOttl({
          and: [
            { field: 'a', eq: 1 },
            { field: 'b', eq: 2 },
          ],
        })
      ).toBe('(log.attributes["a"] == 1) and (log.attributes["b"] == 2)');
    });

    it('renders or', () => {
      expect(
        conditionToOttl({
          or: [
            { field: 'a', eq: 1 },
            { field: 'b', eq: 2 },
          ],
        })
      ).toBe('(log.attributes["a"] == 1) or (log.attributes["b"] == 2)');
    });

    it('renders not', () => {
      expect(conditionToOttl({ not: { field: 'a', eq: 1 } })).toBe(
        'not (log.attributes["a"] == 1)'
      );
    });

    it('renders always / never', () => {
      expect(conditionToOttl({ always: {} })).toBe('true');
      expect(conditionToOttl({ never: {} })).toBe('false');
    });

    it('nests compounds without losing precedence', () => {
      expect(
        conditionToOttl({
          and: [
            { field: 'a', eq: 1 },
            {
              or: [
                { field: 'b', eq: 2 },
                { field: 'c', eq: 3 },
              ],
            },
          ],
        })
      ).toBe(
        '(log.attributes["a"] == 1) and ((log.attributes["b"] == 2) or (log.attributes["c"] == 3))'
      );
    });
  });
});
