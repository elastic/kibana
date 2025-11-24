/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  normalizeFieldName,
  normalizeLogLevel,
  detectTimestampFormat,
  compareFieldNames,
  isValidTimestamp,
  isValidLogLevel,
  extractGrokFieldNames,
  extractDissectFieldNames,
  calculateFieldSetSimilarity,
  validateGrokPattern,
  validateDissectPattern,
} from './pattern_extraction_helpers';

describe('pattern_extraction_helpers', () => {
  describe('normalizeFieldName', () => {
    it('should remove common prefixes', () => {
      expect(normalizeFieldName('log.level')).toBe('level');
      expect(normalizeFieldName('event.timestamp')).toBe('timestamp');
      expect(normalizeFieldName('attributes.severity')).toBe('level');
      expect(normalizeFieldName('message.msg')).toBe('message');
    });

    it('should remove common suffixes', () => {
      expect(normalizeFieldName('level_field')).toBe('level');
      expect(normalizeFieldName('timestamp_value')).toBe('timestamp');
      expect(normalizeFieldName('message_text')).toBe('message');
    });

    it('should normalize common variations', () => {
      expect(normalizeFieldName('lvl')).toBe('level');
      expect(normalizeFieldName('severity')).toBe('level');
      expect(normalizeFieldName('ts')).toBe('timestamp');
      expect(normalizeFieldName('time')).toBe('timestamp');
      expect(normalizeFieldName('datetime')).toBe('timestamp');
      expect(normalizeFieldName('msg')).toBe('message');
    });

    it('should handle combined transformations', () => {
      expect(normalizeFieldName('log.lvl')).toBe('level');
      expect(normalizeFieldName('event.ts_field')).toBe('timestamp');
      expect(normalizeFieldName('attributes.severity_text')).toBe('level');
    });

    it('should convert to lowercase', () => {
      expect(normalizeFieldName('LEVEL')).toBe('level');
      expect(normalizeFieldName('TimeStamp')).toBe('timestamp');
    });

    it('should preserve unknown field names after suffix removal', () => {
      expect(normalizeFieldName('custom_field')).toBe('custom');
      expect(normalizeFieldName('user')).toBe('user');
    });
  });

  describe('normalizeLogLevel', () => {
    it('should normalize TRACE level variations', () => {
      expect(normalizeLogLevel('TRACE')).toBe('TRACE');
      expect(normalizeLogLevel('FINEST')).toBe('TRACE');
      expect(normalizeLogLevel('ALL')).toBe('TRACE');
      expect(normalizeLogLevel('trace')).toBe('TRACE');
    });

    it('should normalize DEBUG level variations', () => {
      expect(normalizeLogLevel('DEBUG')).toBe('DEBUG');
      expect(normalizeLogLevel('FINE')).toBe('DEBUG');
      expect(normalizeLogLevel('FINER')).toBe('DEBUG');
      expect(normalizeLogLevel('debug')).toBe('DEBUG');
    });

    it('should normalize INFO level variations', () => {
      expect(normalizeLogLevel('INFO')).toBe('INFO');
      expect(normalizeLogLevel('INFORMATION')).toBe('INFO');
      expect(normalizeLogLevel('INFORMATIONAL')).toBe('INFO');
      expect(normalizeLogLevel('info')).toBe('INFO');
    });

    it('should normalize WARN level variations', () => {
      expect(normalizeLogLevel('WARN')).toBe('WARN');
      expect(normalizeLogLevel('WARNING')).toBe('WARN');
      expect(normalizeLogLevel('warn')).toBe('WARN');
    });

    it('should normalize ERROR level variations', () => {
      expect(normalizeLogLevel('ERROR')).toBe('ERROR');
      expect(normalizeLogLevel('ERR')).toBe('ERROR');
      expect(normalizeLogLevel('SEVERE')).toBe('ERROR');
      expect(normalizeLogLevel('error')).toBe('ERROR');
    });

    it('should normalize FATAL level variations', () => {
      expect(normalizeLogLevel('FATAL')).toBe('FATAL');
      expect(normalizeLogLevel('CRITICAL')).toBe('FATAL');
      expect(normalizeLogLevel('EMERGENCY')).toBe('FATAL');
      expect(normalizeLogLevel('EMERG')).toBe('FATAL');
      expect(normalizeLogLevel('ALERT')).toBe('FATAL');
      expect(normalizeLogLevel('fatal')).toBe('FATAL');
    });

    it('should handle numeric log levels', () => {
      expect(normalizeLogLevel('0')).toBe('TRACE');
      expect(normalizeLogLevel('1')).toBe('DEBUG');
      expect(normalizeLogLevel('2')).toBe('INFO');
      expect(normalizeLogLevel('3')).toBe('WARN');
      expect(normalizeLogLevel('4')).toBe('ERROR');
      expect(normalizeLogLevel('5')).toBe('FATAL');
      expect(normalizeLogLevel('6')).toBe('FATAL');
    });

    it('should return null for unrecognized levels', () => {
      expect(normalizeLogLevel('UNKNOWN')).toBeNull();
      expect(normalizeLogLevel('custom')).toBeNull();
      expect(normalizeLogLevel('')).toBeNull();
    });

    it('should trim whitespace', () => {
      expect(normalizeLogLevel('  INFO  ')).toBe('INFO');
      expect(normalizeLogLevel(' debug ')).toBe('DEBUG');
    });
  });

  describe('detectTimestampFormat', () => {
    it('should detect ISO8601 format', () => {
      expect(detectTimestampFormat('2024-01-15T10:30:45Z')).toBe('ISO8601');
      expect(detectTimestampFormat('2024-01-15T10:30:45.123Z')).toBe('ISO8601');
      expect(detectTimestampFormat('2024-01-15T10:30:45+00:00')).toBe('ISO8601');
    });

    it('should detect Apache common log format', () => {
      expect(detectTimestampFormat('15/Jan/2024:10:30:45 +0000')).toBe('APACHE_COMMON');
    });

    it('should detect Unix timestamp', () => {
      expect(detectTimestampFormat('1705314645')).toBe('UNIX_TIMESTAMP');
      expect(detectTimestampFormat('1705314645.123')).toBe('UNIX_TIMESTAMP');
    });

    it('should detect Unix timestamp in milliseconds', () => {
      expect(detectTimestampFormat('1705314645123')).toBe('UNIX_TIMESTAMP_MS');
    });

    it('should detect syslog format', () => {
      expect(detectTimestampFormat('Jan 15 10:30:45')).toBe('SYSLOG');
      expect(detectTimestampFormat('Dec  5 08:15:30')).toBe('SYSLOG');
    });

    it('should detect date-time format', () => {
      expect(detectTimestampFormat('2024-01-15 10:30:45')).toBe('DATE_TIME');
      expect(detectTimestampFormat('2024-01-15 10:30:45.123')).toBe('DATE_TIME');
    });

    it('should detect time-only format', () => {
      expect(detectTimestampFormat('10:30:45')).toBe('TIME_ONLY');
      expect(detectTimestampFormat('10:30:45.123')).toBe('TIME_ONLY');
    });

    it('should return OTHER_VALID for parseable dates not matching known formats', () => {
      expect(detectTimestampFormat('January 15, 2024')).toBe('OTHER_VALID');
      expect(detectTimestampFormat('01/15/2024')).toBe('OTHER_VALID');
    });

    it('should return null for non-timestamp values', () => {
      expect(detectTimestampFormat('not a timestamp')).toBeNull();
      expect(detectTimestampFormat('abc123')).toBeNull();
      expect(detectTimestampFormat('')).toBeNull();
    });

    it('should trim whitespace', () => {
      expect(detectTimestampFormat('  2024-01-15T10:30:45Z  ')).toBe('ISO8601');
    });
  });

  describe('compareFieldNames', () => {
    it('should return 1.0 for exact matches', () => {
      expect(compareFieldNames('timestamp', 'timestamp')).toBe(1.0);
      expect(compareFieldNames('log.level', 'log.level')).toBe(1.0);
    });

    it('should return 0.9 for normalized matches', () => {
      expect(compareFieldNames('log.level', 'level')).toBe(0.9);
      expect(compareFieldNames('timestamp', 'ts')).toBe(0.9);
      expect(compareFieldNames('severity', 'level')).toBe(0.9);
    });

    it('should return 0.7 for partial matches', () => {
      expect(compareFieldNames('timestamp', 'timestamp_ms')).toBe(0.7);
      expect(compareFieldNames('user_name', 'user')).toBe(0.7);
    });

    it('should return scores based on common substring for other cases', () => {
      const score = compareFieldNames('user_name', 'username');
      expect(score).toBeGreaterThan(0.0);
      expect(score).toBeLessThan(0.7);
    });

    it('should return low score for completely different names', () => {
      const score1 = compareFieldNames('timestamp', 'user');
      const score2 = compareFieldNames('abc', 'xyz');
      expect(score1).toBeLessThan(0.2);
      expect(score2).toBeLessThan(0.2);
    });
  });

  describe('isValidTimestamp', () => {
    it('should return true for valid timestamps', () => {
      expect(isValidTimestamp('2024-01-15T10:30:45Z')).toBe(true);
      expect(isValidTimestamp('15/Jan/2024:10:30:45 +0000')).toBe(true);
      expect(isValidTimestamp('Jan 15 10:30:45')).toBe(true);
      expect(isValidTimestamp('1705314645')).toBe(true);
    });

    it('should return false for invalid timestamps', () => {
      expect(isValidTimestamp('not a timestamp')).toBe(false);
      expect(isValidTimestamp('abc123')).toBe(false);
      expect(isValidTimestamp('')).toBe(false);
    });

    it('should handle non-string values', () => {
      expect(isValidTimestamp(null as any)).toBe(false);
      expect(isValidTimestamp(undefined as any)).toBe(false);
      expect(isValidTimestamp(123 as any)).toBe(false);
    });
  });

  describe('isValidLogLevel', () => {
    it('should return true for valid log levels', () => {
      expect(isValidLogLevel('INFO')).toBe(true);
      expect(isValidLogLevel('DEBUG')).toBe(true);
      expect(isValidLogLevel('ERROR')).toBe(true);
      expect(isValidLogLevel('WARN')).toBe(true);
      expect(isValidLogLevel('0')).toBe(true);
      expect(isValidLogLevel('4')).toBe(true);
    });

    it('should return false for invalid log levels', () => {
      expect(isValidLogLevel('INVALID')).toBe(false);
      expect(isValidLogLevel('custom')).toBe(false);
      expect(isValidLogLevel('')).toBe(false);
    });

    it('should handle non-string values', () => {
      expect(isValidLogLevel(null as any)).toBe(false);
      expect(isValidLogLevel(undefined as any)).toBe(false);
      expect(isValidLogLevel(123 as any)).toBe(false);
    });
  });

  describe('extractGrokFieldNames', () => {
    it('should extract field names from Grok pattern', () => {
      const pattern = '%{TIMESTAMP_ISO8601:timestamp} %{LOGLEVEL:level} %{GREEDYDATA:message}';
      const fields = extractGrokFieldNames(pattern);
      expect(fields).toEqual(['timestamp', 'level', 'message']);
    });

    it('should handle patterns with multiple types', () => {
      const pattern = '%{IP:client_ip} %{USER:user} %{NUMBER:response_time}';
      const fields = extractGrokFieldNames(pattern);
      expect(fields).toEqual(['client_ip', 'user', 'response_time']);
    });

    it('should return empty array for pattern without fields', () => {
      const pattern = 'static text without fields';
      const fields = extractGrokFieldNames(pattern);
      expect(fields).toEqual([]);
    });

    it('should handle empty pattern', () => {
      expect(extractGrokFieldNames('')).toEqual([]);
    });

    it('should extract all fields even with duplicates', () => {
      const pattern = '%{DATA:field1} %{DATA:field2} %{DATA:field1}';
      const fields = extractGrokFieldNames(pattern);
      expect(fields).toEqual(['field1', 'field2', 'field1']);
    });
  });

  describe('extractDissectFieldNames', () => {
    it('should extract field names from Dissect pattern', () => {
      const pattern = '%{timestamp} %{level} %{message}';
      const fields = extractDissectFieldNames(pattern);
      expect(fields).toEqual(['timestamp', 'level', 'message']);
    });

    it('should handle patterns with modifiers', () => {
      const pattern = '%{timestamp} %{level->} %{+message} %{message->}';
      const fields = extractDissectFieldNames(pattern);
      expect(fields).toEqual(['timestamp', 'level', '+message', 'message']);
    });

    it('should return empty array for pattern without fields', () => {
      const pattern = 'static text without fields';
      const fields = extractDissectFieldNames(pattern);
      expect(fields).toEqual([]);
    });

    it('should handle empty pattern', () => {
      expect(extractDissectFieldNames('')).toEqual([]);
    });
  });

  describe('calculateFieldSetSimilarity', () => {
    it('should return 1.0 for identical field sets', () => {
      const expected = ['timestamp', 'level', 'message'];
      const actual = ['timestamp', 'level', 'message'];
      expect(calculateFieldSetSimilarity(expected, actual)).toBe(1.0);
    });

    it('should return 1.0 for empty sets', () => {
      expect(calculateFieldSetSimilarity([], [])).toBe(1.0);
    });

    it('should return 0.0 when one set is empty', () => {
      expect(calculateFieldSetSimilarity(['timestamp'], [])).toBe(0.0);
      expect(calculateFieldSetSimilarity([], ['timestamp'])).toBe(0.0);
    });

    it('should handle normalized field name matches', () => {
      const expected = ['timestamp', 'level', 'message'];
      const actual = ['ts', 'log.level', 'msg'];
      const similarity = calculateFieldSetSimilarity(expected, actual);
      expect(similarity).toBeGreaterThan(0.8); // Should get high similarity due to normalization
    });

    it('should penalize over-extraction', () => {
      const expected = ['timestamp', 'level'];
      const actual = ['timestamp', 'level', 'extra1', 'extra2', 'extra3'];
      const similarity = calculateFieldSetSimilarity(expected, actual);
      expect(similarity).toBeLessThan(1.0);
      expect(similarity).toBeGreaterThan(0.6); // Should still be decent due to correct fields
    });

    it('should handle partial matches', () => {
      const expected = ['timestamp', 'level', 'message'];
      const actual = ['timestamp', 'level'];
      const similarity = calculateFieldSetSimilarity(expected, actual);
      expect(similarity).toBeGreaterThanOrEqual(0.6);
      expect(similarity).toBeLessThan(1.0);
    });

    it('should return low score for completely different field sets', () => {
      const expected = ['timestamp', 'level', 'message'];
      const actual = ['user', 'host', 'pid'];
      const similarity = calculateFieldSetSimilarity(expected, actual);
      expect(similarity).toBeLessThan(0.3);
    });
  });

  describe('validateGrokPattern', () => {
    it('should validate correct Grok pattern', () => {
      const pattern = '%{TIMESTAMP_ISO8601:timestamp} %{LOGLEVEL:level} %{GREEDYDATA:message}';
      const result = validateGrokPattern(pattern);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.fieldCount).toBe(3);
      expect(result.fieldNames).toEqual(['timestamp', 'level', 'message']);
    });

    it('should detect empty pattern', () => {
      const result = validateGrokPattern('');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Pattern is empty');
    });

    it('should detect unbalanced braces', () => {
      const pattern = '%{TIMESTAMP_ISO8601:timestamp %{LOGLEVEL:level}';
      const result = validateGrokPattern(pattern);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('Unbalanced braces'))).toBe(true);
    });

    it('should warn about patterns with no fields', () => {
      const pattern = 'static text only';
      const result = validateGrokPattern(pattern);
      expect(result.warnings).toContain('No fields defined in pattern');
      expect(result.fieldCount).toBe(0);
    });

    it('should warn about duplicate field names', () => {
      const pattern = '%{DATA:field1} %{DATA:field2} %{DATA:field1}';
      const result = validateGrokPattern(pattern);
      expect(result.warnings).toContain('Duplicate field names detected');
    });

    it('should handle patterns with only static text', () => {
      const pattern = 'Some static log prefix';
      const result = validateGrokPattern(pattern);
      expect(result.isValid).toBe(true);
      expect(result.fieldCount).toBe(0);
      expect(result.warnings).toContain('No fields defined in pattern');
    });
  });

  describe('validateDissectPattern', () => {
    it('should validate correct Dissect pattern', () => {
      const pattern = '%{timestamp} %{level} %{message}';
      const result = validateDissectPattern(pattern);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.fieldCount).toBe(3);
      expect(result.fieldNames).toEqual(['timestamp', 'level', 'message']);
    });

    it('should detect empty pattern', () => {
      const result = validateDissectPattern('');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Pattern is empty');
    });

    it('should detect unbalanced braces', () => {
      const pattern = '%{timestamp %{level} %{message}';
      const result = validateDissectPattern(pattern);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('Unbalanced braces'))).toBe(true);
    });

    it('should warn about patterns with no fields', () => {
      const pattern = 'static text only';
      const result = validateDissectPattern(pattern);
      expect(result.warnings).toContain('No fields defined in pattern');
      expect(result.fieldCount).toBe(0);
    });

    it('should handle patterns with modifiers', () => {
      const pattern = '%{timestamp} %{level->} %{message}';
      const result = validateDissectPattern(pattern);
      expect(result.isValid).toBe(true);
      expect(result.fieldCount).toBe(3);
    });

    it('should warn about duplicate field names', () => {
      const pattern = '%{field} %{field} %{other}';
      const result = validateDissectPattern(pattern);
      expect(result.warnings).toContain('Duplicate field names detected');
    });
  });
});
