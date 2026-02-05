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
    // *** Compatible Cases ***
    // ES|QL now supports the USER_AGENT command for parsing browser user agent strings.
    // These tests verify that both Ingest Pipeline and ES|QL produce similar results.

    apiTest(
      'should extract user agent in both ingest pipeline and ES|QL',
      async ({ testBed, esql }) => {
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

        // ES|QL should contain the USER_AGENT command
        expect(query).toContain('USER_AGENT');
        expect(query).toContain('parsed_agent');

        const docs = [
          {
            agent_string:
              'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0',
          },
        ];

        // Ingest pipeline should process user_agent
        await testBed.ingest('ingest-user-agent-compat', docs, processors);
        const ingestResult = await testBed.getDocs('ingest-user-agent-compat');

        // ES|QL should also process user_agent with USER_AGENT command
        await testBed.ingest('esql-user-agent-compat', docs);
        const esqlResult = await esql.queryOnIndex('esql-user-agent-compat', query);

        // Ingest Pipeline: user_agent is extracted
        expect(ingestResult[0]).toHaveProperty('parsed_agent.name', 'Chrome');
        expect(ingestResult[0]).toHaveProperty('parsed_agent.os.name', 'Mac OS X');

        // ES|QL: user_agent is also extracted via USER_AGENT command
        expect(esqlResult.documents[0]).toHaveProperty('parsed_agent.name', 'Chrome');
        expect(esqlResult.documents[0]).toHaveProperty('parsed_agent.os.name', 'Mac OS X');
      }
    );

    apiTest(
      'should extract user agent in both transpilers (ES|QL extracts all properties)',
      async ({ testBed, esql }) => {
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

        const docs = [
          {
            agent_string:
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/91.0.4472.124',
          },
        ];

        await testBed.ingest('ingest-user-agent-props', docs, processors);
        const ingestResult = await testBed.getDocs('ingest-user-agent-props');

        await testBed.ingest('esql-user-agent-props', docs);
        const esqlResult = await esql.queryOnIndex('esql-user-agent-props', query);

        // Ingest Pipeline: only specified properties are extracted
        expect(ingestResult[0]).toHaveProperty('user_agent.name', 'Chrome');
        expect(ingestResult[0]).toHaveProperty('user_agent.version', '91.0.4472.124');
        expect(ingestResult[0]).toHaveProperty('user_agent.os.name', 'Windows');
        expect(ingestResult[0]).not.toHaveProperty('user_agent.device');

        // ES|QL: USER_AGENT extracts all properties (properties filter not supported in ES|QL)
        // Note: ES|QL USER_AGENT extracts all properties, unlike Ingest which can filter
        expect(esqlResult.documents[0]).toHaveProperty('user_agent.name', 'Chrome');
        expect(esqlResult.documents[0]).toHaveProperty('user_agent.version', '91.0.4472.124');
        expect(esqlResult.documents[0]).toHaveProperty('user_agent.os.name', 'Windows');
      }
    );

    apiTest(
      'should handle where condition in both ingest pipeline and ES|QL',
      async ({ testBed, esql }) => {
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

        await testBed.ingest('esql-user-agent-where', docs);
        const esqlResult = await esql.queryOnIndex('esql-user-agent-where', query);

        // Ingest Pipeline: only first document is processed due to where condition
        expect(ingestResult[0]).toHaveProperty('parsed_agent.name', 'Chrome');
        expect(ingestResult[1]).not.toHaveProperty('parsed_agent');

        // ES|QL: same behavior - only first document is processed due to where condition
        expect(esqlResult.documentsOrdered[0]).toHaveProperty('parsed_agent.name', 'Chrome');
        expect(esqlResult.documentsOrdered[1]).not.toHaveProperty('parsed_agent');
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
      'should handle ignore_missing in both ingest pipeline and ES|QL',
      async ({ testBed, esql }) => {
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

        // Document without the source field
        const docs = [
          {
            other_field: 'some_value',
          },
        ];

        await testBed.ingest('ingest-user-agent-ignore', docs, processors);
        const ingestResult = await testBed.getDocs('ingest-user-agent-ignore');

        await testBed.ingest('esql-user-agent-ignore', docs);
        const esqlResult = await esql.queryOnIndex('esql-user-agent-ignore', query);

        // Ingest Pipeline: document is ingested without error (ignore_missing: true)
        expect(ingestResult).toHaveLength(1);
        expect(ingestResult[0]).not.toHaveProperty('parsed_agent');
        expect(ingestResult[0]).toHaveProperty('other_field', 'some_value');

        // ES|QL: document is returned without user_agent processing (conditional execution handles missing field)
        expect(esqlResult.documents).toHaveLength(1);
        expect(esqlResult.documents[0]).not.toHaveProperty('parsed_agent');
        expect(esqlResult.documents[0]).toHaveProperty('other_field', 'some_value');
      }
    );

    apiTest(
      'should work with mixed processors where user_agent is between supported processors',
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

        // Both should have user_agent parsed
        expect(ingestResult[0]).toHaveProperty('parsed_agent.name', 'Chrome');
        expect(esqlResult.documents[0]).toHaveProperty('parsed_agent.name', 'Chrome');
      }
    );
  }
);
