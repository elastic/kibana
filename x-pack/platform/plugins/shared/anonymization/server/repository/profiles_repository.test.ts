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
    get: jest.fn(),
    update: jest.fn(),
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
    regexRules: [],
    nerRules: [],
  },
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

    esClientMock.index.mockRejectedValueOnce({
      statusCode: 409,
    });

    await expect(repository.create(profileCreateParams)).rejects.toMatchObject({
      statusCode: 409,
    });
  });
});

describe('ProfilesRepository.update', () => {
  it('preserves regex and NER rules when omitted from update payload', async () => {
    const { repository, esClientMock } = createRepository();

    const esDoc = {
      id: 'profile-id',
      name: 'Existing Profile',
      target_type: 'data_view',
      target_id: 'security-solution-default',
      rules: {
        field_rules: [{ field: 'host.name', allowed: true, anonymized: false }],
        regex_rules: [
          {
            id: 'regex-1',
            type: 'regex',
            entity_class: 'EMAIL',
            pattern: '.*',
            enabled: true,
          },
        ],
        ner_rules: [
          {
            id: 'ner-1',
            type: 'ner',
            allowed_entity_classes: ['PER'],
            enabled: true,
          },
        ],
      },
      namespace: 'default',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: 'tester',
      updated_by: 'tester',
    };

    const updatedEsDoc = {
      ...esDoc,
      rules: {
        ...esDoc.rules,
        field_rules: [{ field: 'host.name', allowed: false, anonymized: false }],
      },
    };

    esClientMock.get
      .mockResolvedValueOnce({
        _source: esDoc,
        _seq_no: 1,
        _primary_term: 1,
      })
      .mockResolvedValueOnce({
        _source: updatedEsDoc,
      });

    esClientMock.update.mockResolvedValueOnce({});

    await repository.update('default', 'profile-id', {
      rules: {
        fieldRules: [{ field: 'host.name', allowed: false, anonymized: false }],
      },
      updatedBy: 'updater',
    });

    expect(esClientMock.update).toHaveBeenCalledWith(
      expect.objectContaining({
        if_seq_no: 1,
        if_primary_term: 1,
        doc: expect.objectContaining({
          rules: expect.objectContaining({
            field_rules: [
              expect.objectContaining({ field: 'host.name', allowed: false, anonymized: false }),
            ],
            regex_rules: [expect.objectContaining({ id: 'regex-1' })],
            ner_rules: [expect.objectContaining({ id: 'ner-1' })],
          }),
        }),
      })
    );
  });
});
