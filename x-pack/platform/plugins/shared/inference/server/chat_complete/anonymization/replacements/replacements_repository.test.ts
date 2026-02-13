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

    const createdDoc = (esClient.index as jest.Mock).mock.calls[0][0].document as Record<string, unknown>;
    (esClient.get as jest.Mock).mockResolvedValue({
      _source: createdDoc,
    });

    const result = await repo.get('default', createdDoc.id as string);

    expect(result?.tokenToOriginal).toEqual({ TOKEN_A: 'original-a' });
  });

});
