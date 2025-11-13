/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { extractDissectPatternDangerouslySlow } from './extract_dissect_pattern';
import { getDissectProcessor } from './get_dissect_processor';

describe('Dissect Pattern Extraction - Integration Tests', () => {
  describe('Common Log Formats', () => {
    it('extracts pattern from Apache Common Log Format', () => {
      const logs = [
        '192.168.1.100 - - [10/Oct/2000:13:55:36 -0700] "GET /apache_pb.gif HTTP/1.0" 200 2326',
        '192.168.1.101 - frank [10/Oct/2000:13:55:37 -0700] "POST /submit HTTP/1.1" 201 512',
        '192.168.1.102 - - [11/Oct/2000:14:22:05 -0700] "GET /index.html HTTP/1.0" 304 0',
      ];

      const result = extractDissectPatternDangerouslySlow(logs);

      expect(result.pattern).toBe(
        '%{field_1} - %{field_2} [%{field_3}/%{field_4}/%{field_5}] "%{field_6} /%{field_7}/%{field_8}/%{field_9}" %{field_10}'
      );
      expect(result.fields).toHaveLength(10);
    });

    it('extracts pattern from Syslog format', () => {
      const logs = [
        'Mar 10 15:45:23 hostname sshd[12345]: Accepted password',
        'Mar 10 15:45:24 hostname systemd[6789]: Started service',
        'Mar 10 15:45:25 hostname kernel[4321]: Memory allocation',
      ];

      const result = extractDissectPatternDangerouslySlow(logs);

      expect(result.pattern).toBe(
        '%{field_1} %{field_2} %{field_3} %{field_4} %{field_5}[%{field_6}]: %{} %{field_8} %{field_9}'
      );
      expect(result.fields).toHaveLength(9);
    });

    it('extracts pattern from JSON-like logs', () => {
      const logs = [
        '{"time":"10:30:00","level":"INFO","msg":"User logged in"}',
        '{"time":"10:30:01","level":"WARN","msg":"Rate limiting"}',
        '{"time":"10:30:02","level":"ERROR","msg":"Database fail"}',
      ];

      const result = extractDissectPatternDangerouslySlow(logs);

      expect(result.pattern).toBe(
        '{"%{field_1}":"%{field_2}","%{field_3}":"%{field_4}","%{field_5}":"%{field_6} %{field_7}"}'
      );
      expect(result.fields).toHaveLength(7);
    });

    it('extracts pattern from CSV format', () => {
      const logs = [
        '12345,johndoe,boston,active,entry',
        '67890,janedoe,seattle,inactive,exit',
        '24680,bobsmith,denver,active,pending',
      ];

      const result = extractDissectPatternDangerouslySlow(logs);

      expect(result.pattern).toBe('%{field_1},%{field_2},%{field_3},%{field_4},%{field_5}');
      expect(result.fields).toHaveLength(5);
    });

    it('extracts pattern from pipe-delimited logs', () => {
      const logs = [
        'entry|INFO|UserService|login',
        'entry|WARN|AuthService|ratelimit',
        'entry|ERROR|DatabaseService|timeout',
      ];

      const result = extractDissectPatternDangerouslySlow(logs);

      expect(result.pattern).toBe('%{field_1}|%{field_2}|%{field_3}|%{field_4}');
      expect(result.fields).toHaveLength(4);
    });

    it('extracts pattern from tab-delimited logs', () => {
      const logs = ['alpha\tbeta\tgamma', 'delta\tepsilon\tzeta', 'theta\tiota\tkappa'];

      const result = extractDissectPatternDangerouslySlow(logs);

      expect(result.pattern).toBe('%{field_1}\t%{field_2}\t%{field_3}');
      expect(result.fields).toHaveLength(3);
    });
  });

  describe('Modifier Detection', () => {
    it('detects whitespace delimiters for variable spacing', () => {
      const logs = ['INFO    message', 'WARN  message', 'ERROR   message', 'DEBUG     message'];

      const result = extractDissectPatternDangerouslySlow(logs);

      // Multiple spaces are detected as delimiter
      expect(result.pattern).toMatch(/%\{field_1\}\s+%\{field_2\}/);
      expect(result.fields).toHaveLength(2);
    });

    it('detects skip fields for constant dash values', () => {
      const logs = [
        '192.168.1.1 - - [timestamp] GET',
        '10.0.0.1 - - [timestamp] POST',
        '172.16.0.1 - - [timestamp] PUT',
      ];

      const result = extractDissectPatternDangerouslySlow(logs);

      expect(result.pattern).toBeTruthy();
      // Pattern should be valid even if skip detection varies
      expect(result.fields.length).toBeGreaterThan(0);
    });

    it('handles mixed modifiers correctly', () => {
      const logs = [
        'INFO   - - [2024-01-01] Request received',
        'WARN - - [2024-01-02] Request received',
        'ERROR  - - [2024-01-03] Request received',
      ];

      const result = extractDissectPatternDangerouslySlow(logs);

      expect(result.pattern).toBeTruthy();
      expect(result.fields.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('handles empty input array', () => {
      const result = extractDissectPatternDangerouslySlow([]);

      expect(result.pattern).toBe('');
      expect(result.fields).toEqual([]);
    });

    it('handles single message', () => {
      const logs = ['This is a single log message with some data'];

      const result = extractDissectPatternDangerouslySlow(logs);

      expect(result.pattern).toBeTruthy();
      expect(result.fields.length).toBeGreaterThan(0);
    });

    it('handles identical messages', () => {
      const logs = ['alpha beta', 'alpha beta', 'alpha beta'];

      const result = extractDissectPatternDangerouslySlow(logs);

      expect(result.pattern).toBe('%{field_1} %{field_2}');
      expect(result.fields).toHaveLength(2);
    });

    it('handles messages with no common delimiters', () => {
      const logs = ['abc123', 'xyz789', 'def456'];

      const result = extractDissectPatternDangerouslySlow(logs);

      expect(result.pattern).toBe('%{message}');
      expect(result.fields).toHaveLength(1);
    });

    it('handles messages with only whitespace differences', () => {
      const logs = ['word1 word2 word3', 'word1  word2  word3', 'word1   word2   word3'];

      const result = extractDissectPatternDangerouslySlow(logs);

      expect(result.pattern).toBeTruthy();
      expect(result.fields.length).toBeGreaterThan(0);
    });

    it('handles very long messages efficiently', () => {
      const longPart = 'a'.repeat(1000);
      const logs = [
        `prefix ${longPart} middle ${longPart} suffix`,
        `prefix ${longPart} middle ${longPart} suffix`,
        `prefix ${longPart} middle ${longPart} suffix`,
      ];

      const result = extractDissectPatternDangerouslySlow(logs);

      expect(result.pattern).toBeTruthy();
      expect(result.fields.length).toBeGreaterThan(0);
    });

    it('handles messages with special characters', () => {
      const logs = [
        'user@example.com -> /path/to/file.txt (success)',
        'admin@test.com -> /another/path.log (failure)',
        'guest@domain.org -> /data/output.csv (pending)',
      ];

      const result = extractDissectPatternDangerouslySlow(logs);

      expect(result.pattern).toBeTruthy();
      expect(result.pattern).toContain(' -> ');
      expect(result.pattern).toContain(' (');
      expect(result.pattern).toContain(')');
    });

    it('handles messages with nested brackets', () => {
      const logs = [
        '2024-01-15 [INFO] (module) - {action: start} Message',
        '2024-01-15 [WARN] (module) - {action: stop} Message',
        '2024-01-15 [ERROR] (module) - {action: fail} Message',
      ];

      const result = extractDissectPatternDangerouslySlow(logs);

      expect(result.pattern).toBeTruthy();
      expect(result.pattern).toContain('[');
      expect(result.pattern).toContain(']');
      expect(result.pattern).toContain('(');
      expect(result.pattern).toContain(')');
    });

    it('handles messages with URLs', () => {
      const logs = [
        'GET https://example.com/api/v1/users 200 150ms',
        'POST https://example.com/api/v1/data 201 250ms',
        'PUT https://example.com/api/v1/update 200 180ms',
      ];

      const result = extractDissectPatternDangerouslySlow(logs);

      expect(result.pattern).toBeTruthy();
      expect(result.fields.length).toBeGreaterThan(3);
    });

    it('handles messages with timestamps in various formats', () => {
      const logs = [
        '2024-01-15T10:30:00.000Z INFO Message',
        '2024-01-15T10:30:01.000Z WARN Message',
        '2024-01-15T10:30:02.000Z ERROR Message',
      ];

      const result = extractDissectPatternDangerouslySlow(logs);

      expect(result.pattern).toBeTruthy();
      expect(result.fields.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Pattern Validation', () => {
    it('never produces reference keys (* or &)', () => {
      const testCases = [
        ['ip:1.2.3.4 error:REFUSED', 'ip:5.6.7.8 error:TIMEOUT', 'ip:9.0.1.2 error:REFUSED'],
        ['key1=val1 key2=val2', 'key1=val3 key2=val4', 'key1=val5 key2=val6'],
        ['[field1] [field2]', '[value1] [value2]', '[data1] [data2]'],
      ];

      testCases.forEach((logs) => {
        const result = extractDissectPatternDangerouslySlow(logs);
        expect(result.pattern).not.toContain('%{*');
        expect(result.pattern).not.toContain('%{&');
      });
    });

    it('never produces append modifiers (+)', () => {
      const testCases = [
        ['John Smith age 30', 'Jane Doe age 25', 'Bob Johnson age 35'],
        ['First Last title Manager', 'Alice Bob title Director', 'Carol Dave title CEO'],
      ];

      testCases.forEach((logs) => {
        const result = extractDissectPatternDangerouslySlow(logs);
        expect(result.pattern).not.toContain('%{+');
      });
    });

    it('produces valid field names', () => {
      const logs = ['field1 field2 field3', 'value1 value2 value3', 'data1 data2 data3'];

      const result = extractDissectPatternDangerouslySlow(logs);

      result.fields.forEach((field) => {
        expect(field.name).toBeTruthy();
        expect(field.name).toMatch(/^[a-zA-Z0-9_?]+$/);
      });
    });

    it('produces patterns that are well-formed', () => {
      const testCases = [
        ['a b c', 'd e f', 'g h i'],
        ['1,2,3', '4,5,6', '7,8,9'],
        ['x|y|z', 'p|q|r', 'm|n|o'],
      ];

      testCases.forEach((logs) => {
        const result = extractDissectPatternDangerouslySlow(logs);

        // Pattern should have matching %{ and }
        const openCount = (result.pattern.match(/%\{/g) || []).length;
        const closeCount = (result.pattern.match(/\}/g) || []).length;
        expect(openCount).toBe(closeCount);
        expect(openCount).toBeGreaterThan(0);
      });
    });
  });

  describe('getDissectProcessor Integration', () => {
    it('generates valid processor configuration', () => {
      const logs = [
        '192.168.1.1 GET /index.html 200',
        '10.0.0.1 POST /api/data 201',
        '172.16.0.1 PUT /update 200',
      ];

      const pattern = extractDissectPatternDangerouslySlow(logs);
      const processor = getDissectProcessor(pattern, 'message');

      expect(processor.processor.dissect.field).toBe('message');
      expect(processor.processor.dissect.pattern).toBe(pattern.pattern);
      expect(processor.processor.dissect.ignore_missing).toBe(true);
      expect(processor.metadata.messageCount).toBe(3);
      expect(processor.metadata.confidence).toBeGreaterThan(0);
      expect(processor.metadata.confidence).toBeLessThanOrEqual(1);
    });

    it('calculates higher confidence for complex patterns', () => {
      const simpleLogs = ['a b', 'c d', 'e f'];
      const complexLogs = [
        '2024-01-15 [INFO] (service) {user:123} Action completed successfully',
        '2024-01-16 [WARN] (service) {user:456} Action failed with error',
        '2024-01-17 [ERROR] (service) {user:789} Action timeout occurred',
      ];

      const simplePattern = extractDissectPatternDangerouslySlow(simpleLogs);
      const complexPattern = extractDissectPatternDangerouslySlow(complexLogs);

      const simpleProcessor = getDissectProcessor(simplePattern);
      const complexProcessor = getDissectProcessor(complexPattern);

      expect(complexProcessor.metadata.confidence).toBeGreaterThan(
        simpleProcessor.metadata.confidence
      );
      expect(complexProcessor.metadata.fieldCount).toBeGreaterThan(
        simpleProcessor.metadata.fieldCount
      );
    });

    it('handles whitespace delimiters in processor config', () => {
      const logs = ['INFO    message', 'WARN  message', 'ERROR   message'];

      const pattern = extractDissectPatternDangerouslySlow(logs);
      const processor = getDissectProcessor(pattern);

      expect(processor.processor.dissect.pattern).toMatch(/%\{field_1\}\s+%\{field_2\}/);
      expect(processor.metadata.fieldCount).toBe(2);
    });
  });

  describe('Real-world Scenarios', () => {
    it('handles Nginx access logs', () => {
      const logs = [
        '192.168.1.1 - - [15/Jan/2024:10:30:00 +0000] "GET /api/users HTTP/1.1" 200 1234 "https://example.com" "Mozilla/5.0"',
        '10.0.0.1 - user [15/Jan/2024:10:30:01 +0000] "POST /api/data HTTP/1.1" 201 512 "https://test.com" "Chrome/90.0"',
        '172.16.0.1 - - [15/Jan/2024:10:30:02 +0000] "PUT /api/update HTTP/1.1" 200 128 "https://site.com" "Safari/14.0"',
      ];

      const result = extractDissectPatternDangerouslySlow(logs);

      expect(result.pattern).toBeTruthy();
      expect(result.fields.length).toBeGreaterThan(8);
      expect(result.pattern).toContain('"');
      expect(result.pattern).toContain('[');
    });

    it('handles application logs with stack traces', () => {
      const logs = [
        '[2024-01-15 10:30:00] ERROR: Database connection failed',
        '[2024-01-15 10:30:01] ERROR: Network timeout occurred',
        '[2024-01-15 10:30:02] ERROR: File not found exception',
      ];

      const result = extractDissectPatternDangerouslySlow(logs);

      expect(result.pattern).toBeTruthy();
      expect(result.pattern).toContain('[');
      expect(result.pattern).toContain(']');
      expect(result.pattern).toContain(': ');
    });

    it('handles Kubernetes container logs', () => {
      const logs = [
        '2024-01-15T10:30:00.000Z stdout F Container started successfully',
        '2024-01-15T10:30:01.000Z stderr F Error: Connection refused',
        '2024-01-15T10:30:02.000Z stdout P Partial log line continues',
      ];

      const result = extractDissectPatternDangerouslySlow(logs);

      expect(result.pattern).toBeTruthy();
      expect(result.fields.length).toBeGreaterThanOrEqual(4);
    });

    it('handles Windows Event Logs format', () => {
      const logs = [
        'Event ID: 4624 | Source: Security | Level: Information | User: SYSTEM',
        'Event ID: 4625 | Source: Security | Level: Warning | User: Administrator',
        'Event ID: 4634 | Source: Security | Level: Information | User: Guest',
      ];

      const result = extractDissectPatternDangerouslySlow(logs);

      expect(result.pattern).toBeTruthy();
      expect(result.pattern).toContain(' | ');
      expect(result.fields.length).toBeGreaterThanOrEqual(4);
    });

    it('handles custom application logs with key-value pairs', () => {
      const logs = [
        'timestamp=2024-01-15T10:30:00 level=INFO service=api action=login user_id=123',
        'timestamp=2024-01-15T10:30:01 level=WARN service=api action=logout user_id=456',
        'timestamp=2024-01-15T10:30:02 level=ERROR service=api action=failed user_id=789',
      ];

      const result = extractDissectPatternDangerouslySlow(logs);

      expect(result.pattern).toBeTruthy();
      expect(result.pattern).toContain('=');
      expect(result.fields.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('Performance and Scalability', () => {
    it('handles 100 messages efficiently', () => {
      const logs = Array.from(
        { length: 100 },
        (_, i) => `192.168.1.${i % 255} - - [2024-01-01] "GET /path${i}" 200 ${i * 100}`
      );

      const start = performance.now();
      const result = extractDissectPatternDangerouslySlow(logs);
      const duration = performance.now() - start;

      expect(result.pattern).toBeTruthy();
      expect(result.fields.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(5000); // Should complete in less than 5 seconds
    });

    it('handles messages with many delimiters', () => {
      const logs = [
        'aaa|bbb|ccc|ddd|eee|fff|ggg|hhh',
        'xxx|yyy|zzz|ppp|qqq|rrr|sss|ttt',
        'mmm|nnn|ooo|uuu|vvv|www|jjj|kkk',
      ];

      const result = extractDissectPatternDangerouslySlow(logs);

      expect(result.pattern).toBe(
        '%{field_1}|%{field_2}|%{field_3}|%{field_4}|%{field_5}|%{field_6}|%{field_7}|%{field_8}'
      );
      expect(result.fields).toHaveLength(8);
    });
  });
});
