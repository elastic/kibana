/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import { apiTest } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import {
  PUBLIC_HEADERS,
  INTERNAL_HEADERS,
  ENTITY_STORE_ROUTES,
  ENTITY_STORE_TAGS,
  LATEST_ALIAS,
} from '../../../common/fixtures/constants';
import {
  clearInstalledEntityStoreDocuments,
  forceLogExtraction,
  ingestDoc,
  normalizeKeywordList,
  setupLogsTestDataStream,
  teardownLogsTestDataStream,
} from '../../../common/fixtures/helpers';

const AI_AGENT_LOGS = {
  index: 'logs-entity-store-tests-ai-agent-default',
  template: 'entity-store-test-logs-ai-agent-override',
};
const HOST_ID = 'ai-agent-host-1';
const FROM = '2026-02-01T11:00:00Z';
const TO = '2026-02-01T13:00:00Z';

const defendEvent = (
  timestamp: string,
  userName: string,
  aiAgent: Record<string, unknown>
): Record<string, unknown> => ({
  '@timestamp': timestamp,
  event: { kind: 'event', category: ['process'], module: 'endpoint' },
  host: { id: HOST_ID, name: 'dev-box' },
  user: { name: userName },
  process: { name: '2.1.332', ai_agent: aiAgent },
});

apiTest.describe('Entity Store ai_agent extraction', { tag: ENTITY_STORE_TAGS }, () => {
  let internalHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ samlAuth, apiClient, esClient }) => {
    const credentials = await samlAuth.asInteractiveUser('admin');
    internalHeaders = { ...credentials.cookieHeader, ...INTERNAL_HEADERS };

    const installResponse = await apiClient.post(ENTITY_STORE_ROUTES.public.INSTALL, {
      headers: { ...credentials.cookieHeader, ...PUBLIC_HEADERS },
      responseType: 'json',
      body: { entityTypes: ['ai_agent'] },
    });
    expect([200, 201]).toContain(installResponse.statusCode);

    await clearInstalledEntityStoreDocuments(esClient);
    await setupLogsTestDataStream(esClient, AI_AGENT_LOGS);

    const docs = [
      // Before sign-in: no email.
      defendEvent('2026-02-01T12:00:00Z', 'ec2-user', {
        name: 'claude_code',
        is_descendant: false,
      }),
      defendEvent('2026-02-01T12:01:00Z', 'ec2-user', {
        name: 'claude_code',
        is_descendant: false,
        email: 'first@example.com',
      }),
      // A second person signs in under the same OS user.
      defendEvent('2026-02-01T12:30:00Z', 'ec2-user', {
        name: 'claude_code',
        is_descendant: false,
        email: 'second@example.com',
      }),
      // A sudo child runs as root. It must not create a root agent.
      defendEvent('2026-02-01T12:31:00Z', 'root', { name: 'claude_code', is_descendant: true }),
      // Cursor without the descendant flag still counts as the agent.
      defendEvent('2026-02-01T12:40:00Z', 'dlee', { name: 'cursor' }),
    ];
    for (const doc of docs) {
      await ingestDoc(esClient, doc, AI_AGENT_LOGS.index);
    }
  });

  apiTest.afterAll(async ({ esClient }) => {
    await teardownLogsTestDataStream(esClient, AI_AGENT_LOGS);
  });

  apiTest(
    'extracts one agent per install from its own events, with its host and accounts',
    async ({ apiClient, esClient }) => {
      const response = await forceLogExtraction(apiClient, internalHeaders, 'ai_agent', FROM, TO);
      expect(response.statusCode).toBe(200);
      expect(response.body).toMatchObject({ success: true, count: 2 });

      const result = await esClient.search<Record<string, unknown>>({
        index: LATEST_ALIAS,
        query: { term: { 'entity.EngineMetadata.Type': 'ai_agent' } },
        sort: [{ 'entity.id': 'asc' }],
        size: 10,
      });
      const rows = result.hits.hits.map(({ _source }) => _source ?? {});

      expect(rows.map((row) => get(row, 'entity.id'))).toStrictEqual([
        `ai_agent:claude_code@${HOST_ID}@ec2-user`,
        `ai_agent:cursor@${HOST_ID}@dlee`,
      ]);

      const [claude, cursor] = rows;
      expect(get(claude, 'entity.name')).toBe('claude_code@ec2-user@dev-box');
      expect(get(claude, 'entity.type')).toBe('AI Agent');
      expect(get(claude, 'entity.lifecycle')).toStrictEqual({
        first_seen: '2026-02-01T12:00:00.000Z',
        last_seen: '2026-02-01T12:30:00.000Z',
      });
      expect(
        normalizeKeywordList(get(claude, 'entity.relationships.depends_on.ids'))
      ).toStrictEqual([`host:${HOST_ID}`]);
      expect(
        normalizeKeywordList(
          get(claude, 'entity.relationships.acts_on_behalf_of.raw_identifiers.user.email')
        ).sort()
      ).toStrictEqual(['first@example.com', 'second@example.com']);
      expect(get(cursor, 'entity.relationships.acts_on_behalf_of')).toBeUndefined();
    }
  );
});
