/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { extractGrokPatternDangerouslySlow } from '@kbn/grok-heuristics';
import { extractDissectPattern, serializeAST } from '@kbn/dissect-heuristics';

describe('Pattern generation integration', () => {
  describe('Grok pattern generation', () => {
    it('should generate a pattern for simple log messages', () => {
      const messages = [
        '2023-05-30 12:34:56 INFO  Service started',
        '2023-05-30 12:35:02 WARN  High memory usage',
        '2023-05-30 12:35:10 ERROR Service crashed',
      ];

      const nodes = extractGrokPatternDangerouslySlow(messages);

      // Convert nodes to pattern string
      const pattern = nodes.reduce((acc, node) => {
        if ('id' in node) {
          return acc + `%{${node.component}:${node.id}}`;
        } else {
          return acc + node.pattern;
        }
      }, '');

      expect(pattern).toBeTruthy();
      expect(pattern).toContain('TIMESTAMP');
      expect(pattern).toContain('LOGLEVEL');
    });

    it('should handle edge cases gracefully', () => {
      const messages: string[] = [];
      const nodes = extractGrokPatternDangerouslySlow(messages);
      expect(nodes).toEqual([]);
    });
  });

  describe('Dissect pattern generation', () => {
    it('should generate a pattern for simple log messages', () => {
      const messages = [
        '192.168.1.1 GET /api/users 200 1234',
        '10.0.0.254 POST /api/login 401 567',
        '172.16.0.1 GET /api/data 200 8901',
      ];

      const result = extractDissectPattern(messages);
      const pattern = serializeAST(result.ast);

      expect(pattern).toBeTruthy();
      expect(result.fields.length).toBeGreaterThan(0);
    });

    it('should handle edge cases gracefully', () => {
      const messages: string[] = [];
      const result = extractDissectPattern(messages);
      const pattern = serializeAST(result.ast);

      expect(pattern).toBe('');
      expect(result.fields).toEqual([]);
    });

    it('should detect fields correctly', () => {
      const messages = ['field1 field2 field3', 'value1 value2 value3', 'data1 data2 data3'];

      const result = extractDissectPattern(messages);
      const pattern = serializeAST(result.ast);

      expect(pattern).toBeTruthy();
      expect(pattern).toContain('%{');
      expect(pattern).toContain('}');
      expect(result.fields.length).toBe(3);
    });
  });

  describe('Pattern conversion', () => {
    it('should convert Grok nodes with named fields', () => {
      const nodes = [
        { id: 'timestamp', component: 'TIMESTAMP_ISO8601', values: [] },
        { pattern: '\\s' },
        { id: 'level', component: 'LOGLEVEL', values: [] },
      ];

      const pattern = nodes.reduce((acc, node) => {
        if ('id' in node) {
          return acc + `%{${node.component}:${node.id}}`;
        } else {
          return acc + node.pattern;
        }
      }, '');

      expect(pattern).toBe('%{TIMESTAMP_ISO8601:timestamp}\\s%{LOGLEVEL:level}');
    });
  });
});
