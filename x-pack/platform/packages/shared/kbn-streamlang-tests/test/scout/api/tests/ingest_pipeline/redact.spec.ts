/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import type { RedactProcessor, StreamlangDSL } from '@kbn/streamlang';
import { transpile } from '@kbn/streamlang/src/transpilers/ingest_pipeline';
import { streamlangApiTest as apiTest } from '../..';

apiTest.describe(
  'Streamlang to Ingest Pipeline - Redact Processor',
  { tag: ['@ess', '@svlOblt'] },
  () => {
    apiTest('should redact IP address with default prefix/suffix', async ({ testBed }) => {
      const indexName = 'streams-e2e-test-redact-ip-basic';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'redact',
            from: 'message',
            patterns: ['%{IP:client_ip}'],
          } as RedactProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [{ message: 'Connection from 192.168.1.1 established' }];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);
      expect(ingestedDocs).toHaveLength(1);
      expect(ingestedDocs[0]).toStrictEqual(
        expect.objectContaining({ message: 'Connection from <client_ip> established' })
      );
    });

    apiTest('should redact email address', async ({ testBed }) => {
      const indexName = 'streams-e2e-test-redact-email';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'redact',
            from: 'message',
            patterns: ['%{EMAILADDRESS:email}'],
          } as RedactProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [{ message: 'Contact user at john.doe@example.com for details' }];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);
      expect(ingestedDocs).toHaveLength(1);
      expect(ingestedDocs[0]).toStrictEqual(
        expect.objectContaining({ message: 'Contact user at <email> for details' })
      );
    });

    apiTest('should redact multiple patterns', async ({ testBed }) => {
      const indexName = 'streams-e2e-test-redact-multiple';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'redact',
            from: 'message',
            patterns: ['%{IP:ip}', '%{EMAILADDRESS:email}'],
          } as RedactProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [{ message: 'User john@example.com connected from 10.0.0.1' }];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);
      expect(ingestedDocs).toHaveLength(1);
      expect(ingestedDocs[0]).toStrictEqual(
        expect.objectContaining({ message: 'User <email> connected from <ip>' })
      );
    });

    apiTest('should redact with custom prefix and suffix', async ({ testBed }) => {
      const indexName = 'streams-e2e-test-redact-custom-delimiters';

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

      const { processors } = transpile(streamlangDSL);

      const docs = [{ message: 'Request from 172.16.0.1' }];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);
      expect(ingestedDocs).toHaveLength(1);
      expect(ingestedDocs[0]).toStrictEqual(
        expect.objectContaining({ message: 'Request from [REDACTED:client]' })
      );
    });

    apiTest('should redact MAC address', async ({ testBed }) => {
      const indexName = 'streams-e2e-test-redact-mac';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'redact',
            from: 'message',
            patterns: ['%{MAC:mac_address}'],
          } as RedactProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [{ message: 'Device MAC: 00:1A:2B:3C:4D:5E' }];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);
      expect(ingestedDocs).toHaveLength(1);
      expect(ingestedDocs[0]).toStrictEqual(
        expect.objectContaining({ message: 'Device MAC: <mac_address>' })
      );
    });

    apiTest(
      'should ignore missing field when ignore_missing is true (default)',
      async ({ testBed }) => {
        const indexName = 'streams-e2e-test-redact-ignore-missing';

        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'redact',
              from: 'nonexistent',
              patterns: ['%{IP:ip}'],
              // ignore_missing defaults to true for redact
            } as RedactProcessor,
          ],
        };

        const { processors } = transpile(streamlangDSL);

        const docs = [{ message: 'some_value' }]; // Not including 'nonexistent' field
        await testBed.ingest(indexName, docs, processors);

        const ingestedDocs = await testBed.getDocs(indexName);
        expect(ingestedDocs).toHaveLength(1);
        expect(ingestedDocs[0]).toStrictEqual(expect.objectContaining({ message: 'some_value' }));
        expect((ingestedDocs[0] as Record<string, unknown>).nonexistent).toBeUndefined();
      }
    );

    apiTest('should fail if field is missing and ignore_missing is false', async ({ testBed }) => {
      const indexName = 'streams-e2e-test-redact-fail-missing';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'redact',
            from: 'nonexistent',
            patterns: ['%{IP:ip}'],
            ignore_missing: false,
          } as RedactProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [{ message: 'some_value' }]; // Not including 'nonexistent' field
      const { errors } = await testBed.ingest(indexName, docs, processors);
      expect(errors).toHaveLength(1);
      expect(errors[0].type).toBe('illegal_argument_exception');
    });

    apiTest('should redact field conditionally with where condition', async ({ testBed }) => {
      const indexName = 'streams-e2e-test-redact-conditional';

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

      const { processors } = transpile(streamlangDSL);

      const docs = [
        { message: 'Connection from 192.168.1.1', environment: 'production' },
        { message: 'Connection from 192.168.1.2', environment: 'development' },
      ];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);
      expect(ingestedDocs).toHaveLength(2);

      // Production doc should have IP redacted
      const prodDoc = ingestedDocs.find((d: any) => d.environment === 'production');
      expect(prodDoc).toStrictEqual(expect.objectContaining({ message: 'Connection from <ip>' }));

      // Development doc should keep original IP
      const devDoc = ingestedDocs.find((d: any) => d.environment === 'development');
      expect(devDoc).toStrictEqual(
        expect.objectContaining({ message: 'Connection from 192.168.1.2' })
      );
    });

    apiTest('should redact UUID', async ({ testBed }) => {
      const indexName = 'streams-e2e-test-redact-uuid';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'redact',
            from: 'message',
            patterns: ['%{UUID:user_id}'],
          } as RedactProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [{ message: 'User 550e8400-e29b-41d4-a716-446655440000 logged in' }];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);
      expect(ingestedDocs).toHaveLength(1);
      expect(ingestedDocs[0]).toStrictEqual(
        expect.objectContaining({ message: 'User <user_id> logged in' })
      );
    });

    apiTest('should not modify field when no pattern matches', async ({ testBed }) => {
      const indexName = 'streams-e2e-test-redact-no-match';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'redact',
            from: 'message',
            patterns: ['%{IP:ip}'],
          } as RedactProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [{ message: 'Hello world, no IP here' }];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);
      expect(ingestedDocs).toHaveLength(1);
      expect(ingestedDocs[0]).toStrictEqual(
        expect.objectContaining({ message: 'Hello world, no IP here' })
      );
    });

    [
      {
        templateField: 'host.{{field_name}}',
        description: 'should reject {{ }} template syntax in field names',
      },
      {
        templateField: 'host.{{{field_name}}}',
        description: 'should reject {{{ }}} template syntax in field names',
      },
    ].forEach(({ templateField, description }) => {
      apiTest(`${description}`, async () => {
        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'redact',
              from: templateField,
              patterns: ['%{IP:ip}'],
            } as RedactProcessor,
          ],
        };

        expect(() => transpile(streamlangDSL)).toThrow(
          'Mustache template syntax {{ }} or {{{ }}} is not allowed in field names'
        );
      });
    });
  }
);
