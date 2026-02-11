/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import type { ElasticsearchClient } from '@kbn/core/server';
import { ProfilesRepository } from './profiles_repository';

const createRepository = () => {
  const esClientMock = {
    search: jest.fn(),
    index: jest.fn(),
  };

  const esClient = esClientMock as unknown as ElasticsearchClient;
  const repository = new ProfilesRepository(esClient);

  return { repository, esClientMock };
};

const profileCreateParams = {
  name: 'Test Profile',
  targetType: 'data_view' as const,
  targetId: 'security-solution-default',
  rules: {
    fieldRules: [{ field: 'host.name', allowed: true, anonymized: false }],
  },
  saltId: 'salt-default',
  namespace: 'default',
  createdBy: 'tester',
};

describe('ProfilesRepository.create', () => {
  it('uses deterministic id and atomic create operation', async () => {
    const { repository, esClientMock } = createRepository();

    esClientMock.search.mockResolvedValueOnce({
      hits: { total: 0, hits: [] },
    });
    esClientMock.index.mockResolvedValueOnce({});

    await repository.create(profileCreateParams);

    const expectedId = `profile-${createHash('sha256')
      .update('default:data_view:security-solution-default')
      .digest('hex')}`;

    expect(esClientMock.index).toHaveBeenCalledWith(
      expect.objectContaining({
        id: expectedId,
        op_type: 'create',
      })
    );
  });

  it('returns 409 conflict when atomic create detects concurrent duplicate', async () => {
    const { repository, esClientMock } = createRepository();

    esClientMock.search.mockResolvedValueOnce({
      hits: { total: 0, hits: [] },
    });
    esClientMock.index.mockRejectedValueOnce({
      meta: { statusCode: 409 },
    });

    await expect(repository.create(profileCreateParams)).rejects.toMatchObject({
      statusCode: 409,
    });
  });

  it('returns 409 conflict when tuple already exists before insert', async () => {
    const { repository, esClientMock } = createRepository();

    esClientMock.search.mockResolvedValueOnce({
      hits: {
        total: 1,
        hits: [
          {
            _source: {
              id: 'existing-id',
              name: 'Existing',
              target_type: 'data_view',
              target_id: 'security-solution-default',
              rules: { field_rules: [], regex_rules: [], ner_rules: [] },
              salt_id: 'salt-default',
              namespace: 'default',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              created_by: 'tester',
              updated_by: 'tester',
            },
          },
        ],
      },
    });

    await expect(repository.create(profileCreateParams)).rejects.toMatchObject({
      statusCode: 409,
    });
  });
});
