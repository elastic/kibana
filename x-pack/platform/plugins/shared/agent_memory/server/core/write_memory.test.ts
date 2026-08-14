/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MemoryDocument, MemoryDocumentSnapshot } from '../storage/memory_storage';
import { writeMemory } from './write_memory';

const CURRENT_TIME = '2026-08-13T12:00:00.000Z';

interface IndexRequest {
  id: string;
  document: MemoryDocument;
  if_seq_no?: number;
  if_primary_term?: number;
}

const createDependencies = (
  hits: Array<{
    _id: string;
    _source: MemoryDocument;
    _seq_no?: number;
    _primary_term?: number;
  }> = []
) => {
  const search = jest.fn().mockResolvedValue({ hits: { hits } });
  const index = jest.fn(async (_request: IndexRequest) => ({}));

  return {
    search,
    index,
    storage: {
      getClient: () => ({ search, index }),
    } as never,
    historyClient: {
      create: jest.fn().mockResolvedValue(undefined),
    } as never,
  };
};

describe('writeMemory', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('sets creation and revision timestamps to the current time when creating a memory', async () => {
    jest.useFakeTimers().setSystemTime(new Date(CURRENT_TIME));
    const { storage, historyClient, index } = createDependencies();

    await writeMemory({
      storage,
      historyClient,
      params: {
        title: 'New memory',
        description: 'New description',
        space_id: 'default',
        identity: {
          author: 'user-1',
          author_kind: 'profile_uid',
        },
      },
    });

    const writtenDocument = index.mock.calls[0][0].document;

    expect(writtenDocument.created_at).toBe(CURRENT_TIME);
    expect(writtenDocument['@timestamp']).toBe(CURRENT_TIME);
  });

  it('defaults new memories to the resolved user scope', async () => {
    jest.useFakeTimers().setSystemTime(new Date(CURRENT_TIME));
    const { storage, historyClient, index } = createDependencies();

    await writeMemory({
      storage,
      historyClient,
      params: {
        title: 'New memory',
        description: 'New description',
        space_id: 'default',
        identity: {
          author: 'user-1',
          author_kind: 'profile_uid',
        },
      },
    });

    expect(index.mock.calls[0][0].document.memory).toMatchObject({
      scope_kind: 'user',
      scope_id: 'user-1',
    });
  });

  it('resurrects a legacy memory in place with a new revision timestamp and default scope', async () => {
    jest.useFakeTimers().setSystemTime(new Date(CURRENT_TIME));
    const existingDocument: MemoryDocument = {
      id: 'memory-1',
      type: 'memory',
      title: 'Original title',
      description: 'Same description',
      deleted: true,
      '@timestamp': '2026-08-02T00:00:00.000Z',
      created_at: '2026-08-01T00:00:00.000Z',
      space_id: 'default',
      memory: {
        revision: 1,
        content_hash: 'existing-hash',
        provenance: {
          author: 'user-1',
          author_kind: 'profile_uid',
        },
      },
    };
    const { storage, historyClient, search, index } = createDependencies([
      {
        _id: 'memory-1',
        _source: existingDocument,
        _seq_no: 7,
        _primary_term: 3,
      },
    ]);

    const result = await writeMemory({
      storage,
      historyClient,
      params: {
        title: 'Restored title',
        description: existingDocument.description,
        space_id: 'default',
        identity: {
          author: 'user-1',
          author_kind: 'profile_uid',
        },
      },
    });

    const request = index.mock.calls[0][0];

    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({
        seq_no_primary_term: true,
      })
    );
    expect(result).toMatchObject({ id: 'memory-1', action: 'updated' });
    expect(request).toMatchObject({
      id: 'memory-1',
      if_seq_no: 7,
      if_primary_term: 3,
    });
    expect(request.document).toMatchObject({
      deleted: false,
      created_at: existingDocument.created_at,
      '@timestamp': CURRENT_TIME,
      memory: {
        scope_kind: 'user',
        scope_id: 'user-1',
      },
    });
  });

  it('preserves an explicit non-user scope when superseding', async () => {
    const existingDocument: MemoryDocument = {
      id: 'memory-1',
      type: 'memory',
      title: 'Original title',
      description: 'Same description',
      created_at: '2026-08-01T00:00:00.000Z',
      space_id: 'default',
      memory: {
        revision: 1,
        content_hash: 'existing-hash',
        scope_kind: 'agent',
        scope_id: 'agent-123',
        provenance: {
          author: 'user-1',
          author_kind: 'profile_uid',
        },
      },
    };
    const { storage, historyClient, index } = createDependencies([
      {
        _id: 'memory-1',
        _source: existingDocument,
      },
    ]);

    await writeMemory({
      storage,
      historyClient,
      params: {
        title: 'Updated title',
        description: existingDocument.description,
        space_id: 'default',
        identity: {
          author: 'user-1',
          author_kind: 'profile_uid',
        },
      },
    });

    expect(index.mock.calls[0][0].document.memory).toMatchObject({
      scope_kind: 'agent',
      scope_id: 'agent-123',
    });
  });

  it('keeps only one level of prior-document history when superseding', async () => {
    const priorDocument: MemoryDocumentSnapshot = {
      id: 'memory-1',
      type: 'memory',
      title: 'Original title',
      description: 'Original description',
      tags: ['original'],
      created_at: '2026-08-01T00:00:00.000Z',
      space_id: 'default',
      memory: {
        revision: 1,
        content_hash: 'original-hash',
        provenance: {
          author: 'user-1',
          author_kind: 'profile_uid',
        },
      },
    };
    const existingDocument: MemoryDocument = {
      ...priorDocument,
      title: 'Existing title',
      description: 'Existing description',
      tags: ['existing'],
      memory: {
        ...priorDocument.memory,
        revision: 2,
        content_hash: 'existing-hash',
        prior_document: priorDocument,
      },
    };
    const search = jest.fn().mockResolvedValue({
      hits: {
        hits: [
          {
            _id: 'memory-1',
            _source: existingDocument,
            _seq_no: 7,
            _primary_term: 3,
          },
        ],
      },
    });
    const index = jest.fn(
      async (_request: {
        id: string;
        document: MemoryDocument;
        if_seq_no?: number;
        if_primary_term?: number;
      }) => ({})
    );
    const storage = {
      getClient: () => ({ search, index }),
    } as never;
    const historyClient = {
      create: jest.fn().mockResolvedValue(undefined),
    } as never;

    await writeMemory({
      storage,
      historyClient,
      params: {
        title: 'Updated title',
        description: 'Updated description',
        space_id: 'default',
        identity: {
          author: 'user-1',
          author_kind: 'profile_uid',
        },
      },
    });

    const writtenDocument = index.mock.calls[0][0].document;
    const snapshot = writtenDocument.memory.prior_document;

    expect(snapshot).toMatchObject({
      id: existingDocument.id,
      title: existingDocument.title,
      description: existingDocument.description,
      tags: existingDocument.tags,
      created_at: existingDocument.created_at,
      space_id: existingDocument.space_id,
    });
    expect(snapshot?.memory).not.toHaveProperty('prior_document');
  });
});
