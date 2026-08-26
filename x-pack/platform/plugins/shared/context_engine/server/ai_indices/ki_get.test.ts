/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { DiagnosticResult } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core/server';
import { getKi } from './ki_get';
import { KiNotFoundError } from './errors';

const createNotFoundResponseError = () =>
  new errors.ResponseError({
    meta: {
      aborted: false,
      attempts: 1,
      connection: null,
      context: null,
      name: 'document_missing_exception',
      request: {} as unknown as DiagnosticResult['meta']['request'],
    },
    warnings: [],
    body: 'document_missing_exception',
    statusCode: 404,
  });

describe('ki_get', () => {
  const get = jest.fn();
  const esClient = { get } as unknown as ElasticsearchClient;

  beforeEach(() => {
    get.mockReset();
  });

  it('returns the KI id and stored document', async () => {
    get.mockResolvedValue({
      _id: 'ki-1',
      _source: {
        type: 'playbook',
        title: 'Refund playbook',
        content: 'Verify the order first.',
      },
    });

    await expect(
      getKi(esClient, {
        aiIndexId: 'sample',
        index: 'ai-index-idx-sample',
        kiId: 'ki-1',
      })
    ).resolves.toEqual({
      id: 'ki-1',
      document: {
        type: 'playbook',
        title: 'Refund playbook',
        content: 'Verify the order first.',
      },
    });

    expect(get).toHaveBeenCalledWith({
      index: 'ai-index-idx-sample',
      id: 'ki-1',
    });
  });

  it('throws KiNotFoundError when the document is missing', async () => {
    get.mockRejectedValue(createNotFoundResponseError());

    await expect(
      getKi(esClient, {
        aiIndexId: 'sample',
        index: 'ai-index-idx-sample',
        kiId: 'missing',
      })
    ).rejects.toThrow(new KiNotFoundError('sample', 'missing'));
  });

  it('fetches from the concrete backing index provided by the list response', async () => {
    get.mockResolvedValue({
      _id: 'ki-1',
      _source: { type: 'playbook', title: 'B' },
    });

    await expect(
      getKi(esClient, {
        aiIndexId: 'sample',
        index: 'idx-b',
        kiId: 'ki-1',
      })
    ).resolves.toEqual({
      id: 'ki-1',
      document: { type: 'playbook', title: 'B' },
    });

    expect(get).toHaveBeenCalledWith({
      index: 'idx-b',
      id: 'ki-1',
    });
  });
});
