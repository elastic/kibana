/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import { StorageIndexAdapter } from '@kbn/storage-adapter';
import { AGENT_MEMORY_INDEX } from '../../common';
import {
  agentMemoryMappingsComponentProperties,
  createMemoryStorage,
  memoryStorageSettings,
} from './memory_storage';

jest.mock('@kbn/storage-adapter', () => {
  const actual = jest.requireActual('@kbn/storage-adapter');
  return {
    ...actual,
    StorageIndexAdapter: jest.fn(),
  };
});

describe('memoryStorageSettings', () => {
  const keywordMapping = {
    ignore_above: 1024,
    type: 'keyword',
  } as const;
  const dateMapping = {
    format: 'strict_date_optional_time',
    type: 'date',
  } as const;
  const semanticTextMapping = {
    fields: {
      semantic: {
        type: 'semantic_text',
      },
    },
    type: 'text',
  } as const;

  it('configures the index, component composition, and Agent Memory-owned mappings', () => {
    expect(AGENT_MEMORY_INDEX).toBe('ai-index-idx-agent-memory');
    expect({
      name: memoryStorageSettings.name,
      priority: memoryStorageSettings.priority,
      composedOf: memoryStorageSettings.composedOf,
      ignoreMissingComponentTemplates: memoryStorageSettings.ignoreMissingComponentTemplates,
      inlineSchemaMappings: memoryStorageSettings.inlineSchemaMappings,
    }).toEqual({
      name: 'ai-index-idx-agent-memory',
      priority: 600,
      composedOf: ['ai-index@mappings', 'ai-index@custom', 'ai-index-agent-memory@mappings'],
      ignoreMissingComponentTemplates: ['ai-index@custom'],
      inlineSchemaMappings: false,
    });

    const rootProperties = memoryStorageSettings.schema.properties;

    expect(rootProperties).toEqual({
      '@timestamp': dateMapping,
      type: keywordMapping,
      title: semanticTextMapping,
      description: semanticTextMapping,
      content: semanticTextMapping,
      tags: keywordMapping,
      attributes: { type: 'flattened' },
      references: {
        properties: {
          uri: keywordMapping,
        },
        type: 'object',
      },
      id: keywordMapping,
      deleted: { type: 'boolean' },
      expires_at: dateMapping,
      created_at: dateMapping,
      space_id: keywordMapping,
      namespace: keywordMapping,
      permissions: {
        properties: {
          kibana: {
            properties: {
              privileges: {
                properties: {
                  name: keywordMapping,
                  space: keywordMapping,
                  count: { type: 'long' },
                },
                type: 'nested',
              },
            },
            type: 'object',
          },
        },
        type: 'object',
      },
      memory: {
        properties: {
          type: keywordMapping,
          category: keywordMapping,
          revision: { type: 'long' },
          content_hash: keywordMapping,
          scope_kind: keywordMapping,
          scope_id: keywordMapping,
          provenance: {
            properties: {
              author: keywordMapping,
              author_kind: keywordMapping,
              call_source: keywordMapping,
              used_memory_ids: keywordMapping,
            },
            type: 'object',
          },
        },
        type: 'object',
      },
    });

    expect(agentMemoryMappingsComponentProperties).toEqual({
      id: keywordMapping,
      deleted: { type: 'boolean' },
      expires_at: dateMapping,
      created_at: dateMapping,
      space_id: keywordMapping,
      namespace: keywordMapping,
      permissions: rootProperties.permissions,
      memory: rootProperties.memory,
    });
  });
});

describe('createMemoryStorage', () => {
  it('keeps data operations on the current user and template operations on the internal user', () => {
    const esClient = {} as ElasticsearchClient;
    const indexManagementClient = {} as ElasticsearchClient;
    const logger = loggerMock.create();

    createMemoryStorage({ logger, esClient, indexManagementClient });

    expect(StorageIndexAdapter).toHaveBeenCalledWith(esClient, logger, memoryStorageSettings, {
      indexManagementClient,
    });
  });
});
