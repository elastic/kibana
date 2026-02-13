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
      retentionMs: 60_000,
    });

    await repo.create({
      scopeType: 'execution',
      scopeId: 'scope-1',
      profileId: 'profile-1',
      tokenToOriginal: {
        TOKEN_A: 'original-a',
      },
      tokenSources: [],
      namespace: 'default',
      createdBy: 'test',
    });

    const payload = (esClient.index as jest.Mock).mock.calls[0][0].document as {
      token_to_original?: Record<string, string>;
      token_to_original_encrypted?: Record<string, string>;
    };

    expect(payload.token_to_original).toBeUndefined();
    expect(payload.token_to_original_encrypted?.TOKEN_A).toContain('v1:');
  });

  it('decrypts encrypted token mappings on read', async () => {
    const repo = new ReplacementsRepository(esClient, {
      encryptionKey: 'test-encryption-key',
      retentionMs: 60_000,
    });

    await repo.create({
      scopeType: 'execution',
      scopeId: 'scope-2',
      profileId: 'profile-2',
      tokenToOriginal: {
        TOKEN_A: 'original-a',
      },
      tokenSources: [],
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

    expect(result?.tokenToOriginal).toEqual({ TOKEN_A: 'original-a' });
  });

  it('does not return expired replacements', async () => {
    const repo = new ReplacementsRepository(esClient, {
      encryptionKey: 'test-encryption-key',
    });

    const expiredDoc = {
      id: 'expired-1',
      scope_type: 'execution',
      scope_id: 'scope-3',
      profile_id: 'profile-3',
      token_to_original: { TOKEN_A: 'original-a' },
      token_sources: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      expires_at: new Date(Date.now() - 60_000).toISOString(),
      created_by: 'test',
      namespace: 'default',
    };

    (esClient.get as jest.Mock).mockResolvedValue({
      _source: expiredDoc,
    });

    const result = await repo.get('default', 'expired-1');

    expect(result).toBeNull();
  });

  it('deletes expired documents with deleteByQuery', async () => {
    const repo = new ReplacementsRepository(esClient);
    (esClient.deleteByQuery as jest.Mock).mockResolvedValue({ deleted: 3 });

    const deleted = await repo.deleteExpired();

    expect(deleted).toBe(3);
    expect(esClient.deleteByQuery).toHaveBeenCalledTimes(1);
  });
});
