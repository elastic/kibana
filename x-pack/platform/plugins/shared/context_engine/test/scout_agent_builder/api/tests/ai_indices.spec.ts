/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import type { RoleApiCredentials } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import type { AiIndexTrace } from '../../../../common/http_api/ai_indices';
import { apiTest, testData } from '../fixtures';

const COLLECTION = testData.AI_INDEX_COLLECTION_PATH;
const MANAGED_ID = 'elastic';
const aiIndexPath = (id: string) => `${COLLECTION}/${id}`;
const OTHER_SPACE = 'scout_ce_other_space';
const SPACES = [DEFAULT_SPACE_ID, OTHER_SPACE];
const spacePath = (path: string, spaceId: string) => `s/${spaceId}/${path}`;
// Hardcoded rather than derived, so a change to the index naming helper fails these tests.
const TRACES_INDEX = 'traces-agent_builder.otel-default';

const DEST = {
  dataStream: 'ai-index-ds-scout-test',
  index: 'ai-index-idx-scout-test',
  alias: 'ai-index-idx-scout-alias',
  last: 'ai-index-ds-scout-last-dest',
  shared: 'ai-index-ds-scout-shared-dest',
  crossSpace: 'ai-index-ds-scout-cross-space-dest',
  traces: 'ai-index-ds-scout-traces-test',
  tracesWildcard: 'ai-index-ds-scout-traces-wildcard',
  tracesComma: 'ai-index-ds-scout-traces-comma-b',
};

const TRACES_WILDCARD = 'ai-index-ds-scout-traces-*';

const AI_INDEX = {
  lifecycle: 'scout_test_ai_index',
  index: 'scout_test_index_ai_index',
  lazy: 'scout_test_ai_index_lazy',
  last: 'scout_last_dest_ai_index',
  sharedA: 'scout_shared_dest_a',
  sharedB: 'scout_shared_dest_b',
  crossSpace: 'scout_cross_space_shared_dest',
  rejectedDest: 'scout_rejected_dest_ai_index',
  traceIndexDataStream: 'scout_traces_index_ds',
  traceIndexWildcard: 'scout_traces_index_wildcard',
  traceIndexComma: 'scout_traces_index_comma',
  traceEsql: 'scout_traces_esql',
  traceBuiltinAgent: 'scout_traces_builtin_agent',
  traceRejectMissingIndex: 'scout_traces_reject_missing',
  traceRejectPartialComma: 'scout_traces_reject_partial_comma',
  traceRejectTrailingComma: 'scout_traces_reject_trailing_comma',
  traceRejectMissingAgent: 'scout_traces_reject_missing_agent',
  traceRejectPut: 'scout_traces_reject_put',
  sourceRejectPut: 'scout_sources_reject_put',
};

const DATA_STREAMS = [
  DEST.dataStream,
  DEST.last,
  DEST.shared,
  DEST.crossSpace,
  DEST.traces,
  DEST.tracesWildcard,
  DEST.tracesComma,
];

const API_HEADERS = testData.API_HEADERS;

const dataStreamDest = (value: string) => ({ type: 'data_stream', value });

const aiIndexBody = {
  description: 'AI index created by the Scout API test suite',
  dest: dataStreamDest(DEST.dataStream),
  automations: [{ type: 'workflow', value: 'scout-automation' }],
  sources: [{ type: 'esql', value: `FROM ${DEST.dataStream} | LIMIT 1` }],
  traces: [],
};

const emptyAiIndex = (destValue: string, traces: AiIndexTrace[] = []) => ({
  dest: dataStreamDest(destValue),
  automations: [],
  sources: [],
  traces,
});

apiTest.describe('AI-index memory toggle', { tag: tags.stateful.classic }, () => {
  apiTest('round-trips the toggle', async ({ apiClient, esClient, requestAuth }) => {
    const id = 'scout_memory_toggle_ai_index';
    const path = aiIndexPath(id);
    const dest = 'ai-index-ds-scout-memory-toggle';
    const credentials = await requestAuth.getApiKey('admin');
    const headers = { ...credentials.apiKeyHeader, ...API_HEADERS };
    const body = {
      description: 'Memory toggle integration test',
      dest: dataStreamDest(dest),
      automations: [],
      sources: [],
    };

    await apiClient.delete(path, { headers, responseType: 'json' });
    await esClient.indices.createDataStream({ name: dest }, { ignore: [400] });

    try {
      const createResponse = await apiClient.post(COLLECTION, {
        headers,
        responseType: 'json',
        body: { id, ...body },
      });
      expect(createResponse).toHaveStatusCode(201);

      const defaultResponse = await apiClient.get(path, {
        headers,
        responseType: 'json',
      });
      expect(defaultResponse).toHaveStatusCode(200);
      expect(defaultResponse.body.memory_enabled).toBe(true);

      const updateResponse = await apiClient.put(path, {
        headers,
        responseType: 'json',
        body: { ...body, memory_enabled: false },
      });
      expect(updateResponse).toHaveStatusCode(200);

      const disabledResponse = await apiClient.get(path, {
        headers,
        responseType: 'json',
      });
      expect(disabledResponse).toHaveStatusCode(200);
      expect(disabledResponse.body.memory_enabled).toBe(false);
    } finally {
      await apiClient.delete(path, { headers, responseType: 'json' });
      await esClient.indices.deleteDataStream({ name: dest }, { ignore: [404] });
    }
  });
});

apiTest.describe('context engine AI indices API', { tag: tags.stateful.classic }, () => {
  let adminApiCredentials: RoleApiCredentials;
  let viewerApiCredentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ requestAuth, esClient, apiServices }) => {
    adminApiCredentials = await requestAuth.getApiKey('admin');
    viewerApiCredentials = await requestAuth.getApiKey('viewer');
    await apiServices.spaces.create({ id: OTHER_SPACE, name: OTHER_SPACE });
    for (const name of DATA_STREAMS) {
      await esClient.indices.createDataStream({ name }, { ignore: [400] });
    }
    await esClient.indices.create({ index: DEST.index }, { ignore: [400] });
    await esClient.indices.putAlias({ index: DEST.index, name: DEST.alias });
  });

  apiTest.afterAll(async ({ apiClient, esClient, apiServices }) => {
    for (const spaceId of SPACES) {
      for (const id of Object.values(AI_INDEX)) {
        await apiClient.delete(spacePath(aiIndexPath(id), spaceId), {
          headers: { ...adminApiCredentials.apiKeyHeader, ...API_HEADERS },
          responseType: 'json',
        });
      }
    }
    await apiServices.spaces.delete(OTHER_SPACE);
    await esClient.indices.delete({ index: DEST.index }, { ignore: [404] });
    for (const name of DATA_STREAMS) {
      await esClient.indices.deleteDataStream({ name }, { ignore: [404] });
    }
  });

  apiTest('manages an AI index through its full lifecycle', async ({ apiClient }) => {
    let dateCreated: string;
    const path = aiIndexPath(AI_INDEX.lifecycle);

    await apiTest.step('creates the AI index', async () => {
      const response = await apiClient.post(COLLECTION, {
        headers: { ...adminApiCredentials.apiKeyHeader, ...API_HEADERS },
        responseType: 'json',
        body: { id: AI_INDEX.lifecycle, ...aiIndexBody },
      });

      expect(response).toHaveStatusCode(201);
      expect(response.body).toStrictEqual({ status: 'created' });
    });

    await apiTest.step('rejects a duplicate id with a 409', async () => {
      const response = await apiClient.post(COLLECTION, {
        headers: { ...adminApiCredentials.apiKeyHeader, ...API_HEADERS },
        responseType: 'json',
        body: { id: AI_INDEX.lifecycle, ...aiIndexBody },
      });

      expect(response).toHaveStatusCode(409);
    });

    await apiTest.step('gets the AI index by id', async () => {
      const response = await apiClient.get(path, {
        headers: { ...viewerApiCredentials.apiKeyHeader, ...API_HEADERS },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toMatchObject({ id: AI_INDEX.lifecycle, ...aiIndexBody });
      expect(response.body.memory_enabled).toBe(true);
      expect(response.body.date_created).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(response.body.date_modified).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      dateCreated = response.body.date_created;
    });

    await apiTest.step('lists the AI index', async () => {
      const response = await apiClient.get(COLLECTION, {
        headers: { ...viewerApiCredentials.apiKeyHeader, ...API_HEADERS },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.ai_indices).toStrictEqual(
        expect.arrayContaining([expect.objectContaining({ id: AI_INDEX.lifecycle })])
      );
    });

    await apiTest.step('updates the AI index and preserves date_created', async () => {
      const response = await apiClient.put(path, {
        headers: { ...adminApiCredentials.apiKeyHeader, ...API_HEADERS },
        responseType: 'json',
        body: { ...aiIndexBody, description: 'Updated description', memory_enabled: false },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual({ status: 'updated' });

      const updatedResponse = await apiClient.get(path, {
        headers: { ...viewerApiCredentials.apiKeyHeader, ...API_HEADERS },
        responseType: 'json',
      });
      expect(updatedResponse.body.description).toBe('Updated description');
      expect(updatedResponse.body.memory_enabled).toBe(false);
      expect(updatedResponse.body.date_created).toBe(dateCreated);
    });

    await apiTest.step('deletes the AI index', async () => {
      const response = await apiClient.delete(path, {
        headers: { ...adminApiCredentials.apiKeyHeader, ...API_HEADERS },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual({ acknowledged: true, errors: [] });
    });

    await apiTest.step('returns 404 once deleted', async () => {
      const getResponse = await apiClient.get(path, {
        headers: { ...viewerApiCredentials.apiKeyHeader, ...API_HEADERS },
        responseType: 'json',
      });
      expect(getResponse).toHaveStatusCode(404);

      const deleteResponse = await apiClient.delete(path, {
        headers: { ...adminApiCredentials.apiKeyHeader, ...API_HEADERS },
        responseType: 'json',
      });
      expect(deleteResponse).toHaveStatusCode(404);
    });
  });

  apiTest(
    'creates an AI index whose dest does not exist yet (lazy creation)',
    async ({ apiClient }) => {
      const response = await apiClient.put(aiIndexPath(AI_INDEX.lazy), {
        headers: { ...adminApiCredentials.apiKeyHeader, ...API_HEADERS },
        responseType: 'json',
        body: {
          ...aiIndexBody,
          dest: dataStreamDest('ai-index-ds-does-not-exist'),
        },
      });

      expect(response).toHaveStatusCode(201);
      expect(response.body).toStrictEqual({ status: 'created' });
    }
  );

  apiTest('creates and reads an index AI index', async ({ apiClient }) => {
    const dest = { type: 'index', value: DEST.index };
    const path = aiIndexPath(AI_INDEX.index);

    const createResponse = await apiClient.put(path, {
      headers: { ...adminApiCredentials.apiKeyHeader, ...API_HEADERS },
      responseType: 'json',
      body: { dest, automations: [], sources: [], traces: [] },
    });
    expect(createResponse).toHaveStatusCode(201);
    expect(createResponse.body).toStrictEqual({ status: 'created' });

    const getResponse = await apiClient.get(path, {
      headers: { ...viewerApiCredentials.apiKeyHeader, ...API_HEADERS },
      responseType: 'json',
    });
    expect(getResponse).toHaveStatusCode(200);
    expect(getResponse.body).toMatchObject({ id: AI_INDEX.index, dest });
  });

  apiTest('rejects an index dest outside the ai-index-idx- prefix', async ({ apiClient }) => {
    const response = await apiClient.put(aiIndexPath(AI_INDEX.lifecycle), {
      headers: { ...adminApiCredentials.apiKeyHeader, ...API_HEADERS },
      responseType: 'json',
      body: { ...aiIndexBody, dest: { type: 'index', value: '.kibana' } },
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest('rejects a request without the required dest field', async ({ apiClient }) => {
    const { dest, ...bodyWithoutDest } = aiIndexBody;

    const response = await apiClient.put(aiIndexPath(AI_INDEX.lifecycle), {
      headers: { ...adminApiCredentials.apiKeyHeader, ...API_HEADERS },
      responseType: 'json',
      body: bodyWithoutDest,
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest('rejects an empty ES|QL source', async ({ apiClient }) => {
    const response = await apiClient.put(aiIndexPath(AI_INDEX.lifecycle), {
      headers: { ...adminApiCredentials.apiKeyHeader, ...API_HEADERS },
      responseType: 'json',
      body: { ...aiIndexBody, sources: [{ type: 'esql', value: '' }] },
    });

    expect(response).toHaveStatusCode(400);
    expect(response.body.message).toContain(
      'value has length [0] but it must have a minimum length of [1]'
    );
  });

  apiTest('rejects a syntactically invalid ES|QL source', async ({ apiClient }) => {
    const response = await apiClient.put(aiIndexPath(AI_INDEX.lifecycle), {
      headers: { ...adminApiCredentials.apiKeyHeader, ...API_HEADERS },
      responseType: 'json',
      body: { ...aiIndexBody, sources: [{ type: 'esql', value: 'FROM logs | WHERE' }] },
    });

    expect(response).toHaveStatusCode(400);
    expect(response.body.message).toMatch(/^ES\|QL source 'FROM logs \| WHERE' is invalid: /);
  });

  apiTest('rejects an id with disallowed characters', async ({ apiClient }) => {
    const response = await apiClient.put(aiIndexPath('Invalid_ID'), {
      headers: { ...adminApiCredentials.apiKeyHeader, ...API_HEADERS },
      responseType: 'json',
      body: aiIndexBody,
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest('forbids writes for a read-only user', async ({ apiClient }) => {
    const response = await apiClient.put(aiIndexPath(AI_INDEX.lifecycle), {
      headers: { ...viewerApiCredentials.apiKeyHeader, ...API_HEADERS },
      responseType: 'json',
      body: aiIndexBody,
    });

    expect(response).toHaveStatusCode(403);
  });

  apiTest('allows reads for a read-only user', async ({ apiClient }) => {
    const response = await apiClient.get(COLLECTION, {
      headers: { ...viewerApiCredentials.apiKeyHeader, ...API_HEADERS },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
  });

  apiTest('rejects delete of a managed AI index with 409', async ({ apiClient }) => {
    const path = aiIndexPath(MANAGED_ID);
    const getBefore = await apiClient.get(path, {
      headers: { ...viewerApiCredentials.apiKeyHeader, ...API_HEADERS },
      responseType: 'json',
    });
    expect(getBefore).toHaveStatusCode(200);
    expect(getBefore.body.managed).toBe(true);

    const deleteResponse = await apiClient.delete(
      `${path}?delete_knowledge_indicators=true&delete_automations=true`,
      {
        headers: { ...adminApiCredentials.apiKeyHeader, ...API_HEADERS },
        responseType: 'json',
      }
    );

    expect(deleteResponse).toHaveStatusCode(409);
    expect(deleteResponse.body.message).toStrictEqual(expect.stringContaining('managed'));

    const getAfter = await apiClient.get(path, {
      headers: { ...viewerApiCredentials.apiKeyHeader, ...API_HEADERS },
      responseType: 'json',
    });
    expect(getAfter).toHaveStatusCode(200);
    expect(getAfter.body.managed).toBe(true);
  });

  apiTest(
    'deletes the dest when it is the last AI index using it',
    async ({ apiClient, esClient }) => {
      await esClient.indices.createDataStream({ name: DEST.last }, { ignore: [400] });
      const createResponse = await apiClient.post(COLLECTION, {
        headers: { ...adminApiCredentials.apiKeyHeader, ...API_HEADERS },
        responseType: 'json',
        body: { id: AI_INDEX.last, ...emptyAiIndex(DEST.last) },
      });
      expect(createResponse).toHaveStatusCode(201);
      expect(await esClient.indices.exists({ index: DEST.last })).toBe(true);

      const deleteResponse = await apiClient.delete(
        `${aiIndexPath(AI_INDEX.last)}?delete_knowledge_indicators=true`,
        {
          headers: { ...adminApiCredentials.apiKeyHeader, ...API_HEADERS },
          responseType: 'json',
        }
      );

      expect(deleteResponse).toHaveStatusCode(200);
      expect(deleteResponse.body).toStrictEqual({ acknowledged: true, errors: [] });
      expect(await esClient.indices.exists({ index: DEST.last })).toBe(false);
    }
  );

  apiTest(
    'skips dest delete while another AI index still uses it',
    async ({ apiClient, esClient }) => {
      await apiTest.step('creates two AI indices that share a dest', async () => {
        await esClient.indices.createDataStream({ name: DEST.shared }, { ignore: [400] });
        for (const id of [AI_INDEX.sharedA, AI_INDEX.sharedB]) {
          const response = await apiClient.post(COLLECTION, {
            headers: { ...adminApiCredentials.apiKeyHeader, ...API_HEADERS },
            responseType: 'json',
            body: { id, ...emptyAiIndex(DEST.shared) },
          });
          expect(response).toHaveStatusCode(201);
        }
      });

      await apiTest.step('keeps the dest when the first AI index is deleted', async () => {
        const response = await apiClient.delete(
          `${aiIndexPath(AI_INDEX.sharedA)}?delete_knowledge_indicators=true`,
          {
            headers: { ...adminApiCredentials.apiKeyHeader, ...API_HEADERS },
            responseType: 'json',
          }
        );

        expect(response).toHaveStatusCode(200);
        expect(response.body.acknowledged).toBe(true);
        expect(response.body.errors).toStrictEqual([expect.stringContaining(AI_INDEX.sharedB)]);
        expect(await esClient.indices.exists({ index: DEST.shared })).toBe(true);
      });

      await apiTest.step('deletes the dest when the last AI index is deleted', async () => {
        const response = await apiClient.delete(
          `${aiIndexPath(AI_INDEX.sharedB)}?delete_knowledge_indicators=true`,
          {
            headers: { ...adminApiCredentials.apiKeyHeader, ...API_HEADERS },
            responseType: 'json',
          }
        );

        expect(response).toHaveStatusCode(200);
        expect(response.body).toStrictEqual({ acknowledged: true, errors: [] });
        expect(await esClient.indices.exists({ index: DEST.shared })).toBe(false);
      });
    }
  );

  apiTest(
    'skips dest delete while the same AI index id in another space still uses it',
    async ({ apiClient, esClient }) => {
      const headers = { ...adminApiCredentials.apiKeyHeader, ...API_HEADERS };
      const path = `${aiIndexPath(AI_INDEX.crossSpace)}?delete_knowledge_indicators=true`;

      await apiTest.step('reuses one id in two spaces, both pointing at one dest', async () => {
        for (const spaceId of SPACES) {
          const response = await apiClient.post(spacePath(COLLECTION, spaceId), {
            headers,
            responseType: 'json',
            body: { id: AI_INDEX.crossSpace, ...emptyAiIndex(DEST.crossSpace) },
          });
          expect(response).toHaveStatusCode(201);
        }
      });

      await apiTest.step('keeps the dest when the other space is deleted first', async () => {
        const response = await apiClient.delete(spacePath(path, OTHER_SPACE), {
          headers,
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        expect(response.body.acknowledged).toBe(true);
        // The remaining user sits in another space, so it is reported as `space/id`.
        expect(response.body.errors).toStrictEqual([
          expect.stringContaining(`default/${AI_INDEX.crossSpace}`),
        ]);
        expect(await esClient.indices.exists({ index: DEST.crossSpace })).toBe(true);
      });

      await apiTest.step('deletes the dest once the last space releases it', async () => {
        const response = await apiClient.delete(spacePath(path, DEFAULT_SPACE_ID), {
          headers,
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        expect(response.body).toStrictEqual({ acknowledged: true, errors: [] });
        expect(await esClient.indices.exists({ index: DEST.crossSpace })).toBe(false);
      });
    }
  );

  apiTest('rejects a wildcard dest', async ({ apiClient }) => {
    const response = await apiClient.put(aiIndexPath(AI_INDEX.rejectedDest), {
      headers: { ...adminApiCredentials.apiKeyHeader, ...API_HEADERS },
      responseType: 'json',
      body: emptyAiIndex('ai-index-ds-scout-pattern*'),
    });

    expect(response).toHaveStatusCode(400);
    expect(response.body.message).toContain(
      'must name a single index or data stream, not a pattern'
    );
  });

  apiTest('rejects a comma-separated dest', async ({ apiClient }) => {
    const response = await apiClient.put(aiIndexPath(AI_INDEX.rejectedDest), {
      headers: { ...adminApiCredentials.apiKeyHeader, ...API_HEADERS },
      responseType: 'json',
      body: emptyAiIndex(`${DEST.dataStream},${DEST.shared}`),
    });

    expect(response).toHaveStatusCode(400);
    expect(response.body.message).toContain(
      'must name a single index or data stream, not a pattern'
    );
  });

  apiTest('rejects an alias dest', async ({ apiClient }) => {
    const response = await apiClient.put(aiIndexPath(AI_INDEX.rejectedDest), {
      headers: { ...adminApiCredentials.apiKeyHeader, ...API_HEADERS },
      responseType: 'json',
      body: { ...aiIndexBody, dest: { type: 'index', value: DEST.alias } },
    });

    expect(response).toHaveStatusCode(400);
    expect(response.body.message).toContain(`'${DEST.alias}' is an alias`);
  });

  apiTest(
    'accepts an index trace pointing at an existing data stream and returns a FROM query',
    async ({ apiClient }) => {
      const trace = { type: 'index' as const, value: DEST.traces };
      const id = AI_INDEX.traceIndexDataStream;
      const path = aiIndexPath(id);

      await apiTest.step('creates the AI index with an index trace', async () => {
        const response = await apiClient.post(COLLECTION, {
          headers: { ...adminApiCredentials.apiKeyHeader, ...API_HEADERS },
          responseType: 'json',
          body: { id, ...emptyAiIndex(DEST.traces, [trace]) },
        });

        expect(response).toHaveStatusCode(201);
        expect(response.body).toStrictEqual({ status: 'created' });
      });

      await apiTest.step('returns the derived FROM query on GET', async () => {
        const response = await apiClient.get(path, {
          headers: { ...viewerApiCredentials.apiKeyHeader, ...API_HEADERS },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        expect(response.body.traces).toStrictEqual([
          { type: 'index', value: DEST.traces, query: `FROM ${DEST.traces}` },
        ]);
      });

      await apiTest.step('returns the derived FROM query on LIST', async () => {
        const response = await apiClient.get(COLLECTION, {
          headers: { ...viewerApiCredentials.apiKeyHeader, ...API_HEADERS },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        expect(response.body.ai_indices).toStrictEqual(
          expect.arrayContaining([
            expect.objectContaining({
              id,
              traces: [{ type: 'index', value: DEST.traces, query: `FROM ${DEST.traces}` }],
            }),
          ])
        );
      });
    }
  );

  apiTest(
    'accepts an index trace with a wildcard pattern that matches an existing data stream',
    async ({ apiClient }) => {
      const trace = { type: 'index' as const, value: TRACES_WILDCARD };
      const id = AI_INDEX.traceIndexWildcard;

      const createResponse = await apiClient.post(COLLECTION, {
        headers: { ...adminApiCredentials.apiKeyHeader, ...API_HEADERS },
        responseType: 'json',
        body: { id, ...emptyAiIndex(DEST.tracesWildcard, [trace]) },
      });
      expect(createResponse).toHaveStatusCode(201);

      const getResponse = await apiClient.get(aiIndexPath(id), {
        headers: { ...viewerApiCredentials.apiKeyHeader, ...API_HEADERS },
        responseType: 'json',
      });
      expect(getResponse).toHaveStatusCode(200);
      expect(getResponse.body.traces).toStrictEqual([
        { type: 'index', value: TRACES_WILDCARD, query: `FROM ${TRACES_WILDCARD}` },
      ]);
    }
  );

  apiTest(
    'accepts an index trace with a comma-separated value when every expression resolves',
    async ({ apiClient }) => {
      const traceValue = `${DEST.traces},${DEST.tracesComma}`;
      const trace = { type: 'index' as const, value: traceValue };
      const id = AI_INDEX.traceIndexComma;

      const createResponse = await apiClient.post(COLLECTION, {
        headers: { ...adminApiCredentials.apiKeyHeader, ...API_HEADERS },
        responseType: 'json',
        body: { id, ...emptyAiIndex(DEST.traces, [trace]) },
      });
      expect(createResponse).toHaveStatusCode(201);

      const getResponse = await apiClient.get(aiIndexPath(id), {
        headers: { ...viewerApiCredentials.apiKeyHeader, ...API_HEADERS },
        responseType: 'json',
      });
      expect(getResponse).toHaveStatusCode(200);
      expect(getResponse.body.traces).toStrictEqual([
        { type: 'index', value: traceValue, query: `FROM ${traceValue}` },
      ]);
    }
  );

  apiTest(
    'accepts an esql trace without validating the query against Elasticsearch',
    async ({ apiClient }) => {
      const esqlQuery = 'FROM scout-traces-nonexistent-index | LIMIT 1';
      const trace = { type: 'esql' as const, value: esqlQuery };
      const id = AI_INDEX.traceEsql;

      const createResponse = await apiClient.post(COLLECTION, {
        headers: { ...adminApiCredentials.apiKeyHeader, ...API_HEADERS },
        responseType: 'json',
        body: { id, ...emptyAiIndex(DEST.traces, [trace]) },
      });
      expect(createResponse).toHaveStatusCode(201);

      const getResponse = await apiClient.get(aiIndexPath(id), {
        headers: { ...viewerApiCredentials.apiKeyHeader, ...API_HEADERS },
        responseType: 'json',
      });
      expect(getResponse).toHaveStatusCode(200);
      expect(getResponse.body.traces).toStrictEqual([
        { type: 'esql', value: esqlQuery, query: esqlQuery },
      ]);
    }
  );

  apiTest(
    'returns a built-in default agent trace query without a custom- hash',
    async ({ apiClient }) => {
      const trace = { type: 'elastic_agent' as const, value: agentBuilderDefaultAgentId };
      const id = AI_INDEX.traceBuiltinAgent;

      const createResponse = await apiClient.post(COLLECTION, {
        headers: { ...adminApiCredentials.apiKeyHeader, ...API_HEADERS },
        responseType: 'json',
        body: { id, ...emptyAiIndex(DEST.traces, [trace]) },
      });
      expect(createResponse).toHaveStatusCode(201);

      const getResponse = await apiClient.get(aiIndexPath(id), {
        headers: { ...viewerApiCredentials.apiKeyHeader, ...API_HEADERS },
        responseType: 'json',
      });
      expect(getResponse).toHaveStatusCode(200);
      expect(getResponse.body.traces).toStrictEqual([
        {
          type: 'elastic_agent',
          value: agentBuilderDefaultAgentId,
          query: `FROM ${TRACES_INDEX}\n| WHERE attributes.gen_ai.agent.id IN ("${agentBuilderDefaultAgentId}")`,
        },
      ]);
      // A built-in agent is exported under its own id, so it must never be hashed.
      expect(getResponse.body.traces[0].query).not.toContain('custom-');
    }
  );

  apiTest(
    'rejects an index trace naming a data stream that does not exist',
    async ({ apiClient }) => {
      const missingExpression = 'scout-traces-missing-data-stream';
      const response = await apiClient.post(COLLECTION, {
        headers: { ...adminApiCredentials.apiKeyHeader, ...API_HEADERS },
        responseType: 'json',
        body: {
          id: AI_INDEX.traceRejectMissingIndex,
          ...emptyAiIndex(DEST.traces, [{ type: 'index' as const, value: missingExpression }]),
        },
      });

      expect(response).toHaveStatusCode(400);
      expect(response.body.message).toBe(
        `Index trace '${missingExpression}' does not match any index, data stream, or alias`
      );
    }
  );

  apiTest(
    'rejects an index trace when one comma-separated expression does not resolve',
    async ({ apiClient }) => {
      const missingExpression = 'scout-traces-missing';
      const traceValue = `${DEST.traces},${missingExpression}`;

      // A resolvable first expression must not let a second one through into the ES|QL FROM clause.
      const response = await apiClient.post(COLLECTION, {
        headers: { ...adminApiCredentials.apiKeyHeader, ...API_HEADERS },
        responseType: 'json',
        body: {
          id: AI_INDEX.traceRejectPartialComma,
          ...emptyAiIndex(DEST.traces, [{ type: 'index' as const, value: traceValue }]),
        },
      });

      expect(response).toHaveStatusCode(400);
      expect(response.body.message).toBe(
        `Index trace '${missingExpression}' does not match any index, data stream, or alias`
      );
    }
  );

  apiTest('rejects an index trace with a trailing comma', async ({ apiClient }) => {
    const response = await apiClient.post(COLLECTION, {
      headers: { ...adminApiCredentials.apiKeyHeader, ...API_HEADERS },
      responseType: 'json',
      body: {
        id: AI_INDEX.traceRejectTrailingComma,
        ...emptyAiIndex(DEST.traces, [{ type: 'index' as const, value: `${DEST.traces},` }]),
      },
    });

    expect(response).toHaveStatusCode(400);
    expect(response.body.message).toBe('Index trace value cannot contain an empty expression');
  });

  apiTest(
    'rejects an elastic_agent trace naming an agent that does not exist',
    async ({ apiClient }) => {
      const missingAgentId = 'scout-traces-missing-agent';
      const response = await apiClient.post(COLLECTION, {
        headers: { ...adminApiCredentials.apiKeyHeader, ...API_HEADERS },
        responseType: 'json',
        body: {
          id: AI_INDEX.traceRejectMissingAgent,
          ...emptyAiIndex(DEST.traces, [{ type: 'elastic_agent' as const, value: missingAgentId }]),
        },
      });

      expect(response).toHaveStatusCode(400);
      expect(response.body.message).toBe(`Agent '${missingAgentId}' was not found`);
    }
  );

  apiTest(
    'rejects invalid traces on PUT without modifying the stored AI index',
    async ({ apiClient }) => {
      const id = AI_INDEX.traceRejectPut;
      const path = aiIndexPath(id);
      const body = emptyAiIndex(DEST.traces, [{ type: 'index' as const, value: DEST.traces }]);

      await apiTest.step('creates an AI index with a valid index trace', async () => {
        const response = await apiClient.post(COLLECTION, {
          headers: { ...adminApiCredentials.apiKeyHeader, ...API_HEADERS },
          responseType: 'json',
          body: { id, ...body },
        });

        expect(response).toHaveStatusCode(201);
      });

      await apiTest.step('rejects a PUT with an index trace that does not resolve', async () => {
        const missingExpression = 'scout-traces-missing-on-put';
        const response = await apiClient.put(path, {
          headers: { ...adminApiCredentials.apiKeyHeader, ...API_HEADERS },
          responseType: 'json',
          body: { ...body, traces: [{ type: 'index' as const, value: missingExpression }] },
        });

        expect(response).toHaveStatusCode(400);
        expect(response.body.message).toBe(
          `Index trace '${missingExpression}' does not match any index, data stream, or alias`
        );
      });

      await apiTest.step(
        'leaves the original traces unchanged after the rejected PUT',
        async () => {
          const response = await apiClient.get(path, {
            headers: { ...viewerApiCredentials.apiKeyHeader, ...API_HEADERS },
            responseType: 'json',
          });

          expect(response).toHaveStatusCode(200);
          expect(response.body.traces).toStrictEqual([
            { type: 'index', value: DEST.traces, query: `FROM ${DEST.traces}` },
          ]);
        }
      );
    }
  );

  apiTest(
    'rejects an invalid ES|QL source on PUT without modifying the stored AI index',
    async ({ apiClient }) => {
      const id = AI_INDEX.sourceRejectPut;
      const path = aiIndexPath(id);
      const sources = [{ type: 'esql', value: `FROM ${DEST.dataStream}` }];

      await apiTest.step('creates an AI index with a valid ES|QL source', async () => {
        const response = await apiClient.post(COLLECTION, {
          headers: { ...adminApiCredentials.apiKeyHeader, ...API_HEADERS },
          responseType: 'json',
          body: { id, ...emptyAiIndex(DEST.dataStream), sources },
        });

        expect(response).toHaveStatusCode(201);
      });

      await apiTest.step('rejects a PUT with a syntactically invalid ES|QL source', async () => {
        const response = await apiClient.put(path, {
          headers: { ...adminApiCredentials.apiKeyHeader, ...API_HEADERS },
          responseType: 'json',
          body: {
            ...emptyAiIndex(DEST.dataStream),
            sources: [{ type: 'esql', value: 'FROM logs | WHERE' }],
          },
        });

        expect(response).toHaveStatusCode(400);
        expect(response.body.message).toMatch(/^ES\|QL source 'FROM logs \| WHERE' is invalid: /);
      });

      await apiTest.step(
        'leaves the original sources unchanged after the rejected PUT',
        async () => {
          const response = await apiClient.get(path, {
            headers: { ...viewerApiCredentials.apiKeyHeader, ...API_HEADERS },
            responseType: 'json',
          });

          expect(response).toHaveStatusCode(200);
          expect(response.body.sources).toStrictEqual(sources);
        }
      );
    }
  );
});
