/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { SHORT_TERM_MEMORY_DATA_STREAM } from '../../common/memory';
import {
  MemoryDisabledError,
  MemoryForbiddenError,
  MemoryNotFoundError,
  MemoryValidationError,
} from './errors';
import type { StoredMemoryDocument } from './memory_document';
import { MemoryService } from './service';
import type { MemoryServiceDeps } from './service';

const NOW = new Date('2026-10-01T00:00:00.000Z');
const DAY_MS = 24 * 60 * 60 * 1000;

const rememberParams = {
  type: 'memory.session_fact' as const,
  title: 'Prefers dark mode',
  description: 'UI preference',
  content: 'The user prefers dark mode.',
};

const storedMemory = (overrides: Partial<StoredMemoryDocument> = {}): StoredMemoryDocument => ({
  '@timestamp': '2026-09-30T00:00:00.000Z',
  id: 'memory-1',
  type: 'memory.session_fact',
  title: 'Old title',
  description: 'Old description',
  content: 'Old content',
  tags: ['ui'],
  expires_at: '2026-12-01T00:00:00.000Z',
  updated_at: '2026-09-30T00:00:00.000Z',
  references: [{ uri: 'conversation://c1', relation: 'source' }],
  attributes: { 'memory.session_id': 'session-1' },
  governance: {
    provenance: {
      created_by: { uri: 'user://u0', metadata: {} },
      updated_by: { uri: 'user://u0', metadata: {} },
    },
  },
  permissions: { kibana: { privileges: [{ space: 'default', name: [], count: 0 }] } },
  ...overrides,
});

describe('MemoryService', () => {
  let esClient: ReturnType<typeof elasticsearchClientMock.createElasticsearchClient>;
  let deps: MemoryServiceDeps;
  let ids: string[];

  const mockLatest = (document?: StoredMemoryDocument) => {
    esClient.search.mockResolvedValue({
      hits: { hits: document ? [{ _index: 'idx', _id: 'doc', _source: document }] : [] },
    } as unknown as Awaited<ReturnType<typeof esClient.search>>);
  };

  const writtenDocument = (): StoredMemoryDocument =>
    esClient.index.mock.calls[0][0].document as StoredMemoryDocument;

  const createService = (overrides: Partial<MemoryServiceDeps> = {}) =>
    new MemoryService({ ...deps, ...overrides });

  beforeEach(() => {
    esClient = elasticsearchClientMock.createElasticsearchClient();
    ids = ['generated-1', 'generated-2'];
    deps = {
      spaceId: 'default',
      esClient,
      logger: loggerMock.create(),
      isContextEngineEnabled: jest.fn().mockResolvedValue(true),
      isMemoryEnabled: jest.fn().mockResolvedValue(true),
      hasWritePrivilege: jest.fn().mockResolvedValue(true),
      getCurrentUser: jest.fn().mockResolvedValue({ id: 'u1', username: 'elastic' }),
      ensureStore: jest.fn().mockResolvedValue(undefined),
      generateId: () => ids.shift() ?? 'generated-x',
      getCurrentDate: () => NOW,
    };
    mockLatest();
  });

  describe('remember', () => {
    it('creates a new memory with defaults for the calling user', async () => {
      const result = await createService().remember(rememberParams);

      expect(result).toEqual({ id: 'generated-1', session_id: 'generated-2' });
      expect(esClient.search).not.toHaveBeenCalled();
      expect(deps.ensureStore).toHaveBeenCalled();
      expect(esClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          index: SHORT_TERM_MEMORY_DATA_STREAM,
          op_type: 'create',
          refresh: 'wait_for',
        })
      );
      const writer = { uri: 'user://u1', metadata: { username: 'elastic', space_id: 'default' } };
      expect(writtenDocument()).toEqual({
        '@timestamp': NOW.toISOString(),
        id: 'generated-1',
        type: 'memory.session_fact',
        title: 'Prefers dark mode',
        description: 'UI preference',
        content: 'The user prefers dark mode.',
        expires_at: new Date(NOW.getTime() + 90 * DAY_MS).toISOString(),
        updated_at: NOW.toISOString(),
        attributes: { 'memory.session_id': 'generated-2' },
        governance: { provenance: { created_by: writer, updated_by: writer } },
        permissions: { kibana: { privileges: [{ space: 'default', name: [], count: 0 }] } },
      });
    });

    it('keeps a supplied session id and adds the user id to a supplied writer', async () => {
      await createService().remember({
        ...rememberParams,
        session_id: 'conversation-1',
        writer: { uri: 'tool://platform.context_engine.remember', metadata: {} },
      });

      expect(writtenDocument().attributes).toEqual({ 'memory.session_id': 'conversation-1' });
      expect(writtenDocument().governance?.provenance?.created_by).toEqual({
        uri: 'tool://platform.context_engine.remember',
        metadata: { user_id: 'u1' },
      });
    });

    it.each([
      ['not a date', 'expires_at must be an ISO 8601 date.'],
      ['2026-09-30T00:00:00.000Z', 'expires_at must be in the future.'],
      [new Date(NOW.getTime() + 91 * DAY_MS).toISOString(), 'at most 90 days'],
    ])('rejects expires_at %s', async (expiresAt, message) => {
      await expect(
        createService().remember({ ...rememberParams, expires_at: expiresAt })
      ).rejects.toThrow(MemoryValidationError);
      await expect(
        createService().remember({ ...rememberParams, expires_at: expiresAt })
      ).rejects.toThrow(message);
      expect(esClient.index).not.toHaveBeenCalled();
    });

    it('accepts expires_at within 90 days', async () => {
      const expiresAt = new Date(NOW.getTime() + 7 * DAY_MS).toISOString();

      await createService().remember({ ...rememberParams, expires_at: expiresAt });

      expect(writtenDocument().expires_at).toBe(expiresAt);
    });

    it('revises the latest revision, keeping its session, tags and references', async () => {
      mockLatest(storedMemory());

      const result = await createService().remember({ ...rememberParams, id: 'memory-1' });

      expect(esClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          index: SHORT_TERM_MEMORY_DATA_STREAM,
          size: 1,
          sort: [{ '@timestamp': 'desc' }],
        })
      );
      expect(result).toEqual({ id: 'memory-1', session_id: 'session-1' });
      const document = writtenDocument();
      expect(document).toMatchObject({
        id: 'memory-1',
        title: 'Prefers dark mode',
        tags: ['ui'],
        references: [{ uri: 'conversation://c1', relation: 'source' }],
      });
      expect(document.governance?.provenance).toEqual({
        created_by: { uri: 'user://u0', metadata: {} },
        updated_by: { uri: 'user://u1', metadata: { username: 'elastic', space_id: 'default' } },
      });
    });

    it('rejects revising an unknown memory', async () => {
      await expect(createService().remember({ ...rememberParams, id: 'missing' })).rejects.toThrow(
        MemoryNotFoundError
      );
    });

    it('rejects revising a memory as another type', async () => {
      mockLatest(storedMemory({ type: 'memory.session' }));

      await expect(createService().remember({ ...rememberParams, id: 'memory-1' })).rejects.toThrow(
        MemoryValidationError
      );
    });

    it('rejects revising a deleted memory', async () => {
      mockLatest(storedMemory({ governance: { lifecycle: { status: 'deleted' } } }));

      await expect(createService().remember({ ...rememberParams, id: 'memory-1' })).rejects.toThrow(
        'was deleted'
      );
    });

    it('treats a long-term memory id as unknown', async () => {
      mockLatest(storedMemory({ type: 'memory.fact' }));

      await expect(createService().remember({ ...rememberParams, id: 'memory-1' })).rejects.toThrow(
        MemoryNotFoundError
      );
    });
  });

  describe('write checks', () => {
    it('rejects writes when Context Engine is disabled in the space', async () => {
      const service = createService({ isContextEngineEnabled: jest.fn().mockResolvedValue(false) });

      await expect(service.remember(rememberParams)).rejects.toThrow(MemoryDisabledError);
      expect(deps.isMemoryEnabled).not.toHaveBeenCalled();
    });

    it('rejects writes when memory is disabled', async () => {
      const service = createService({ isMemoryEnabled: jest.fn().mockResolvedValue(false) });

      await expect(service.forget({ id: 'memory-1' })).rejects.toThrow(MemoryDisabledError);
      expect(deps.hasWritePrivilege).not.toHaveBeenCalled();
    });

    it('rejects writes without the Context Engine write privilege', async () => {
      const service = createService({ hasWritePrivilege: jest.fn().mockResolvedValue(false) });

      await expect(service.remember(rememberParams)).rejects.toThrow(MemoryForbiddenError);
      expect(esClient.index).not.toHaveBeenCalled();
    });
  });

  describe('forget', () => {
    it('writes a tombstone revision', async () => {
      mockLatest(storedMemory());

      await expect(createService().forget({ id: 'memory-1' })).resolves.toEqual({
        id: 'memory-1',
      });

      const document = writtenDocument();
      expect(document).toMatchObject({
        id: 'memory-1',
        '@timestamp': NOW.toISOString(),
        content: 'Old content',
      });
      expect(document.governance?.lifecycle).toEqual({ status: 'deleted' });
      expect(document.governance?.provenance?.updated_by?.uri).toBe('user://u1');
    });

    it('is a no-op for a memory that is already deleted', async () => {
      mockLatest(storedMemory({ governance: { lifecycle: { status: 'deleted' } } }));

      await expect(createService().forget({ id: 'memory-1' })).resolves.toEqual({
        id: 'memory-1',
      });
      expect(esClient.index).not.toHaveBeenCalled();
    });

    it.each([
      ['an unknown memory', undefined],
      ['a long-term memory', storedMemory({ type: 'memory.fact' })],
    ])('rejects %s', async (_name, latest) => {
      mockLatest(latest);

      await expect(createService().forget({ id: 'memory-1' })).rejects.toThrow(MemoryNotFoundError);
    });
  });
});
