/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createGrokProcessor } from './processors';

describe('processors utilities', () => {
  describe('createGrokProcessor', () => {
    it('should escape special characters in grok patterns while preserving grok syntax', () => {
      const patterns = [
        '[%{TIMESTAMP_ISO8601:timestamp}] %{GREEDYDATA:message}',
        'message with (parentheses) and %{WORD:action}',
        'message with {braces} and %{DATA:field}',
        'message with * asterisk',
        'message with + plus',
        'message with ? question',
        'message with . dot',
      ];

      const processor = createGrokProcessor(patterns);

      expect(processor).toHaveProperty('grok');
      expect(processor.grok).toHaveProperty('patterns');
      expect(processor.grok).toHaveProperty('field', 'message');
      expect(processor.grok).toHaveProperty('tag', 'grok_header_pattern');

      const grokPatterns = processor.grok.patterns as string[];

      // Verify literal brackets are escaped but grok patterns are preserved
      expect(grokPatterns[0]).toContain('\\[%{TIMESTAMP_ISO8601:timestamp}\\]');
      expect(grokPatterns[0]).toContain('%{GREEDYDATA:message}');

      // Verify parentheses are escaped but grok patterns are preserved
      expect(grokPatterns[1]).toContain('\\(parentheses\\)');
      expect(grokPatterns[1]).toContain('%{WORD:action}');

      // Verify braces are escaped but grok patterns are preserved
      expect(grokPatterns[2]).toContain('\\{braces\\}');
      expect(grokPatterns[2]).toContain('%{DATA:field}');

      // Verify other special characters are escaped
      expect(grokPatterns[3]).toContain('\\*');
      expect(grokPatterns[4]).toContain('\\+');
      expect(grokPatterns[5]).toContain('\\?');
      expect(grokPatterns[6]).toContain('\\.');
    });

    it('should handle complex real-world syslog patterns', () => {
      const patterns = [
        '[18/Feb/2025:22:39:16 +0000] CONNECT conn=20597223 from=%{IP:source_ip}:%{INT:source_port} to=%{IP:dest_ip}:%{INT:dest_port} protocol=%{WORD:protocol}',
        '<%{POSINT:priority}>%{NUMBER:version} %{TIMESTAMP_ISO8601:timestamp} %{HOSTNAME:hostname} %{PROG:program}[%{POSINT:pid}]: %{GREEDYDATA:message}',
      ];

      const processor = createGrokProcessor(patterns);
      const grokPatterns = processor.grok.patterns as string[];

      // First pattern: brackets should be escaped but grok patterns preserved
      expect(grokPatterns[0]).toContain('\\[18/Feb/2025:22:39:16 \\+0000\\]');
      expect(grokPatterns[0]).toContain('%{IP:source_ip}');
      expect(grokPatterns[0]).toContain('%{INT:source_port}');

      // Second pattern: < and > should be escaped but grok patterns preserved
      expect(grokPatterns[1]).toContain('\\<%{POSINT:priority}\\>');
      expect(grokPatterns[1]).toContain('%{TIMESTAMP_ISO8601:timestamp}');
      expect(grokPatterns[1]).toContain('\\[%{POSINT:pid}\\]');
    });

    it('should handle patterns with no special characters', () => {
      const patterns = ['simple message with %{GREEDYDATA:content}'];

      const processor = createGrokProcessor(patterns);
      const grokPatterns = processor.grok.patterns as string[];

      // Should preserve the pattern as-is
      expect(grokPatterns[0]).toBe('simple message with %{GREEDYDATA:content}');
    });

    it('should handle empty patterns array', () => {
      const processor = createGrokProcessor([]);

      expect(processor).toHaveProperty('grok');
      expect(processor.grok.patterns).toEqual([]);
    });

    it('should handle patterns with only grok syntax', () => {
      const patterns = ['%{TIMESTAMP_ISO8601:timestamp} %{HOSTNAME:host} %{GREEDYDATA:message}'];

      const processor = createGrokProcessor(patterns);
      const grokPatterns = processor.grok.patterns as string[];

      // Should preserve grok patterns exactly
      expect(grokPatterns[0]).toBe(
        '%{TIMESTAMP_ISO8601:timestamp} %{HOSTNAME:host} %{GREEDYDATA:message}'
      );
    });

    it('should handle mixed literal and grok pattern braces correctly', () => {
      const patterns = [
        'literal {brace} with %{WORD:field} and more {text}',
        'nested patterns %{DATA:field1} within %{GREEDYDATA:field2}',
      ];

      const processor = createGrokProcessor(patterns);
      const grokPatterns = processor.grok.patterns as string[];

      // Literal braces should be escaped, grok patterns should not
      expect(grokPatterns[0]).toBe('literal \\{brace\\} with %{WORD:field} and more \\{text\\}');
      expect(grokPatterns[1]).toBe('nested patterns %{DATA:field1} within %{GREEDYDATA:field2}');
    });

    it('should handle all common special characters', () => {
      const patterns = [
        'chars: [brackets] (parens) {braces} *asterisk +plus ?question .dot ^caret $dollar |pipe',
      ];

      const processor = createGrokProcessor(patterns);
      const grokPatterns = processor.grok.patterns as string[];

      expect(grokPatterns[0]).toBe(
        'chars: \\[brackets\\] \\(parens\\) \\{braces\\} \\*asterisk \\+plus \\?question \\.dot \\^caret \\$dollar \\|pipe'
      );
    });
  });
});
