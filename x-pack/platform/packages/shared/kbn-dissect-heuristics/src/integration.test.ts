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
        '%{field_1} - %{field_2} [%{field_3}/%{field_4}/%{field_5}] "%{field_6} /%{field_7}/%{field_8}" %{field_9}'
      );
      expect(result.fields).toHaveLength(9);
    });

    it('extracts pattern from Syslog format', () => {
      const logs = [
        'Mar 10 15:45:23 hostname sshd[12345]: Accepted password',
        'Mar 10 15:45:24 hostname systemd[6789]: Started service',
        'Mar 10 15:45:25 hostname kernel[4321]: Memory allocation',
      ];

      const result = extractDissectPatternDangerouslySlow(logs);

      expect(result.pattern).toBe(
        '%{field_1} %{field_2} %{field_3} %{field_4} %{field_5}[%{field_6}]: %{field_7} %{field_8}'
      );
      expect(result.fields).toHaveLength(8);
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

      // Right-padding modifier correctly handles variable spacing
      expect(result.pattern).toBe('%{field_1->} %{field_2}');
      expect(result.fields).toHaveLength(2);
    });

    it('detects skip fields for constant dash values', () => {
      const logs = [
        '192.168.1.1 - - [timestamp] GET',
        '10.0.0.1 - - [timestamp] POST',
        '172.16.0.1 - - [timestamp] PUT',
      ];

      const result = extractDissectPatternDangerouslySlow(logs);

      expect(result.pattern).toBe('%{field_1} - - [%{field_2}] %{field_3}');
      expect(result.fields).toHaveLength(3);
    });

    it('handles mixed modifiers correctly', () => {
      const logs = [
        'INFO   - - [2024-01-01] Request received',
        'WARN - - [2024-01-02] Request received',
        'ERROR  - - [2024-01-03] Request received',
      ];

      const result = extractDissectPatternDangerouslySlow(logs);

      // After whitespace normalization: correctly detects varying log level lengths
      // and applies right-padding modifier. Date is kept as single field.
      expect(result.pattern).toBe('%{field_1->} - - [%{field_2}] %{field_3}');
      expect(result.fields).toHaveLength(3);
    });
  });

  describe('Edge Cases', () => {
    it('handles empty input array', () => {
      const result = extractDissectPatternDangerouslySlow([]);

      expect(result.pattern).toBe('');
      expect(result.fields).toEqual([]);
    });

    it('handles a single message (ensures no crash)', () => {
      const logs = ['This is a single log message with some data'];

      const result = extractDissectPatternDangerouslySlow(logs);

      expect(result.pattern).toBe(
        '%{field_1} %{field_2} %{field_3} %{field_4} %{field_5} %{field_6} %{field_7} %{field_8} %{field_9}'
      );
      expect(result.fields).toHaveLength(9);
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

      // Right-padding modifier correctly handles varying whitespace
      expect(result.pattern).toBe('%{field_1->} %{field_2->} %{field_3}');
      expect(result.fields).toHaveLength(3);
    });

    it('handles very long messages efficiently', () => {
      const longPart = 'a'.repeat(1000);
      const logs = [
        `prefix ${longPart} middle ${longPart} suffix`,
        `prefix ${longPart} middle ${longPart} suffix`,
        `prefix ${longPart} middle ${longPart} suffix`,
      ];

      const result = extractDissectPatternDangerouslySlow(logs);

      expect(result.pattern).toBe('%{field_1} %{field_2} %{field_3} %{field_4} %{field_5}');
      expect(result.fields).toHaveLength(5);
    });

    it('handles messages with special characters', () => {
      const logs = [
        'user@example.com -> /path/to/file.txt (success)',
        'admin@test.com -> /another/path.log (failure)',
        'guest@domain.org -> /data/output.csv (pending)',
      ];

      const result = extractDissectPatternDangerouslySlow(logs);

      expect(result.pattern).toBe('%{field_1}@%{field_2} -> /%{field_3} (%{field_4})');
      expect(result.fields).toHaveLength(4);
    });

    it('handles messages with nested brackets', () => {
      const logs = [
        '2024-01-15 [INFO] (module) - {action: start} Message',
        '2024-01-15 [WARN] (module) - {action: stop} Message',
        '2024-01-15 [ERROR] (module) - {action: fail} Message',
      ];

      const result = extractDissectPatternDangerouslySlow(logs);

      expect(result.pattern).toBe(
        '%{field_1}-%{field_2}-%{field_3} [%{field_4}] (%{field_5}) - {%{field_6}: %{field_7}} %{field_8}'
      );
      expect(result.fields).toHaveLength(8);
    });

    it('handles messages with URLs', () => {
      const logs = [
        'GET https://example.com/api/v1/users 200 150ms',
        'POST https://example.com/api/v1/data 201 250ms',
        'PUT https://example.com/api/v1/update 200 180ms',
      ];

      const result = extractDissectPatternDangerouslySlow(logs);

      expect(result.pattern).toBe('%{field_1} %{field_2}://%{field_3} %{field_4} %{field_5}');
      expect(result.fields).toHaveLength(5);
    });

    it('handles messages with timestamps in various formats', () => {
      const logs = [
        '2024-01-15T10:30:00.000Z INFO Message',
        '2024-01-15T10:30:01.000Z WARN Message',
        '2024-01-15T10:30:02.000Z ERROR Message',
      ];

      const result = extractDissectPatternDangerouslySlow(logs);

      expect(result.pattern).toBe('%{field_1}-%{field_2}-%{field_3} %{field_4} %{field_5}');
      expect(result.fields).toHaveLength(5);
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
        simpleProcessor.metadata.confidence!
      );
      expect(complexProcessor.metadata.fieldCount).toBeGreaterThan(
        simpleProcessor.metadata.fieldCount
      );
    });

    it('handles whitespace delimiters in processor config', () => {
      const logs = ['INFO    message', 'WARN  message', 'ERROR   message'];

      const pattern = extractDissectPatternDangerouslySlow(logs);
      const processor = getDissectProcessor(pattern);

      // Right-padding modifier correctly handles variable spacing
      expect(processor.processor.dissect.pattern).toBe('%{field_1->} %{field_2}');
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

      expect(result.pattern).toBe(
        '%{field_1} - %{field_2} [%{field_3}/%{field_4}/%{field_5} +%{field_6}] "%{field_7} /%{field_8}/%{field_9}/%{field_10}" %{field_11}://%{field_12}" "%{field_13}/%{field_14}'
      );
      expect(result.fields).toHaveLength(14);
    });

    it('handles application logs with stack traces', () => {
      const logs = [
        '[2024-01-15 10:30:00] ERROR: Database connection failed',
        '[2024-01-15 10:30:01] ERROR: Network timeout occurred',
        '[2024-01-15 10:30:02] ERROR: File not found exception',
      ];

      const result = extractDissectPatternDangerouslySlow(logs);

      expect(result.pattern).toBe(
        '[%{field_1}-%{field_2}-%{field_3} %{field_4}] %{field_5}: %{field_6} %{field_7} %{field_8}'
      );
      expect(result.fields).toHaveLength(8);
    });

    it('handles Kubernetes container logs', () => {
      const logs = [
        '2024-01-15T10:30:00.000Z stdout F Container started successfully',
        '2024-01-15T10:30:01.000Z stderr F Error: Connection refused',
        '2024-01-15T10:30:02.000Z stdout F Request processed',
      ];

      const result = extractDissectPatternDangerouslySlow(logs);

      expect(result.pattern).toBe(
        '%{field_1}-%{field_2}-%{field_3} %{field_4} %{field_5} %{field_6} %{field_7}'
      );
      expect(result.fields).toHaveLength(7);
    });

    it('handles Windows Event Logs format', () => {
      const logs = [
        'Event ID: 4624 | Source: Security | Level: Information | User: SYSTEM',
        'Event ID: 4625 | Source: Security | Level: Warning | User: Administrator',
        'Event ID: 4634 | Source: Security | Level: Information | User: Guest',
      ];

      const result = extractDissectPatternDangerouslySlow(logs);

      expect(result.pattern).toBe(
        '%{field_1} %{field_2}: %{field_3} | %{field_4}: %{field_5} | %{field_6}: %{field_7} | %{field_8}: %{field_9}'
      );
      expect(result.fields).toHaveLength(9);
    });

    it('handles custom application logs with key-value pairs', () => {
      const logs = [
        'timestamp=2024-01-15T10:30:00 level=INFO service=api action=login user_id=123',
        'timestamp=2024-01-15T10:30:01 level=WARN service=api action=logout user_id=456',
        'timestamp=2024-01-15T10:30:02 level=ERROR service=api action=failed user_id=789',
      ];

      const result = extractDissectPatternDangerouslySlow(logs);

      expect(result.pattern).toBe(
        '%{field_1}=%{field_2}-%{field_3}-%{field_4} %{field_5}=%{field_6} %{field_7}=%{field_8} %{field_9}=%{field_10} %{field_11}_%{field_12}=%{field_13}'
      );
      expect(result.fields).toHaveLength(13);
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

  describe('Complex Real-World Logs', () => {
    it('handles complex syslog messages with varying structure', () => {
      const logs = [
        '- 1763056460 2005.11.09 eadmin2 Nov 9 12:01:01 src@eadmin2 crond(pam_unix)[12636]: session closed for user root',
        '- 1763056460 2005.11.09 dn228 Nov 9 12:01:01 dn228/dn228 crond[2916]: (root) CMD (run-parts /etc/cron.hourly)',
        '- 1763056460 2005.11.09 dn73 Nov 9 12:01:01 dn73/dn73 crond(pam_unix)[2917]: session opened for user root by (uid=0)',
        '- 1763056460 2005.11.09 en257 Nov 9 12:01:01 en257/en257 crond[8951]: (root) CMD (run-parts /etc/cron.hourly)',
        '- 1763056460 2005.11.09 dn700 Nov 9 12:01:01 dn700/dn700 crond(pam_unix)[2912]: session closed for user root',
        '- 1763056460 2005.11.09 dn978 Nov 9 12:01:01 dn978/dn978 crond[2921]: (root) CMD (run-parts /etc/cron.hourly)',
        '- 1763056460 2005.11.09 eadmin2 Nov 9 12:01:01 src@eadmin2 crond(pam_unix)[12636]: session opened for user root by (uid=0)',
        '- 1763056460 2005.11.09 dn596 Nov 9 12:01:01 dn596/dn596 crond[2728]: (root) CMD (run-parts /etc/cron.hourly)',
        '- 1763056460 2005.11.09 dn3 Nov 9 12:01:01 dn3/dn3 crond[2908]: (root) CMD (run-parts /etc/cron.hourly)',
        '- 1763056460 2005.11.09 en257 Nov 9 12:01:01 en257/en257 crond(pam_unix)[8950]: session closed for user root',
        '- 1763056460 2005.11.09 dn596 Nov 9 12:01:01 dn596/dn596 crond(pam_unix)[2727]: session opened for user root by (uid=0)',
        '- 1763056460 2005.11.09 dn596 Nov 9 12:01:01 dn596/dn596 crond(pam_unix)[2727]: session closed for user root',
        '- 1763056460 2005.11.09 dn978 Nov 9 12:01:01 dn978/dn978 crond(pam_unix)[2920]: session closed for user root',
        '- 1763056460 2005.11.09 dn261 Nov 9 12:01:01 dn261/dn261 crond(pam_unix)[2907]: session closed for user root',
        '- 1763056460 2005.11.09 dn73 Nov 9 12:01:01 dn73/dn73 crond[2918]: (root) CMD (run-parts /etc/cron.hourly)',
        '- 1763056460 2005.11.09 tbird-admin1 Nov 9 12:01:01 local@tbird-admin1 /apps/x86_64/system/ganglia-3.0.1/sbin/gmetad[1682]: data_thread() got not answer from any [Thunderbird_A8] datasource',
        '- 1763056460 2005.11.09 dn3 Nov 9 12:01:01 dn3/dn3 crond(pam_unix)[2907]: session closed for user root',
        '- 1763056460 2005.11.09 dn228 Nov 9 12:01:01 dn228/dn228 crond(pam_unix)[2915]: session closed for user root',
        '- 1763056460 2005.11.09 dn754 Nov 9 12:01:01 dn754/dn754 crond(pam_unix)[2913]: session opened for user root by (uid=0)',
        '- 1763056460 2005.11.09 dn3 Nov 9 12:01:01 dn3/dn3 crond(pam_unix)[2907]: session opened for user root by (uid=0)',
        '- 1763056460 2005.11.09 en74 Nov 9 12:01:01 en74/en74 crond(pam_unix)[3080]: session closed for user root',
        '- 1763056460 2005.11.09 en257 Nov 9 12:01:01 en257/en257 crond(pam_unix)[8950]: session opened for user root by (uid=0)',
        '- 1763056460 2005.11.09 en74 Nov 9 12:01:01 en74/en74 crond[3081]: (root) CMD (run-parts /etc/cron.hourly)',
        '- 1763056460 2005.11.09 dn731 Nov 9 12:01:01 dn731/dn731 crond(pam_unix)[2916]: session opened for user root by (uid=0)',
        '- 1763056460 2005.11.09 tbird-admin1 Nov 9 12:01:01 local@tbird-admin1 /apps/x86_64/system/ganglia-3.0.1/sbin/gmetad[1682]: data_thread() got not answer from any [Thunderbird_C5] datasource',
        '- 1763056458 2005.11.09 tbird-admin1 Nov 9 12:01:01 local@tbird-admin1 /apps/x86_64/system/ganglia-3.0.1/sbin/gmetad[1682]: data_thread() got not answer from any [Thunderbird_C5] datasource',
        '- 1763056458 2005.11.09 dn754 Nov 9 12:01:01 dn754/dn754 crond(pam_unix)[2913]: session opened for user root by (uid=0)',
        '- 1763056458 2005.11.09 dn3 Nov 9 12:01:01 dn3/dn3 crond(pam_unix)[2907]: session opened for user root by (uid=0)',
        '- 1763056458 2005.11.09 dn228 Nov 9 12:01:01 dn228/dn228 crond(pam_unix)[2915]: session opened for user root by (uid=0)',
        '- 1763056458 2005.11.09 dn596 Nov 9 12:01:01 dn596/dn596 crond(pam_unix)[2727]: session closed for user root',
        '- 1763056458 2005.11.09 dn261 Nov 9 12:01:01 dn261/dn261 crond(pam_unix)[2907]: session closed for user root',
        '- 1763056458 2005.11.09 dn754 Nov 9 12:01:01 dn754/dn754 crond[2914]: (root) CMD (run-parts /etc/cron.hourly)',
        '- 1763056458 2005.11.09 dn731 Nov 9 12:01:01 dn731/dn731 crond[2917]: (root) CMD (run-parts /etc/cron.hourly)',
        '- 1763056458 2005.11.09 dn261 Nov 9 12:01:01 dn261/dn261 crond[2908]: (root) CMD (run-parts /etc/cron.hourly)',
        '- 1763056458 2005.11.09 dn228 Nov 9 12:01:01 dn228/dn228 crond(pam_unix)[2915]: session closed for user root',
        '- 1763056458 2005.11.09 dn3 Nov 9 12:01:01 dn3/dn3 crond(pam_unix)[2907]: session closed for user root',
        '- 1763056458 2005.11.09 eadmin1 Nov 9 12:01:01 src@eadmin1 crond(pam_unix)[4307]: session opened for user root by (uid=0)',
        '- 1763056458 2005.11.09 en74 Nov 9 12:01:01 en74/en74 crond(pam_unix)[3080]: session closed for user root',
        '- 1763056458 2005.11.09 en257 Nov 9 12:01:01 en257/en257 crond[8951]: (root) CMD (run-parts /etc/cron.hourly)',
        '- 1763056458 2005.11.09 en257 Nov 9 12:01:01 en257/en257 crond(pam_unix)[8950]: session closed for user root',
        '- 1763056458 2005.11.09 tbird-admin1 Nov 9 12:01:01 local@tbird-admin1 /apps/x86_64/system/ganglia-3.0.1/sbin/gmetad[1682]: data_thread() got not answer from any [Thunderbird_B8] datasource',
        '- 1763056458 2005.11.09 dn596 Nov 9 12:01:01 dn596/dn596 crond[2728]: (root) CMD (run-parts /etc/cron.hourly)',
        '- 1763056458 2005.11.09 en74 Nov 9 12:01:01 en74/en74 crond[3081]: (root) CMD (run-parts /etc/cron.hourly)',
        '- 1763056458 2005.11.09 dn73 Nov 9 12:01:01 dn73/dn73 crond(pam_unix)[2917]: session closed for user root',
        '- 1763056458 2005.11.09 dn228 Nov 9 12:01:01 dn228/dn228 crond[2916]: (root) CMD (run-parts /etc/cron.hourly)',
        '- 1763056458 2005.11.09 en257 Nov 9 12:01:01 en257/en257 crond(pam_unix)[8950]: session opened for user root by (uid=0)',
        '- 1763056458 2005.11.09 dn700 Nov 9 12:01:01 dn700/dn700 crond(pam_unix)[2912]: session opened for user root by (uid=0)',
        '- 1763056458 2005.11.09 eadmin2 Nov 9 12:01:01 src@eadmin2 crond[12637]: (root) CMD (run-parts /etc/cron.hourly)',
        '- 1763056458 2005.11.09 dn754 Nov 9 12:01:01 dn754/dn754 crond(pam_unix)[2913]: session closed for user root',
        '- 1763056457 2005.11.09 en74 Nov 9 12:01:01 en74/en74 crond(pam_unix)[3080]: session closed for user root',
        '- 1763056457 2005.11.09 dn700 Nov 9 12:01:01 dn700/dn700 crond(pam_unix)[2912]: session closed for user root',
        '- 1763056457 2005.11.09 tbird-admin1 Nov 9 12:01:01 local@tbird-admin1 /apps/x86_64/system/ganglia-3.0.1/sbin/gmetad[1682]: data_thread() got not answer from any [Thunderbird_C5] datasource',
        '- 1763056457 2005.11.09 dn3 Nov 9 12:01:01 dn3/dn3 crond(pam_unix)[2907]: session opened for user root by (uid=0)',
        '- 1763056457 2005.11.09 tbird-admin1 Nov 9 12:01:01 local@tbird-admin1 /apps/x86_64/system/ganglia-3.0.1/sbin/gmetad[1682]: data_thread() got not answer from any [Thunderbird_A8] datasource',
        '- 1763056457 2005.11.09 dn596 Nov 9 12:01:01 dn596/dn596 crond(pam_unix)[2727]: session opened for user root by (uid=0)',
        '- 1763056457 2005.11.09 dn228 Nov 9 12:01:01 dn228/dn228 crond(pam_unix)[2915]: session opened for user root by (uid=0)',
        '- 1763056457 2005.11.09 dn978 Nov 9 12:01:01 dn978/dn978 crond(pam_unix)[2920]: session opened for user root by (uid=0)',
        '- 1763056457 2005.11.09 eadmin1 Nov 9 12:01:01 src@eadmin1 crond(pam_unix)[4307]: session opened for user root by (uid=0)',
        '- 1763056457 2005.11.09 eadmin2 Nov 9 12:01:01 src@eadmin2 crond[12637]: (root) CMD (run-parts /etc/cron.hourly)',
        '- 1763056457 2005.11.09 dn754 Nov 9 12:01:01 dn754/dn754 crond[2914]: (root) CMD (run-parts /etc/cron.hourly)',
        '- 1763056457 2005.11.09 dn754 Nov 9 12:01:01 dn754/dn754 crond(pam_unix)[2913]: session closed for user root',
        '- 1763056457 2005.11.09 dn73 Nov 9 12:01:01 dn73/dn73 crond(pam_unix)[2917]: session opened for user root by (uid=0)',
        '- 1763056457 2005.11.09 eadmin1 Nov 9 12:01:01 src@eadmin1 crond(pam_unix)[4307]: session closed for user root',
        '- 1763056457 2005.11.09 dn596 Nov 9 12:01:01 dn596/dn596 crond(pam_unix)[2727]: session closed for user root',
        '- 1763056457 2005.11.09 dn3 Nov 9 12:01:01 dn3/dn3 crond[2908]: (root) CMD (run-parts /etc/cron.hourly)',
        '- 1763056457 2005.11.09 en74 Nov 9 12:01:01 en74/en74 crond[3081]: (root) CMD (run-parts /etc/cron.hourly)',
        '- 1763056457 2005.11.09 dn228 Nov 9 12:01:01 dn228/dn228 crond(pam_unix)[2915]: session closed for user root',
        '- 1763056457 2005.11.09 dn754 Nov 9 12:01:01 dn754/dn754 crond(pam_unix)[2913]: session opened for user root by (uid=0)',
        '- 1763056457 2005.11.09 eadmin1 Nov 9 12:01:01 src@eadmin1 crond[4308]: (root) CMD (run-parts /etc/cron.hourly)',
        '- 1763056457 2005.11.09 dn261 Nov 9 12:01:01 dn261/dn261 crond(pam_unix)[2907]: session opened for user root by (uid=0)',
        '- 1763056457 2005.11.09 dn978 Nov 9 12:01:01 dn978/dn978 crond(pam_unix)[2920]: session closed for user root',
        '- 1763056457 2005.11.09 en257 Nov 9 12:01:01 en257/en257 crond[8951]: (root) CMD (run-parts /etc/cron.hourly)',
        '- 1763056457 2005.11.09 dn731 Nov 9 12:01:01 dn731/dn731 crond[2917]: (root) CMD (run-parts /etc/cron.hourly)',
        '- 1763056457 2005.11.09 dn731 Nov 9 12:01:01 dn731/dn731 crond(pam_unix)[2916]: session closed for user root',
        '- 1763056457 2005.11.09 en257 Nov 9 12:01:01 en257/en257 crond(pam_unix)[8950]: session closed for user root',
        '- 1763056457 2005.11.09 dn261 Nov 9 12:01:01 dn261/dn261 crond[2908]: (root) CMD (run-parts /etc/cron.hourly)',
        '- 1763056457 2005.11.09 dn978 Nov 9 12:01:01 dn978/dn978 crond[2921]: (root) CMD (run-parts /etc/cron.hourly)',
        '- 1763056455 2005.11.09 tbird-admin1 Nov 9 12:01:01 local@tbird-admin1 /apps/x86_64/system/ganglia-3.0.1/sbin/gmetad[1682]: data_thread() got not answer from any [Thunderbird_C5] datasource',
        '- 1763056455 2005.11.09 dn754 Nov 9 12:01:01 dn754/dn754 crond[2914]: (root) CMD (run-parts /etc/cron.hourly)',
        '- 1763056455 2005.11.09 tbird-admin1 Nov 9 12:01:01 local@tbird-admin1 /apps/x86_64/system/ganglia-3.0.1/sbin/gmetad[1682]: data_thread() got not answer from any [Thunderbird_B8] datasource',
        '- 1763056455 2005.11.09 eadmin1 Nov 9 12:01:01 src@eadmin1 crond(pam_unix)[4307]: session opened for user root by (uid=0)',
        '- 1763056455 2005.11.09 eadmin1 Nov 9 12:01:01 src@eadmin1 crond[4308]: (root) CMD (run-parts /etc/cron.hourly)',
        '- 1763056455 2005.11.09 dn754 Nov 9 12:01:01 dn754/dn754 crond(pam_unix)[2913]: session opened for user root by (uid=0)',
        '- 1763056455 2005.11.09 dn978 Nov 9 12:01:01 dn978/dn978 crond(pam_unix)[2920]: session opened for user root by (uid=0)',
        '- 1763056455 2005.11.09 dn73 Nov 9 12:01:01 dn73/dn73 crond[2918]: (root) CMD (run-parts /etc/cron.hourly)',
        '- 1763056455 2005.11.09 en74 Nov 9 12:01:01 en74/en74 crond(pam_unix)[3080]: session closed for user root',
        '- 1763056455 2005.11.09 en257 Nov 9 12:01:01 en257/en257 crond[8951]: (root) CMD (run-parts /etc/cron.hourly)',
        '- 1763056455 2005.11.09 dn731 Nov 9 12:01:01 dn731/dn731 crond(pam_unix)[2916]: session closed for user root',
        '- 1763056455 2005.11.09 dn700 Nov 9 12:01:01 dn700/dn700 crond[2913]: (root) CMD (run-parts /etc/cron.hourly)',
        '- 1763056455 2005.11.09 dn754 Nov 9 12:01:01 dn754/dn754 crond(pam_unix)[2913]: session closed for user root',
        '- 1763056455 2005.11.09 en257 Nov 9 12:01:01 en257/en257 crond(pam_unix)[8950]: session opened for user root by (uid=0)',
        '- 1763056455 2005.11.09 eadmin1 Nov 9 12:01:01 src@eadmin1 crond(pam_unix)[4307]: session closed for user root',
        '- 1763056455 2005.11.09 en74 Nov 9 12:01:01 en74/en74 crond(pam_unix)[3080]: session opened for user root by (uid=0)',
        '- 1763056455 2005.11.09 dn73 Nov 9 12:01:01 dn73/dn73 crond(pam_unix)[2917]: session opened for user root by (uid=0)',
        '- 1763056455 2005.11.09 tbird-admin1 Nov 9 12:01:01 local@tbird-admin1 /apps/x86_64/system/ganglia-3.0.1/sbin/gmetad[1682]: data_thread() got not answer from any [Thunderbird_A8] datasource',
        '- 1763056455 2005.11.09 dn73 Nov 9 12:01:01 dn73/dn73 crond(pam_unix)[2917]: session closed for user root',
        '- 1763056455 2005.11.09 dn731 Nov 9 12:01:01 dn731/dn731 crond[2917]: (root) CMD (run-parts /etc/cron.hourly)',
        '- 1763056455 2005.11.09 dn700 Nov 9 12:01:01 dn700/dn700 crond(pam_unix)[2912]: session closed for user root',
        '- 1763056455 2005.11.09 en257 Nov 9 12:01:01 en257/en257 crond(pam_unix)[8950]: session closed for user root',
        '- 1763056455 2005.11.09 en74 Nov 9 12:01:01 en74/en74 crond[3081]: (root) CMD (run-parts /etc/cron.hourly)',
      ];

      const result = extractDissectPatternDangerouslySlow(logs);

      // These messages have very high structural variability (different timestamps,
      // hostnames, separators, processes, etc.). The heuristic should use space-based
      // extraction as a fallback to capture the structured fields.
      // After normalization: correctly detects '-' and ':' as delimiters

      expect(result.pattern).toBe(
        '%{} %{field_2} %{field_3} %{field_4} %{field_5} %{field_6} %{field_7} %{field_8} %{field_9}: %{field_10} %{field_11} %{field_12} %{field_13}'
      );
      expect(result.fields.length).toBe(13);
    });

    it('handles uniform syslog messages successfully', () => {
      // More uniform messages where heuristic can succeed
      const logs = [
        'Nov 9 12:01:01 server1 crond[2920]: session opened for user root',
        'Nov 9 12:01:02 server2 crond[2921]: session closed for user admin',
        'Nov 9 12:01:03 server3 crond[2922]: session opened for user guest',
        'Nov 9 12:01:04 server4 crond[2923]: session closed for user root',
        'Nov 9 12:01:05 server5 crond[2924]: session opened for user admin',
      ];

      const result = extractDissectPatternDangerouslySlow(logs);

      // With uniform structure, heuristic should extract clear delimiters
      expect(result.pattern).toBeTruthy();
      expect(result.fields.length).toBeGreaterThan(4);
      expect(result.fields.length).toBeLessThan(15);

      // Should separate the structured parts
      const monthField = result.fields.find((f) => f.values.every((v) => v === 'Nov'));
      expect(monthField).toBeDefined();
    });

    it.only('handles wahtever this is', () => {
      const logs = [
        '- 1763058798 2005.11.09 en257 Nov 9 12:01:01 en257/en257 crond[8951]: (root) CMD (run-parts /etc/cron.hourly)',
        '- 1763058798 2005.11.09 dn73 Nov 9 12:01:01 dn73/dn73 crond[2918]: (root) CMD (run-parts /etc/cron.hourly)',
        '- 1763058798 2005.11.09 dn73 Nov 9 12:01:01 dn73/dn73 crond(pam_unix)[2917]: session closed for user root',
        '- 1763058798 2005.11.09 dn596 Nov 9 12:01:01 dn596/dn596 crond(pam_unix)[2727]: session opened for user root by (uid=0)',
        '- 1763058798 2005.11.09 en74 Nov 9 12:01:01 en74/en74 crond[3081]: (root) CMD (run-parts /etc/cron.hourly)',
        '- 1763058798 2005.11.09 en74 Nov 9 12:01:01 en74/en74 crond(pam_unix)[3080]: session closed for user root',
        '- 1763058798 2005.11.09 eadmin2 Nov 9 12:01:01 src@eadmin2 crond[12637]: (root) CMD (run-parts /etc/cron.hourly)',
        '- 1763058798 2005.11.09 dn228 Nov 9 12:01:01 dn228/dn228 crond(pam_unix)[2915]: session opened for user root by (uid=0)',
        '- 1763058798 2005.11.09 dn228 Nov 9 12:01:01 dn228/dn228 crond(pam_unix)[2915]: session closed for user root',
        '- 1763058798 2005.11.09 dn731 Nov 9 12:01:01 dn731/dn731 crond[2917]: (root) CMD (run-parts /etc/cron.hourly)',
        '- 1763058798 2005.11.09 dn700 Nov 9 12:01:01 dn700/dn700 crond(pam_unix)[2912]: session opened for user root by (uid=0)',
        '- 1763058798 2005.11.09 dn700 Nov 9 12:01:01 dn700/dn700 crond[2913]: (root) CMD (run-parts /etc/cron.hourly)',
        '- 1763058798 2005.11.09 dn700 Nov 9 12:01:01 dn700/dn700 crond(pam_unix)[2912]: session closed for user root',
        '- 1763058798 2005.11.09 dn978 Nov 9 12:01:01 dn978/dn978 crond[2921]: (root) CMD (run-parts /etc/cron.hourly)',
        '- 1763058798 2005.11.09 dn596 Nov 9 12:01:01 dn596/dn596 crond(pam_unix)[2727]: session closed for user root',
        '- 1763058798 2005.11.09 dn754 Nov 9 12:01:01 dn754/dn754 crond(pam_unix)[2913]: session closed for user root',
        '- 1763058798 2005.11.09 eadmin1 Nov 9 12:01:01 src@eadmin1 crond[4308]: (root) CMD (run-parts /etc/cron.hourly)',
        '- 1763058798 2005.11.09 dn754 Nov 9 12:01:01 dn754/dn754 crond[2914]: (root) CMD (run-parts /etc/cron.hourly)',
        '- 1763058798 2005.11.09 dn754 Nov 9 12:01:01 dn754/dn754 crond(pam_unix)[2913]: session opened for user root by (uid=0)',
        '- 1763058798 2005.11.09 en257 Nov 9 12:01:01 en257/en257 crond(pam_unix)[8950]: session closed for user root',
        '- 1763058798 2005.11.09 dn261 Nov 9 12:01:01 dn261/dn261 crond(pam_unix)[2907]: session closed for user root',
        '- 1763058798 2005.11.09 dn596 Nov 9 12:01:01 dn596/dn596 crond[2728]: (root) CMD (run-parts /etc/cron.hourly)',
        '- 1763058798 2005.11.09 dn261 Nov 9 12:01:01 dn261/dn261 crond(pam_unix)[2907]: session opened for user root by (uid=0)',
        '- 1763058798 2005.11.09 dn978 Nov 9 12:01:01 dn978/dn978 crond(pam_unix)[2920]: session opened for user root by (uid=0)',
        '- 1763058798 2005.11.09 dn3 Nov 9 12:01:01 dn3/dn3 crond[2908]: (root) CMD (run-parts /etc/cron.hourly)',
        '- 1763058798 2005.11.09 eadmin1 Nov 9 12:01:01 src@eadmin1 crond(pam_unix)[4307]: session opened for user root by (uid=0)',
        '- 1763058798 2005.11.09 eadmin2 Nov 9 12:01:01 src@eadmin2 crond(pam_unix)[12636]: session closed for user root',
        '- 1763058798 2005.11.09 dn3 Nov 9 12:01:01 dn3/dn3 crond(pam_unix)[2907]: session opened for user root by (uid=0)',
        '- 1763058798 2005.11.09 eadmin2 Nov 9 12:01:01 src@eadmin2 crond(pam_unix)[12636]: session opened for user root by (uid=0)',
        '- 1763058798 2005.11.09 eadmin1 Nov 9 12:01:01 src@eadmin1 crond(pam_unix)[4307]: session closed for user root',
        '- 1763058797 2005.11.09 dn700 Nov 9 12:01:01 dn700/dn700 crond(pam_unix)[2912]: session opened for user root by (uid=0)',
        '- 1763058797 2005.11.09 dn731 Nov 9 12:01:01 dn731/dn731 crond(pam_unix)[2916]: session closed for user root',
        '- 1763058797 2005.11.09 en257 Nov 9 12:01:01 en257/en257 crond[8951]: (root) CMD (run-parts /etc/cron.hourly)',
        '- 1763058797 2005.11.09 dn3 Nov 9 12:01:01 dn3/dn3 crond(pam_unix)[2907]: session closed for user root',
        '- 1763058797 2005.11.09 dn261 Nov 9 12:01:01 dn261/dn261 crond[2908]: (root) CMD (run-parts /etc/cron.hourly)',
        '- 1763058797 2005.11.09 en74 Nov 9 12:01:01 en74/en74 crond(pam_unix)[3080]: session opened for user root by (uid=0)',
        '- 1763058797 2005.11.09 dn3 Nov 9 12:01:01 dn3/dn3 crond(pam_unix)[2907]: session opened for user root by (uid=0)',
        '- 1763058797 2005.11.09 dn754 Nov 9 12:01:01 dn754/dn754 crond(pam_unix)[2913]: session closed for user root',
        '- 1763058797 2005.11.09 dn596 Nov 9 12:01:01 dn596/dn596 crond[2728]: (root) CMD (run-parts /etc/cron.hourly)',
        '- 1763058797 2005.11.09 eadmin2 Nov 9 12:01:01 src@eadmin2 crond[12637]: (root) CMD (run-parts /etc/cron.hourly)',
        '- 1763058797 2005.11.09 eadmin1 Nov 9 12:01:01 src@eadmin1 crond[4308]: (root) CMD (run-parts /etc/cron.hourly)',
        '- 1763058797 2005.11.09 en74 Nov 9 12:01:01 en74/en74 crond(pam_unix)[3080]: session closed for user root',
        '- 1763058797 2005.11.09 dn978 Nov 9 12:01:01 dn978/dn978 crond[2921]: (root) CMD (run-parts /etc/cron.hourly)',
        '- 1763058797 2005.11.09 dn261 Nov 9 12:01:01 dn261/dn261 crond(pam_unix)[2907]: session closed for user root',
        '- 1763058797 2005.11.09 dn3 Nov 9 12:01:01 dn3/dn3 crond[2908]: (root) CMD (run-parts /etc/cron.hourly)',
        '- 1763058797 2005.11.09 dn596 Nov 9 12:01:01 dn596/dn596 crond(pam_unix)[2727]: session opened for user root by (uid=0)',
        '- 1763058797 2005.11.09 eadmin2 Nov 9 12:01:01 src@eadmin2 crond(pam_unix)[12636]: session closed for user root',
        '- 1763058797 2005.11.09 eadmin1 Nov 9 12:01:01 src@eadmin1 crond(pam_unix)[4307]: session opened for user root by (uid=0)',
        '- 1763058797 2005.11.09 dn754 Nov 9 12:01:01 dn754/dn754 crond[2914]: (root) CMD (run-parts /etc/cron.hourly)',
        '- 1763058797 2005.11.09 dn978 Nov 9 12:01:01 dn978/dn978 crond(pam_unix)[2920]: session opened for user root by (uid=0)',
        '- 1763058797 2005.11.09 eadmin1 Nov 9 12:01:01 src@eadmin1 crond(pam_unix)[4307]: session closed for user root',
        '- 1763058797 2005.11.09 dn228 Nov 9 12:01:01 dn228/dn228 crond(pam_unix)[2915]: session opened for user root by (uid=0)',
        '- 1763058797 2005.11.09 dn731 Nov 9 12:01:01 dn731/dn731 crond(pam_unix)[2916]: session opened for user root by (uid=0)',
        '- 1763058797 2005.11.09 dn731 Nov 9 12:01:01 dn731/dn731 crond[2917]: (root) CMD (run-parts /etc/cron.hourly)',
        '- 1763058797 2005.11.09 en257 Nov 9 12:01:01 en257/en257 crond(pam_unix)[8950]: session closed for user root',
        '- 1763058797 2005.11.09 dn73 Nov 9 12:01:01 dn73/dn73 crond(pam_unix)[2917]: session closed for user root',
        '- 1763058797 2005.11.09 dn228 Nov 9 12:01:01 dn228/dn228 crond[2916]: (root) CMD (run-parts /etc/cron.hourly)',
        '- 1763058797 2005.11.09 dn73 Nov 9 12:01:01 dn73/dn73 crond(pam_unix)[2917]: session opened for user root by (uid=0)',
        '- 1763058797 2005.11.09 en74 Nov 9 12:01:01 en74/en74 crond[3081]: (root) CMD (run-parts /etc/cron.hourly)',
        '- 1763058797 2005.11.09 dn596 Nov 9 12:01:01 dn596/dn596 crond(pam_unix)[2727]: session closed for user root',
        '- 1763058797 2005.11.09 dn978 Nov 9 12:01:01 dn978/dn978 crond(pam_unix)[2920]: session closed for user root',
        '- 1763058797 2005.11.09 dn700 Nov 9 12:01:01 dn700/dn700 crond[2913]: (root) CMD (run-parts /etc/cron.hourly)',
        '- 1763058797 2005.11.09 dn700 Nov 9 12:01:01 dn700/dn700 crond(pam_unix)[2912]: session closed for user root',
        '- 1763058797 2005.11.09 dn261 Nov 9 12:01:01 dn261/dn261 crond(pam_unix)[2907]: session opened for user root by (uid=0)',
        '- 1763058795 2005.11.09 eadmin1 Nov 9 12:01:01 src@eadmin1 crond[4308]: (root) CMD (run-parts /etc/cron.hourly)',
        '- 1763058795 2005.11.09 dn731 Nov 9 12:01:01 dn731/dn731 crond(pam_unix)[2916]: session opened for user root by (uid=0)',
        '- 1763058795 2005.11.09 dn700 Nov 9 12:01:01 dn700/dn700 crond[2913]: (root) CMD (run-parts /etc/cron.hourly)',
        '- 1763058795 2005.11.09 en74 Nov 9 12:01:01 en74/en74 crond(pam_unix)[3080]: session opened for user root by (uid=0)',
        '- 1763058795 2005.11.09 dn3 Nov 9 12:01:01 dn3/dn3 crond(pam_unix)[2907]: session opened for user root by (uid=0)',
        '- 1763058795 2005.11.09 dn754 Nov 9 12:01:01 dn754/dn754 crond(pam_unix)[2913]: session closed for user root',
        '- 1763058795 2005.11.09 eadmin2 Nov 9 12:01:01 src@eadmin2 crond[12637]: (root) CMD (run-parts /etc/cron.hourly)',
        '- 1763058795 2005.11.09 en74 Nov 9 12:01:01 en74/en74 crond(pam_unix)[3080]: session closed for user root',
        '- 1763058795 2005.11.09 en257 Nov 9 12:01:01 en257/en257 crond[8951]: (root) CMD (run-parts /etc/cron.hourly)',
        '- 1763058795 2005.11.09 dn261 Nov 9 12:01:01 dn261/dn261 crond[2908]: (root) CMD (run-parts /etc/cron.hourly)',
        '- 1763058795 2005.11.09 dn228 Nov 9 12:01:01 dn228/dn228 crond(pam_unix)[2915]: session closed for user root',
        '- 1763058795 2005.11.09 dn731 Nov 9 12:01:01 dn731/dn731 crond[2917]: (root) CMD (run-parts /etc/cron.hourly)',
        '- 1763058795 2005.11.09 eadmin2 Nov 9 12:01:01 src@eadmin2 crond(pam_unix)[12636]: session closed for user root',
        '- 1763058795 2005.11.09 dn228 Nov 9 12:01:01 dn228/dn228 crond(pam_unix)[2915]: session opened for user root by (uid=0)',
        '- 1763058795 2005.11.09 dn754 Nov 9 12:01:01 dn754/dn754 crond[2914]: (root) CMD (run-parts /etc/cron.hourly)',
        '- 1763058795 2005.11.09 dn73 Nov 9 12:01:01 dn73/dn73 crond(pam_unix)[2917]: session opened for user root by (uid=0)',
        '- 1763058795 2005.11.09 dn731 Nov 9 12:01:01 dn731/dn731 crond(pam_unix)[2916]: session closed for user root',
        '- 1763058795 2005.11.09 dn596 Nov 9 12:01:01 dn596/dn596 crond(pam_unix)[2727]: session closed for user root',
        '- 1763058795 2005.11.09 eadmin2 Nov 9 12:01:01 src@eadmin2 crond(pam_unix)[12636]: session opened for user root by (uid=0)',
        '- 1763058795 2005.11.09 dn228 Nov 9 12:01:01 dn228/dn228 crond[2916]: (root) CMD (run-parts /etc/cron.hourly)',
        '- 1763058795 2005.11.09 dn261 Nov 9 12:01:01 dn261/dn261 crond(pam_unix)[2907]: session opened for user root by (uid=0)',
        '- 1763058795 2005.11.09 dn978 Nov 9 12:01:01 dn978/dn978 crond(pam_unix)[2920]: session closed for user root',
        '- 1763058795 2005.11.09 dn978 Nov 9 12:01:01 dn978/dn978 crond(pam_unix)[2920]: session opened for user root by (uid=0)',
        '- 1763058795 2005.11.09 en257 Nov 9 12:01:01 en257/en257 crond(pam_unix)[8950]: session opened for user root by (uid=0)',
        '- 1763058795 2005.11.09 dn596 Nov 9 12:01:01 dn596/dn596 crond[2728]: (root) CMD (run-parts /etc/cron.hourly)',
        '- 1763058795 2005.11.09 dn3 Nov 9 12:01:01 dn3/dn3 crond[2908]: (root) CMD (run-parts /etc/cron.hourly)',
        '- 1763058795 2005.11.09 dn700 Nov 9 12:01:01 dn700/dn700 crond(pam_unix)[2912]: session opened for user root by (uid=0)',
        '- 1763058795 2005.11.09 eadmin1 Nov 9 12:01:01 src@eadmin1 crond(pam_unix)[4307]: session opened for user root by (uid=0)',
        '- 1763058795 2005.11.09 dn596 Nov 9 12:01:01 dn596/dn596 crond(pam_unix)[2727]: session opened for user root by (uid=0)',
        '- 1763058795 2005.11.09 en257 Nov 9 12:01:01 en257/en257 crond(pam_unix)[8950]: session closed for user root',
      ];
      const result = extractDissectPatternDangerouslySlow(logs);
      // After normalization: correctly detects '-' and ':' as delimiters
      expect(result.pattern).toBe(
        '%{} %{field_2} %{field_3} %{field_4} %{field_5} %{field_6} %{field_7} %{field_8} %{field_9}: %{field_10} %{field_11} %{field_12} %{field_13}'
      );
      expect(result.fields.length).toBe(13);
    });

    it('handles this case', () => {
      const logs = [
        '[11.13 18:56:54] chrome.exe - proxy.cse.cuhk.edu.hk:5070 close, 451 bytes sent, 18846 bytes (18.4 KB) received, lifetime <1 sec',
        '[11.13 18:56:54] chrome.exe - proxy.cse.cuhk.edu.hk:5070 close, 1682 bytes (1.64 KB) sent, 472 bytes received, lifetime <1 sec',
        '[11.13 18:56:54] chrome.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
        '[11.13 18:56:54] chrome.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
        '[11.13 18:56:54] chrome.exe - proxy.cse.cuhk.edu.hk:5070 close, 1301 bytes (1.27 KB) sent, 434 bytes received, lifetime <1 sec',
        '[11.13 18:56:54] chrome.exe - proxy.cse.cuhk.edu.hk:5070 close, 1372 bytes (1.33 KB) sent, 1224 bytes (1.19 KB) received, lifetime <1 sec',
        '[11.13 18:56:54] chrome.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
        '[11.13 18:56:54] chrome.exe - proxy.cse.cuhk.edu.hk:5070 close, 1293 bytes (1.26 KB) sent, 2439 bytes (2.38 KB) received, lifetime <1 sec',
        '[11.13 18:56:54] chrome.exe - proxy.cse.cuhk.edu.hk:5070 close, 0 bytes sent, 0 bytes received, lifetime 00:19',
        '[11.13 18:56:54] chrome.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
        '[11.13 18:56:54] chrome.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
        '[11.13 18:56:54] chrome.exe - proxy.cse.cuhk.edu.hk:5070 close, 704 bytes sent, 2476 bytes (2.41 KB) received, lifetime <1 sec',
        '[11.13 18:56:54] chrome.exe - proxy.cse.cuhk.edu.hk:5070 close, 0 bytes sent, 0 bytes received, lifetime <1 sec',
        '[11.13 18:56:54] chrome.exe - proxy.cse.cuhk.edu.hk:5070 close, 1034 bytes (1.00 KB) sent, 17383 bytes (16.9 KB) received, lifetime <1 sec',
        '[11.13 18:56:54] chrome.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
        '[11.13 18:56:54] chrome.exe - proxy.cse.cuhk.edu.hk:5070 close, 0 bytes sent, 0 bytes received, lifetime <1 sec',
        '[11.13 18:56:54] chrome.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
        '[11.13 18:56:54] chrome.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
        '[11.13 18:56:54] chrome.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
        '[11.13 18:56:54] chrome.exe - proxy.cse.cuhk.edu.hk:5070 close, 458 bytes sent, 1781 bytes (1.73 KB) received, lifetime <1 sec',
        '[11.13 18:56:54] chrome.exe - proxy.cse.cuhk.edu.hk:5070 close, 1188 bytes (1.16 KB) sent, 421 bytes received, lifetime <1 sec',
        '[11.13 18:56:53] chrome.exe - proxy.cse.cuhk.edu.hk:5070 close, 1165 bytes (1.13 KB) sent, 783 bytes received, lifetime <1 sec',
        '[11.13 18:56:53] chrome.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
        '[11.13 18:56:53] chrome.exe - proxy.cse.cuhk.edu.hk:5070 close, 1107 bytes (1.08 KB) sent, 29322 bytes (28.6 KB) received, lifetime <1 sec',
        '[11.13 18:56:53] chrome.exe - proxy.cse.cuhk.edu.hk:5070 close, 1293 bytes (1.26 KB) sent, 2459 bytes (2.40 KB) received, lifetime <1 sec',
        '[11.13 18:56:53] chrome.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
        '[11.13 18:56:53] chrome.exe - proxy.cse.cuhk.edu.hk:5070 close, 1327 bytes (1.29 KB) sent, 3250 bytes (3.17 KB) received, lifetime <1 sec',
        '[11.13 18:56:53] chrome.exe - proxy.cse.cuhk.edu.hk:5070 close, 1257 bytes (1.22 KB) sent, 421 bytes received, lifetime <1 sec',
        '[11.13 18:56:53] chrome.exe - proxy.cse.cuhk.edu.hk:5070 close, 0 bytes sent, 0 bytes received, lifetime 00:02',
        '[11.13 18:56:53] chrome.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
        '[11.13 18:56:53] chrome.exe - proxy.cse.cuhk.edu.hk:5070 close, 934 bytes sent, 5869 bytes (5.73 KB) received, lifetime <1 sec',
        '[11.13 18:56:53] chrome.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
        '[11.13 18:56:53] chrome.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
        '[11.13 18:56:53] chrome.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
        '[11.13 18:56:53] chrome.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
        '[11.13 18:56:53] chrome.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
        '[11.13 18:56:53] chrome.exe - proxy.cse.cuhk.edu.hk:5070 close, 1293 bytes (1.26 KB) sent, 2440 bytes (2.38 KB) received, lifetime <1 sec',
        '[11.13 18:56:53] chrome.exe - proxy.cse.cuhk.edu.hk:5070 close, 508 bytes sent, 29786 bytes (29.0 KB) received, lifetime <1 sec',
        '[11.13 18:56:53] chrome.exe - proxy.cse.cuhk.edu.hk:5070 close, 2380 bytes (2.32 KB) sent, 678 bytes received, lifetime <1 sec',
        '[11.13 18:56:53] chrome.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
        '[11.13 18:56:53] chrome.exe - proxy.cse.cuhk.edu.hk:5070 close, 1119 bytes (1.09 KB) sent, 3210 bytes (3.13 KB) received, lifetime <1 sec',
        '[11.13 18:56:53] chrome.exe - proxy.cse.cuhk.edu.hk:5070 close, 850 bytes sent, 10547 bytes (10.2 KB) received, lifetime 00:02',
        '[11.13 18:56:53] chrome.exe - proxy.cse.cuhk.edu.hk:5070 close, 489 bytes sent, 566 bytes received, lifetime <1 sec',
        '[11.13 18:56:53] chrome.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
        '[11.13 18:56:53] chrome.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
        '[11.13 18:56:53] chrome.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
        '[11.13 18:56:53] chrome.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
        '[11.13 18:56:53] chrome.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
        '[11.13 18:56:53] chrome.exe - proxy.cse.cuhk.edu.hk:5070 close, 451 bytes sent, 18846 bytes (18.4 KB) received, lifetime <1 sec',
        '[11.13 18:56:53] chrome.exe - proxy.cse.cuhk.edu.hk:5070 close, 4512 bytes (4.40 KB) sent, 82166 bytes (80.2 KB) received, lifetime 00:01',
        '[11.13 18:56:53] chrome.exe - proxy.cse.cuhk.edu.hk:5070 close, 1682 bytes (1.64 KB) sent, 472 bytes received, lifetime <1 sec',
        '[11.13 18:56:53] chrome.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
        '[11.13 18:56:51] chrome.exe - proxy.cse.cuhk.edu.hk:5070 close, 19904 bytes (19.4 KB) sent, 27629 bytes (26.9 KB) received, lifetime 02:19',
        '[11.13 18:56:51] chrome.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
        '[11.13 18:56:51] chrome.exe - proxy.cse.cuhk.edu.hk:5070 close, 1257 bytes (1.22 KB) sent, 421 bytes received, lifetime <1 sec',
        '[11.13 18:56:51] chrome.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
        '[11.13 18:56:51] chrome.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
        '[11.13 18:56:51] chrome.exe - proxy.cse.cuhk.edu.hk:5070 close, 0 bytes sent, 0 bytes received, lifetime 00:17',
        '[11.13 18:56:51] chrome.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
        '[11.13 18:56:51] chrome.exe - proxy.cse.cuhk.edu.hk:5070 close, 704 bytes sent, 2476 bytes (2.41 KB) received, lifetime <1 sec',
        '[11.13 18:56:51] chrome.exe - proxy.cse.cuhk.edu.hk:5070 close, 458 bytes sent, 1781 bytes (1.73 KB) received, lifetime <1 sec',
        '[11.13 18:56:51] chrome.exe - proxy.cse.cuhk.edu.hk:5070 close, 428 bytes sent, 5365 bytes (5.23 KB) received, lifetime <1 sec',
        '[11.13 18:56:51] chrome.exe - proxy.cse.cuhk.edu.hk:5070 close, 1165 bytes (1.13 KB) sent, 0 bytes received, lifetime <1 sec',
        '[11.13 18:56:51] chrome.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
        '[11.13 18:56:51] chrome.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
        '[11.13 18:56:51] chrome.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
        '[11.13 18:56:51] chrome.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
        '[11.13 18:56:51] chrome.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
        '[11.13 18:56:51] chrome.exe - proxy.cse.cuhk.edu.hk:5070 close, 0 bytes sent, 0 bytes received, lifetime <1 sec',
        '[11.13 18:56:51] chrome.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
        '[11.13 18:56:51] chrome.exe - proxy.cse.cuhk.edu.hk:5070 close, 489 bytes sent, 566 bytes received, lifetime <1 sec',
        '[11.13 18:56:51] chrome.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
        '[11.13 18:56:51] chrome.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
        '[11.13 18:56:51] chrome.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
        '[11.13 18:56:51] chrome.exe - proxy.cse.cuhk.edu.hk:5070 close, 1165 bytes (1.13 KB) sent, 815 bytes received, lifetime <1 sec',
        '[11.13 18:56:51] chrome.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
        '[11.13 18:56:51] chrome.exe - proxy.cse.cuhk.edu.hk:5070 close, 934 bytes sent, 5869 bytes (5.73 KB) received, lifetime <1 sec',
        '[11.13 18:56:51] chrome.exe - proxy.cse.cuhk.edu.hk:5070 close, 408 bytes sent, 421 bytes received, lifetime 00:03',
        '[11.13 18:56:51] chrome.exe - proxy.cse.cuhk.edu.hk:5070 close, 1590 bytes (1.55 KB) sent, 472 bytes received, lifetime 00:01',
        '[11.13 18:56:51] chrome.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
        '[11.13 18:56:51] chrome.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
        '[11.13 18:56:51] chrome.exe - proxy.cse.cuhk.edu.hk:5070 close, 974 bytes sent, 9624 bytes (9.39 KB) received, lifetime <1 sec',
        '[11.13 18:56:51] chrome.exe - proxy.cse.cuhk.edu.hk:5070 close, 1034 bytes (1.00 KB) sent, 17383 bytes (16.9 KB) received, lifetime <1 sec',
        '[11.13 18:56:50] chrome.exe - proxy.cse.cuhk.edu.hk:5070 close, 1257 bytes (1.22 KB) sent, 421 bytes received, lifetime <1 sec',
        '[11.13 18:56:50] chrome.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
        '[11.13 18:56:50] chrome.exe - proxy.cse.cuhk.edu.hk:5070 close, 1293 bytes (1.26 KB) sent, 2460 bytes (2.40 KB) received, lifetime <1 sec',
        '[11.13 18:56:50] chrome.exe - proxy.cse.cuhk.edu.hk:5070 close, 0 bytes sent, 0 bytes received, lifetime 00:01',
        '[11.13 18:56:50] chrome.exe - proxy.cse.cuhk.edu.hk:5070 close, 1372 bytes (1.33 KB) sent, 1224 bytes (1.19 KB) received, lifetime <1 sec',
        '[11.13 18:56:50] chrome.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
        '[11.13 18:56:50] chrome.exe - proxy.cse.cuhk.edu.hk:5070 close, 1033 bytes (1.00 KB) sent, 46810 bytes (45.7 KB) received, lifetime <1 sec',
        '[11.13 18:56:50] chrome.exe - proxy.cse.cuhk.edu.hk:5070 close, 0 bytes sent, 0 bytes received, lifetime 00:02',
        '[11.13 18:56:50] chrome.exe - proxy.cse.cuhk.edu.hk:5070 close, 1133 bytes (1.10 KB) sent, 3274 bytes (3.19 KB) received, lifetime 00:01',
        '[11.13 18:56:50] chrome.exe - proxy.cse.cuhk.edu.hk:5070 close, 1293 bytes (1.26 KB) sent, 2247 bytes (2.19 KB) received, lifetime <1 sec',
        '[11.13 18:56:50] chrome.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
        '[11.13 18:56:50] chrome.exe - proxy.cse.cuhk.edu.hk:5070 close, 1257 bytes (1.22 KB) sent, 421 bytes received, lifetime <1 sec',
        '[11.13 18:56:50] chrome.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
        '[11.13 18:56:50] chrome.exe - proxy.cse.cuhk.edu.hk:5070 close, 0 bytes sent, 0 bytes received, lifetime 00:04',
        '[11.13 18:56:50] chrome.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
        '[11.13 18:56:50] chrome.exe - proxy.cse.cuhk.edu.hk:5070 close, 974 bytes sent, 9624 bytes (9.39 KB) received, lifetime <1 sec',
        '[11.13 18:56:50] chrome.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
      ];
      const result = extractDissectPatternDangerouslySlow(logs);
      expect(result.pattern).toBe(
        '[%{field_1} %{field_2}] %{field_3} - %{field_4} %{field_5} %{field_6} %{field_7} %{field_8} %{field_9}'
      );
    });

    it('handles this other case', () => {
      const logs = [
        'Nov 13 20:10:41 combo sshd(pam_unix)[11741]: authentication failure; logname= uid=0 euid=0 tty=NODEVssh ruser= rhost=202-132-40-29.adsl.ttn.net  user=root',
        'Nov 13 20:10:39 combo su(pam_unix)[10583]: session closed for user news',
        'Nov 13 20:10:39 combo logrotate: ALERT exited abnormally with [1]',
        'Nov 13 20:10:37 combo sshd(pam_unix)[8113]: session closed for user test',
        'Nov 13 20:10:37 combo sshd(pam_unix)[8114]: session closed for user test',
        'Nov 13 20:10:37 combo sshd(pam_unix)[8117]: session opened for user test by (uid=509)',
        'Nov 13 20:10:31 combo sshd(pam_unix)[4053]: authentication failure; logname= uid=0 euid=0 tty=NODEVssh ruser= rhost=68.143.156.89.nw.nuvox.net  user=root',
        'Nov 13 20:10:31 combo sshd(pam_unix)[4052]: authentication failure; logname= uid=0 euid=0 tty=NODEVssh ruser= rhost=68.143.156.89.nw.nuvox.net  user=root',
        'Nov 13 20:10:28 combo sshd(pam_unix)[1337]: authentication failure; logname= uid=0 euid=0 tty=NODEVssh ruser= rhost=211.137.205.253  user=root',
        'Nov 13 20:10:27 combo gdm(pam_unix)[2803]: authentication failure; logname= uid=0 euid=0 tty=:0 ruser= rhost=',
        "Nov 13 20:10:27 combo gdm-binary[2803]: Couldn't authenticate user",
        'Nov 13 20:10:26 combo su(pam_unix)[32608]: session opened for user news by (uid=0)',
        'Nov 13 20:10:26 combo su(pam_unix)[32237]: session closed for user cyrus',
        'Nov 13 20:10:26 combo sshd(pam_unix)[31850]: authentication failure; logname= uid=0 euid=0 tty=NODEVssh ruser= rhost=82.77.200.128  user=root',
        'Nov 13 20:10:26 combo sshd(pam_unix)[31854]: authentication failure; logname= uid=0 euid=0 tty=NODEVssh ruser= rhost=82.77.200.128  user=root',
        'Nov 13 20:10:26 combo sshd(pam_unix)[31855]: authentication failure; logname= uid=0 euid=0 tty=NODEVssh ruser= rhost=82.77.200.128  user=root',
        'Nov 13 20:10:24 combo sshd(pam_unix)[30737]: authentication failure; logname= uid=0 euid=0 tty=NODEVssh ruser= rhost=211.214.161.141  user=root',
        'Nov 13 20:10:24 combo sshd(pam_unix)[30674]: authentication failure; logname= uid=0 euid=0 tty=NODEVssh ruser= rhost=150.183.249.110  user=root',
        'Nov 13 20:10:24 combo sshd(pam_unix)[30680]: authentication failure; logname= uid=0 euid=0 tty=NODEVssh ruser= rhost=150.183.249.110  user=root',
        'Nov 13 20:10:24 combo sshd(pam_unix)[30682]: authentication failure; logname= uid=0 euid=0 tty=NODEVssh ruser= rhost=150.183.249.110  user=root',
        'Nov 13 20:10:24 combo sshd(pam_unix)[30686]: authentication failure; logname= uid=0 euid=0 tty=NODEVssh ruser= rhost=150.183.249.110  user=root',
        'Nov 13 20:10:24 combo sshd(pam_unix)[30640]: authentication failure; logname= uid=0 euid=0 tty=NODEVssh ruser= rhost=150.183.249.110  user=root',
        'Nov 13 20:10:24 combo sshd(pam_unix)[30645]: authentication failure; logname= uid=0 euid=0 tty=NODEVssh ruser= rhost=150.183.249.110  user=root',
        'Nov 13 20:10:24 combo sshd(pam_unix)[30658]: authentication failure; logname= uid=0 euid=0 tty=NODEVssh ruser= rhost=150.183.249.110  user=root',
        'Nov 13 20:10:24 combo sshd(pam_unix)[30662]: authentication failure; logname= uid=0 euid=0 tty=NODEVssh ruser= rhost=150.183.249.110  user=root',
        'Nov 13 20:10:24 combo sshd(pam_unix)[30618]: authentication failure; logname= uid=0 euid=0 tty=NODEVssh ruser= rhost=150.183.249.110  user=root',
        'Nov 13 20:10:24 combo sshd(pam_unix)[30624]: authentication failure; logname= uid=0 euid=0 tty=NODEVssh ruser= rhost=150.183.249.110  user=root',
        'Nov 13 20:10:24 combo sshd(pam_unix)[30625]: authentication failure; logname= uid=0 euid=0 tty=NODEVssh ruser= rhost=150.183.249.110  user=root',
        'Nov 13 20:10:24 combo sshd(pam_unix)[30632]: authentication failure; logname= uid=0 euid=0 tty=NODEVssh ruser= rhost=150.183.249.110  user=root',
        'Nov 13 20:10:24 combo sshd(pam_unix)[30634]: authentication failure; logname= uid=0 euid=0 tty=NODEVssh ruser= rhost=150.183.249.110  user=root',
        'Nov 13 20:10:24 combo sshd(pam_unix)[30584]: authentication failure; logname= uid=0 euid=0 tty=NODEVssh ruser= rhost=150.183.249.110  user=root',
        'Nov 13 20:10:24 combo sshd(pam_unix)[30585]: authentication failure; logname= uid=0 euid=0 tty=NODEVssh ruser= rhost=150.183.249.110  user=root',
        'Nov 13 20:10:24 combo sshd(pam_unix)[30592]: authentication failure; logname= uid=0 euid=0 tty=NODEVssh ruser= rhost=150.183.249.110  user=root',
        'Nov 13 20:10:24 combo sshd(pam_unix)[30595]: authentication failure; logname= uid=0 euid=0 tty=NODEVssh ruser= rhost=150.183.249.110  user=root',
        'Nov 13 20:10:24 combo sshd(pam_unix)[30598]: authentication failure; logname= uid=0 euid=0 tty=NODEVssh ruser= rhost=150.183.249.110  user=root',
        'Nov 13 20:10:24 combo sshd(pam_unix)[30558]: authentication failure; logname= uid=0 euid=0 tty=NODEVssh ruser= rhost=150.183.249.110  user=root',
        'Nov 13 20:10:24 combo sshd(pam_unix)[30560]: authentication failure; logname= uid=0 euid=0 tty=NODEVssh ruser= rhost=150.183.249.110  user=root',
        'Nov 13 20:10:24 combo sshd(pam_unix)[30566]: authentication failure; logname= uid=0 euid=0 tty=NODEVssh ruser= rhost=150.183.249.110  user=root',
        'Nov 13 20:10:24 combo sshd(pam_unix)[30570]: authentication failure; logname= uid=0 euid=0 tty=NODEVssh ruser= rhost=150.183.249.110  user=root',
        'Nov 13 20:10:24 combo sshd(pam_unix)[30572]: authentication failure; logname= uid=0 euid=0 tty=NODEVssh ruser= rhost=150.183.249.110  user=root',
        'Nov 13 20:10:24 combo sshd(pam_unix)[30530]: authentication failure; logname= uid=0 euid=0 tty=NODEVssh ruser= rhost=150.183.249.110  user=root',
        'Nov 13 20:10:24 combo sshd(pam_unix)[30535]: authentication failure; logname= uid=0 euid=0 tty=NODEVssh ruser= rhost=150.183.249.110  user=root',
        'Nov 13 20:10:24 combo sshd(pam_unix)[30540]: authentication failure; logname= uid=0 euid=0 tty=NODEVssh ruser= rhost=150.183.249.110  user=root',
        'Nov 13 20:10:24 combo sshd(pam_unix)[30542]: authentication failure; logname= uid=0 euid=0 tty=NODEVssh ruser= rhost=150.183.249.110  user=root',
        'Nov 13 20:10:24 combo sshd(pam_unix)[30548]: authentication failure; logname= uid=0 euid=0 tty=NODEVssh ruser= rhost=150.183.249.110  user=root',
        'Nov 13 20:10:23 combo ftpd[30293]: connection from 220.94.205.45 () at Sun Jul 10 13:17:22 2005',
        'Nov 13 20:10:23 combo ftpd[30280]: connection from 220.94.205.45 () at Sun Jul 10 13:17:22 2005',
        'Nov 13 20:10:23 combo ftpd[30282]: connection from 220.94.205.45 () at Sun Jul 10 13:17:22 2005',
        'Nov 13 20:10:23 combo ftpd[30284]: connection from 220.94.205.45 () at Sun Jul 10 13:17:22 2005',
        'Nov 13 20:10:23 combo ftpd[30294]: connection from 220.94.205.45 () at Sun Jul 10 13:17:22 2005',
        'Nov 13 20:10:23 combo ftpd[30296]: connection from 220.94.205.45 () at Sun Jul 10 13:17:22 2005',
        'Nov 13 20:10:23 combo ftpd[30297]: connection from 220.94.205.45 () at Sun Jul 10 13:17:22 2005',
        'Nov 13 20:10:22 combo ftpd[29730]: connection from 82.83.227.67 (dsl-082-083-227-067.arcor-ip.net) at Sun Jul 10 07:24:34 2005',
        'Nov 13 20:10:22 combo ftpd[29731]: connection from 82.83.227.67 (dsl-082-083-227-067.arcor-ip.net) at Sun Jul 10 07:24:34 2005',
        'Nov 13 20:10:22 combo ftpd[29732]: connection from 82.83.227.67 (dsl-082-083-227-067.arcor-ip.net) at Sun Jul 10 07:24:34 2005',
        'Nov 13 20:10:22 combo ftpd[29729]: connection from 82.83.227.67 (dsl-082-083-227-067.arcor-ip.net) at Sun Jul 10 07:24:34 2005',
        'Nov 13 20:10:22 combo ftpd[29734]: connection from 82.83.227.67 (dsl-082-083-227-067.arcor-ip.net) at Sun Jul 10 07:24:34 2005',
        'Nov 13 20:10:22 combo ftpd[29735]: connection from 82.83.227.67 (dsl-082-083-227-067.arcor-ip.net) at Sun Jul 10 07:24:34 2005',
        'Nov 13 20:10:22 combo ftpd[29723]: connection from 82.83.227.67 (dsl-082-083-227-067.arcor-ip.net) at Sun Jul 10 07:24:24 2005',
        'Nov 13 20:10:22 combo ftpd[29720]: connection from 82.83.227.67 (dsl-082-083-227-067.arcor-ip.net) at Sun Jul 10 07:24:24 2005',
        'Nov 13 20:10:22 combo ftpd[29717]: connection from 82.83.227.67 (dsl-082-083-227-067.arcor-ip.net) at Sun Jul 10 07:24:24 2005',
        'Nov 13 20:10:22 combo ftpd[29718]: connection from 82.83.227.67 (dsl-082-083-227-067.arcor-ip.net) at Sun Jul 10 07:24:24 2005',
        'Nov 13 20:10:22 combo ftpd[29721]: connection from 82.83.227.67 (dsl-082-083-227-067.arcor-ip.net) at Sun Jul 10 07:24:24 2005',
        'Nov 13 20:10:21 combo su(pam_unix)[26353]: session opened for user news by (uid=0)',
        'Nov 13 20:10:21 combo syslogd 1.4.1: restart.',
        'Nov 13 20:10:21 combo logrotate: ALERT exited abnormally with [1]',
        'Nov 13 20:10:21 combo cups: cupsd shutdown succeeded',
        'Nov 13 20:10:21 combo ftpd[24519]: connection from 217.187.83.139 () at Sun Jul 10 03:55:15 2005',
        'Nov 13 20:10:21 combo ftpd[24514]: connection from 217.187.83.139 () at Sun Jul 10 03:55:15 2005',
        'Nov 13 20:10:21 combo ftpd[24516]: connection from 217.187.83.139 () at Sun Jul 10 03:55:15 2005',
        'Nov 13 20:10:21 combo ftpd[24517]: connection from 217.187.83.139 () at Sun Jul 10 03:55:15 2005',
        'Nov 13 20:10:21 combo ftpd[24525]: connection from 217.187.83.139 () at Sun Jul 10 03:55:15 2005',
        'Nov 13 20:10:21 combo ftpd[24529]: connection from 217.187.83.139 () at Sun Jul 10 03:55:15 2005',
        'Nov 13 20:10:21 combo ftpd[24531]: connection from 217.187.83.139 () at Sun Jul 10 03:55:15 2005',
        'Nov 13 20:10:20 combo ftpd[24085]: connection from 206.196.21.129 (host129.206.196.21.maximumasp.com) at Sat Jul  9 22:53:19 2005',
        'Nov 13 20:10:20 combo ftpd[24089]: connection from 206.196.21.129 (host129.206.196.21.maximumasp.com) at Sat Jul  9 22:53:19 2005',
        'Nov 13 20:10:20 combo ftpd[24071]: connection from 206.196.21.129 (host129.206.196.21.maximumasp.com) at Sat Jul  9 22:53:22 2005',
        'Nov 13 20:10:20 combo ftpd[24069]: connection from 206.196.21.129 (host129.206.196.21.maximumasp.com) at Sat Jul  9 22:53:22 2005',
        'Nov 13 20:10:20 combo ftpd[24079]: connection from 206.196.21.129 (host129.206.196.21.maximumasp.com) at Sat Jul  9 22:53:22 2005',
        'Nov 13 20:10:20 combo ftpd[24075]: connection from 206.196.21.129 (host129.206.196.21.maximumasp.com) at Sat Jul  9 22:53:22 2005',
        'Nov 13 20:10:20 combo ftpd[24078]: connection from 206.196.21.129 (host129.206.196.21.maximumasp.com) at Sat Jul  9 22:53:22 2005',
        'Nov 13 20:10:20 combo ftpd[24070]: connection from 206.196.21.129 (host129.206.196.21.maximumasp.com) at Sat Jul  9 22:53:22 2005',
        'Nov 13 20:10:20 combo ftpd[24082]: connection from 206.196.21.129 (host129.206.196.21.maximumasp.com) at Sat Jul  9 22:53:22 2005',
        'Nov 13 20:10:20 combo sshd(pam_unix)[23788]: authentication failure; logname= uid=0 euid=0 tty=NODEVssh ruser= rhost=p15105218.pureserver.info  user=root',
        'Nov 13 20:10:20 combo sshd(pam_unix)[23794]: authentication failure; logname= uid=0 euid=0 tty=NODEVssh ruser= rhost=p15105218.pureserver.info  user=root',
        'Nov 13 20:10:20 combo sshd(pam_unix)[23798]: authentication failure; logname= uid=0 euid=0 tty=NODEVssh ruser= rhost=p15105218.pureserver.info  user=root',
        'Nov 13 20:10:20 combo sshd(pam_unix)[23780]: authentication failure; logname= uid=0 euid=0 tty=NODEVssh ruser= rhost=p15105218.pureserver.info  user=root',
        'Nov 13 20:10:19 combo ftpd[23204]: connection from 81.171.220.226 () at Sat Jul  9 12:59:44 2005',
        'Nov 13 20:10:19 combo ftpd[23205]: connection from 81.171.220.226 () at Sat Jul  9 12:59:44 2005',
        'Nov 13 20:10:19 combo ftpd[23217]: connection from 81.171.220.226 () at Sat Jul  9 12:59:44 2005',
        'Nov 13 20:10:19 combo ftpd[23207]: connection from 81.171.220.226 () at Sat Jul  9 12:59:44 2005',
        'Nov 13 20:10:19 combo ftpd[23210]: connection from 81.171.220.226 () at Sat Jul  9 12:59:44 2005',
        'Nov 13 20:10:19 combo ftpd[23212]: connection from 81.171.220.226 () at Sat Jul  9 12:59:44 2005',
        'Nov 13 20:10:19 combo ftpd[23214]: connection from 81.171.220.226 () at Sat Jul  9 12:59:44 2005',
        'Nov 13 20:10:19 combo ftpd[23224]: connection from 81.171.220.226 () at Sat Jul  9 12:59:45 2005',
        'Nov 13 20:10:19 combo ftpd[23226]: connection from 81.171.220.226 () at Sat Jul  9 12:59:45 2005',
        'Nov 13 20:10:18 combo ftpd[23145]: connection from 211.167.68.59 () at Sat Jul  9 12:16:49 2005',
        'Nov 13 20:10:18 combo ftpd[23150]: connection from 211.167.68.59 () at Sat Jul  9 12:16:49 2005',
        'Nov 13 20:10:18 combo ftpd[23147]: connection from 211.167.68.59 () at Sat Jul  9 12:16:49 2005',
        'Nov 13 20:10:18 combo ftpd[23152]: connection from 211.167.68.59 () at Sat Jul  9 12:16:51 2005',
      ];
      const result = extractDissectPatternDangerouslySlow(logs);
      // After normalization: correctly detects ':' as delimiter
      // With lenient position scoring, the colon is detected despite varying process name lengths
      expect(result.pattern).toBe(
        '%{field_1} %{field_2} %{field_3} %{field_4} %{field_5}: %{field_6} %{field_7} %{field_8}'
      );
      expect(result.fields.length).toBe(8);
    });
  });
});
