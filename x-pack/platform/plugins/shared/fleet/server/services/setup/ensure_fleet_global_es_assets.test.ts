/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ensureFleetAgentsIndexExists } from './ensure_fleet_global_es_assets';

const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
};

describe('ensureFleetAgentsIndexExists', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates the index and logs success', async () => {
    const esClient: any = {
      indices: { create: jest.fn().mockResolvedValue({}) },
    };

    await ensureFleetAgentsIndexExists(esClient, mockLogger as any);

    expect(esClient.indices.create).toHaveBeenCalledWith({ index: '.fleet-agents' });
    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('.fleet-agents'));
  });

  it('treats resource_already_exists_exception as a no-op', async () => {
    const esClient: any = {
      indices: {
        create: jest.fn().mockRejectedValue({
          body: { error: { type: 'resource_already_exists_exception' } },
        }),
      },
    };

    await expect(ensureFleetAgentsIndexExists(esClient, mockLogger as any)).resolves.toBeUndefined();
  });

  it('rethrows unrelated Elasticsearch errors', async () => {
    const unexpectedError = { body: { error: { type: 'cluster_block_exception' } } };
    const esClient: any = {
      indices: { create: jest.fn().mockRejectedValue(unexpectedError) },
    };

    await expect(ensureFleetAgentsIndexExists(esClient, mockLogger as any)).rejects.toBe(
      unexpectedError
    );
  });
});
