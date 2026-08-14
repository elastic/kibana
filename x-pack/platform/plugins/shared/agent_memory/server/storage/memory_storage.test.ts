/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { AGENT_MEMORY_INDEX } from '@kbn/agent-memory-common';
import { loggerMock } from '@kbn/logging-mocks';
import { StorageIndexAdapter } from '@kbn/storage-adapter';
import { createMemoryStorage, memoryStorageSettings } from './memory_storage';

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

  it('configures the exact index and component-template composition', () => {
    expect(AGENT_MEMORY_INDEX).toBe('ai-index-idx-agent-memory');
    expect({
      name: memoryStorageSettings.name,
      priority: memoryStorageSettings.priority,
      componentTemplate: memoryStorageSettings.componentTemplate,
    }).toEqual({
      name: 'ai-index-idx-agent-memory',
      priority: 600,
      componentTemplate: {
        name: 'ai-index-agent-memory@mappings',
        required: ['ai-index@mappings'],
        optional: ['ai-index@custom'],
      },
    });
  });

  it('maps only Agent Memory-owned fields in its component template', () => {
    const rootProperties = memoryStorageSettings.schema.properties;

    expect(rootProperties).toEqual({
      id: keywordMapping,
      deleted: { type: 'boolean' },
      expires_at: dateMapping,
      created_at: dateMapping,
      space_id: keywordMapping,
      memory: {
        properties: {
          type: keywordMapping,
          category: keywordMapping,
          revision: { type: 'long' },
          content_hash: keywordMapping,
          scope_kind: keywordMapping,
          scope_id: keywordMapping,
          entities: keywordMapping,
          origin: keywordMapping,
          assurance: keywordMapping,
          provenance: {
            properties: {
              author: keywordMapping,
              author_kind: keywordMapping,
              call_source: keywordMapping,
              conversation_ids: keywordMapping,
              trace_ids: keywordMapping,
              source_memory_ids: keywordMapping,
            },
            type: 'object',
          },
          valid_at: dateMapping,
          invalid_at: dateMapping,
          expired_at: dateMapping,
          superseded_by: keywordMapping,
          suppress_until: dateMapping,
          use_count: { type: 'long' },
          last_used_at: dateMapping,
          diff_id: keywordMapping,
          derived_from: keywordMapping,
          prior_document: {
            enabled: false,
            type: 'object',
          },
        },
        type: 'object',
      },
    });

    for (const inheritedField of [
      '@timestamp',
      'type',
      'title',
      'description',
      'content',
      'tags',
      'attributes',
      'references',
    ]) {
      expect(rootProperties).not.toHaveProperty(inheritedField);
    }
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
