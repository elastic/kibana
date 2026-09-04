/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core/server';
import { createTestServers, type TestElasticsearchUtils } from '@kbn/core-test-helpers-kbn-server';
import { loggerMock } from '@kbn/logging-mocks';
import { AGENT_MEMORY_INDEX } from '../../../common';
import { recallMemory } from '../../core/recall_memory';
import { writeMemory } from '../../core/write_memory';
import {
  deleteAgentMemoryMappingsComponentTemplate,
  ensureAgentMemoryMappingsComponentTemplate,
} from '../ensure_agent_memory_component_template';
import {
  agentMemoryMappingsComponentProperties,
  createMemoryStorage,
  memoryStorageSettings,
  type MemoryStorage,
} from '../memory_storage';

describe('Agent Memory AI Index integration', () => {
  let esServer: TestElasticsearchUtils;
  let esClient: Client;
  let storage: MemoryStorage;

  const identity = {
    author: 'profile-agent-memory-integration',
    author_kind: 'profile_uid' as const,
  };
  const spaceId = 'agent-memory-integration-space';
  const logger = loggerMock.create();
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
    await ensureAgentMemoryMappingsComponentTemplate({
      esClient: esClient as unknown as ElasticsearchClient,
      logger,
    });
    storage = createMemoryStorage({
      logger,
      esClient: esClient as unknown as ElasticsearchClient,
      indexManagementClient: esClient as unknown as ElasticsearchClient,
    });
  });

  afterAll(async () => {
    try {
      await storage?.getClient().clean();
      await deleteAgentMemoryMappingsComponentTemplate({
        esClient: esClient as unknown as ElasticsearchClient,
      });

      await expect(
        esClient.cluster.getComponentTemplate({ name: 'ai-index@mappings' })
      ).resolves.toMatchObject({
        component_templates: [{ name: 'ai-index@mappings' }],
      });
    } finally {
      await esServer?.stop();
    }
  });

  it('composes the built-in mappings and recalls a stored memory', async () => {
    await expect(
      esClient.cluster.getComponentTemplate({ name: 'ai-index@mappings' })
    ).resolves.toMatchObject({
      component_templates: [{ name: 'ai-index@mappings' }],
    });

    const title = 'Preferred incident review sources';
    const description = 'Use primary runbooks before community troubleshooting posts.';
    const writeResult = await writeMemory({
      storage,
      esClient: esClient as unknown as ElasticsearchClient,
      params: {
        title,
        description,
        category: 'procedures',
        tags: ['incident-response'],
        call_source: 'user',
        space_id: spaceId,
        identity,
      },
    });

    const indexTemplate = await esClient.indices.getIndexTemplate({ name: AGENT_MEMORY_INDEX });
    expect(indexTemplate.index_templates[0].index_template).toMatchObject({
      priority: 600,
      composed_of: ['ai-index@mappings', 'ai-index@custom', 'ai-index-agent-memory@mappings'],
      ignore_missing_component_templates: ['ai-index@custom'],
    });

    const simulatedTemplate = await esClient.indices.simulateIndexTemplate({
      name: `${AGENT_MEMORY_INDEX}-999999`,
    });
    const { type: _memoryObjectType, ...expectedMemoryMapping } =
      memoryStorageSettings.schema.properties.memory;
    const { type: _provenanceObjectType, ...expectedProvenanceMapping } =
      expectedMemoryMapping.properties.provenance;
    const { type: _permissionsObjectType, ...expectedPermissionsMapping } =
      agentMemoryMappingsComponentProperties.permissions;
    const { type: _kibanaObjectType, ...expectedKibanaMapping } =
      expectedPermissionsMapping.properties.kibana;
    expect(simulatedTemplate.template).toMatchObject({
      aliases: {
        [AGENT_MEMORY_INDEX]: {
          is_write_index: true,
        },
      },
      mappings: {
        dynamic: 'strict',
        properties: {
          '@timestamp': { type: 'date' },
          type: { type: 'keyword' },
          title: {
            type: 'text',
            fields: {
              semantic: {
                type: 'semantic_text',
              },
            },
          },
          description: {
            type: 'text',
            fields: {
              semantic: {
                type: 'semantic_text',
              },
            },
          },
          content: {
            type: 'text',
            fields: {
              semantic: {
                type: 'semantic_text',
              },
            },
          },
          tags: { type: 'keyword' },
          attributes: { type: 'flattened' },
          references: {
            properties: {
              uri: { type: 'keyword' },
            },
          },
          ...agentMemoryMappingsComponentProperties,
          permissions: {
            ...expectedPermissionsMapping,
            properties: {
              ...expectedPermissionsMapping.properties,
              kibana: expectedKibanaMapping,
            },
          },
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
      permissions: {
        kibana: {
          privileges: [
            {
              space: spaceId,
              name: ['ai_index:agent_memory/read'],
              count: 1,
            },
          ],
        },
      },
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

    const unconstrainedRecall = await recallMemory({
      storage,
      logger,
      params: {
        query: semanticQuery,
        space_id: spaceId,
        identity,
        limit: 10,
      },
    });
    expect(unconstrainedRecall.memories.map(({ id }) => id)).toContain(writeResult.id);

    const recalled = await recallMemory({
      storage,
      logger,
      params: {
        query: semanticQuery,
        tags: ['incident-response'],
        space_id: spaceId,
        identity,
        limit: 10,
      },
    });
    expect(recalled.memories.map(({ id }) => id)).toContain(writeResult.id);

    const excludedByTags = await recallMemory({
      storage,
      logger,
      params: {
        query: semanticQuery,
        tags: ['incident-response', 'project:other'],
        space_id: spaceId,
        identity,
        limit: 10,
      },
    });
    expect(excludedByTags.memories).toEqual([]);
  });
});
