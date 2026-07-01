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

        expect(query).toContain('USER_AGENT');
        expect(query).toContain('parsed_agent');

        const docs = [
          {
            agent_string:
              'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0',
          },
        ];

        await testBed.ingest('ingest-user-agent-compat', docs, processors);
        const ingestResult = await testBed.getDocs('ingest-user-agent-compat');

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
      'should extract user agent properties in both transpilers',
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

    apiTest(
      'should preserve pre-existing target sub-fields when parsing is skipped or fails (destruction-fix parity)',
      async ({ testBed, esql }) => {
        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'user_agent',
              from: 'agent_string',
              to: 'user_agent',
              where: { field: 'should_parse', eq: true },
            } as UserAgentProcessor,
          ],
        };

        const priorUserAgent = {
          name: 'prior-browser',
          version: 'test',
          original: 'prior-ua-string',
          os: { name: 'prior-os' },
        };

        const docs = [
          {
            case: 'processed',
            should_parse: true,
            agent_string:
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/91.0.4472.124',
            user_agent: priorUserAgent,
          },
          {
            case: 'skipped',
            should_parse: false,
            agent_string: 'not-a-valid-user-agent-for-parsing',
            user_agent: priorUserAgent,
          },
          {
            case: 'failed-parse',
            should_parse: true,
            agent_string: 'test',
            user_agent: priorUserAgent,
          },
        ];

        const { processors } = await transpileIngestPipeline(streamlangDSL);
        const { query } = await transpileEsql(streamlangDSL);

        await testBed.ingest('ingest-user-agent-preserve', docs, processors);
        const ingestResult = await testBed.getFlattenedDocsOrdered('ingest-user-agent-preserve');

        await testBed.ingest('esql-user-agent-preserve', docs);
        const esqlResult = await esql.queryOnIndex('esql-user-agent-preserve', query);

        const byCase = (rows: Array<Record<string, unknown>>) =>
          Object.fromEntries(rows.map((row) => [row.case, row]));

        const ingestByCase = byCase(ingestResult);
        const esqlByCase = byCase(esqlResult.documentsWithoutKeywords);

        // Processed row: successful parse overwrites prior values.
        expect(ingestByCase.processed['user_agent.name']).toBe('Chrome');
        expect(ingestByCase.processed['user_agent.version']).toBe('91.0.4472.124');
        expect(esqlByCase.processed['user_agent.name']).toBe('Chrome');
        expect(esqlByCase.processed['user_agent.version']).toBe('91.0.4472.124');

        // Skipped row (where:false): ingest leaves target untouched; ES|QL must not null sub-fields.
        expect(ingestByCase.skipped['user_agent.version']).toBe('test');
        expect(ingestByCase.skipped['user_agent.name']).toBe('prior-browser');
        expect(esqlByCase.skipped['user_agent.version']).toBe('test');
        expect(esqlByCase.skipped['user_agent.name']).toBe('prior-browser');

        // Failed parse: ES|QL must preserve prior sub-fields (ingest may omit null outputs).
        expect(esqlByCase['failed-parse']['user_agent.version']).toBe('test');
        expect(esqlByCase['failed-parse']['user_agent.name']).toBe('prior-browser');
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
  }
);
