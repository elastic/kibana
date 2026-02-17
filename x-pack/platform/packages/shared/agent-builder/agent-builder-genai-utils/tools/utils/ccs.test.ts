/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { isCcsTarget, partitionByCcs, getFieldsFromFieldCaps } from './ccs';

describe('isCcsTarget', () => {
  it('returns true for a CCS pattern with cluster prefix', () => {
    expect(isCcsTarget('remote_cluster:my-index')).toBe(true);
  });

  it('returns true for a CCS wildcard pattern', () => {
    expect(isCcsTarget('cluster_a:logs-*')).toBe(true);
  });

  it('returns true for a wildcard cluster pattern', () => {
    expect(isCcsTarget('*:metrics-*')).toBe(true);
  });

  it('returns false for a local index name', () => {
    expect(isCcsTarget('my-local-index')).toBe(false);
  });

  it('returns false for a local wildcard pattern', () => {
    expect(isCcsTarget('logs-*')).toBe(false);
  });

  it('returns false for the default pattern', () => {
    expect(isCcsTarget('*')).toBe(false);
  });
});

describe('partitionByCcs', () => {
  it('separates local and remote resources', () => {
    const resources = [
      { name: 'local-index', type: 'index' },
      { name: 'remote:remote-index', type: 'index' },
      { name: 'another-local', type: 'alias' },
      { name: 'cluster_b:logs-*', type: 'data_stream' },
    ];

    const { local, remote } = partitionByCcs(resources);

    expect(local).toEqual([
      { name: 'local-index', type: 'index' },
      { name: 'another-local', type: 'alias' },
    ]);
    expect(remote).toEqual([
      { name: 'remote:remote-index', type: 'index' },
      { name: 'cluster_b:logs-*', type: 'data_stream' },
    ]);
  });

  it('returns all resources as local when none are CCS targets', () => {
    const resources = [{ name: 'index-a' }, { name: 'index-b' }];

    const { local, remote } = partitionByCcs(resources);

    expect(local).toEqual(resources);
    expect(remote).toEqual([]);
  });

  it('returns all resources as remote when all are CCS targets', () => {
    const resources = [{ name: 'cluster:index-a' }, { name: 'cluster:index-b' }];

    const { local, remote } = partitionByCcs(resources);

    expect(local).toEqual([]);
    expect(remote).toEqual(resources);
  });

  it('handles an empty array', () => {
    const { local, remote } = partitionByCcs([]);

    expect(local).toEqual([]);
    expect(remote).toEqual([]);
  });
});

describe('getFieldsFromFieldCaps', () => {
  it('calls fieldCaps and returns processed fields', async () => {
    const mockFieldCapsResponse = {
      indices: ['remote:my-index'],
      fields: {
        message: {
          text: { type: 'text', searchable: true, aggregatable: false },
        },
        status: {
          keyword: { type: 'keyword', searchable: true, aggregatable: true },
        },
      },
    };

    const esClient = {
      fieldCaps: jest.fn().mockResolvedValue(mockFieldCapsResponse),
    } as unknown as ElasticsearchClient;

    const fields = await getFieldsFromFieldCaps({
      resource: 'remote:my-index',
      esClient,
    });

    expect(esClient.fieldCaps).toHaveBeenCalledWith({
      index: 'remote:my-index',
      fields: ['*'],
    });

    expect(fields.sort((a, b) => a.path.localeCompare(b.path))).toEqual([
      { path: 'message', type: 'text', meta: {} },
      { path: 'status', type: 'keyword', meta: {} },
    ]);
  });
});
