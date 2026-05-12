/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { hasConnectedRemoteClusters, prefixIndexPatternsWithCcs, resetCcsCache } from './ccs_utils';

describe('hasConnectedRemoteClusters', () => {
  beforeEach(() => {
    resetCcsCache();
  });

  const mockEsClient = (remoteInfo: Record<string, { connected: boolean }>) =>
    ({
      cluster: {
        remoteInfo: jest.fn().mockResolvedValue(remoteInfo),
      },
    } as unknown as ElasticsearchClient);

  it('returns true when at least one remote cluster is connected', async () => {
    const esClient = mockEsClient({
      cluster_a: { connected: true },
      cluster_b: { connected: false },
    });
    expect(await hasConnectedRemoteClusters(esClient)).toBe(true);
  });

  it('returns false when no remote clusters are connected', async () => {
    const esClient = mockEsClient({
      cluster_a: { connected: false },
    });
    expect(await hasConnectedRemoteClusters(esClient)).toBe(false);
  });

  it('returns false when there are no remote clusters', async () => {
    const esClient = mockEsClient({});
    expect(await hasConnectedRemoteClusters(esClient)).toBe(false);
  });

  it('returns cached result without calling remoteInfo again within TTL', async () => {
    const esClient = mockEsClient({ cluster_a: { connected: true } });
    await hasConnectedRemoteClusters(esClient);
    await hasConnectedRemoteClusters(esClient);
    expect(esClient.cluster.remoteInfo).toHaveBeenCalledTimes(1);
  });

  it('returns false and caches the result when remoteInfo throws', async () => {
    const esClient = {
      cluster: { remoteInfo: jest.fn().mockRejectedValue(new Error('permission denied')) },
    } as unknown as ElasticsearchClient;
    expect(await hasConnectedRemoteClusters(esClient)).toBe(false);
    expect(await hasConnectedRemoteClusters(esClient)).toBe(false);
    expect(esClient.cluster.remoteInfo).toHaveBeenCalledTimes(1);
  });
});

describe('prefixIndexPatternsWithCcs', () => {
  it('returns the original pattern unchanged when ccsEnabled is false', () => {
    expect(prefixIndexPatternsWithCcs('logs-osquery_manager.result*', false)).toBe(
      'logs-osquery_manager.result*'
    );
  });

  it('appends *: prefixed patterns when ccsEnabled is true', () => {
    expect(prefixIndexPatternsWithCcs('logs-osquery_manager.result*', true)).toBe(
      'logs-osquery_manager.result*,*:logs-osquery_manager.result*'
    );
  });

  it('handles comma-separated patterns', () => {
    expect(
      prefixIndexPatternsWithCcs(
        'logs-osquery_manager.result-default,logs-osquery_manager.result-ns1',
        true
      )
    ).toBe(
      'logs-osquery_manager.result-default,logs-osquery_manager.result-ns1,*:logs-osquery_manager.result-default,*:logs-osquery_manager.result-ns1'
    );
  });
});
