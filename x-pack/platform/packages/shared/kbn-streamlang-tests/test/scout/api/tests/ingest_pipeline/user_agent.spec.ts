/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import type { UserAgentProcessor, StreamlangDSL } from '@kbn/streamlang';
import { transpile } from '@kbn/streamlang/src/transpilers/ingest_pipeline';
import { asDoc } from '../../fixtures/doc_utils';
import { streamlangApiTest as apiTest } from '../..';

apiTest.describe(
  'Streamlang to Ingest Pipeline - User Agent Processor',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    apiTest('should extract user agent details from a browser string', async ({ testBed }) => {
      const indexName = 'stream-e2e-test-user-agent';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'user_agent',
            from: 'http.user_agent',
          } as UserAgentProcessor,
        ],
      };

      const { processors } = await transpile(streamlangDSL);

      const docs = [
        {
          http: {
            user_agent:
              'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        },
      ];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);
      expect(ingestedDocs).toHaveLength(1);
      const source = asDoc(ingestedDocs[0]);
      const ua = asDoc(source.user_agent);

      // Default target field is 'user_agent'
      expect(ua.name).toBe('Chrome');
      expect(asDoc(ua.os).name).toBe('Mac OS X');
      expect(asDoc(ua.device).name).toBe('Mac');
    });

    apiTest('should extract user agent to a custom target field', async ({ testBed }) => {
      const indexName = 'stream-e2e-test-user-agent-custom-target';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'user_agent',
            from: 'agent_string',
            to: 'parsed_agent',
          } as UserAgentProcessor,
        ],
      };

      const { processors } = await transpile(streamlangDSL);

      const docs = [
        {
          agent_string:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
      ];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);
      expect(ingestedDocs).toHaveLength(1);
      const source = asDoc(ingestedDocs[0]);
      const parsed = asDoc(source.parsed_agent);

      expect(parsed.name).toBe('Chrome');
      expect(asDoc(parsed.os).name).toBe('Windows');
      expect(source.user_agent).toBeUndefined();
    });

    apiTest('should ignore missing field when ignore_missing is true', async ({ testBed }) => {
      const indexName = 'stream-e2e-test-user-agent-ignore-missing';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'user_agent',
            from: 'http.user_agent',
            ignore_missing: true,
          } as UserAgentProcessor,
        ],
      };

      const { processors } = await transpile(streamlangDSL);

      const docs = [{ log: { level: 'info' } }];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);
      expect(ingestedDocs).toHaveLength(1);
      const source = asDoc(ingestedDocs[0]);
      expect(source.user_agent).toBeUndefined();
    });

    apiTest('should fail if field is missing and ignore_missing is false', async ({ testBed }) => {
      const indexName = 'stream-e2e-test-user-agent-fail-missing';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'user_agent',
            from: 'http.user_agent',
            ignore_missing: false,
          } as UserAgentProcessor,
        ],
      };

      const { processors } = await transpile(streamlangDSL);

      const docs = [{ log: { level: 'info' } }];
      const { errors } = await testBed.ingest(indexName, docs, processors);
      expect(errors[0].reason).toContain('not present as part of path [http.user_agent]');
    });

    apiTest('should extract only specified properties', async ({ testBed }) => {
      const indexName = 'stream-e2e-test-user-agent-properties';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'user_agent',
            from: 'agent_string',
            properties: ['name', 'version'],
          } as UserAgentProcessor,
        ],
      };

      const { processors } = await transpile(streamlangDSL);

      const docs = [
        {
          agent_string:
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      ];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);
      expect(ingestedDocs).toHaveLength(1);
      const source = asDoc(ingestedDocs[0]);
      const ua = asDoc(source.user_agent);

      expect(asDoc(ua.name)).toBe('Chrome');
      expect(asDoc(ua.version)).toBe('120.0.0.0');
      expect(ua.os).toBeUndefined();
      expect(ua.device).toBeUndefined();
    });

    apiTest('should extract device type when extract_device_type is true', async ({ testBed }) => {
      const indexName = 'stream-e2e-test-user-agent-device-type';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'user_agent',
            from: 'agent_string',
            extract_device_type: true,
          } as UserAgentProcessor,
        ],
      };

      const { processors } = await transpile(streamlangDSL);

      const docs = [
        {
          agent_string:
            'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1',
        },
      ];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);
      expect(ingestedDocs).toHaveLength(1);
      const source = asDoc(ingestedDocs[0]);

      expect(asDoc(asDoc(source.user_agent).device).type).toBe('Phone');
    });

    apiTest('should apply user_agent only when where condition matches', async ({ testBed }) => {
      const indexName = 'stream-e2e-test-user-agent-where';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'user_agent',
            from: 'agent_string',
            where: {
              field: 'should_parse',
              eq: true,
            },
          } as UserAgentProcessor,
        ],
      };

      const { processors } = await transpile(streamlangDSL);

      const docs = [
        {
          agent_string:
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0',
          should_parse: true,
        },
        {
          agent_string: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0.4472.124',
          should_parse: false,
        },
      ];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocsOrdered(indexName);
      expect(ingestedDocs).toHaveLength(2);

      const first = asDoc(ingestedDocs[0]);
      const second = asDoc(ingestedDocs[1]);
      expect(asDoc(first.user_agent).name).toBe('Chrome');
      expect(second.user_agent).toBeUndefined();
    });

    [
      {
        templateFrom: '{{fromField}}',
        description: 'should reject {{ }} template syntax in field names',
      },
      {
        templateFrom: '{{{fromField}}}',
        description: 'should reject {{{ }}} template syntax in field names',
      },
    ].forEach(({ templateFrom, description }) => {
      apiTest(`${description}`, async () => {
        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'user_agent',
              from: templateFrom,
            } as UserAgentProcessor,
          ],
        };
        await expect(transpile(streamlangDSL)).rejects.toThrow(
          'Mustache template syntax {{ }} or {{{ }}} is not allowed in field names'
        );
      });
    });
  }
);
