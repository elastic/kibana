/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { extractDissectPattern } from './extract_dissect_pattern';
import { getDissectProcessor } from './get_dissect_processor';
import { serializeAST } from './serialize_ast';

// Helper function to get pattern string from result
const getPattern = (result: ReturnType<typeof extractDissectPattern>) => serializeAST(result.ast);

describe('Dissect Pattern Extraction - Integration Tests', () => {
  describe('Common Log Formats', () => {
    it('extracts pattern from Apache Common Log Format', () => {
      const logs = [
        '192.168.1.100 - - [10/Oct/2000:13:55:36 -0700] "GET /apache_pb.gif HTTP/1.0" 200 2326',
        '192.168.1.101 - frank [10/Oct/2000:13:55:37 -0700] "POST /submit HTTP/1.1" 201 512',
        '192.168.1.102 - - [11/Oct/2000:14:22:05 -0700] "GET /index.html HTTP/1.0" 304 0',
      ];

      const result = extractDissectPattern(logs);

      expect(getPattern(result)).toBe(
        '%{field_1} - %{field_2} [%{field_3}/%{field_4}/%{field_5->} %{field_6}] "%{field_7} /%{field_8->} %{field_9}/%{field_10->}" %{field_11} %{field_12}'
      );
      expect(result.fields).toHaveLength(12);
    });

    it('extracts pattern from Syslog format', () => {
      const logs = [
        'Mar 10 15:45:23 hostname sshd[12345]: Accepted password',
        'Mar 10 15:45:24 hostname systemd[6789]: Started service',
        'Mar 10 15:45:25 hostname kernel[4321]: Memory allocation',
      ];

      const result = extractDissectPattern(logs);

      expect(getPattern(result)).toBe(
        '%{field_1} %{field_2} %{field_3} %{field_4} %{field_5}[%{field_6}]: %{field_7->} %{field_8}'
      );
      expect(result.fields).toHaveLength(8);
    });

    it('extracts pattern from JSON-like logs', () => {
      const logs = [
        '{"time":"10:30:00","level":"INFO","msg":"User logged in"}',
        '{"time":"10:30:01","level":"WARN","msg":"Rate limiting"}',
        '{"time":"10:30:02","level":"ERROR","msg":"Database fail"}',
      ];

      const result = extractDissectPattern(logs);

      expect(getPattern(result)).toBe(
        '{"%{field_1}":"%{field_2}","%{field_3}":"%{field_4}","%{field_5}":"%{field_6->} %{field_7}"}'
      );
      expect(result.fields).toHaveLength(7);
    });

    it('extracts pattern from CSV format', () => {
      const logs = [
        '12345,johndoe,boston,active,entry',
        '67890,janedoe,seattle,inactive,exit',
        '24680,bobsmith,denver,active,pending',
      ];

      const result = extractDissectPattern(logs);

      expect(getPattern(result)).toBe('%{field_1},%{field_2},%{field_3},%{field_4},%{field_5}');
      expect(result.fields).toHaveLength(5);
    });

    it('extracts pattern from pipe-delimited logs', () => {
      const logs = [
        'entry|INFO|UserService|login',
        'entry|WARN|AuthService|ratelimit',
        'entry|ERROR|DatabaseService|timeout',
      ];

      const result = extractDissectPattern(logs);

      expect(getPattern(result)).toBe('%{field_1}|%{field_2}|%{field_3}|%{field_4}');
      expect(result.fields).toHaveLength(4);
    });

    it('extracts pattern from tab-delimited logs', () => {
      const logs = ['alpha\tbeta\tgamma', 'delta\tepsilon\tzeta', 'theta\tiota\tkappa'];

      const result = extractDissectPattern(logs);

      expect(getPattern(result)).toBe('%{field_1}\t%{field_2->}\t%{field_3}');
      expect(result.fields).toHaveLength(3);
    });
  });

  describe('Modifier Detection', () => {
    it('detects whitespace delimiters for variable spacing', () => {
      const logs = ['INFO    message', 'WARN  message', 'ERROR   message', 'DEBUG     message'];

      const result = extractDissectPattern(logs);

      // Whitespace varies, so field_1 needs right-padding
      expect(getPattern(result)).toBe('%{field_1->} %{field_2}');
      expect(result.fields).toHaveLength(2);
    });

    it('detects skip fields for constant dash values', () => {
      const logs = [
        '192.168.1.1 - - [timestamp] GET',
        '10.0.0.1 - - [timestamp] POST',
        '172.16.0.1 - - [timestamp] PUT',
      ];

      const result = extractDissectPattern(logs);

      expect(getPattern(result)).toBe('%{field_1} - - [%{field_2}] %{field_3}');
      expect(result.fields).toHaveLength(3);
    });

    it('handles mixed modifiers correctly', () => {
      const logs = [
        'INFO   - - [2024-01-01] Request received',
        'WARN - - [2024-01-02] Request received',
        'ERROR  - - [2024-01-03] Request received',
      ];

      const result = extractDissectPattern(logs);

      // After whitespace normalization: correctly detects varying log level lengths
      // and applies right-padding modifier. Date is kept as single field.
      expect(getPattern(result)).toBe(
        '%{field_1->} - - [%{field_2}-%{field_3}-%{field_4}] %{field_5->} %{field_6}'
      );
      expect(result.fields).toHaveLength(6);
    });
  });

  describe('Edge Cases', () => {
    it('handles empty input array', () => {
      const result = extractDissectPattern([]);

      expect(getPattern(result)).toBe('');
      expect(result.fields).toEqual([]);
    });

    it('handles a single message (ensures no crash)', () => {
      const logs = ['This is a single log message with some data'];

      const result = extractDissectPattern(logs);

      expect(getPattern(result)).toBe(
        '%{field_1} %{field_2} %{field_3} %{field_4} %{field_5} %{field_6} %{field_7} %{field_8} %{field_9}'
      );
      expect(result.fields).toHaveLength(9);
    });

    it('handles identical messages', () => {
      const logs = ['alpha beta', 'alpha beta', 'alpha beta'];

      const result = extractDissectPattern(logs);

      expect(getPattern(result)).toBe('%{field_1} %{field_2}');
      expect(result.fields).toHaveLength(2);
    });

    it('handles messages with no common delimiters', () => {
      const logs = ['abc123', 'xyz789', 'def456'];

      const result = extractDissectPattern(logs);

      expect(getPattern(result)).toBe('%{message}');
      expect(result.fields).toHaveLength(1);
    });

    it('handles messages with only whitespace differences', () => {
      const logs = ['word1 word2 word3', 'word1  word2  word3', 'word1   word2   word3'];

      const result = extractDissectPattern(logs);

      // Right-padding modifier correctly handles varying whitespace
      expect(getPattern(result)).toBe('%{field_1->} %{field_2->} %{field_3}');
      expect(result.fields).toHaveLength(3);
    });

    it('handles very long messages efficiently', () => {
      const longPart = 'a'.repeat(1000);
      const logs = [
        `prefix ${longPart} middle ${longPart} suffix`,
        `prefix ${longPart} middle ${longPart} suffix`,
        `prefix ${longPart} middle ${longPart} suffix`,
      ];

      const result = extractDissectPattern(logs);

      expect(getPattern(result)).toBe('%{field_1} %{field_2} %{field_3} %{field_4} %{field_5}');
      expect(result.fields).toHaveLength(5);
    });

    it('handles messages with special characters', () => {
      const logs = [
        'user@example.com -> /path/to/file.txt (success)',
        'admin@test.com -> /another/path.log (failure)',
        'guest@domain.org -> /data/output.csv (pending)',
      ];

      const result = extractDissectPattern(logs);

      // Symmetry enforcement removed the isolated closing ')' delimiter; we accept
      // that the final status field now absorbs the closing parenthesis character.
      expect(getPattern(result)).toBe(
        '%{field_1}@%{field_2} -> /%{field_3}/%{field_4} (%{field_5})'
      );
      expect(result.fields).toHaveLength(5);
    });

    it('handles messages with nested brackets', () => {
      const logs = [
        '2024-01-15 [INFO] (module) - {action: start} Message',
        '2024-01-15 [WARN] (module) - {action: stop} Message',
        '2024-01-15 [ERROR] (module) - {action: fail} Message',
      ];

      const result = extractDissectPattern(logs);

      expect(getPattern(result)).toBe(
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

      const result = extractDissectPattern(logs);

      expect(getPattern(result)).toBe(
        '%{field_1->} %{field_2}://%{field_3}/%{field_4}/%{field_5}/%{field_6->} %{field_7->} %{field_8}'
      );
      expect(result.fields).toHaveLength(8);
    });

    it('handles messages with timestamps in various formats', () => {
      const logs = [
        '2024-01-15T10:30:00.000Z INFO Message',
        '2024-01-15T10:30:01.000Z WARN Message',
        '2024-01-15T10:30:02.000Z ERROR Message',
      ];

      const result = extractDissectPattern(logs);

      expect(getPattern(result)).toBe('%{field_1}-%{field_2}-%{field_3} %{field_4->} %{field_5}');
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
        const result = extractDissectPattern(logs);
        expect(getPattern(result)).not.toContain('%{*');
        expect(getPattern(result)).not.toContain('%{&');
      });
    });

    it('never produces append modifiers (+)', () => {
      const testCases = [
        ['John Smith age 30', 'Jane Doe age 25', 'Bob Johnson age 35'],
        ['First Last title Manager', 'Alice Bob title Director', 'Carol Dave title CEO'],
      ];

      testCases.forEach((logs) => {
        const result = extractDissectPattern(logs);
        expect(getPattern(result)).not.toContain('%{+');
      });
    });

    it('produces valid field names', () => {
      const logs = ['field1 field2 field3', 'value1 value2 value3', 'data1 data2 data3'];

      const result = extractDissectPattern(logs);

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
        const result = extractDissectPattern(logs);

        // Pattern should have matching %{ and }
        const openCount = (getPattern(result).match(/%\{/g) || []).length;
        const closeCount = (getPattern(result).match(/\}/g) || []).length;
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

      const pattern = extractDissectPattern(logs);
      const processor = getDissectProcessor(pattern, 'message');

      expect(processor.processor.dissect.field).toBe('message');
      expect(processor.processor.dissect.pattern).toBe(getPattern(pattern));
      expect(processor.processor.dissect.ignore_missing).toBe(true);
      expect(processor.metadata.messageCount).toBe(3);
    });

    it('handles whitespace delimiters in processor config', () => {
      const logs = ['INFO    message', 'WARN  message', 'ERROR   message'];

      const pattern = extractDissectPattern(logs);
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

      const result = extractDissectPattern(logs);

      expect(getPattern(result)).toBe(
        '%{field_1} - %{field_2} [%{field_3}/%{field_4}/%{field_5} +%{field_6}] "%{field_7} /%{field_8}/%{field_9} %{field_10}/%{field_11}" %{field_12} %{field_13} "%{field_14}://%{field_15}" "%{field_16}/%{field_17}"'
      );
      expect(result.fields).toHaveLength(17);
    });

    it('handles application logs with stack traces', () => {
      const logs = [
        '[2024-01-15 10:30:00] ERROR: Database connection failed',
        '[2024-01-15 10:30:01] ERROR: Network timeout occurred',
        '[2024-01-15 10:30:02] ERROR: File not found exception',
      ];

      const result = extractDissectPattern(logs);

      expect(getPattern(result)).toBe(
        '[%{field_1}-%{field_2}-%{field_3} %{field_4}] %{field_5}: %{field_6->} %{field_7} %{field_8}'
      );
      expect(result.fields).toHaveLength(8);
    });

    it('handles Kubernetes container logs', () => {
      const logs = [
        '2024-01-15T10:30:00.000Z stdout F Container started successfully',
        '2024-01-15T10:30:01.000Z stderr F Error: Connection refused',
        '2024-01-15T10:30:02.000Z stdout F Request processed',
      ];

      const result = extractDissectPattern(logs);

      expect(getPattern(result)).toBe(
        '%{field_1}-%{field_2}-%{field_3} %{field_4} %{field_5} %{field_6->} %{field_7}'
      );
      expect(result.fields).toHaveLength(7);
    });

    it('handles Windows Event Logs format', () => {
      const logs = [
        'Event ID: 4624 | Source: Security | Level: Information | User: SYSTEM',
        'Event ID: 4625 | Source: Security | Level: Warning | User: Administrator',
        'Event ID: 4634 | Source: Security | Level: Information | User: Guest',
      ];

      const result = extractDissectPattern(logs);

      expect(getPattern(result)).toBe(
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

      const result = extractDissectPattern(logs);

      expect(getPattern(result)).toBe(
        '%{field_1}=%{field_2}-%{field_3}-%{field_4} %{field_5}=%{field_6->} %{field_7}=%{field_8->} %{field_9}=%{field_10->} %{field_11}_%{field_12}=%{field_13}'
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
      const result = extractDissectPattern(logs);
      const duration = performance.now() - start;

      expect(getPattern(result)).toBeTruthy();
      expect(result.fields.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(5000); // Should complete in less than 5 seconds
    });

    it('handles messages with many delimiters', () => {
      const logs = [
        'aaa|bbb|ccc|ddd|eee|fff|ggg|hhh',
        'xxx|yyy|zzz|ppp|qqq|rrr|sss|ttt',
        'mmm|nnn|ooo|uuu|vvv|www|jjj|kkk',
      ];

      const result = extractDissectPattern(logs);

      expect(getPattern(result)).toBe(
        '%{field_1}|%{field_2}|%{field_3}|%{field_4}|%{field_5}|%{field_6}|%{field_7}|%{field_8}'
      );
      expect(result.fields).toHaveLength(8);
    });
  });

  describe('Complex Real-World Logs', () => {
    it('extracts pattern from heterogeneous cron and system activity syslog batch', () => {
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

      const result = extractDissectPattern(logs);

      // These messages have very high structural variability (different timestamps,
      // hostnames, separators, processes, etc.). The heuristic should use space-based
      // extraction as a fallback to capture the structured fields.
      // After normalization: correctly detects '-' and ':' as delimiters

      expect(getPattern(result)).toBe(
        '- %{field_1} %{field_2} %{field_3->} %{field_4->} %{field_5->} %{field_6} %{field_7->}: %{field_8->} %{field_9} %{field_10} %{field_11} %{field_12}'
      );
      expect(result.fields.length).toBe(12);
    });

    it('extracts pattern from uniform cron session syslog', () => {
      // More uniform messages where heuristic can succeed
      const logs = [
        'Nov 9 12:01:01 server1 crond[2920]: session opened for user root',
        'Nov 9 12:01:02 server2 crond[2921]: session closed for user admin',
        'Nov 9 12:01:03 server3 crond[2922]: session opened for user guest',
        'Nov 9 12:01:04 server4 crond[2923]: session closed for user root',
        'Nov 9 12:01:05 server5 crond[2924]: session opened for user admin',
      ];

      const result = extractDissectPattern(logs);

      // With uniform structure, heuristic should extract clear delimiters
      expect(getPattern(result)).toBeTruthy();
      expect(result.fields.length).toBeGreaterThan(4);
      expect(result.fields.length).toBeLessThan(15);

      // Should separate the structured parts
      const monthField = result.fields.find((f) => f.values.every((v) => v === 'Nov'));
      expect(monthField).toBeDefined();
    });

    it('extracts pattern from extended ganglia and cluster service logs', () => {
      const logs = [
        '- 1763064638 2005.11.09 tbird-admin1 Nov 9 12:10:54 local@tbird-admin1 /apps/x86_64/system/ganglia-3.0.1/sbin/gmetad[1691]: data_thread() got not answer from any [Thunderbird_B3] datasource',
        '- 1763064638 2005.11.09 tbird-admin1 Nov 9 12:10:54 local@tbird-admin1 gmetad: Warning: we failed to resolve data source name cn910 cn911 cn912 cn913 cn914 cn915 cn916 cn917 cn918 cn919 cn920 cn921 cn922 cn923 cn924 cn925 cn926 cn927 cn928 cn929 cn930 cn931 cn932 cn933 cn934 cn935 cn936 cn937 cn938 cn939 cn940 cn941 cn942 cn943 cn944 cn945 cn946 cn947 cn948 cn949 cn950 cn951 cn952 cn953 cn954 cn955 cn956 cn957 cn958 cn959 cn960 cn961 cn962 cn963 cn964 cn965 cn966 cn967 cn968 cn969 cn970 cn971 cn972 cn973 cn974 cn975 cn976 cn977 cn978 cn979 cn980 cn981 cn982 cn983 cn984 cn985 cn986 cn987 cn988 cn989 cn990 cn991 cn992 cn993 cn994 cn995 cn996 cn997 cn998 cn999 cn1000 cn1001 cn1002 cn1003 cn1004 cn1005 cn1006 cn1007 cn1008 cn1009 cn1010 cn1011 cn1012 cn1013 cn1014 cn1015 cn1016 cn1017 cn1018 cn1019 cn1020 cn1021 cn1022 cn1023 cn1024',
        '- 1763064638 2005.11.09 tbird-admin1 Nov 9 12:10:54 local@tbird-admin1 /apps/x86_64/system/ganglia-3.0.1/sbin/gmetad[1691]: data_thread() got not answer from any [Thunderbird_C1] datasource',
        '- 1763064638 2005.11.09 tbird-admin1 Nov 9 12:10:53 local@tbird-admin1 gmetad: Warning: we failed to resolve data source name an14 an15 an16 an17 an18 an19 an20 an21 an22 an23 an24 an25 an26 an27 an28 an29 an30 an31 an32 an33 an34 an35 an36 an37 an38 an39 an40 an41 an42 an43 an44 an45 an46 an47 an48 an49 an50 an51 an52 an53 an54 an55 an56 an57 an58 an59 an60 an61 an62 an63 an64 an65 an66 an67 an68 an69 an70 an71 an72 an73 an74 an75 an76 an77 an78 an79 an80 an81 an82 an83 an84 an85 an86 an87 an88 an89 an90 an91 an92 an93 an94 an95 an96 an97 an98 an99 an100 an101 an102 an103 an104 an105 an106 an107 an108 an109 an110 an111 an112 an113 an114 an115 an116 an117 an118 an119 an120 an121 an122 an123 an124 an125 an126 an127 an128',
        '- 1763064638 2005.11.09 tbird-admin1 Nov 9 12:10:53 local@tbird-admin1 gmetad: Warning: we failed to resolve data source name dadmin2 dadmin3 dadmin4',
        '- 1763064638 2005.11.09 tbird-admin1 Nov 9 12:10:53 local@tbird-admin1 gmetad: Warning: we failed to resolve data source name an270 an271 an272 an273 an274 an275 an276 an277 an278 an279 an280 an281 an282 an283 an284 an285 an286 an287 an288 an289 an290 an291 an292 an293 an294 an295 an296 an297 an298 an299 an300 an301 an302 an303 an304 an305 an306 an307 an308 an309 an310 an311 an312 an313 an314 an315 an316 an317 an318 an319 an320 an321 an322 an323 an324 an325 an326 an327 an328 an329 an330 an331 an332 an333 an334 an335 an336 an337 an338 an339 an340 an341 an342 an343 an344 an345 an346 an347 an348 an349 an350 an351 an352 an353 an354 an355 an356 an357 an358 an359 an360 an361 an362 an363 an364 an365 an366 an367 an368 an369 an370 an371 an372 an373 an374 an375 an376 an377 an378 an379 an380 an381 an382 an383 an384',
        '- 1763064638 2005.11.09 tbird-admin1 Nov 9 12:10:53 local@tbird-admin1 gmetad: Warning: we failed to resolve data source name an142 an143 an144 an145 an146 an147 an148 an149 an150 an151 an152 an153 an154 an155 an156 an157 an158 an159 an160 an161 an162 an163 an164 an165 an166 an167 an168 an169 an170 an171 an172 an173 an174 an175 an176 an177 an178 an179 an180 an181 an182 an183 an184 an185 an186 an187 an188 an189 an190 an191 an192 an193 an194 an195 an196 an197 an198 an199 an200 an201 an202 an203 an204 an205 an206 an207 an208 an209 an210 an211 an212 an213 an214 an215 an216 an217 an218 an219 an220 an221 an222 an223 an224 an225 an226 an227 an228 an229 an230 an231 an232 an233 an234 an235 an236 an237 an238 an239 an240 an241 an242 an243 an244 an245 an246 an247 an248 an249 an250 an251 an252 an253 an254 an255 an256',
        '- 1763064636 2005.11.09 tbird-admin1 Nov 9 12:10:46 local@tbird-admin1 /apps/x86_64/system/ganglia-3.0.1/sbin/gmetad[1682]: data_thread() got not answer from any [Thunderbird_D6] datasource',
        '- 1763064636 2005.11.09 tbird-admin1 Nov 9 12:10:43 local@tbird-admin1 ACPI: RSDP (v000 DELL ) @ 0x00000000000fd650',
        '- 1763064636 2005.11.09 tbird-admin1 Nov 9 12:10:43 local@tbird-admin1 ACPI: PCI interrupt 0000:02:0e.0[A] -> GSI 46 (level, low) -> IRQ 177',
        '- 1763064636 2005.11.09 tbird-admin1 Nov 9 12:10:43 local@tbird-admin1 ACPI: IOAPIC (id[0x09] address[0xfec80000] gsi_base[32])',
        '- 1763064636 2005.11.09 tbird-admin1 Nov 9 12:10:43 local@tbird-admin1 portmap: portmap startup succeeded',
        '- 1763064636 2005.11.09 tbird-admin1 Nov 9 12:10:43 local@tbird-admin1 ip_tables: (C) 2000-2002 Netfilter core team',
        '- 1763064636 2005.11.09 tbird-admin1 Nov 9 12:10:43 local@tbird-admin1 audit: initializing netlink socket (disabled)',
        '- 1763064636 2005.11.09 tbird-admin1 Nov 9 12:10:43 local@tbird-admin1 md: ... autorun DONE.',
        '- 1763064636 2005.11.09 tbird-admin1 Nov 9 12:10:43 local@tbird-admin1 audit(1131538222.234:0): initialized',
        '- 1763064636 2005.11.09 tbird-admin1 Nov 9 12:10:43 local@tbird-admin1 divert: allocating divert_blk for eth1',
        '- 1763064636 2005.11.09 tbird-admin1 Nov 9 12:10:43 local@tbird-admin1 nfslock: rpc.statd startup succeeded',
        '- 1763064636 2005.11.09 tbird-admin1 Nov 9 12:10:43 local@tbird-admin1 ACPI: DSDT (v001 DELL PE BKC 0x00000001 MSFT 0x0100000e) @ 0x0000000000000000',
        '- 1763064636 2005.11.09 tbird-admin1 Nov 9 12:10:43 local@tbird-admin1 ACPI: PCI Interrupt Link [LNKC] (IRQs 3 4 5 6 7 10 11 12) *15',
        '- 1763064636 2005.11.09 tbird-admin1 Nov 9 12:10:43 local@tbird-admin1 ACPI: Processor [CPU1] (supports C1)',
        '- 1763064636 2005.11.09 tbird-admin1 Nov 9 12:10:43 local@tbird-admin1 SELinux: Disabled at runtime.',
        '- 1763064636 2005.11.09 tbird-admin1 Nov 9 12:10:43 local@tbird-admin1 drivers/usb/input/hid-core.c: v2.0:USB HID core driver',
        '- 1763064636 2005.11.09 tbird-admin1 Nov 9 12:10:43 local@tbird-admin1 TCP: Hash tables configured (established 262144 bind 65536)',
        '- 1763064636 2005.11.09 tbird-admin1 Nov 9 12:10:43 local@tbird-admin1 md: Autodetecting RAID arrays.',
        '- 1763064636 2005.11.09 tbird-admin1 Nov 9 12:10:43 local@tbird-admin1 ACPI: PCI interrupt 0000:09:0d.0[A] -> GSI 18 (level, low) -> IRQ 201',
        '- 1763064636 2005.11.09 tbird-admin1 Nov 9 12:10:43 local@tbird-admin1 RAMDISK: Compressed image found at block 0',
        '- 1763064632 2005.11.09 tbird-admin1 Nov 9 12:10:26 local@tbird-admin1 /apps/x86_64/system/ganglia-3.0.1/sbin/gmetad[1682]: data_thread() got not answer from any [Thunderbird_D5] datasource',
        '- 1763064626 2005.11.09 aadmin1 Nov 9 12:10:01 src@aadmin1 crond[16571]: (root) CMD (/projects/tbird/temps/get_temps a)',
        '- 1763064625 2005.11.09 tbird-admin1 Nov 9 12:09:55 local@tbird-admin1 /apps/x86_64/system/ganglia-3.0.1/sbin/gmetad[1682]: data_thread() got not answer from any [Thunderbird_C6] datasource',
        '- 1763064624 2005.11.09 tbird-sm1 Nov 9 12:09:52 src@tbird-sm1 ib_sm.x[24904]: [ib_sm_sweep.c:1455]: No topology change',
        '- 1763064619 2005.11.09 tbird-admin1 Nov 9 12:09:27 local@tbird-admin1 /apps/x86_64/system/ganglia-3.0.1/sbin/gmetad[1682]: data_thread() got not answer from any [Thunderbird_B8] datasource',
        '- 1763064619 2005.11.09 tbird-admin1 Nov 9 12:09:27 local@tbird-admin1 /apps/x86_64/system/ganglia-3.0.1/sbin/gmetad[1682]: data_thread() got not answer from any [Thunderbird_C4] datasource',
        '- 1763064618 2005.11.09 tbird-admin1 Nov 9 12:09:23 local@tbird-admin1 /apps/x86_64/system/ganglia-3.0.1/sbin/gmetad[1682]: data_thread() got not answer from any [Thunderbird_D4] datasource',
        '- 1763064616 2005.11.09 tbird-admin1 Nov 9 12:09:13 local@tbird-admin1 /apps/x86_64/system/ganglia-3.0.1/sbin/gmetad[1682]: data_thread() got not answer from any [Thunderbird_C1] datasource',
        '- 1763064614 2005.11.09 cn959 Nov 9 12:09:07 cn959/cn959 ntpd[19944]: synchronized to 10.100.16.250, stratum 3',
        '- 1763064611 2005.11.09 tbird-admin1 Nov 9 12:08:50 local@tbird-admin1 /apps/x86_64/system/ganglia-3.0.1/sbin/gmetad[1682]: data_thread() got not answer from any [Thunderbird_B2] datasource',
        '- 1763064610 2005.11.09 tbird-admin1 Nov 9 12:08:45 local@tbird-admin1 ntpd[1815]: synchronized to #3#, stratum 1',
        '- 1763064609 2005.11.09 tbird-sm1 Nov 9 12:08:42 src@tbird-sm1 ib_sm.x[24904]: [ib_sm_sweep.c:1455]: No topology change',
        '- 1763064606 2005.11.09 tbird-sm1 Nov 9 12:08:28 src@tbird-sm1 ib_sm.x[24904]: [ib_sm_sweep.c:1455]: No topology change',
        '- 1763064600 2005.11.09 tbird-sm1 Nov 9 12:08:00 src@tbird-sm1 ib_sm.x[24904]: [ib_sm_sweep.c:1455]: No topology change',
        '- 1763064600 2005.11.09 tbird-admin1 Nov 9 12:08:00 local@tbird-admin1 /apps/x86_64/system/ganglia-3.0.1/sbin/gmetad[1682]: data_thread() got not answer from any [Thunderbird_A2] datasource',
        '- 1763064599 2005.11.09 tbird-admin1 Nov 9 12:07:58 local@tbird-admin1 /apps/x86_64/system/ganglia-3.0.1/sbin/gmetad[1682]: data_thread() got not answer from any [Thunderbird_C5] datasource',
        '- 1763064596 2005.11.09 cn666 Nov 9 12:07:43 cn666/cn666 ntpd[18497]: synchronized to 10.100.22.250, stratum 3',
        '- 1763064596 2005.11.09 tbird-sm1 Nov 9 12:07:42 src@tbird-sm1 ib_sm.x[24904]: [ib_sm_sweep.c:1831]: ********************** NEW SWEEP ********************',
        '- 1763064594 2005.11.09 cn834 Nov 9 12:07:33 cn834/cn834 ntpd[28063]: synchronized to 10.100.22.250, stratum 3',
        '- 1763064591 2005.11.09 bn211 Nov 9 12:07:21 bn211/bn211 ntpd[22411]: synchronized to 10.100.22.250, stratum 3',
        '- 1763064588 2005.11.09 tbird-admin1 Nov 9 12:07:09 local@tbird-admin1 /apps/x86_64/system/ganglia-3.0.1/sbin/gmetad[1682]: data_thread() got not answer from any [Thunderbird_B6] datasource',
        '- 1763064586 2005.11.09 bn385 Nov 9 12:06:57 bn385/bn385 ntpd[29353]: synchronized to 10.100.12.250, stratum 3',
        '- 1763064585 2005.11.09 tbird-admin1 Nov 9 12:06:54 local@tbird-admin1 /apps/x86_64/system/ganglia-3.0.1/sbin/gmetad[1682]: data_thread() got not answer from any [Thunderbird_C5] datasource',
        '- 1763064584 2005.11.09 tbird-admin1 Nov 9 12:06:48 local@tbird-admin1 /apps/x86_64/system/ganglia-3.0.1/sbin/gmetad[1682]: data_thread() got not answer from any [Thunderbird_D6] datasource',
        '- 1763064581 2005.11.09 tbird-admin1 Nov 9 12:06:36 local@tbird-admin1 /apps/x86_64/system/ganglia-3.0.1/sbin/gmetad[1682]: data_thread() got not answer from any [Thunderbird_B3] datasource',
        '- 1763064581 2005.11.09 tbird-admin1 Nov 9 12:06:34 local@tbird-admin1 /apps/x86_64/system/ganglia-3.0.1/sbin/gmetad[1682]: data_thread() got not answer from any [Thunderbird_B4] datasource',
        '- 1763064580 2005.11.09 cn907 Nov 9 12:06:33 cn907/cn907 ntpd[28086]: synchronized to 10.100.22.250, stratum 3',
        '- 1763064579 2005.11.09 tbird-admin1 Nov 9 12:06:26 local@tbird-admin1 /apps/x86_64/system/ganglia-3.0.1/sbin/gmetad[1682]: data_thread() got not answer from any [Thunderbird_B8] datasource',
        '- 1763064571 2005.11.09 tbird-sm1 Nov 9 12:05:50 src@tbird-sm1 ib_sm.x[24904]: [ib_sm_sweep.c:1831]: ********************** NEW SWEEP ********************',
        '- 1763064570 2005.11.09 tbird-admin1 Nov 9 12:05:46 local@tbird-admin1 /apps/x86_64/system/ganglia-3.0.1/sbin/gmetad[1682]: data_thread() got not answer from any [Thunderbird_C2] datasource',
        '- 1763064569 2005.11.09 tbird-admin1 Nov 9 12:05:39 local@tbird-admin1 /apps/x86_64/system/ganglia-3.0.1/sbin/gmetad[1682]: data_thread() got not answer from any [Thunderbird_C1] datasource',
        '- 1763064566 2005.11.09 tbird-admin1 Nov 9 12:05:29 local@tbird-admin1 /apps/x86_64/system/ganglia-3.0.1/sbin/gmetad[1682]: data_thread() got not answer from any [Thunderbird_B2] datasource',
        '- 1763064566 2005.11.09 cn269 Nov 9 12:05:27 cn269/cn269 ntpd[12178]: synchronized to 10.100.20.250, stratum 3',
        '- 1763064560 2005.11.09 cn439 Nov 9 12:05:00 cn439/cn439 ntpd[13201]: synchronized to 10.100.22.250, stratum 3',
        '- 1763064558 2005.11.09 cn684 Nov 9 12:04:51 cn684/cn684 ntpd[19346]: synchronized to 10.100.18.250, stratum 3',
        '- 1763064558 2005.11.09 cn373 Nov 9 12:04:49 cn373/cn373 ntpd[10321]: synchronized to 10.100.16.250, stratum 3',
        '- 1763064556 2005.11.09 bn364 Nov 9 12:04:43 bn364/bn364 ntpd[28894]: synchronized to 10.100.14.250, stratum 3',
        '- 1763064552 2005.11.09 tbird-admin1 Nov 9 12:04:26 local@tbird-admin1 /apps/x86_64/system/ganglia-3.0.1/sbin/gmetad[1682]: data_thread() got not answer from any [Thunderbird_A7] datasource',
        '- 1763064547 2005.11.09 tbird-sm1 Nov 9 12:04:02 src@tbird-sm1 ib_sm.x[24904]: [ib_sm_sweep.c:1455]: No topology change',
        '- 1763064547 2005.11.09 bn843 Nov 9 12:03:59 bn843/bn843 ntpd[22085]: synchronized to 10.100.20.250, stratum 3',
        '- 1763064544 2005.11.09 tbird-admin1 Nov 9 12:03:49 local@tbird-admin1 /apps/x86_64/system/ganglia-3.0.1/sbin/gmetad[1682]: data_thread() got not answer from any [Thunderbird_D4] datasource',
        '- 1763064542 2005.11.09 tbird-admin1 Nov 9 12:03:39 local@tbird-admin1 /apps/x86_64/system/ganglia-3.0.1/sbin/gmetad[1682]: data_thread() got not answer from any [Thunderbird_C4] datasource',
        '- 1763064538 2005.11.09 tbird-admin1 Nov 9 12:03:19 local@tbird-admin1 /apps/x86_64/system/ganglia-3.0.1/sbin/gmetad[1682]: data_thread() got not answer from any [Thunderbird_B1] datasource',
        '- 1763064533 2005.11.09 bn661 Nov 9 12:02:56 bn661/bn661 ntpd[23903]: synchronized to 10.100.22.250, stratum 3',
        '- 1763064532 2005.11.09 tbird-sm1 Nov 9 12:02:52 src@tbird-sm1 ib_sm.x[24904]: [ib_sm_sweep.c:1482]: No configuration change required',
        '- 1763064531 2005.11.09 tbird-admin1 Nov 9 12:02:48 local@tbird-admin1 /apps/x86_64/system/ganglia-3.0.1/sbin/gmetad[1682]: data_thread() got not answer from any [Thunderbird_A5] datasource',
        '- 1763064530 2005.11.09 tbird-admin1 Nov 9 12:02:42 local@tbird-admin1 /apps/x86_64/system/ganglia-3.0.1/sbin/gmetad[1682]: data_thread() got not answer from any [Thunderbird_C4] datasource',
        '- 1763064530 2005.11.09 bn413 Nov 9 12:02:42 bn413/bn413 ntpd[29462]: synchronized to 10.100.20.250, stratum 3',
        '- 1763064528 2005.11.09 dn907 Nov 9 12:02:33 dn907/dn907 ntpd[3975]: synchronized to 10.100.28.250, stratum 3',
        '- 1763064526 2005.11.09 tbird-admin1 Nov 9 12:02:27 local@tbird-admin1 /apps/x86_64/system/ganglia-3.0.1/sbin/gmetad[1682]: data_thread() got not answer from any [Thunderbird_B7] datasource',
        '- 1763064524 2005.11.09 cn179 Nov 9 12:02:15 cn179/cn179 ntpd[9791]: synchronized to 10.100.22.250, stratum 3',
        '- 1763064521 2005.11.09 aadmin3 Nov 9 12:02:05 src@aadmin3 dhcpd: DHCPREQUEST for 10.100.4.251 (10.100.0.250) from 00:11:43:e3:ba:c3 via eth1: unknown lease 10.100.4.251.',
        '- 1763064521 2005.11.09 aadmin4 Nov 9 12:02:05 src@aadmin4 dhcpd: DHCPDISCOVER from 00:11:43:e3:ba:c3 via eth1: network A_net: no free leases',
        '- 1763064519 2005.11.09 tbird-sm1 Nov 9 12:01:56 src@tbird-sm1 ib_sm.x[24904]: [ib_sm_sweep.c:1482]: No configuration change required',
        '- 1763064518 2005.11.09 bn132 Nov 9 12:01:50 bn132/bn132 ntpd[22316]: synchronized to 10.100.20.250, stratum 3',
        '- 1763064517 2005.11.09 cn296 Nov 9 12:01:46 cn296/cn296 ntpd[24199]: synchronized to 10.100.20.250, stratum 3',
        '- 1763064516 2005.11.09 tbird-sm1 Nov 9 12:01:42 src@tbird-sm1 ib_sm.x[24904]: [ib_sm_sweep.c:1482]: No configuration change required',
        '- 1763064516 2005.11.09 aadmin1 Nov 9 12:01:41 src@aadmin1 dhcpd: DHCPDISCOVER from 00:11:43:e3:ba:c3 via eth1',
        '- 1763064514 2005.11.09 cn566 Nov 9 12:01:33 cn566/cn566 ntpd[18010]: synchronized to 10.100.22.250, stratum 3',
        '- 1763064512 2005.11.09 tbird-admin1 Nov 9 12:01:22 local@tbird-admin1 /apps/x86_64/system/ganglia-3.0.1/sbin/gmetad[1682]: data_thread() got not answer from any [Thunderbird_C4] datasource',
        '- 1763064511 2005.11.09 dn77 Nov 9 12:01:20 dn77/dn77 ntpd[9978]: synchronized to 10.100.24.250, stratum 3',
        '- 1763064511 2005.11.09 bn431 Nov 9 12:01:19 bn431/bn431 ntpd[28723]: synchronized to 10.100.20.250, stratum 3',
        '- 1763064511 2005.11.09 tbird-admin1 Nov 9 12:01:18 local@tbird-admin1 /apps/x86_64/system/ganglia-3.0.1/sbin/gmetad[1682]: data_thread() got not answer from any [Thunderbird_A6] datasource',
        '- 1763064510 2005.11.09 tbird-admin1 Nov 9 12:01:15 local@tbird-admin1 /apps/x86_64/system/ganglia-3.0.1/sbin/gmetad[1682]: data_thread() got not answer from any [Thunderbird_A1] datasource',
        '- 1763064508 2005.11.09 cn142 Nov 9 12:01:03 cn142/cn142 ntpd[7467]: synchronized to 10.100.20.250, stratum 3',
        '- 1763064507 2005.11.09 #8# Nov 9 12:01:02 #8#/#8# crond(pam_unix)[23469]: session closed for user root',
        '- 1763064507 2005.11.09 eadmin2 Nov 9 12:01:01 src@eadmin2 crond[12637]: (root) CMD (run-parts /etc/cron.hourly)',
        '- 1763064507 2005.11.09 dn261 Nov 9 12:01:01 dn261/dn261 crond(pam_unix)[2907]: session closed for user root',
        '- 1763064503 2005.11.09 tbird-admin1 Nov 9 12:12:46 local@tbird-admin1 /apps/x86_64/system/ganglia-3.0.1/sbin/gmetad[1682]: data_thread() got not answer from any [Thunderbird_C2] datasource',
        '- 1763064503 2005.11.09 bn772 Nov 9 12:12:45 bn772/bn772 ntpd[3214]: synchronized to 10.100.18.250, stratum 3',
        '- 1763064497 2005.11.09 tbird-admin1 Nov 9 12:12:21 local@tbird-admin1 /apps/x86_64/system/ganglia-3.0.1/sbin/gmetad[1682]: data_thread() got not answer from any [Thunderbird_A7] datasource',
        '- 1763064496 2005.11.09 tbird-admin1 Nov 9 12:12:16 local@tbird-admin1 /apps/x86_64/system/ganglia-3.0.1/sbin/gmetad[1682]: data_thread() got not answer from any [Thunderbird_A4] datasource',
        '- 1763064495 2005.11.09 dn669 Nov 9 12:12:11 dn669/dn669 ntpd[504]: synchronized to 10.100.28.250, stratum 3',
      ];
      const result = extractDissectPattern(logs);
      // After normalization: correctly detects '-' and ':' as delimiters
      expect(getPattern(result)).toBe(
        '- %{field_1} %{field_2} %{field_3->} %{field_4->} %{field_5->} %{field_6->} %{field_7->}: %{field_8} %{field_9}'
      );
    });

    it('extracts pattern from HTTP proxy connection activity logs', () => {
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
      const result = extractDissectPattern(logs);
      expect(getPattern(result)).toBe(
        '[%{field_1} %{field_2}] %{field_3} - %{field_4} %{field_5->} %{field_6->} %{field_7->} %{field_8} %{field_9}'
      );
    });

    it('extracts pattern from mixed application proxy and error logs', () => {
      const logs = [
        '[11.13 20:08:27] chrome.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
        '[11.13 20:08:27] YodaoDict.exe - oimagec3.ydstatic.com:80 close, 358 bytes sent, 48647 bytes (47.5 KB) received, lifetime 00:30',
        '[11.13 20:08:27] YodaoDict.exe - oimagec7.ydstatic.com:80 error : A connection request was canceled before the completion.',
        '[11.13 20:08:27] YodaoDict.exe - oimageb5.ydstatic.com:80 error : A connection request was canceled before the completion.',
        '[11.13 20:08:27] spoolsv.exe *64 - 127.0.0.1:135 error : Could not connect through proxy proxy.cse.cuhk.edu.hk:5070 - Proxy server cannot establish a connection with the target, status code 403',
        '[11.13 20:08:27] YodaoDict.exe - oimagea5.ydstatic.com:80 error : A connection request was canceled before the completion.',
        '[11.13 20:08:27] chrome.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
        '[11.13 20:08:27] chrome.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
        '[11.13 20:08:27] chrome.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
        '[11.13 20:08:27] chrome.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
        '[11.13 20:08:27] chrome.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
        '[11.13 20:08:27] YodaoDict.exe - oimagea5.ydstatic.com:80 error : A connection request was canceled before the completion.',
        '[11.13 20:08:27] chrome.exe - proxy.cse.cuhk.edu.hk:5070 close, 697 bytes sent, 889 bytes received, lifetime <1 sec',
        '[11.13 20:08:27] chrome.exe - proxy.cse.cuhk.edu.hk:5070 close, 0 bytes sent, 0 bytes received, lifetime 00:01',
        '[11.13 20:08:27] chrome.exe - proxy.cse.cuhk.edu.hk:5070 close, 694 bytes sent, 892 bytes received, lifetime <1 sec',
        '[11.13 20:08:27] chrome.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
        '[11.13 20:08:27] chrome.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
        '[11.13 20:08:27] chrome.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
        '[11.13 20:08:27] chrome.exe - proxy.cse.cuhk.edu.hk:5070 close, 806 bytes sent, 1407 bytes (1.37 KB) received, lifetime 00:01',
        '[11.13 20:08:27] chrome.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
        '[11.13 20:08:27] chrome.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
        '[11.13 20:08:27] chrome.exe - proxy.cse.cuhk.edu.hk:5070 close, 0 bytes sent, 0 bytes received, lifetime 00:02',
        '[11.13 20:08:27] chrome.exe - proxy.cse.cuhk.edu.hk:5070 close, 4272 bytes (4.17 KB) sent, 20283 bytes (19.8 KB) received, lifetime 00:20',
        '[11.13 20:08:27] chrome.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
        '[11.13 20:08:27] chrome.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
        '[11.13 20:08:27] chrome.exe - proxy.cse.cuhk.edu.hk:5070 close, 0 bytes sent, 0 bytes received, lifetime 00:13',
        '[11.13 20:08:27] chrome.exe - proxy.cse.cuhk.edu.hk:5070 close, 1730 bytes (1.68 KB) sent, 4796 bytes (4.68 KB) received, lifetime 00:01',
        '[11.13 20:08:27] chrome.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
        '[11.13 20:08:27] chrome.exe - proxy.cse.cuhk.edu.hk:5070 close, 0 bytes sent, 0 bytes received, lifetime 00:07',
        '[11.13 20:08:27] chrome.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
        '[11.13 20:08:27] chrome.exe - proxy.cse.cuhk.edu.hk:5070 close, 3254 bytes (3.17 KB) sent, 5295 bytes (5.17 KB) received, lifetime 00:04',
        '[11.13 20:08:27] chrome.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
        '[11.13 20:08:27] chrome.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
        '[11.13 20:08:27] chrome.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
        '[11.13 20:08:27] chrome.exe - proxy.cse.cuhk.edu.hk:5070 close, 935 bytes sent, 6675 bytes (6.51 KB) received, lifetime <1 sec',
        '[11.13 20:08:27] chrome.exe - proxy.cse.cuhk.edu.hk:5070 close, 2413 bytes (2.35 KB) sent, 324 bytes received, lifetime 02:01',
        '[11.13 20:08:27] chrome.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
        '[11.13 20:08:27] chrome.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
        '[11.13 20:08:27] chrome.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
        '[11.13 20:08:27] chrome.exe - proxy.cse.cuhk.edu.hk:5070 close, 0 bytes sent, 0 bytes received, lifetime 00:13',
        '[11.13 20:08:27] chrome.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
        '[11.13 20:08:27] chrome.exe - proxy.cse.cuhk.edu.hk:5070 close, 534 bytes sent, 388 bytes received, lifetime 00:05',
        '[11.13 20:08:27] chrome.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
        '[11.13 20:08:27] chrome.exe - proxy.cse.cuhk.edu.hk:5070 close, 542 bytes sent, 388 bytes received, lifetime 00:05',
        '[11.13 20:08:27] chrome.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
        '[11.13 20:08:27] chrome.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
        '[11.13 20:08:27] WeChat.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
        '[11.13 20:08:27] firefox.exe - proxy.cse.cuhk.edu.hk:5070 close, 983 bytes sent, 268665 bytes (262 KB) received, lifetime 01:57',
        '[11.13 20:08:27] firefox.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
        '[11.13 20:08:27] Skype.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
        '[11.13 20:08:27] firefox.exe - proxy.cse.cuhk.edu.hk:5070 close, 950 bytes sent, 3559 bytes (3.47 KB) received, lifetime 01:01',
        '[11.13 20:08:27] Skype.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
        '[11.13 20:08:27] firefox.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
        '[11.13 20:08:27] git-remote-https.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
        '[11.13 20:08:27] firefox.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
        '[11.13 20:08:27] WeChat.exe - proxy.cse.cuhk.edu.hk:5070 close, 451 bytes sent, 353 bytes received, lifetime <1 sec',
        '[11.13 20:08:27] QQ.exe - showxml.qq.com:80 close, 600 bytes sent, 1716 bytes (1.67 KB) received, lifetime <1 sec',
        '[11.13 20:08:27] QQ.exe - cgi.qqweb.qq.com:80 close, 477 bytes sent, 448 bytes received, lifetime <1 sec',
        '[11.13 20:08:27] chrome.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
        '[11.13 20:08:27] chrome.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
        '[11.13 20:08:27] chrome.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
        '[11.13 20:08:27] chrome.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
        '[11.13 20:08:27] chrome.exe - proxy.cse.cuhk.edu.hk:5070 close, 860 bytes sent, 3314 bytes (3.23 KB) received, lifetime 00:01',
        '[11.13 20:08:27] chrome.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
        '[11.13 20:08:27] chrome.exe - proxy.cse.cuhk.edu.hk:5070 close, 5248 bytes (5.12 KB) sent, 1114 bytes (1.08 KB) received, lifetime <1 sec',
        '[11.13 20:08:27] chrome.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
        '[11.13 20:08:27] chrome.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
        '[11.13 20:08:27] chrome.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
        '[11.13 20:08:27] chrome.exe - proxy.cse.cuhk.edu.hk:5070 close, 397 bytes sent, 3558 bytes (3.47 KB) received, lifetime 00:01',
        '[11.13 20:08:27] chrome.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
        '[11.13 20:08:27] chrome.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
        '[11.13 20:08:27] chrome.exe - proxy.cse.cuhk.edu.hk:5070 close, 946 bytes sent, 783 bytes received, lifetime <1 sec',
        '[11.13 20:08:27] chrome.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
        '[11.13 20:08:27] chrome.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
        '[11.13 20:08:27] chrome.exe - proxy.cse.cuhk.edu.hk:5070 close, 1166 bytes (1.13 KB) sent, 336 bytes received, lifetime <1 sec',
        '[11.13 20:08:27] chrome.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
        '[11.13 20:08:27] chrome.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
        '[11.13 20:08:27] chrome.exe - proxy.cse.cuhk.edu.hk:5070 close, 952 bytes sent, 782 bytes received, lifetime 00:10',
        '[11.13 20:08:27] chrome.exe - proxy.cse.cuhk.edu.hk:5070 close, 2437 bytes (2.37 KB) sent, 842 bytes received, lifetime 02:04',
        '[11.13 20:08:27] chrome.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
        '[11.13 20:08:27] chrome.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
        '[11.13 20:08:27] chrome.exe - proxy.cse.cuhk.edu.hk:5070 close, 445 bytes sent, 5174 bytes (5.05 KB) received, lifetime <1 sec',
        '[11.13 20:08:27] chrome.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
        '[11.13 20:08:27] chrome.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
        '[11.13 20:08:27] chrome.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
        '[11.13 20:08:27] chrome.exe - proxy.cse.cuhk.edu.hk:5070 close, 1119 bytes (1.09 KB) sent, 3210 bytes (3.13 KB) received, lifetime <1 sec',
        '[11.13 20:08:27] chrome.exe - proxy.cse.cuhk.edu.hk:5070 close, 489 bytes sent, 566 bytes received, lifetime <1 sec',
        '[11.13 20:08:27] chrome.exe - proxy.cse.cuhk.edu.hk:5070 close, 1198 bytes (1.16 KB) sent, 344 bytes received, lifetime <1 sec',
        '[11.13 20:08:27] chrome.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
        '[11.13 20:08:27] chrome.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
        '[11.13 20:08:27] chrome.exe - proxy.cse.cuhk.edu.hk:5070 close, 1033 bytes (1.00 KB) sent, 46810 bytes (45.7 KB) received, lifetime <1 sec',
        '[11.13 20:08:27] chrome.exe - proxy.cse.cuhk.edu.hk:5070 close, 1248 bytes (1.21 KB) sent, 334 bytes received, lifetime 00:20',
        '[11.13 20:08:27] chrome.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
        '[11.13 20:08:27] chrome.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
        '[11.13 20:08:27] chrome.exe - proxy.cse.cuhk.edu.hk:5070 close, 0 bytes sent, 0 bytes received, lifetime 00:02',
        '[11.13 20:08:27] chrome.exe - proxy.cse.cuhk.edu.hk:5070 close, 2473 bytes (2.41 KB) sent, 1926 bytes (1.88 KB) received, lifetime 00:20',
        '[11.13 20:08:27] chrome.exe - proxy.cse.cuhk.edu.hk:5070 close, 19904 bytes (19.4 KB) sent, 27629 bytes (26.9 KB) received, lifetime 02:19',
        '[11.13 20:08:27] chrome.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
        '[11.13 20:08:27] chrome.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
        '[11.13 20:08:27] chrome.exe - proxy.cse.cuhk.edu.hk:5070 close, 508 bytes sent, 47293 bytes (46.1 KB) received, lifetime <1 sec',
      ];
      const result = extractDissectPattern(logs);
      // Note: field_3 does not use right-padding because ` - ` is a non-whitespace delimiter
      // The space is part of the delimiter, not padding. Fields naturally vary in length.
      expect(getPattern(result)).toBe(
        '[%{field_1} %{field_2}] %{field_3} - %{field_4->} %{field_5->} %{field_6} %{field_7} %{field_8} %{field_9}'
      );
    });

    it('extracts pattern from authentication failure and FTP connection syslog', () => {
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
      const result = extractDissectPattern(logs);
      // After normalization: correctly detects ':' as delimiter
      // With lenient position scoring, the colon is detected despite varying process name lengths
      expect(getPattern(result)).toBe(
        '%{field_1} %{field_2} %{field_3} %{field_4} %{field_5}: %{field_6->} %{field_7}'
      );
      expect(result.fields.length).toBe(7);
    });

    it('extracts pattern from cron session open/close syslog variant', () => {
      const logs = [
        '- 1763468956 2005.11.09 dn700 Nov 9 12:01:01 dn700/dn700 crond(pam_unix)[2912]: session closed for user root',
        '- 1763468957 2005.11.09 dn978 Nov 9 12:01:01 dn978/dn978 crond[2921]: (root) CMD (run-parts /etc/cron.hourly)',
        '- 1763468959 2005.11.09 eadmin2 Nov 9 12:01:01 src@eadmin2 crond[12637]: (root) CMD (run-parts /etc/cron.hourly)',
        '- 1763468959 2005.11.09 dn73 Nov 9 12:01:01 dn73/dn73 crond[2918]: (root) CMD (run-parts /etc/cron.hourly)',
        '- 1763468959 2005.11.09 eadmin2 Nov 9 12:01:01 src@eadmin2 crond(pam_unix)[12636]: session closed for user root',
        '- 1763468959 2005.11.09 dn754 Nov 9 12:01:01 dn754/dn754 crond[2914]: (root) CMD (run-parts /etc/cron.hourly)',
        '- 1763468957 2005.11.09 dn228 Nov 9 12:01:01 dn228/dn228 crond(pam_unix)[2915]: session opened for user root by (uid=0)',
        '- 1763468959 2005.11.09 dn700 Nov 9 12:01:01 dn700/dn700 crond(pam_unix)[2912]: session opened for user root by (uid=0)',
        '- 1763468956 2005.11.09 eadmin2 Nov 9 12:01:01 src@eadmin2 crond(pam_unix)[12636]: session opened for user root by (uid=0)',
        '- 1763468956 2005.11.09 en257 Nov 9 12:01:01 en257/en257 crond(pam_unix)[8950]: session opened for user root by (uid=0)',
        '- 1763468959 2005.11.09 dn731 Nov 9 12:01:01 dn731/dn731 crond[2917]: (root) CMD (run-parts /etc/cron.hourly)',
        '- 1763468956 2005.11.09 eadmin2 Nov 9 12:01:01 src@eadmin2 crond[12637]: (root) CMD (run-parts /etc/cron.hourly)',
        '- 1763468959 2005.11.09 dn731 Nov 9 12:01:01 dn731/dn731 crond(pam_unix)[2916]: session closed for user root',
        '- 1763468959 2005.11.09 dn978 Nov 9 12:01:01 dn978/dn978 crond[2921]: (root) CMD (run-parts /etc/cron.hourly)',
        '- 1763468956 2005.11.09 dn73 Nov 9 12:01:01 dn73/dn73 crond(pam_unix)[2917]: session opened for user root by (uid=0)',
        '- 1763468956 2005.11.09 dn731 Nov 9 12:01:01 dn731/dn731 crond[2917]: (root) CMD (run-parts /etc/cron.hourly)',
        '- 1763468956 2005.11.09 dn3 Nov 9 12:01:01 dn3/dn3 crond(pam_unix)[2907]: session opened for user root by (uid=0)',
        '- 1763468957 2005.11.09 dn3 Nov 9 12:01:01 dn3/dn3 crond(pam_unix)[2907]: session opened for user root by (uid=0)',
        '- 1763468956 2005.11.09 dn978 Nov 9 12:01:01 dn978/dn978 crond[2921]: (root) CMD (run-parts /etc/cron.hourly)',
        '- 1763468959 2005.11.09 en74 Nov 9 12:01:01 en74/en74 crond(pam_unix)[3080]: session opened for user root by (uid=0)',
        '- 1763468959 2005.11.09 eadmin1 Nov 9 12:01:01 src@eadmin1 crond[4308]: (root) CMD (run-parts /etc/cron.hourly)',
        '- 1763468959 2005.11.09 dn261 Nov 9 12:01:01 dn261/dn261 crond(pam_unix)[2907]: session opened for user root by (uid=0)',
        '- 1763468959 2005.11.09 dn3 Nov 9 12:01:01 dn3/dn3 crond(pam_unix)[2907]: session opened for user root by (uid=0)',
        '- 1763468956 2005.11.09 dn261 Nov 9 12:01:01 dn261/dn261 crond(pam_unix)[2907]: session closed for user root',
        '- 1763468957 2005.11.09 en74 Nov 9 12:01:01 en74/en74 crond(pam_unix)[3080]: session opened for user root by (uid=0)',
        '- 1763468957 2005.11.09 dn754 Nov 9 12:01:01 dn754/dn754 crond(pam_unix)[2913]: session opened for user root by (uid=0)',
        '- 1763468957 2005.11.09 dn700 Nov 9 12:01:01 dn700/dn700 crond(pam_unix)[2912]: session closed for user root',
        '- 1763468957 2005.11.09 dn3 Nov 9 12:01:01 dn3/dn3 crond(pam_unix)[2907]: session closed for user root',
        '- 1763468956 2005.11.09 dn700 Nov 9 12:01:01 dn700/dn700 crond[2913]: (root) CMD (run-parts /etc/cron.hourly)',
        '- 1763468956 2005.11.09 dn596 Nov 9 12:01:01 dn596/dn596 crond(pam_unix)[2727]: session opened for user root by (uid=0)',
        '- 1763468957 2005.11.09 dn700 Nov 9 12:01:01 dn700/dn700 crond[2913]: (root) CMD (run-parts /etc/cron.hourly)',
        '- 1763468959 2005.11.09 dn228 Nov 9 12:01:01 dn228/dn228 crond[2916]: (root) CMD (run-parts /etc/cron.hourly)',
        '- 1763468956 2005.11.09 eadmin1 Nov 9 12:01:01 src@eadmin1 crond[4308]: (root) CMD (run-parts /etc/cron.hourly)',
        '- 1763468956 2005.11.09 eadmin1 Nov 9 12:01:01 src@eadmin1 crond(pam_unix)[4307]: session opened for user root by (uid=0)',
        '- 1763468956 2005.11.09 dn3 Nov 9 12:01:01 dn3/dn3 crond[2908]: (root) CMD (run-parts /etc/cron.hourly)',
        '- 1763468957 2005.11.09 dn754 Nov 9 12:01:01 dn754/dn754 crond(pam_unix)[2913]: session closed for user root',
        '- 1763468957 2005.11.09 dn261 Nov 9 12:01:01 dn261/dn261 crond(pam_unix)[2907]: session closed for user root',
        '- 1763468957 2005.11.09 dn596 Nov 9 12:01:01 dn596/dn596 crond(pam_unix)[2727]: session opened for user root by (uid=0)',
        '- 1763468959 2005.11.09 eadmin1 Nov 9 12:01:01 src@eadmin1 crond(pam_unix)[4307]: session closed for user root',
        '- 1763468957 2005.11.09 eadmin2 Nov 9 12:01:01 src@eadmin2 crond[12637]: (root) CMD (run-parts /etc/cron.hourly)',
        '- 1763468957 2005.11.09 eadmin1 Nov 9 12:01:01 src@eadmin1 crond[4308]: (root) CMD (run-parts /etc/cron.hourly)',
        '- 1763468957 2005.11.09 eadmin2 Nov 9 12:01:01 src@eadmin2 crond(pam_unix)[12636]: session closed for user root',
        '- 1763468956 2005.11.09 dn261 Nov 9 12:01:01 dn261/dn261 crond(pam_unix)[2907]: session opened for user root by (uid=0)',
        '- 1763468956 2005.11.09 en74 Nov 9 12:01:01 en74/en74 crond(pam_unix)[3080]: session closed for user root',
        '- 1763468959 2005.11.09 dn73 Nov 9 12:01:01 dn73/dn73 crond(pam_unix)[2917]: session closed for user root',
        '- 1763468959 2005.11.09 dn228 Nov 9 12:01:01 dn228/dn228 crond(pam_unix)[2915]: session closed for user root',
        '- 1763468956 2005.11.09 en257 Nov 9 12:01:01 en257/en257 crond[8951]: (root) CMD (run-parts /etc/cron.hourly)',
        '- 1763468959 2005.11.09 dn754 Nov 9 12:01:01 dn754/dn754 crond(pam_unix)[2913]: session closed for user root',
        '- 1763468959 2005.11.09 eadmin1 Nov 9 12:01:01 src@eadmin1 crond(pam_unix)[4307]: session opened for user root by (uid=0)',
        '- 1763468956 2005.11.09 dn596 Nov 9 12:01:01 dn596/dn596 crond[2728]: (root) CMD (run-parts /etc/cron.hourly)',
        '- 1763468957 2005.11.09 en74 Nov 9 12:01:01 en74/en74 crond(pam_unix)[3080]: session closed for user root',
        '- 1763468959 2005.11.09 dn3 Nov 9 12:01:01 dn3/dn3 crond[2908]: (root) CMD (run-parts /etc/cron.hourly)',
        '- 1763468959 2005.11.09 dn228 Nov 9 12:01:01 dn228/dn228 crond(pam_unix)[2915]: session opened for user root by (uid=0)',
        '- 1763468957 2005.11.09 eadmin2 Nov 9 12:01:01 src@eadmin2 crond(pam_unix)[12636]: session opened for user root by (uid=0)',
        '- 1763468956 2005.11.09 en74 Nov 9 12:01:01 en74/en74 crond(pam_unix)[3080]: session opened for user root by (uid=0)',
        '- 1763468957 2005.11.09 eadmin1 Nov 9 12:01:01 src@eadmin1 crond(pam_unix)[4307]: session closed for user root',
        '- 1763468957 2005.11.09 dn731 Nov 9 12:01:01 dn731/dn731 crond(pam_unix)[2916]: session opened for user root by (uid=0)',
        '- 1763468957 2005.11.09 dn3 Nov 9 12:01:01 dn3/dn3 crond[2908]: (root) CMD (run-parts /etc/cron.hourly)',
        '- 1763468957 2005.11.09 dn596 Nov 9 12:01:01 dn596/dn596 crond(pam_unix)[2727]: session closed for user root',
        '- 1763468957 2005.11.09 dn978 Nov 9 12:01:01 dn978/dn978 crond(pam_unix)[2920]: session closed for user root',
        '- 1763468959 2005.11.09 dn596 Nov 9 12:01:01 dn596/dn596 crond(pam_unix)[2727]: session closed for user root',
        '- 1763468956 2005.11.09 dn978 Nov 9 12:01:01 dn978/dn978 crond(pam_unix)[2920]: session opened for user root by (uid=0)',
        '- 1763468957 2005.11.09 dn700 Nov 9 12:01:01 dn700/dn700 crond(pam_unix)[2912]: session opened for user root by (uid=0)',
        '- 1763468959 2005.11.09 en257 Nov 9 12:01:01 en257/en257 crond[8951]: (root) CMD (run-parts /etc/cron.hourly)',
        '- 1763468956 2005.11.09 dn228 Nov 9 12:01:01 dn228/dn228 crond[2916]: (root) CMD (run-parts /etc/cron.hourly)',
        '- 1763468956 2005.11.09 dn228 Nov 9 12:01:01 dn228/dn228 crond(pam_unix)[2915]: session opened for user root by (uid=0)',
        '- 1763468957 2005.11.09 dn73 Nov 9 12:01:01 dn73/dn73 crond[2918]: (root) CMD (run-parts /etc/cron.hourly)',
        '- 1763468959 2005.11.09 dn978 Nov 9 12:01:01 dn978/dn978 crond(pam_unix)[2920]: session closed for user root',
        '- 1763468956 2005.11.09 dn700 Nov 9 12:01:01 dn700/dn700 crond(pam_unix)[2912]: session opened for user root by (uid=0)',
        '- 1763468957 2005.11.09 en257 Nov 9 12:01:01 en257/en257 crond(pam_unix)[8950]: session closed for user root',
        '- 1763468957 2005.11.09 dn261 Nov 9 12:01:01 dn261/dn261 crond[2908]: (root) CMD (run-parts /etc/cron.hourly)',
        '- 1763468956 2005.11.09 dn731 Nov 9 12:01:01 dn731/dn731 crond(pam_unix)[2916]: session opened for user root by (uid=0)',
        '- 1763468956 2005.11.09 dn228 Nov 9 12:01:01 dn228/dn228 crond(pam_unix)[2915]: session closed for user root',
        '- 1763468959 2005.11.09 en257 Nov 9 12:01:01 en257/en257 crond(pam_unix)[8950]: session closed for user root',
        '- 1763468957 2005.11.09 en257 Nov 9 12:01:01 en257/en257 crond(pam_unix)[8950]: session opened for user root by (uid=0)',
        '- 1763468959 2005.11.09 dn754 Nov 9 12:01:01 dn754/dn754 crond(pam_unix)[2913]: session opened for user root by (uid=0)',
        '- 1763468959 2005.11.09 en74 Nov 9 12:01:01 en74/en74 crond(pam_unix)[3080]: session closed for user root',
        '- 1763468956 2005.11.09 dn3 Nov 9 12:01:01 dn3/dn3 crond(pam_unix)[2907]: session closed for user root',
        '- 1763468956 2005.11.09 dn73 Nov 9 12:01:01 dn73/dn73 crond(pam_unix)[2917]: session closed for user root',
        '- 1763468959 2005.11.09 dn596 Nov 9 12:01:01 dn596/dn596 crond(pam_unix)[2727]: session opened for user root by (uid=0)',
        '- 1763468959 2005.11.09 dn73 Nov 9 12:01:01 dn73/dn73 crond(pam_unix)[2917]: session opened for user root by (uid=0)',
        '- 1763468959 2005.11.09 dn978 Nov 9 12:01:01 dn978/dn978 crond(pam_unix)[2920]: session opened for user root by (uid=0)',
        '- 1763468956 2005.11.09 dn261 Nov 9 12:01:01 dn261/dn261 crond[2908]: (root) CMD (run-parts /etc/cron.hourly)',
        '- 1763468957 2005.11.09 dn228 Nov 9 12:01:01 dn228/dn228 crond[2916]: (root) CMD (run-parts /etc/cron.hourly)',
        '- 1763468957 2005.11.09 eadmin1 Nov 9 12:01:01 src@eadmin1 crond(pam_unix)[4307]: session opened for user root by (uid=0)',
        '- 1763468956 2005.11.09 en74 Nov 9 12:01:01 en74/en74 crond[3081]: (root) CMD (run-parts /etc/cron.hourly)',
        '- 1763468956 2005.11.09 dn596 Nov 9 12:01:01 dn596/dn596 crond(pam_unix)[2727]: session closed for user root',
        '- 1763468957 2005.11.09 dn596 Nov 9 12:01:01 dn596/dn596 crond[2728]: (root) CMD (run-parts /etc/cron.hourly)',
        '- 1763468956 2005.11.09 en257 Nov 9 12:01:01 en257/en257 crond(pam_unix)[8950]: session closed for user root',
        '- 1763468957 2005.11.09 dn731 Nov 9 12:01:01 dn731/dn731 crond[2917]: (root) CMD (run-parts /etc/cron.hourly)',
        '- 1763468957 2005.11.09 dn73 Nov 9 12:01:01 dn73/dn73 crond(pam_unix)[2917]: session closed for user root',
        '- 1763468957 2005.11.09 en74 Nov 9 12:01:01 en74/en74 crond[3081]: (root) CMD (run-parts /etc/cron.hourly)',
        '- 1763468956 2005.11.09 dn978 Nov 9 12:01:01 dn978/dn978 crond(pam_unix)[2920]: session closed for user root',
      ];
      const result = extractDissectPattern(logs);
      expect(getPattern(result)).toBe(
        '- %{field_1} %{field_2} %{field_3->} %{field_4->} %{field_5->} %{field_6} %{field_7}] %{field_8->}: %{field_9} %{field_10} %{field_11} %{field_12}'
      );
    });
  });
});
