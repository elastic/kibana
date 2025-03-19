/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core/server';

import { executeAsyncByChunks } from './helpers';

const generateIndices = (count: number) => {
  const indices = [];

  for (let i = 0; i < count; i++) {
    indices.push(`index-${i}`);
  }

  return indices;
};

const mockClient = {
  asCurrentUser: {
    indices: {
      delete: jest.fn(),
    },
  },
} as unknown as IScopedClusterClient;

describe('executeAsyncByChunks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should make just one request for one index', async () => {
    const params = {
      index: generateIndices(1),
    };

    await executeAsyncByChunks(params, mockClient, 'delete');

    expect(mockClient.asCurrentUser.indices.delete).toHaveBeenCalledTimes(1);
  });

  it('should make 2 requests for 32 indices', async () => {
    const params = {
      index: generateIndices(32),
    };

    await executeAsyncByChunks(params, mockClient, 'delete');

    expect(mockClient.asCurrentUser.indices.delete).toHaveBeenCalledTimes(2);
  });
});
