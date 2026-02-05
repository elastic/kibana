/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
import type { UserAgentProcessor, StreamlangDSL } from '@kbn/streamlang';
import { transpileIngestPipeline, transpileEsql } from '@kbn/streamlang';
import { streamlangApiTest as apiTest } from '../..';

apiTest.describe(
  'Cross-compatibility - User Agent Processor',
  { tag: ['@ess', '@svlOblt'] },
  () => {
    // *** Ingest Pipeline Only ***
    // ES|QL does not currently support user_agent parsing.
    // The ES|QL transpiler emits a warning instead of a USER_AGENT command.
    // These tests verify Ingest Pipeline works correctly and ES|QL emits warning.

    apiTest(
      'should extract user agent in ingest pipeline (ES|QL emits warning)',
      async ({ testBed }) => {
        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'user_agent',
              from: 'agent_string',
              to: 'parsed_agent',
            } as UserAgentProcessor,
          ],
        };

        const { processors } = transpileIngestPipeline(streamlangDSL);
        const { query } = transpileEsql(streamlangDSL);

        // ES|QL should contain a warning since USER_AGENT is not supported
        expect(query).toContain('WARNING: user_agent processor not supported in ES|QL');

        const docs = [
          {
            agent_string:
              'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0',
          },
        ];

        // Ingest pipeline should process user_agent
        await testBed.ingest('ingest-user-agent-compat', docs, processors);
        const ingestResult = await testBed.getDocs('ingest-user-agent-compat');

        // Ingest Pipeline: user_agent is extracted
        expect(ingestResult[0]).toHaveProperty('parsed_agent.name', 'Chrome');
        expect(ingestResult[0]).toHaveProperty('parsed_agent.os.name', 'Mac OS X');
      }
    );

    apiTest(
      'should extract user agent with properties in ingest pipeline (ES|QL emits warning)',
      async ({ testBed }) => {
        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'user_agent',
              from: 'agent_string',
              properties: ['name', 'version', 'os'],
            } as UserAgentProcessor,
          ],
        };

        const { processors } = transpileIngestPipeline(streamlangDSL);
        const { query } = transpileEsql(streamlangDSL);

        // ES|QL emits warning
        expect(query).toContain('WARNING: user_agent processor not supported in ES|QL');

        const docs = [
          {
            agent_string:
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/91.0.4472.124',
          },
        ];

        await testBed.ingest('ingest-user-agent-props', docs, processors);
        const ingestResult = await testBed.getDocs('ingest-user-agent-props');

        // Ingest Pipeline: only specified properties are extracted
        expect(ingestResult[0]).toHaveProperty('user_agent.name', 'Chrome');
        expect(ingestResult[0]).toHaveProperty('user_agent.version', '91.0.4472.124');
        expect(ingestResult[0]).toHaveProperty('user_agent.os.name', 'Windows');
        expect(ingestResult[0]).not.toHaveProperty('user_agent.device');
      }
    );

    apiTest(
      'should handle where condition in ingest pipeline (ES|QL emits warning)',
      async ({ testBed }) => {
        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'user_agent',
              from: 'agent_string',
              to: 'parsed_agent',
              where: {
                field: 'should_parse',
                eq: true,
              },
            } as UserAgentProcessor,
          ],
        };

        const { processors } = transpileIngestPipeline(streamlangDSL);
        const { query } = transpileEsql(streamlangDSL);

        // ES|QL emits warning
        expect(query).toContain('WARNING: user_agent processor not supported in ES|QL');

        const docs = [
          {
            case: 'parse',
            agent_string: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120.0.0.0',
            should_parse: true,
          },
          {
            case: 'skip',
            agent_string: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0.4472.124',
            should_parse: false,
          },
        ];

        await testBed.ingest('ingest-user-agent-where', docs, processors);
        const ingestResult = await testBed.getDocsOrdered('ingest-user-agent-where');

        // Ingest Pipeline: only first document is processed due to where condition
        expect(ingestResult[0]).toHaveProperty('parsed_agent.name', 'Chrome');
        expect(ingestResult[1]).not.toHaveProperty('parsed_agent');
      }
    );

    // Template validation tests - both transpilers should consistently REJECT Mustache templates
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
                action: 'user_agent',
                from,
              } as UserAgentProcessor,
            ],
          };

          // Both transpilers should throw validation errors for Mustache templates
          expect(() => transpileIngestPipeline(streamlangDSL)).toThrow(
            'Mustache template syntax {{ }} or {{{ }}} is not allowed'
          );
          expect(() => transpileEsql(streamlangDSL)).toThrow(
            'Mustache template syntax {{ }} or {{{ }}} is not allowed'
          );
        }
      );
    });

    apiTest(
      'should handle ignore_missing in ingest pipeline (ES|QL emits warning)',
      async ({ testBed }) => {
        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'user_agent',
              from: 'agent_string',
              to: 'parsed_agent',
              ignore_missing: true,
            } as UserAgentProcessor,
          ],
        };

        const { processors } = transpileIngestPipeline(streamlangDSL);
        const { query } = transpileEsql(streamlangDSL);

        // ES|QL emits warning
        expect(query).toContain('WARNING: user_agent processor not supported in ES|QL');

        // Document without the source field
        const docs = [
          {
            other_field: 'some_value',
          },
        ];

        await testBed.ingest('ingest-user-agent-ignore', docs, processors);
        const ingestResult = await testBed.getDocs('ingest-user-agent-ignore');

        // Ingest Pipeline: document is ingested without error (ignore_missing: true)
        expect(ingestResult).toHaveLength(1);
        expect(ingestResult[0]).not.toHaveProperty('parsed_agent');
        expect(ingestResult[0]).toHaveProperty('other_field', 'some_value');
      }
    );

    apiTest(
      'should work with mixed processors in ingest pipeline (ES|QL skips user_agent)',
      async ({ testBed, esql }) => {
        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'set',
              to: 'before_user_agent',
              value: 'before',
            },
            {
              action: 'user_agent',
              from: 'agent_string',
              to: 'parsed_agent',
            } as UserAgentProcessor,
            {
              action: 'set',
              to: 'after_user_agent',
              value: 'after',
            },
          ],
        };

        const { processors } = transpileIngestPipeline(streamlangDSL);
        const { query } = transpileEsql(streamlangDSL);

        // ES|QL should contain warning for user_agent but still process other steps
        expect(query).toContain('WARNING: user_agent processor not supported in ES|QL');

        const docs = [
          {
            agent_string: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120.0.0.0',
          },
        ];

        await testBed.ingest('ingest-user-agent-mixed', docs, processors);
        const ingestResult = await testBed.getDocs('ingest-user-agent-mixed');

        await testBed.ingest('esql-user-agent-mixed', docs);
        const esqlResult = await esql.queryOnIndex('esql-user-agent-mixed', query);

        // Both should have the set processor results
        expect(ingestResult[0]).toHaveProperty('before_user_agent', 'before');
        expect(ingestResult[0]).toHaveProperty('after_user_agent', 'after');
        expect(esqlResult.documents[0]).toHaveProperty('before_user_agent', 'before');
        expect(esqlResult.documents[0]).toHaveProperty('after_user_agent', 'after');

        // Ingest Pipeline: user_agent is parsed
        expect(ingestResult[0]).toHaveProperty('parsed_agent.name', 'Chrome');

        // ES|QL: user_agent is NOT parsed (warning was emitted instead)
        expect(esqlResult.documents[0]).not.toHaveProperty('parsed_agent');
      }
    );
  }
);
