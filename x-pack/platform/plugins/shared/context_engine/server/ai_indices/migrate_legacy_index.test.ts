/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { legacyAiIndicesIndexName, migrateLegacyAiIndices } from './migrate_legacy_index';
import { createAiIndexStorageClient } from './storage';

jest.mock('./storage', () => ({
  ...jest.requireActual('./storage'),
  createAiIndexStorageClient: jest.fn(),
}));

const createAiIndexStorageClientMock = createAiIndexStorageClient as jest.Mock;

describe('migrateLegacyAiIndices', () => {
  const getIndices = jest.fn();
  const deleteIndex = jest.fn();
  const deleteIndexTemplate = jest.fn();
  const search = jest.fn();
  const bulk = jest.fn();
  const info = jest.fn();
  const esClient = {
    indices: { get: getIndices, delete: deleteIndex, deleteIndexTemplate },
    search,
  } as unknown as ElasticsearchClient;
  const logger = { info } as unknown as Logger;

  const migrate = () => migrateLegacyAiIndices({ esClient, logger });

  beforeEach(() => {
    jest.clearAllMocks();
    createAiIndexStorageClientMock.mockReturnValue({ bulk });
    getIndices.mockResolvedValue({ [`${legacyAiIndicesIndexName}-000001`]: {} });
    search.mockResolvedValue({
      hits: {
        total: { value: 2, relation: 'eq' },
        hits: [
          { _id: 'default:logs', _source: { id: 'logs', space: 'default' } },
          { _id: 'team:ops', _source: { id: 'ops', space: 'team' } },
        ],
      },
    });
    bulk.mockResolvedValue({ errors: false, items: [{ create: { status: 201 } }] });
  });

  it('does nothing without a legacy index', async () => {
    getIndices.mockResolvedValue({});

    await migrate();

    expect(getIndices).toHaveBeenCalledWith(
      expect.objectContaining({ index: legacyAiIndicesIndexName, ignore_unavailable: true })
    );
    expect(search).not.toHaveBeenCalled();
    expect(deleteIndex).not.toHaveBeenCalled();
  });

  it('copies entries and removes the legacy index', async () => {
    await migrate();

    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({
        index: legacyAiIndicesIndexName,
        size: 10_000,
        allow_partial_search_results: false,
      })
    );
    expect(bulk).toHaveBeenCalledWith({
      operations: [
        { create: { _id: 'default:logs', document: { id: 'logs', space: 'default' } } },
        { create: { _id: 'team:ops', document: { id: 'ops', space: 'team' } } },
      ],
    });
    expect(deleteIndex).toHaveBeenCalledWith(
      { index: [`${legacyAiIndicesIndexName}-000001`] },
      { ignore: [404] }
    );
    expect(deleteIndexTemplate).toHaveBeenCalledWith(
      { name: legacyAiIndicesIndexName },
      { ignore: [404] }
    );
  });

  it('keeps entries already migrated', async () => {
    bulk.mockResolvedValue({
      errors: true,
      items: [{ create: { status: 409, error: { type: 'version_conflict_engine_exception' } } }],
    });

    await migrate();

    expect(deleteIndex).toHaveBeenCalled();
  });

  it('keeps the legacy index when a copy fails', async () => {
    bulk.mockResolvedValue({
      errors: true,
      items: [{ create: { status: 500, error: { type: 'exception' } } }],
    });

    await expect(migrate()).rejects.toThrow('Failed to copy 1 of 2 entries');
    expect(deleteIndex).not.toHaveBeenCalled();
  });

  it('keeps the legacy index when not every entry was fetched', async () => {
    search.mockResolvedValue({
      hits: {
        total: { value: 3, relation: 'eq' },
        hits: [{ _id: 'default:logs', _source: { id: 'logs', space: 'default' } }],
      },
    });

    await expect(migrate()).rejects.toThrow('holds 3 entries');
    expect(bulk).not.toHaveBeenCalled();
    expect(deleteIndex).not.toHaveBeenCalled();
  });

  it('tolerates another node deleting the legacy index first', async () => {
    search.mockResolvedValue({ hits: { total: { value: 0, relation: 'eq' }, hits: [] } });

    await migrate();

    expect(search).toHaveBeenCalledWith(expect.objectContaining({ ignore_unavailable: true }));
    expect(bulk).not.toHaveBeenCalled();
    expect(deleteIndex).toHaveBeenCalled();
  });
});
