/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
import type { StreamlangDSL, UserAgentProcessor } from '@kbn/streamlang';
import { transpileEsql as transpile } from '@kbn/streamlang';
import { streamlangApiTest as apiTest } from '../..';

apiTest.describe(
  'Streamlang to ES|QL - User Agent Processor (Not Supported)',
  { tag: ['@ess', '@svlOblt'] },
  () => {
    apiTest('should handle user_agent by showing warning message', async ({ esql, testBed }) => {
      const indexName = 'stream-e2e-test-esql-user-agent-not-supported';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'user_agent',
            from: 'http.user_agent',
            to: 'parsed_agent',
          } as UserAgentProcessor,
        ],
      };

      const { query } = transpile(streamlangDSL);

      // Verify that the ES|QL query contains a warning about user_agent not being supported
      expect(query).toContain('WARNING: user_agent processor not supported in ES|QL');

      // Test that the generated query is valid ES|QL syntax
      const docs = [
        {
          http: {
            user_agent:
              'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0',
          },
          existing_field: 'existing_value',
        },
      ];

      // Create a simple test index with data for ES|QL execution
      await testBed.ingest(indexName, docs);

      // Execute the ES|QL query - it should run without syntax errors
      const result = await esql.queryOnIndex(indexName, query);

      // Should return the documents (the warning is just informational)
      expect(result.documents.length).toBeGreaterThan(0);

      // The original fields should be preserved since user_agent is not processed
      expect(result.documents[0]).toHaveProperty('existing_field', 'existing_value');

      // The user_agent processor should NOT have been applied (no 'parsed_agent' field)
      expect(result.documents[0]).not.toHaveProperty('parsed_agent');
    });

    apiTest(
      'should handle user_agent with where condition (condition ignored)',
      async ({ esql, testBed }) => {
        const indexName = 'stream-e2e-test-esql-user-agent-conditional';

        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'user_agent',
              from: 'agent_string',
              to: 'parsed_agent',
              where: { field: 'should_parse', eq: true },
            } as UserAgentProcessor,
          ],
        };

        const { query } = transpile(streamlangDSL);

        expect(query).toContain('WARNING: user_agent processor not supported in ES|QL');

        const docs = [
          {
            agent_string: 'Mozilla/5.0 Chrome/120.0.0.0',
            should_parse: true,
          },
          {
            agent_string: 'Mozilla/5.0 Safari/605.1.15',
            should_parse: false,
          },
        ];

        await testBed.ingest(indexName, docs);
        const result = await esql.queryOnIndex(indexName, query);

        // Both documents should be returned since the user_agent processor (and its condition) is ignored
        expect(result.documents).toHaveLength(2);

        // Neither document should have the parsed_agent field applied
        result.documents.forEach((doc) => {
          expect(doc).not.toHaveProperty('parsed_agent');
        });
      }
    );

    apiTest(
      'should generate valid ES|QL when mixed with supported processors',
      async ({ esql, testBed }) => {
        const indexName = 'stream-e2e-test-esql-user-agent-mixed';

        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'set',
              to: 'supported_field',
              value: 'supported_value',
            },
            {
              action: 'user_agent',
              from: 'agent_string',
              to: 'parsed_agent',
            } as UserAgentProcessor,
            {
              action: 'rename',
              from: 'old_field',
              to: 'new_field',
              override: true,
            },
          ],
        };

        const { query } = transpile(streamlangDSL);

        // Should contain the warning for user_agent processor
        expect(query).toContain('WARNING: user_agent processor not supported in ES|QL');

        // Should also contain supported processors
        expect(query).toContain('EVAL'); // For set processor

        const docs = [
          {
            agent_string: 'Mozilla/5.0 Chrome/120.0.0.0',
            old_field: 'to_be_renamed',
            new_field: '',
          },
        ];

        await testBed.ingest(indexName, docs);
        const result = await esql.queryOnIndex(indexName, query);

        expect(result.documents.length).toBeGreaterThan(0);

        const doc = result.documents[0];

        // Supported processors should work
        expect(doc).toHaveProperty('supported_field', 'supported_value');
        expect(doc).toHaveProperty('new_field', 'to_be_renamed');
        expect(doc).not.toHaveProperty('old_field'); // Should be renamed

        // User agent processor should be ignored
        expect(doc).not.toHaveProperty('parsed_agent');
      }
    );
  }
);
