/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import type { UserAgentProcessor, StreamlangDSL } from '@kbn/streamlang';
import { transpileIngestPipeline, transpileEsql } from '@kbn/streamlang';
import { asDoc } from '../../fixtures/doc_utils';
import { streamlangApiTest as apiTest } from '../..';

apiTest.describe(
  'Cross-compatibility - User Agent Processor',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
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

        const { processors } = await transpileIngestPipeline(streamlangDSL);
        const { query } = await transpileEsql(streamlangDSL);

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

        const ingest0 = asDoc(ingestResult[0]);
        const parsedIngest = asDoc(ingest0.parsed_agent);
        expect(parsedIngest.name).toBe('Chrome');
        expect(asDoc(parsedIngest.os).name).toBe('Mac OS X');

        const esql0 = asDoc(esqlResult.documentsWithoutKeywords[0]);
        expect(esql0['parsed_agent.name']).toBe('Chrome');
        expect(esql0['parsed_agent.os.name']).toBe('Mac OS X');
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

        const { processors } = await transpileIngestPipeline(streamlangDSL);
        const { query } = await transpileEsql(streamlangDSL);

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

        const ingestUa = asDoc(asDoc(ingestResult[0]).user_agent);
        expect(ingestUa.name).toBe('Chrome');
        expect(ingestUa.version).toBe('91.0.4472.124');
        expect(asDoc(ingestUa.os).name).toBe('Windows');
        expect(ingestUa.device).toBeUndefined();

        const esql0 = asDoc(esqlResult.documentsWithoutKeywords[0]);
        expect(esql0['user_agent.name']).toBe('Chrome');
        expect(esql0['user_agent.version']).toBe('91.0.4472.124');
        expect(esql0['user_agent.os.name']).toBe('Windows');
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

        const { processors } = await transpileIngestPipeline(streamlangDSL);
        const { query } = await transpileEsql(streamlangDSL);

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

        expect(asDoc(asDoc(ingestResult[0]).parsed_agent).name).toBe('Chrome');
        expect(asDoc(ingestResult[1]).parsed_agent).toBeUndefined();

        const esqlOrdered = esqlResult.documentsWithoutKeywordsOrdered;
        expect(asDoc(esqlOrdered[0])['parsed_agent.name']).toBe('Chrome');
        expect(asDoc(esqlOrdered[1])['parsed_agent.name']).toBeNull();
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

          await expect(transpileIngestPipeline(streamlangDSL)).rejects.toThrow(
            'Mustache template syntax {{ }} or {{{ }}} is not allowed in field names'
          );
          await expect(transpileEsql(streamlangDSL)).rejects.toThrow(
            'Mustache template syntax {{ }} or {{{ }}} is not allowed in field names'
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

        const { processors } = await transpileIngestPipeline(streamlangDSL);
        const { query } = await transpileEsql(streamlangDSL);

        // Seed `agent_string` in the index mapping (second doc omits it) so ES|QL can resolve the column.
        const docs = [
          {
            agent_string:
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/91.0.4472.124',
            other_field: 'seed',
          },
          {
            other_field: 'some_value',
          },
        ];

        await testBed.ingest('ingest-user-agent-ignore', docs, processors);
        const ingestResult = await testBed.getDocsOrdered('ingest-user-agent-ignore');

        await testBed.ingest('esql-user-agent-ignore', docs);
        const esqlResult = await esql.queryOnIndex('esql-user-agent-ignore', query);

        expect(ingestResult).toHaveLength(2);
        expect(asDoc(ingestResult[1]).parsed_agent).toBeUndefined();
        expect(asDoc(ingestResult[1]).other_field).toBe('some_value');

        const esqlOrdered = esqlResult.documentsWithoutKeywordsOrdered;
        expect(esqlOrdered).toHaveLength(2);
        expect(asDoc(esqlOrdered[1])['parsed_agent.name']).toBeNull();
        expect(asDoc(esqlOrdered[1]).other_field).toBe('some_value');
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

        const { processors } = await transpileIngestPipeline(streamlangDSL);
        const { query } = await transpileEsql(streamlangDSL);

        const docs = [
          {
            agent_string: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120.0.0.0',
          },
        ];

        await testBed.ingest('ingest-user-agent-mixed', docs, processors);
        const ingestResult = await testBed.getDocs('ingest-user-agent-mixed');

        await testBed.ingest('esql-user-agent-mixed', docs);
        const esqlResult = await esql.queryOnIndex('esql-user-agent-mixed', query);

        const ingest0 = asDoc(ingestResult[0]);
        const esqlFlat = asDoc(esqlResult.documentsWithoutKeywords[0]);
        expect(ingest0.before_user_agent).toBe('before');
        expect(ingest0.after_user_agent).toBe('after');
        expect(esqlFlat.before_user_agent).toBe('before');
        expect(esqlFlat.after_user_agent).toBe('after');

        expect(asDoc(ingest0.parsed_agent).name).toBe('Chrome');
        expect(esqlFlat['parsed_agent.name']).toBe('Chrome');
      }
    );
  }
);
