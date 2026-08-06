/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { chatSystemIndex } from '@kbn/agent-builder-server';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { createSystemIndicesEsClient } from '../../../scout_agent_builder_shared/lib/system_indices_es_client';
import { apiTest } from '../fixtures';
import { API_AGENT_BUILDER } from '../fixtures/constants';

apiTest.describe(
  'Agent Builder — legacy ES|QL tool type migration API',
  { tag: [...tags.stateful.classic, ...tags.serverless.search] },
  () => {
    let sysEsClient: Client;
    const legacyToolId = 'legacy-esql-tool-types-migration';
    const dummyToolId = `dummy-tool-${Date.now()}`;
    const toolIndex = chatSystemIndex('tools');
    const timestamp = new Date().toISOString();

    const legacyConfig = {
      query:
        'FROM my_cases | WHERE t == ?t AND k == ?k AND l == ?l AND i == ?i AND d == ?d AND f == ?f AND b == ?b AND dt == ?dt AND o == ?o AND n == ?n',
      params: {
        t: { type: 'text', description: 'text', optional: true, defaultValue: 'hello' },
        k: { type: 'keyword', description: 'keyword', optional: true, defaultValue: 'world' },
        l: { type: 'long', description: 'long', optional: true, defaultValue: 42 },
        i: { type: 'integer', description: 'integer', optional: true, defaultValue: 7 },
        d: { type: 'double', description: 'double', optional: true, defaultValue: 3.14 },
        f: { type: 'float', description: 'float', optional: true, defaultValue: 2.5 },
        b: { type: 'boolean', description: 'boolean', optional: true, defaultValue: false },
        dt: {
          type: 'date',
          description: 'date',
          optional: true,
          defaultValue: '2024-01-01T00:00:00.000Z',
        },
        o: { type: 'object', description: 'object', optional: true, defaultValue: { foo: 'bar' } },
        n: {
          type: 'nested',
          description: 'nested',
          optional: true,
          defaultValue: [{ foo: 'bar' }, { foo: 'baz' }],
        },
      },
    };

    apiTest.beforeAll(async ({ asAdmin, esClient, config }) => {
      sysEsClient = await createSystemIndicesEsClient(esClient, config);
      await asAdmin.post(`${API_AGENT_BUILDER}/tools`, {
        body: {
          id: dummyToolId,
          type: 'esql',
          description: 'Dummy ES|QL tool for bootstrapping tools index',
          tags: ['test'],
          configuration: { query: 'FROM my_cases | LIMIT 1', params: {} },
        },
        responseType: 'json',
      });
      await sysEsClient.index({
        index: toolIndex,
        id: legacyToolId,
        refresh: 'wait_for',
        document: {
          id: legacyToolId,
          type: 'esql',
          space: 'default',
          description: 'Legacy ES|QL tool',
          configuration: legacyConfig,
          tags: ['legacy'],
          created_at: timestamp,
          updated_at: timestamp,
        },
      });
      await sysEsClient.indices.refresh({ index: toolIndex });
    });

    apiTest.afterAll(async ({ asAdmin }) => {
      await asAdmin.delete(`${API_AGENT_BUILDER}/tools/${encodeURIComponent(legacyToolId)}`);
      await asAdmin.delete(`${API_AGENT_BUILDER}/tools/${encodeURIComponent(dummyToolId)}`);
      try {
        await sysEsClient.delete({ index: toolIndex, id: legacyToolId, refresh: true });
      } catch {
        // ignore
      }
    });

    apiTest('GET migrates legacy types for single tool', async ({ asAdmin }) => {
      const response = await asAdmin.get(`${API_AGENT_BUILDER}/tools/${legacyToolId}`, {
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body.configuration).toStrictEqual({
        query: legacyConfig.query,
        params: {
          t: { type: 'string', description: 'text', optional: true, defaultValue: 'hello' },
          k: { type: 'string', description: 'keyword', optional: true, defaultValue: 'world' },
          l: { type: 'integer', description: 'long', optional: true, defaultValue: 42 },
          i: { type: 'integer', description: 'integer', optional: true, defaultValue: 7 },
          d: { type: 'float', description: 'double', optional: true, defaultValue: 3.14 },
          f: { type: 'float', description: 'float', optional: true, defaultValue: 2.5 },
          b: { type: 'boolean', description: 'boolean', optional: true, defaultValue: false },
          dt: {
            type: 'date',
            description: 'date',
            optional: true,
            defaultValue: '2024-01-01T00:00:00.000Z',
          },
          o: {
            type: 'string',
            description: 'object',
            optional: true,
            defaultValue: JSON.stringify({ foo: 'bar' }),
          },
          n: {
            type: 'string',
            description: 'nested',
            optional: true,
            defaultValue: JSON.stringify([{ foo: 'bar' }, { foo: 'baz' }]),
          },
        },
      });
    });

    apiTest('GET list includes migrated legacy tool params', async ({ asAdmin }) => {
      const response = await asAdmin.get(`${API_AGENT_BUILDER}/tools`, {
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      const tool = response.body.results.find((r: { id: string }) => r.id === legacyToolId);
      expect(tool).toBeDefined();
      expect(tool.configuration.params.t.type).toBe('string');
      expect(tool.configuration.params.o.defaultValue).toBe(JSON.stringify({ foo: 'bar' }));
    });
  }
);
