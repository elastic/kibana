/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { ReplacementsRepository } from './replacements_repository';

describe('ReplacementsRepository', () => {
  const esClient = {
    index: jest.fn(),
    get: jest.fn(),
    search: jest.fn(),
    update: jest.fn(),
    deleteByQuery: jest.fn(),
  } as unknown as jest.Mocked<ElasticsearchClient>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('stores token mappings encrypted when encryption key is configured', async () => {
    const repo = new ReplacementsRepository(esClient, {
      encryptionKey: 'test-encryption-key',
    });

    await repo.create({
      replacements: [{ anonymized: 'TOKEN_A', original: 'original-a' }],
      namespace: 'default',
      createdBy: 'test',
    });

    const payload = (esClient.index as jest.Mock).mock.calls[0][0].document as {
      replacements: Array<{
        anonymized: string;
        original_encrypted?: string;
      }>;
    };

    expect(payload.replacements[0].anonymized).toBe('TOKEN_A');
    expect(payload.replacements[0].original_encrypted).toContain('v1:');
  });

  it('decrypts encrypted token mappings on read', async () => {
    const repo = new ReplacementsRepository(esClient, {
      encryptionKey: 'test-encryption-key',
    });

    await repo.create({
      replacements: [{ anonymized: 'TOKEN_A', original: 'original-a' }],
      namespace: 'default',
      createdBy: 'test',
    });

    const createdDoc = (esClient.index as jest.Mock).mock.calls[0][0].document as Record<
      string,
      unknown
    >;
    (esClient.get as jest.Mock).mockResolvedValue({
      _source: createdDoc,
    });

    const result = await repo.get('default', createdDoc.id as string);

    expect(result?.replacements).toEqual([{ anonymized: 'TOKEN_A', original: 'original-a' }]);
  });

  it('rejects conflicting anonymized mappings on update', async () => {
    const repo = new ReplacementsRepository(esClient, {
      encryptionKey: 'test-encryption-key',
    });
    const id = 'replacements-1';

    (esClient.get as jest.Mock).mockResolvedValue({
      _source: {
        id,
        replacements: [{ anonymized: 'TOKEN_A', original: 'original-a' }],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: 'test',
        namespace: 'default',
      },
    });

    await expect(
      repo.update('default', id, {
        replacements: [{ anonymized: 'TOKEN_A', original: 'different-original' }],
      })
    ).rejects.toThrow('Cannot store replacements');
  });

  it('deduplicates identical anonymized mappings on update', async () => {
    const repo = new ReplacementsRepository(esClient, {
      encryptionKey: 'test-encryption-key',
    });
    const id = 'replacements-2';

    (esClient.get as jest.Mock)
      .mockResolvedValueOnce({
        _source: {
          id,
          replacements: [{ anonymized: 'TOKEN_A', original: 'original-a' }],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: 'test',
          namespace: 'default',
        },
      })
      .mockResolvedValueOnce({
        _source: {
          id,
          replacements: [{ anonymized: 'TOKEN_A', original: 'original-a' }],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: 'test',
          namespace: 'default',
        },
      });

    const result = await repo.update('default', id, {
      replacements: [{ anonymized: 'TOKEN_A', original: 'original-a' }],
    });

    expect(result?.replacements).toHaveLength(1);
  });

  it('retries optimistic update on version conflict', async () => {
    const repo = new ReplacementsRepository(esClient, {
      encryptionKey: 'test-encryption-key',
    });
    const id = 'replacements-retry';
    const now = new Date().toISOString();

    (esClient.get as jest.Mock)
      .mockResolvedValueOnce({
        _seq_no: 1,
        _primary_term: 1,
        _source: {
          id,
          replacements: [{ anonymized: 'TOKEN_A', original: 'original-a' }],
          created_at: now,
          updated_at: now,
          created_by: 'test',
          namespace: 'default',
        },
      })
      .mockResolvedValueOnce({
        _seq_no: 2,
        _primary_term: 1,
        _source: {
          id,
          replacements: [{ anonymized: 'TOKEN_A', original: 'original-a' }],
          created_at: now,
          updated_at: now,
          created_by: 'test',
          namespace: 'default',
        },
      })
      .mockResolvedValueOnce({
        _source: {
          id,
          replacements: [
            { anonymized: 'TOKEN_A', original: 'original-a' },
            { anonymized: 'TOKEN_B', original: 'original-b' },
          ],
          created_at: now,
          updated_at: now,
          created_by: 'test',
          namespace: 'default',
        },
      });

    const conflictError = Object.assign(new Error('version conflict'), {
      meta: { statusCode: 409 },
    });
    (esClient.update as jest.Mock)
      .mockRejectedValueOnce(conflictError)
      .mockResolvedValueOnce({ result: 'updated' });

    const result = await repo.update('default', id, {
      replacements: [{ anonymized: 'TOKEN_B', original: 'original-b' }],
    });

    expect(esClient.update).toHaveBeenCalledTimes(2);
    expect((esClient.update as jest.Mock).mock.calls[0][0]).toMatchObject({
      if_seq_no: 1,
      if_primary_term: 1,
    });
    expect((esClient.update as jest.Mock).mock.calls[1][0]).toMatchObject({
      if_seq_no: 2,
      if_primary_term: 1,
    });
    expect(result?.replacements).toHaveLength(2);
  });

  it('throws when a stored replacement entry has no original payload', async () => {
    const repo = new ReplacementsRepository(esClient, {
      encryptionKey: 'test-encryption-key',
    });
    const id = 'replacements-invalid';

    (esClient.get as jest.Mock).mockResolvedValue({
      _source: {
        id,
        replacements: [{ anonymized: 'TOKEN_A' }],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: 'test',
        namespace: 'default',
      },
    });

    await expect(repo.get('default', id)).rejects.toThrow(
      'Invalid replacements entry for token "TOKEN_A": missing original payload'
    );
  });
});
