/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { extractEsqlParamMatches, extractEsqlParams } from './extract_esql_params';

describe('ES|QL parameter extraction', () => {
  describe('extractEsqlParamMatches', () => {
    it('should return an empty array for an empty string', () => {
      expect(extractEsqlParamMatches('')).toEqual([]);
    });

    it('should return an empty array when no params are present', () => {
      expect(extractEsqlParamMatches('FROM my_index')).toEqual([]);
    });

    it('should extract a single parameter', () => {
      const matches = extractEsqlParamMatches('FROM my_index | WHERE field == ?param1');
      expect(matches).toHaveLength(1);
      expect(matches[0][0]).toBe('?param1');
      expect(matches[0][1]).toBe('param1');
    });

    it('should extract multiple different parameters', () => {
      const matches = extractEsqlParamMatches(
        'FROM my_index | WHERE field1 == ?param1 AND field2 == ?param2'
      );
      expect(matches).toHaveLength(2);
      expect(matches[0][1]).toBe('param1');
      expect(matches[1][1]).toBe('param2');
    });

    it('should extract multiple occurrences of the same parameter', () => {
      const matches = extractEsqlParamMatches(
        'FROM my_index | WHERE field1 == ?param1 AND field2 == ?param1'
      );
      expect(matches).toHaveLength(2);
      expect(matches[0][1]).toBe('param1');
      expect(matches[1][1]).toBe('param1');
    });

    it('should extract a parameter at the beginning of the string', () => {
      const matches = extractEsqlParamMatches('?param1 | FROM my_index');
      expect(matches).toHaveLength(1);
      expect(matches[0][1]).toBe('param1');
    });

    it('should not extract a parameter if it is not preceded by whitespace', () => {
      expect(extractEsqlParamMatches('FROM my_index | WHERE field = foo?param1')).toEqual([]);
    });

    it('should handle multiline queries', () => {
      const esql = `
        FROM my_index
        | WHERE field1 == ?param1
        | AND field2 == ?param2
      `;
      const matches = extractEsqlParamMatches(esql);
      expect(matches).toHaveLength(2);
      expect(matches[0][1]).toBe('param1');
      expect(matches[1][1]).toBe('param2');
    });
  });

  describe('extractEsqlParams', () => {
    it('should return an empty array for an empty string', () => {
      expect(extractEsqlParams('')).toEqual([]);
    });

    it('should return an empty array when no params are present', () => {
      expect(extractEsqlParams('FROM my_index')).toEqual([]);
    });

    it('should extract a single parameter', () => {
      expect(extractEsqlParams('FROM my_index | WHERE field == ?param1')).toEqual(['param1']);
    });

    it('should extract multiple different parameters', () => {
      expect(
        extractEsqlParams('FROM my_index | WHERE field1 == ?param1 AND field2 == ?param2')
      ).toEqual(['param1', 'param2']);
    });

    it('should return unique parameters when duplicates are present', () => {
      expect(
        extractEsqlParams('FROM my_index | WHERE field1 == ?param1 AND field2 == ?param1')
      ).toEqual(['param1']);
    });

    it('should extract a parameter at the beginning of the string', () => {
      expect(extractEsqlParams('?param1 | FROM my_index')).toEqual(['param1']);
    });

    it('should not extract a parameter if it is not preceded by whitespace', () => {
      expect(extractEsqlParams('FROM my_index | WHERE field = foo?param1')).toEqual([]);
    });

    it('should handle multiline queries', () => {
      const esql = `
        FROM my_index
        | WHERE field1 == ?param1
        | AND field2 == ?param2 AND field3 == ?param1
      `;
      expect(extractEsqlParams(esql)).toEqual(['param1', 'param2']);
    });
  });
});
