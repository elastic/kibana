/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { AGENT_MEMORY_INDEX } from '@kbn/agent-memory-common';
import type { ElasticsearchClient } from '@kbn/core/server';
import { createTestServers, type TestElasticsearchUtils } from '@kbn/core-test-helpers-kbn-server';
import type { DataStreamClient } from '@kbn/data-streams';
import { loggerMock } from '@kbn/logging-mocks';
import { writeMemory } from '../../core/write_memory';
import { tombstoneMemory } from '../../core/tombstone_memory';
import { buildRetriever } from '../../recall/build_retriever';
import type { agentMemoryHistoryMappings } from '../history_stream';
import { createMemoryStorage, memoryStorageSettings, type MemoryStorage } from '../memory_storage';

describe('Agent Memory AI Index integration', () => {
  let esServer: TestElasticsearchUtils;
  let esClient: Client;
  let storage: MemoryStorage;

  const identity = {
    author: 'profile-agent-memory-integration',
    author_kind: 'profile_uid' as const,
  };
  const spaceId = 'agent-memory-integration-space';
  const historyClient = {
    create: jest.fn().mockResolvedValue({}),
  } as unknown as DataStreamClient<typeof agentMemoryHistoryMappings>;

  beforeAll(async () => {
    const { startES } = createTestServers({
      adjustTimeout: jest.setTimeout,
      settings: {
        es: {
          license: 'trial',
        },
        kbn: {
          cliArgs: {
            oss: false,
          },
        },
      },
    });

    esServer = await startES();
    esClient = esServer.es.getClient();
    storage = createMemoryStorage({
      logger: loggerMock.create(),
      esClient: esClient as unknown as ElasticsearchClient,
      indexManagementClient: esClient as unknown as ElasticsearchClient,
    });
  });

  afterAll(async () => {
    try {
      await storage?.getClient().clean();

      await expect(
        esClient.cluster.getComponentTemplate({ name: 'ai-index@mappings' })
      ).resolves.toMatchObject({
        component_templates: [{ name: 'ai-index@mappings' }],
      });
    } finally {
      await esServer?.stop();
    }
  });

  it('composes the built-in mappings and recalls then excludes a tombstoned memory', async () => {
    await expect(
      esClient.cluster.getComponentTemplate({ name: 'ai-index@mappings' })
    ).resolves.toMatchObject({
      component_templates: [{ name: 'ai-index@mappings' }],
    });

    const title = 'Preferred incident review sources';
    const description = 'Use primary runbooks before community troubleshooting posts.';
    const writeResult = await writeMemory({
      storage,
      historyClient,
      params: {
        title,
        description,
        type: 'semantic',
        category: 'preferences',
        tags: ['incident-response'],
        entities: ['runbooks'],
        origin: 'user',
        assurance: 'stated',
        call_source: 'user',
        conversation_ids: ['conversation-1'],
        trace_ids: ['trace-1'],
        space_id: spaceId,
        identity,
      },
    });

    const indexTemplate = await esClient.indices.getIndexTemplate({ name: AGENT_MEMORY_INDEX });
    expect(indexTemplate.index_templates[0].index_template).toMatchObject({
      priority: 600,
      composed_of: ['ai-index@mappings', 'ai-index-agent-memory@mappings', 'ai-index@custom'],
      ignore_missing_component_templates: ['ai-index@custom'],
    });

    const simulatedTemplate = await esClient.indices.simulateIndexTemplate({
      name: `${AGENT_MEMORY_INDEX}-999999`,
    });
    const { type: _memoryObjectType, ...expectedMemoryMapping } =
      memoryStorageSettings.schema.properties.memory;
    const { type: _provenanceObjectType, ...expectedProvenanceMapping } =
      expectedMemoryMapping.properties.provenance;
    expect(simulatedTemplate.template).toMatchObject({
      aliases: {
        [AGENT_MEMORY_INDEX]: {
          is_write_index: true,
        },
      },
      mappings: {
        dynamic: 'strict',
        properties: {
          content: {
            fields: {
              semantic: {
                type: 'semantic_text',
              },
            },
          },
          ...memoryStorageSettings.schema.properties,
          memory: {
            ...expectedMemoryMapping,
            properties: {
              ...expectedMemoryMapping.properties,
              provenance: expectedProvenanceMapping,
            },
          },
        },
      },
    });

    const stored = await storage.getClient().get({ id: writeResult.id });
    expect(stored._index).toBe(`${AGENT_MEMORY_INDEX}-000001`);
    expect(stored._source).toMatchObject({
      id: writeResult.id,
      content: `${title}\n\n${description}`,
      deleted: false,
    });

    const aliases = await esClient.indices.getAlias({ name: AGENT_MEMORY_INDEX });
    expect(aliases[`${AGENT_MEMORY_INDEX}-000001`].aliases).toEqual({
      [AGENT_MEMORY_INDEX]: {
        is_write_index: true,
      },
    });

    const semanticQuery = 'authoritative operational documentation';
    const lexicalOnly = await storage.getClient().search({
      size: 10,
      track_total_hits: false,
      query: {
        multi_match: {
          query: semanticQuery,
          fields: ['title^2', 'description'],
          type: 'best_fields',
        },
      },
    });
    expect(lexicalOnly.hits.hits).toHaveLength(0);

    const retriever = buildRetriever({
      query: semanticQuery,
      space_id: spaceId,
      author: identity.author,
      limit: 10,
    });
    const recalled = await storage.getClient().search({
      size: 10,
      track_total_hits: true,
      retriever,
    });
    expect(recalled.hits.hits.map(({ _id }) => _id)).toContain(writeResult.id);

    await expect(
      tombstoneMemory({
        storage,
        historyClient,
        params: {
          id: writeResult.id,
          space_id: spaceId,
          identity,
          call_source: 'user',
        },
      })
    ).resolves.toEqual({ result: 'deleted' });

    const recalledAfterTombstone = await storage.getClient().search({
      size: 10,
      track_total_hits: true,
      retriever,
    });
    expect(recalledAfterTombstone.hits.hits.map(({ _id }) => _id)).not.toContain(writeResult.id);
  });
});
