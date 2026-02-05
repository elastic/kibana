/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
import type { UserAgentProcessor, StreamlangDSL } from '@kbn/streamlang';
import { transpile } from '@kbn/streamlang/src/transpilers/ingest_pipeline';
import { streamlangApiTest as apiTest } from '../..';

apiTest.describe(
  'Streamlang to Ingest Pipeline - User Agent Processor',
  { tag: ['@ess', '@svlOblt'] },
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

      const { processors } = transpile(streamlangDSL);

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
      const source = ingestedDocs[0];

      // Default target field is 'user_agent'
      expect(source).toHaveProperty('user_agent.name', 'Chrome');
      expect(source).toHaveProperty('user_agent.os.name', 'Mac OS X');
      expect(source).toHaveProperty('user_agent.device.name', 'Mac');
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

      const { processors } = transpile(streamlangDSL);

      const docs = [
        {
          agent_string:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
      ];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);
      expect(ingestedDocs).toHaveLength(1);
      const source = ingestedDocs[0];

      expect(source).toHaveProperty('parsed_agent.name', 'Chrome');
      expect(source).toHaveProperty('parsed_agent.os.name', 'Windows');
      expect(source).not.toHaveProperty('user_agent');
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

      const { processors } = transpile(streamlangDSL);

      const docs = [{ log: { level: 'info' } }]; // No 'http.user_agent' field
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);
      expect(ingestedDocs).toHaveLength(1);
      const source = ingestedDocs[0];
      expect(source).not.toHaveProperty('user_agent');
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

      const { processors } = transpile(streamlangDSL);

      const docs = [{ log: { level: 'info' } }]; // 'http.user_agent' field is missing
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

      const { processors } = transpile(streamlangDSL);

      const docs = [
        {
          agent_string:
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      ];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);
      expect(ingestedDocs).toHaveLength(1);
      const source = ingestedDocs[0];

      expect(source).toHaveProperty('user_agent.name', 'Chrome');
      expect(source).toHaveProperty('user_agent.version', '120.0.0.0');
      // Should not have other properties like os or device
      expect(source).not.toHaveProperty('user_agent.os');
      expect(source).not.toHaveProperty('user_agent.device');
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

      const { processors } = transpile(streamlangDSL);

      const docs = [
        {
          agent_string:
            'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1',
        },
      ];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);
      expect(ingestedDocs).toHaveLength(1);
      const source = ingestedDocs[0];

      expect(source).toHaveProperty('user_agent.device.type', 'Phone');
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

      const { processors } = transpile(streamlangDSL);

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

      // First document should have user_agent parsed
      expect(ingestedDocs[0]).toHaveProperty('user_agent.name', 'Chrome');

      // Second document should NOT have user_agent parsed
      expect(ingestedDocs[1]).not.toHaveProperty('user_agent');
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
        expect(() => {
          const streamlangDSL: StreamlangDSL = {
            steps: [
              {
                action: 'user_agent',
                from: templateFrom,
              } as UserAgentProcessor,
            ],
          };
          transpile(streamlangDSL);
        }).toThrow('Mustache template syntax {{ }} or {{{ }}} is not allowed');
      });
    });
  }
);
