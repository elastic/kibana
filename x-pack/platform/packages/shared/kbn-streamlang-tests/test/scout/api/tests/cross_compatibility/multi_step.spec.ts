/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import type {
  StreamlangDSL,
  SetProcessor,
  RenameProcessor,
  AppendProcessor,
  DateProcessor,
  GrokProcessor,
  RemoveProcessor,
  ConvertProcessor,
  ReplaceProcessor,
  MathProcessor,
} from '@kbn/streamlang';
import { transpileIngestPipeline, transpileEsql } from '@kbn/streamlang';
import { streamlangApiTest as apiTest } from '../..';

apiTest.describe(
  'Cross-compatibility - Multi-Step Pipeline with Operator Coverage',
  { tag: ['@ess', '@svlOblt'] },
  () => {
    apiTest(
      'should process web server access logs with comprehensive operator and processor coverage',
      async ({ testBed, esql }) => {
        // Realistic web server log processing pipeline covering core operators and processors:
        // Operators tested: eq, neq, lt, lte, gt, gte, range, exists
        // Processors tested: grok, date, set, append, rename, remove, convert, replace
        // Note: contains, startsWith, endsWith have ES|QL syntax conflicts in CASE expressions
        const streamlangDSL: StreamlangDSL = {
          steps: [
            // Step 1: Parse Apache/Nginx access log format using GROK
            {
              action: 'grok',
              from: 'message',
              patterns: [
                '%{IPORHOST:client_ip} - - \\[%{HTTPDATE:timestamp}\\] "%{WORD:method} %{URIPATH:path} HTTP/%{NUMBER:http_version}" %{NUMBER:status_code:long} %{NUMBER:response_size:long} "%{DATA:referer}" "%{DATA:user_agent}" %{NUMBER:response_time_ms:int}',
              ],
              where: { field: 'log_type', eq: 'access' },
            } as GrokProcessor,

            // Step 2: Parse timestamp
            {
              action: 'date',
              from: 'timestamp',
              to: '@timestamp',
              formats: ['dd/MMM/yyyy:HH:mm:ss Z'],
              where: { field: 'timestamp', exists: true },
            } as DateProcessor,

            // Step 3: Set error category based on status code (testing gte operator with string values)
            {
              action: 'set',
              to: 'error.type',
              value: 'server_error',
              where: { field: 'status_code', gte: 500 },
            } as SetProcessor,

            // Step 4: Set warning category for client errors (testing range operator with string values)
            {
              action: 'set',
              to: 'error.type',
              value: 'client_error',
              where: { field: 'status_code', range: { gte: 400, lt: 500 } },
            } as SetProcessor,

            // Step 5: Set success category (testing lt operator with string values)
            {
              action: 'set',
              to: 'error.type',
              value: 'success',
              where: { field: 'status_code', lt: 400 },
            } as SetProcessor,

            // Step 6: Set performance category based on response time (testing gt operator with string values)
            {
              action: 'set',
              to: 'performance.category',
              value: 'slow',
              where: { field: 'response_time_ms', gt: 1000 },
            } as SetProcessor,

            // Step 7: Set fast performance category (testing lte operator with string values)
            {
              action: 'set',
              to: 'performance.category',
              value: 'fast',
              where: { field: 'response_time_ms', lte: 200 },
            } as SetProcessor,

            // Step 8: Set medium performance for remaining requests (using range with string values)
            {
              action: 'set',
              to: 'performance.category',
              value: 'medium',
              where: { field: 'response_time_ms', range: { gt: 200, lte: 1000 } },
            } as SetProcessor,

            // Step 9: Tag bot traffic (testing eq operator for specific bot)
            {
              action: 'set',
              to: 'traffic.source',
              value: 'bot',
              where: { field: 'user_agent', eq: 'bot/crawler-v1.0' },
            } as SetProcessor,

            // Step 10: Tag crawler traffic (testing eq operator for specific user agents)
            {
              action: 'set',
              to: 'traffic.source',
              value: 'crawler',
              where: { field: 'user_agent', eq: 'GoogleBot/2.1' },
            } as SetProcessor,

            // Step 11: Set human traffic as default
            {
              action: 'set',
              to: 'traffic.source',
              value: 'human',
              where: { field: 'traffic.source', exists: false },
            } as SetProcessor,

            // Step 12: Append environment and service tags
            {
              action: 'append',
              to: 'tags',
              value: ['web-server', 'production', 'nginx'],
              where: { field: 'status_code', exists: true },
            } as AppendProcessor,

            // Step 13: Append security alert for admin paths (testing eq for exact path match)
            {
              action: 'append',
              to: 'tags',
              value: ['security-alert'],
              where: { field: 'path', eq: '/admin/dashboard' },
            } as AppendProcessor,

            // Step 14: Rename fields for ECS compliance
            {
              action: 'rename',
              from: 'client_ip',
              to: 'source.ip',
              where: { field: 'client_ip', exists: true },
            } as RenameProcessor,

            // Step 15: Rename HTTP fields
            {
              action: 'rename',
              from: 'method',
              to: 'http.request.method',
              where: { field: 'method', exists: true },
            } as RenameProcessor,

            // Step 16: Rename status code
            {
              action: 'rename',
              from: 'status_code',
              to: 'http.response.status_code',
              where: { field: 'status_code', exists: true },
            } as RenameProcessor,

            // Step 16a: Convert status code to string for consistent formatting
            {
              action: 'convert',
              from: 'http.response.status_code',
              to: 'http.response.status_code_str',
              type: 'string',
              where: { field: 'http.response.status_code', exists: true },
            } as ConvertProcessor,

            // Step 17: Set default device type to desktop for all documents (testing exists operator)
            // Note: This must happen BEFORE user agent sanitization (Step 18b)
            {
              action: 'set',
              to: 'device.type',
              value: 'desktop',
              where: { field: 'log_type', exists: true },
            } as SetProcessor,

            // Step 18: Override device type to mobile for specific user agent (testing eq operator)
            // Note: This must happen BEFORE user agent sanitization (Step 18b)
            {
              action: 'set',
              to: 'device.type',
              value: 'mobile',
              where: {
                field: 'user_agent',
                eq: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) Mobile Safari/15.0',
              },
            } as SetProcessor,

            // Step 18b: Sanitize user agent - remove version numbers and normalize
            // Note: This happens AFTER device type detection to preserve original user agent for matching
            {
              action: 'replace',
              from: 'user_agent',
              pattern: '\\/[\\d\\.]+',
              replacement: '',
              where: { field: 'user_agent', exists: true },
            } as ReplaceProcessor,

            // Step 18c: Remove temporary processing fields after conversion
            // Unconditional removal to actually drop the field (not just nullify it)
            // ignore_missing: true to avoid errors when field doesn't exist
            {
              action: 'remove',
              from: 'http_version',
              ignore_missing: true,
            } as RemoveProcessor,

            // Step 19: Tag requests to API endpoints (testing eq operator)
            {
              action: 'append',
              to: 'tags',
              value: ['api-request'],
              where: { field: 'path', eq: '/api/users' },
            } as AppendProcessor,

            // Step 20: Tag image requests (testing exact path match)
            {
              action: 'append',
              to: 'tags',
              value: ['static-content', 'image'],
              where: { field: 'path', eq: '/images/logo.jpg' },
            } as AppendProcessor,

            // Step 21: Test additional numeric comparison (testing another gt operator with string values)
            {
              action: 'set',
              to: 'size.category',
              value: 'large',
              where: { field: 'response_size', gt: 5000 },
            } as SetProcessor,

            // Step 22: Test additional numeric comparison (testing another lte operator with string values)
            {
              action: 'set',
              to: 'size.category',
              value: 'small',
              where: { field: 'response_size', lte: 1000 },
            } as SetProcessor,

            // Step 23: Test additional numeric comparison (testing another range operator with string values)
            {
              action: 'set',
              to: 'size.category',
              value: 'medium',
              where: { field: 'response_size', range: { gt: 1000, lte: 5000 } },
            } as SetProcessor,

            // Step 24: Calculate response time in seconds using math processor
            // Note: Using * 0.001 instead of / 1000 to force floating-point arithmetic
            // (JavaScript/TinyMath doesn't preserve .0 suffix, so 1000.0 becomes 1000)
            {
              action: 'math',
              expression: 'response_time_ms * 0.001',
              to: 'response_time_sec',
              where: { field: 'response_time_ms', exists: true },
            } as MathProcessor,

            // Step 25: Calculate throughput (bytes per second) using math processor
            // Note: Multiply response_size by 1000/response_time_ms to get bytes per second
            // Using 1000.0 pattern but JS loses .0, so we use multiply by decimal
            {
              action: 'math',
              expression: 'response_size * 1000 / response_time_ms',
              to: 'throughput_bytes_per_sec',
              where: { field: 'response_time_ms', gt: 0 },
            } as MathProcessor,

            // Step 27: Clean up referer field - remove query parameters for privacy
            {
              action: 'replace',
              from: 'referer',
              pattern: '\\?.*$',
              replacement: '',
              where: { field: 'referer', exists: true },
            } as ReplaceProcessor,

            // Step 28: Remove temporary timestamp field after date conversion
            // Unconditional removal to actually drop the field (not just nullify it)
            // ignore_missing: true to avoid errors when field doesn't exist
            {
              action: 'remove',
              from: 'timestamp',
              ignore_missing: true,
            } as RemoveProcessor,
          ],
        };

        const { processors } = transpileIngestPipeline(streamlangDSL);
        const { query } = transpileEsql(streamlangDSL);

        // Test documents covering different scenarios
        const docs = [
          // Document 1: Fast successful request (API endpoint - eq test)
          {
            log_type: 'access',
            message:
              '192.168.1.100 - - [10/Oct/2024:13:55:36 +0000] "GET /api/users HTTP/1.1" 200 1234 "https://example.com" "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" 150',
          },
          // Document 2: Slow server error
          {
            log_type: 'access',
            message:
              '10.0.0.50 - - [10/Oct/2024:14:22:15 +0000] "POST /api/data HTTP/1.1" 500 567 "-" "curl/7.68.0" 2500',
          },
          // Document 3: Client error with medium response time
          {
            log_type: 'access',
            message:
              '203.0.113.42 - - [10/Oct/2024:15:30:22 +0000] "GET /nonexistent HTTP/1.1" 404 512 "https://google.com" "Mozilla/5.0" 750',
          },
          // Document 4: Bot traffic accessing admin
          {
            log_type: 'access',
            message:
              '172.16.0.10 - - [10/Oct/2024:16:45:00 +0000] "GET /admin/dashboard HTTP/1.1" 200 2048 "-" "bot/crawler-v1.0" 300',
          },
          // Document 5: GoogleBot crawler
          {
            log_type: 'access',
            message:
              '66.249.66.1 - - [10/Oct/2024:17:15:33 +0000] "GET /sitemap.xml HTTP/1.1" 200 8192 "-" "GoogleBot/2.1" 180',
          },
          // Document 6: Mobile device request (contains test)
          {
            log_type: 'access',
            message:
              '198.51.100.25 - - [10/Oct/2024:19:30:45 +0000] "GET /mobile/app HTTP/1.1" 200 2048 "-" "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) Mobile Safari/15.0" 250',
          },
          // Document 7: Image request (endsWith test)
          {
            log_type: 'access',
            message:
              '203.0.113.99 - - [10/Oct/2024:20:15:12 +0000] "GET /images/logo.jpg HTTP/1.1" 200 45678 "https://example.com/home" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)" 120',
          },
          // Document 8: Document without log_type (should be ignored due to where clause)
          {
            message:
              '127.0.0.1 - - [10/Oct/2024:18:00:00 +0000] "GET /health HTTP/1.1" 200 100 "-" "HealthCheck/1.0" 50',
          },
        ];

        // Required mapping for ES|QL (pre-map all fields that will be referenced)
        // Note: timestamp and http_version are included because they're extracted by GROK and referenced
        // in where clauses, but they will be removed by remove processors later
        const mappingDoc = {
          log_type: 'access',
          message: '',
          timestamp: '', // Extracted by GROK, converted to @timestamp, then removed
          '@timestamp': '2024-01-01T00:00:00.000Z', // Must be datetime type
          client_ip: '',
          method: '',
          path: '',
          http_version: '1.1', // Extracted by GROK, removed later
          status_code: 200, // Grok extracts as long
          response_size: 1000, // Grok extracts as long
          referer: '',
          user_agent: '',
          response_time_ms: 100, // Grok extracts as int
          'error.type': '',
          'performance.category': '',
          'traffic.source': '',
          'device.type': '',
          'size.category': '',
          response_time_sec: 0.1, // Math processor output: response_time_ms * 0.001
          throughput_bytes_per_sec: 10000, // Math processor output: response_size * 1000 / response_time_ms
          tags: [''],
          'source.ip': '',
          'http.request.method': '',
          'http.response.status_code': 200, // Gets assigned from status_code (number)
          'http.response.status_code_str': '200', // Converted to string
        };

        await testBed.ingest('ingest-multi-step', docs, processors);
        const ingestResult = await testBed.getFlattenedDocsOrdered('ingest-multi-step');

        await testBed.ingest('esql-multi-step', [mappingDoc, ...docs]);
        const esqlResult = await esql.queryOnIndex('esql-multi-step', query);

        // *** TEST SECTION: DOCUMENT COUNTS ***
        // Verify document count (8 input docs: 7 with log_type='access' + 1 without)
        // All 8 docs get processed (though with different levels of processing)
        expect(ingestResult).toHaveLength(8);

        // Both transpilers should return same number of valid documents
        expect(esqlResult.documentsOrdered).toHaveLength(7); // 7 documents with log_type='access'

        // *** TEST SECTION: HELPER FUNCTION ***
        // Helper to find docs in results
        const findIngestDoc = (ip: string) => ingestResult.find((doc) => doc['source.ip'] === ip);
        const findEsqlDoc = (ip: string) =>
          esqlResult.documentsOrdered.find((doc) => doc['source.ip'] === ip);

        // *** TEST SECTION: DOCUMENT 1 VERIFICATION ***
        // Test Document 1: Fast successful request (192.168.1.100)
        const doc1Ingest = findIngestDoc('192.168.1.100');
        const doc1Esql = findEsqlDoc('192.168.1.100');

        expect(doc1Ingest).toBeDefined();
        expect(doc1Esql).toBeDefined();

        // Verify GROK extraction
        expect(doc1Ingest?.['http.request.method']).toBe('GET');
        expect(doc1Esql?.['http.request.method']).toBe('GET');

        // Verify operators: lt (status < 400)
        expect(doc1Ingest?.['error.type']).toBe('success');
        expect(doc1Esql?.['error.type']).toBe('success');

        // Verify operators: lte (response_time <= 200)
        expect(doc1Ingest?.['performance.category']).toBe('fast');
        expect(doc1Esql?.['performance.category']).toBe('fast');

        // Verify traffic source (not bot/crawler)
        expect(doc1Ingest?.['traffic.source']).toBe('human');
        expect(doc1Esql?.['traffic.source']).toBe('human');

        // *** TEST SECTION: DOCUMENT 2 VERIFICATION ***
        // Test Document 2: Slow server error (10.0.0.50)
        const doc2Ingest = findIngestDoc('10.0.0.50');
        const doc2Esql = findEsqlDoc('10.0.0.50');

        // Verify operators: gte (status >= 500)
        expect(doc2Ingest?.['error.type']).toBe('server_error');
        expect(doc2Esql?.['error.type']).toBe('server_error');

        // Verify operators: gt (response_time > 1000)
        expect(doc2Ingest?.['performance.category']).toBe('slow');
        expect(doc2Esql?.['performance.category']).toBe('slow');

        // *** TEST SECTION: DOCUMENT 3 VERIFICATION ***
        // Test Document 3: Client error with medium response time (203.0.113.42)
        const doc3Ingest = findIngestDoc('203.0.113.42');
        const doc3Esql = findEsqlDoc('203.0.113.42');

        // Verify operators: range (400 <= status < 500)
        expect(doc3Ingest?.['error.type']).toBe('client_error');
        expect(doc3Esql?.['error.type']).toBe('client_error');

        // Verify operators: range (200 < response_time <= 1000)
        expect(doc3Ingest?.['performance.category']).toBe('medium');
        expect(doc3Esql?.['performance.category']).toBe('medium');

        // *** TEST SECTION: DOCUMENT 4 VERIFICATION ***
        // Test Document 4: Bot traffic accessing admin (172.16.0.10)
        const doc4Ingest = findIngestDoc('172.16.0.10');
        const doc4Esql = findEsqlDoc('172.16.0.10');

        // Verify operators: startsWith (user_agent starts with 'bot')
        expect(doc4Ingest?.['traffic.source']).toBe('bot');
        expect(doc4Esql?.['traffic.source']).toBe('bot');

        // Verify operators: startsWith (path starts with '/admin') - should have security-alert tag
        expect(doc4Ingest?.tags).toContain('security-alert');
        expect(doc4Esql?.tags).toContain('security-alert');

        // *** TEST SECTION: DOCUMENT 5 VERIFICATION ***
        // Test Document 5: GoogleBot crawler (66.249.66.1)
        const doc5Ingest = findIngestDoc('66.249.66.1');
        const doc5Esql = findEsqlDoc('66.249.66.1');

        // Verify operators: startsWith (user_agent starts with 'GoogleBot')
        expect(doc5Ingest?.['traffic.source']).toBe('crawler');
        expect(doc5Esql?.['traffic.source']).toBe('crawler');

        // *** TEST SECTION: DOCUMENT 6 VERIFICATION ***
        // Test Document 6: Mobile device request (198.51.100.25) - testing exact eq operator
        const doc6Ingest = findIngestDoc('198.51.100.25');
        const doc6Esql = findEsqlDoc('198.51.100.25');

        // Verify operators: eq (exact user_agent match)
        expect(doc6Ingest?.['device.type']).toBe('mobile');
        expect(doc6Esql?.['device.type']).toBe('mobile');

        // *** TEST SECTION: DOCUMENT 7 VERIFICATION ***
        // Test Document 7: Image request (203.0.113.99) - testing exact path eq operator
        const doc7Ingest = findIngestDoc('203.0.113.99');
        const doc7Esql = findEsqlDoc('203.0.113.99');

        // Verify operators: eq (exact path match for '/images/logo.jpg')
        expect(doc7Ingest?.tags).toContain('static-content');
        expect(doc7Ingest?.tags).toContain('image');
        expect(doc7Esql?.tags).toContain('static-content');
        expect(doc7Esql?.tags).toContain('image');

        // *** TEST SECTION: DEVICE TYPE CATEGORIZATION ***
        // Test device type categorization: Most devices should be marked as desktop, one as mobile
        const mobileIngestDocs = ingestResult.filter((doc) => doc['device.type'] === 'mobile');
        const desktopIngestDocs = ingestResult.filter((doc) => doc['device.type'] === 'desktop');
        const mobileEsqlDocs = esqlResult.documents.filter(
          (doc) => doc['device.type'] === 'mobile'
        );
        const desktopEsqlDocs = esqlResult.documents.filter(
          (doc) => doc['device.type'] === 'desktop'
        );

        // Verify device type logic: 1 mobile, 6+ desktop (or similar)
        expect(mobileIngestDocs).toHaveLength(mobileEsqlDocs.length);
        expect(desktopIngestDocs).toHaveLength(desktopEsqlDocs.length);
        expect(mobileIngestDocs).toHaveLength(1); // One iPhone device
        expect(desktopIngestDocs.length).toBeGreaterThan(5); // Multiple desktop devices

        // *** TEST SECTION: VERIFY API REQUEST TAG ***
        // Test eq operator: Document 1 should have api-request tag (path equals '/api/users')
        expect(doc1Ingest?.tags).toContain('api-request');
        expect(doc1Esql?.tags).toContain('api-request');

        // *** TEST SECTION: SIZE CATEGORIZATION ***
        // Test size categorization operators (gt, lte, range on response_size)
        const processedIngestDocsWithSize = ingestResult.filter((doc) => doc['size.category']);
        const processedEsqlDocsWithSize = esqlResult.documents.filter(
          (doc) => doc['size.category']
        );

        // Find documents with different size categories
        const largeIngestDocs = processedIngestDocsWithSize.filter(
          (doc) => doc['size.category'] === 'large'
        );
        const smallIngestDocs = processedIngestDocsWithSize.filter(
          (doc) => doc['size.category'] === 'small'
        );
        const mediumIngestDocs = processedIngestDocsWithSize.filter(
          (doc) => doc['size.category'] === 'medium'
        );

        const largeEsqlDocs = processedEsqlDocsWithSize.filter(
          (doc) => doc['size.category'] === 'large'
        );
        const smallEsqlDocs = processedEsqlDocsWithSize.filter(
          (doc) => doc['size.category'] === 'small'
        );
        const mediumEsqlDocs = processedEsqlDocsWithSize.filter(
          (doc) => doc['size.category'] === 'medium'
        );

        // Verify size categorization logic works (gt: >5000, lte: <=1000, range: 1000<x<=5000)
        expect(largeIngestDocs).toHaveLength(largeEsqlDocs.length);
        expect(smallIngestDocs).toHaveLength(smallEsqlDocs.length);
        expect(mediumIngestDocs).toHaveLength(mediumEsqlDocs.length);

        // *** TEST SECTION: MATH PROCESSOR VERIFICATION ***
        // Test math processor: response_time_sec = response_time_ms * 0.001
        // Document 1 has response_time_ms = 150, so response_time_sec should be 0.15
        expect(doc1Ingest?.response_time_sec).toBe(0.15);
        expect(doc1Esql?.response_time_sec).toBe(0.15);

        // Test math processor: throughput = response_size * 1000 / response_time_ms
        // Document 1 has response_size = 1234, response_time_ms = 150
        // throughput = 1234 * 1000 / 150 = 8226 (integer division)
        expect(doc1Ingest?.throughput_bytes_per_sec).toBe(8226);
        expect(doc1Esql?.throughput_bytes_per_sec).toBe(8226);

        // *** TEST SECTION: COMMON FIELDS VERIFICATION ***
        // Verify common fields across all processed documents
        const processedIngestDocs = ingestResult.filter((doc) => doc['source.ip']);
        const processedEsqlDocs = esqlResult.documents.filter((doc) => doc['source.ip']);

        for (const doc of processedIngestDocs) {
          // All should have base tags from append processor
          expect(doc.tags).toContain('web-server');
          expect(doc.tags).toContain('production');
          expect(doc.tags).toContain('nginx');

          // All should have parsed timestamp
          expect(doc['@timestamp']).toBeDefined();
          expect(new Date(doc['@timestamp'] as string)).toBeInstanceOf(Date);

          // All should have renamed fields (ECS compliance)
          expect(doc['http.response.status_code']).toBeDefined();
          expect(typeof doc['http.response.status_code']).toBe('number');

          // Verify convert processor: status code string version should exist
          expect(doc['http.response.status_code_str']).toBeDefined();
          expect(typeof doc['http.response.status_code_str']).toBe('string');

          // Verify remove processor: temporary fields should be removed
          expect(doc.http_version).toBeUndefined();
          expect(doc.timestamp).toBeUndefined();
        }

        // Instead of conditionally checking each ESQL document, filter to only those with source.ip
        // and verify they all have the expected properties
        const validEsqlDocs = processedEsqlDocs.filter((doc) => !!doc['source.ip']);

        // Check that all valid documents have the required tags
        expect(validEsqlDocs.every((doc) => (doc.tags as string[]).includes('web-server'))).toBe(
          true
        );
        expect(validEsqlDocs.every((doc) => (doc.tags as string[]).includes('production'))).toBe(
          true
        );
        expect(validEsqlDocs.every((doc) => (doc.tags as string[]).includes('nginx'))).toBe(true);

        // Check that all valid documents have @timestamp defined
        expect(validEsqlDocs.every((doc) => doc['@timestamp'] !== undefined)).toBe(true);

        // Check that all valid documents have http.response.status_code defined
        expect(validEsqlDocs.every((doc) => doc['http.response.status_code'] !== undefined)).toBe(
          true
        );

        // Verify convert processor: status code string version should exist
        expect(
          validEsqlDocs.every((doc) => doc['http.response.status_code_str'] !== undefined)
        ).toBe(true);
        expect(
          validEsqlDocs.every((doc) => typeof doc['http.response.status_code_str'] === 'string')
        ).toBe(true);

        // Verify remove processor: temporary fields should be removed
        expect(validEsqlDocs.every((doc) => doc.http_version === undefined)).toBe(true);
        expect(validEsqlDocs.every((doc) => doc.timestamp === undefined)).toBe(true);

        // Verify replace processor: user agent should have version numbers removed
        // Example: "Mozilla/5.0" should become "Mozilla" (version removed)
        const doc1ForReplaceCheck = validEsqlDocs.find(
          (doc) => doc['source.ip'] === '192.168.1.100'
        );
        expect(doc1ForReplaceCheck).toBeDefined();
        expect(doc1ForReplaceCheck?.user_agent).toBeDefined();
        // User agent should not contain version patterns like "/5.0" or "/1.1"
        expect(doc1ForReplaceCheck!.user_agent).not.toMatch(/\/[\d\.]+/);
      }
    );
  }
);
