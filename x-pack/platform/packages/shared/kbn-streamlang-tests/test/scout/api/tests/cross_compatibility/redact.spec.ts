/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import type { RedactProcessor, StreamlangDSL } from '@kbn/streamlang';
import { transpileIngestPipeline, transpileEsql } from '@kbn/streamlang';
import { streamlangApiTest as apiTest } from '../..';

apiTest.describe('Cross-compatibility - Redact Processor', { tag: ['@ess', '@svlOblt'] }, () => {
  // *** Compatible Cases ***
  apiTest(
    'should correctly redact IP address with default delimiters in both Ingest Pipeline and ES|QL',
    async ({ testBed, esql }) => {
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'redact',
            from: 'message',
            patterns: ['%{IP:client_ip}'],
          } as RedactProcessor,
        ],
      };

      const { processors } = transpileIngestPipeline(streamlangDSL);
      const { query } = transpileEsql(streamlangDSL);

      const docs = [{ message: 'Connection from 192.168.1.1 established' }];
      await testBed.ingest('ingest-redact-ip', docs, processors);
      const ingestResult = await testBed.getFlattenedDocsOrdered('ingest-redact-ip');

      await testBed.ingest('esql-redact-ip', docs);
      const esqlResult = await esql.queryOnIndex('esql-redact-ip', query);

      expect(ingestResult[0]).toStrictEqual(esqlResult.documentsWithoutKeywords[0]);
      expect(ingestResult[0]).toStrictEqual(
        expect.objectContaining({ message: 'Connection from <client_ip> established' })
      );
    }
  );

  apiTest(
    'should correctly redact email address in both Ingest Pipeline and ES|QL',
    async ({ testBed, esql }) => {
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'redact',
            from: 'message',
            patterns: ['%{EMAILADDRESS:email}'],
          } as RedactProcessor,
        ],
      };

      const { processors } = transpileIngestPipeline(streamlangDSL);
      const { query } = transpileEsql(streamlangDSL);

      const docs = [{ message: 'Contact user at john.doe@example.com for details' }];
      await testBed.ingest('ingest-redact-email', docs, processors);
      const ingestResult = await testBed.getFlattenedDocsOrdered('ingest-redact-email');

      await testBed.ingest('esql-redact-email', docs);
      const esqlResult = await esql.queryOnIndex('esql-redact-email', query);

      expect(ingestResult[0]).toStrictEqual(esqlResult.documentsWithoutKeywords[0]);
      expect(ingestResult[0]).toStrictEqual(
        expect.objectContaining({ message: 'Contact user at <email> for details' })
      );
    }
  );

  apiTest(
    'should correctly redact multiple patterns in both Ingest Pipeline and ES|QL',
    async ({ testBed, esql }) => {
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'redact',
            from: 'message',
            patterns: ['%{IP:ip}', '%{EMAILADDRESS:email}'],
          } as RedactProcessor,
        ],
      };

      const { processors } = transpileIngestPipeline(streamlangDSL);
      const { query } = transpileEsql(streamlangDSL);

      const docs = [{ message: 'User john@example.com connected from 10.0.0.1' }];
      await testBed.ingest('ingest-redact-multiple', docs, processors);
      const ingestResult = await testBed.getFlattenedDocsOrdered('ingest-redact-multiple');

      await testBed.ingest('esql-redact-multiple', docs);
      const esqlResult = await esql.queryOnIndex('esql-redact-multiple', query);

      expect(ingestResult[0]).toStrictEqual(esqlResult.documentsWithoutKeywords[0]);
      expect(ingestResult[0]).toStrictEqual(
        expect.objectContaining({ message: 'User <email> connected from <ip>' })
      );
    }
  );

  apiTest(
    'should correctly redact with custom prefix and suffix in both Ingest Pipeline and ES|QL',
    async ({ testBed, esql }) => {
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'redact',
            from: 'message',
            patterns: ['%{IP:client}'],
            prefix: '[REDACTED:',
            suffix: ']',
          } as RedactProcessor,
        ],
      };

      const { processors } = transpileIngestPipeline(streamlangDSL);
      const { query } = transpileEsql(streamlangDSL);

      const docs = [{ message: 'Request from 172.16.0.1' }];
      await testBed.ingest('ingest-redact-custom-delim', docs, processors);
      const ingestResult = await testBed.getFlattenedDocsOrdered('ingest-redact-custom-delim');

      await testBed.ingest('esql-redact-custom-delim', docs);
      const esqlResult = await esql.queryOnIndex('esql-redact-custom-delim', query);

      expect(ingestResult[0]).toStrictEqual(esqlResult.documentsWithoutKeywords[0]);
      expect(ingestResult[0]).toStrictEqual(
        expect.objectContaining({ message: 'Request from [REDACTED:client]' })
      );
    }
  );

  apiTest(
    'should correctly redact MAC address in both Ingest Pipeline and ES|QL',
    async ({ testBed, esql }) => {
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'redact',
            from: 'message',
            patterns: ['%{MAC:mac_address}'],
          } as RedactProcessor,
        ],
      };

      const { processors } = transpileIngestPipeline(streamlangDSL);
      const { query } = transpileEsql(streamlangDSL);

      const docs = [{ message: 'Device MAC: 00:1A:2B:3C:4D:5E' }];
      await testBed.ingest('ingest-redact-mac', docs, processors);
      const ingestResult = await testBed.getFlattenedDocsOrdered('ingest-redact-mac');

      await testBed.ingest('esql-redact-mac', docs);
      const esqlResult = await esql.queryOnIndex('esql-redact-mac', query);

      expect(ingestResult[0]).toStrictEqual(esqlResult.documentsWithoutKeywords[0]);
      expect(ingestResult[0]).toStrictEqual(
        expect.objectContaining({ message: 'Device MAC: <mac_address>' })
      );
    }
  );

  apiTest(
    'should support conditional redaction with where clause in both Ingest Pipeline and ES|QL',
    async ({ testBed, esql }) => {
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'redact',
            from: 'message',
            patterns: ['%{IP:ip}'],
            where: {
              field: 'environment',
              eq: 'production',
            },
          } as RedactProcessor,
        ],
      };

      const { processors } = transpileIngestPipeline(streamlangDSL);
      const { query } = transpileEsql(streamlangDSL);

      const docs = [
        { message: 'Connection from 192.168.1.1', environment: 'production' },
        { message: 'Connection from 192.168.1.2', environment: 'development' },
      ];
      await testBed.ingest('ingest-redact-conditional', docs, processors);
      const ingestResult = await testBed.getFlattenedDocsOrdered('ingest-redact-conditional');

      await testBed.ingest('esql-redact-conditional', docs);
      const esqlResult = await esql.queryOnIndex('esql-redact-conditional', query);

      // Both should produce the same results
      expect(ingestResult).toHaveLength(2);
      expect(esqlResult.documents).toHaveLength(2);

      const ingestDoc1 = ingestResult.find((d: any) => d.environment === 'production');
      const ingestDoc2 = ingestResult.find((d: any) => d.environment === 'development');
      const esqlDoc1 = esqlResult.documentsWithoutKeywords.find(
        (d: any) => d.environment === 'production'
      );
      const esqlDoc2 = esqlResult.documentsWithoutKeywords.find(
        (d: any) => d.environment === 'development'
      );

      expect(ingestDoc1).toStrictEqual(esqlDoc1);
      expect(ingestDoc2).toStrictEqual(esqlDoc2);
      expect(ingestDoc1).toStrictEqual(
        expect.objectContaining({ message: 'Connection from <ip>' })
      );
      expect(ingestDoc2).toStrictEqual(
        expect.objectContaining({ message: 'Connection from 192.168.1.2' })
      );
    }
  );

  apiTest(
    'should not modify field when no pattern matches in both Ingest Pipeline and ES|QL',
    async ({ testBed, esql }) => {
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'redact',
            from: 'message',
            patterns: ['%{IP:ip}'],
          } as RedactProcessor,
        ],
      };

      const { processors } = transpileIngestPipeline(streamlangDSL);
      const { query } = transpileEsql(streamlangDSL);

      const docs = [{ message: 'Hello world, no IP here' }];
      await testBed.ingest('ingest-redact-no-match', docs, processors);
      const ingestResult = await testBed.getFlattenedDocsOrdered('ingest-redact-no-match');

      await testBed.ingest('esql-redact-no-match', docs);
      const esqlResult = await esql.queryOnIndex('esql-redact-no-match', query);

      expect(ingestResult[0]).toStrictEqual(esqlResult.documentsWithoutKeywords[0]);
      expect(ingestResult[0]).toStrictEqual(
        expect.objectContaining({ message: 'Hello world, no IP here' })
      );
    }
  );

  apiTest(
    'should correctly redact UUID in both Ingest Pipeline and ES|QL',
    async ({ testBed, esql }) => {
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'redact',
            from: 'message',
            patterns: ['%{UUID:user_id}'],
          } as RedactProcessor,
        ],
      };

      const { processors } = transpileIngestPipeline(streamlangDSL);
      const { query } = transpileEsql(streamlangDSL);

      const docs = [{ message: 'User 550e8400-e29b-41d4-a716-446655440000 logged in' }];
      await testBed.ingest('ingest-redact-uuid', docs, processors);
      const ingestResult = await testBed.getFlattenedDocsOrdered('ingest-redact-uuid');

      await testBed.ingest('esql-redact-uuid', docs);
      const esqlResult = await esql.queryOnIndex('esql-redact-uuid', query);

      expect(ingestResult[0]).toStrictEqual(esqlResult.documentsWithoutKeywords[0]);
      expect(ingestResult[0]).toStrictEqual(
        expect.objectContaining({ message: 'User <user_id> logged in' })
      );
    }
  );

  apiTest(
    'should correctly redact URI in both Ingest Pipeline and ES|QL',
    async ({ testBed, esql }) => {
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'redact',
            from: 'message',
            patterns: ['%{URI:url}'],
          } as RedactProcessor,
        ],
      };

      const { processors } = transpileIngestPipeline(streamlangDSL);
      const { query } = transpileEsql(streamlangDSL);

      const docs = [{ message: 'Visited https://example.com/path?query=value today' }];
      await testBed.ingest('ingest-redact-uri', docs, processors);
      const ingestResult = await testBed.getFlattenedDocsOrdered('ingest-redact-uri');

      await testBed.ingest('esql-redact-uri', docs);
      const esqlResult = await esql.queryOnIndex('esql-redact-uri', query);

      expect(ingestResult[0]).toStrictEqual(esqlResult.documentsWithoutKeywords[0]);
      expect(ingestResult[0]).toStrictEqual(
        expect.objectContaining({ message: 'Visited <url> today' })
      );
    }
  );

  [
    {
      templateType: '{{ }}',
      from: '{{template_from}}',
    },
    {
      templateType: '{{{ }}}',
      from: '{{{template_from}}}',
    },
  ].forEach(({ templateType, from }) => {
    apiTest(
      `should consistently reject ${templateType} template syntax in both Ingest Pipeline and ES|QL transpilers`,
      async () => {
        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'redact',
              from,
              patterns: ['%{IP:ip}'],
            } as RedactProcessor,
          ],
        };

        // Both transpilers should reject Mustache template syntax
        expect(() => transpileIngestPipeline(streamlangDSL)).toThrow(
          'Mustache template syntax {{ }} or {{{ }}} is not allowed in field names'
        );
        expect(() => transpileEsql(streamlangDSL)).toThrow(
          'Mustache template syntax {{ }} or {{{ }}} is not allowed in field names'
        );
      }
    );
  });

  // *** Incompatible / Partially Compatible Cases ***
  // Note: The ES redact processor is a commercial feature, and the ESQL implementation
  // uses compiled Grok patterns with replace(), which should produce equivalent results
  // for most common patterns.
});
