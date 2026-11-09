/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { ToolingLog } from '@kbn/tooling-log';
import {
  filterIndicesToRestore,
  restoreIndices,
  waitForRestoredIndicesToBeActive,
} from './restore';
import { restoreSnapshot } from '.';
import { extractDataStreamName } from '../utils';

const log = new ToolingLog({
  level: 'silent',
  writeTo: {
    write: () => {},
  },
});

const createMockEsClient = ({
  healthResponse = { timed_out: false },
  restoredIndices = ['logs-a', 'logs-b'],
}: {
  healthResponse?: { timed_out: boolean };
  restoredIndices?: string[];
} = {}): Client =>
  ({
    snapshot: {
      get: jest.fn().mockResolvedValue({
        snapshots: [
          {
            snapshot: 'test-snapshot',
            indices: ['logs-a', 'logs-b'],
            start_time: '2024-01-01T00:00:00.000Z',
            end_time: '2024-01-01T01:00:00.000Z',
            state: 'SUCCESS',
          },
        ],
      }),
      restore: jest.fn().mockResolvedValue({ snapshot: { indices: restoredIndices } }),
      deleteRepository: jest.fn().mockResolvedValue({}),
    },
    cluster: {
      health: jest.fn().mockResolvedValue(healthResponse),
    },
  } as unknown as Client);

describe('filterIndicesToRestore', () => {
  it('filters regular indices by pattern', () => {
    const indices = ['logs-app-1', 'logs-app-2', 'metrics-host', 'other-index'];
    expect(filterIndicesToRestore(indices, ['logs-*'])).toEqual(['logs-app-1', 'logs-app-2']);
  });

  it('filters data stream backing indices by extracted data stream name', () => {
    const indices = [
      '.ds-logs-nginx-default-2024.01.01-000001',
      '.ds-logs-nginx-default-2024.01.02-000002',
      '.ds-metrics-system.cpu-default-2024.01.01-000001',
    ];
    expect(filterIndicesToRestore(indices, ['logs-*'])).toEqual([
      '.ds-logs-nginx-default-2024.01.01-000001',
      '.ds-logs-nginx-default-2024.01.02-000002',
    ]);
  });

  it('supports multiple patterns', () => {
    const indices = [
      '.ds-logs-app-default-2024.01.01-000001',
      '.ds-metrics-host-default-2024.01.01-000001',
      '.ds-traces-apm-default-2024.01.01-000001',
      'other-index',
    ];
    expect(filterIndicesToRestore(indices, ['logs-*', 'metrics-*'])).toEqual([
      '.ds-logs-app-default-2024.01.01-000001',
      '.ds-metrics-host-default-2024.01.01-000001',
    ]);
  });

  it('returns empty array when no matches', () => {
    expect(filterIndicesToRestore(['other-index', 'another-index'], ['logs-*'])).toEqual([]);
  });

  it('handles exact pattern matches', () => {
    expect(
      filterIndicesToRestore(['my-exact-index', 'my-exact-index-2'], ['my-exact-index'])
    ).toEqual(['my-exact-index']);
  });

  it('treats patterns as globs (escapes regex metacharacters)', () => {
    const indices = ['logs-a.b-1', 'logs-axb-1'];
    expect(filterIndicesToRestore(indices, ['logs-a.b-*'])).toEqual(['logs-a.b-1']);
  });
});

describe('extractDataStreamName', () => {
  it('extracts data stream name from backing index', () => {
    expect(extractDataStreamName('.ds-logs-nginx-default-2024.01.01-000001')).toBe(
      'logs-nginx-default'
    );
  });

  it('handles complex data stream names', () => {
    expect(extractDataStreamName('.ds-metrics-system.cpu-default-2024.12.08-000001')).toBe(
      'metrics-system.cpu-default'
    );
  });

  it('returns null for regular indices', () => {
    expect(extractDataStreamName('regular-index')).toBeNull();
  });

  it('returns null for non-backing index formats', () => {
    expect(extractDataStreamName('.ds-incomplete')).toBeNull();
    expect(extractDataStreamName('logs-nginx-default')).toBeNull();
  });
});

describe('restoreIndices', () => {
  const restoreParams = {
    log,
    repoName: 'test-repository',
    snapshotName: 'test-snapshot',
    indices: ['logs-a', 'logs-b'],
    renamePattern: '(.+)',
    renameReplacement: 'temp-$1',
  };

  it('preserves the existing restore request and skips health when index settings are omitted', async () => {
    const esClient = createMockEsClient();

    await restoreIndices({ esClient, ...restoreParams });

    expect(esClient.snapshot.restore).toHaveBeenCalledWith(
      {
        repository: 'test-repository',
        snapshot: 'test-snapshot',
        wait_for_completion: true,
        indices: 'logs-a,logs-b',
        include_global_state: false,
        rename_pattern: '(.+)',
        rename_replacement: 'temp-$1',
      },
      { requestTimeout: 5 * 60 * 1000 }
    );
    expect(esClient.cluster.health).not.toHaveBeenCalled();
  });

  it('passes index settings unchanged', async () => {
    const esClient = createMockEsClient();
    const indexSettings = {
      'index.auto_expand_replicas': '0-1',
      'index.number_of_replicas': 0,
    };

    await restoreIndices({ esClient, ...restoreParams, indexSettings });

    expect(esClient.snapshot.restore).toHaveBeenCalledWith(
      expect.objectContaining({ index_settings: indexSettings }),
      { requestTimeout: 5 * 60 * 1000 }
    );
  });

  it('uses the restore response as the source of restored index names for opted-in restores', async () => {
    const esClient = createMockEsClient({
      restoredIndices: ['server-renamed-logs-a', 'server-renamed-logs-b'],
    });

    const restoredIndices = await restoreIndices({
      esClient,
      ...restoreParams,
      indexSettings: { 'index.auto_expand_replicas': '0-1' },
    });

    expect(restoredIndices).toEqual(['server-renamed-logs-a', 'server-renamed-logs-b']);
  });

  it('waits for the restored indices to become active', async () => {
    const esClient = createMockEsClient();

    await waitForRestoredIndicesToBeActive({
      esClient,
      restoredIndices: ['temp-logs-a', 'temp-logs-b'],
    });

    expect(esClient.cluster.health).toHaveBeenCalledWith(
      {
        index: 'temp-logs-a,temp-logs-b',
        wait_for_active_shards: 'all',
        timeout: '120s',
      },
      { ignore: [408], requestTimeout: 130_000 }
    );
  });

  it('throws a clear error when restored indices do not become active within 120 seconds', async () => {
    const esClient = createMockEsClient({ healthResponse: { timed_out: true } });

    await expect(
      waitForRestoredIndicesToBeActive({
        esClient,
        restoredIndices: ['temp-logs-a', 'temp-logs-b'],
      })
    ).rejects.toThrow(
      'Restored indices did not become active within 120 seconds: temp-logs-a, temp-logs-b'
    );
  });
});

describe('restoreSnapshot', () => {
  const repository = {
    type: 'url' as const,
    validate: jest.fn(),
    register: jest.fn().mockResolvedValue(undefined),
  };

  it('waits for restored indices when index settings are provided', async () => {
    const esClient = createMockEsClient();

    const result = await restoreSnapshot({
      esClient,
      log,
      repository,
      snapshotName: 'test-snapshot',
      indexSettings: { 'index.auto_expand_replicas': '0-1' },
    });

    const restoreOrder = (esClient.snapshot.restore as unknown as jest.Mock).mock
      .invocationCallOrder[0];
    const healthOrder = (esClient.cluster.health as unknown as jest.Mock).mock
      .invocationCallOrder[0];
    expect(restoreOrder).toBeLessThan(healthOrder);
    expect(result.success).toBe(true);
    expect(result.restoredIndices).toEqual(['logs-a', 'logs-b']);
  });

  it('preserves restore orchestration when index settings are omitted', async () => {
    const esClient = createMockEsClient();

    const result = await restoreSnapshot({
      esClient,
      log,
      repository,
      snapshotName: 'test-snapshot',
    });

    expect(esClient.snapshot.restore).toHaveBeenCalledWith(
      expect.not.objectContaining({ index_settings: expect.anything() }),
      { requestTimeout: 5 * 60 * 1000 }
    );
    expect(esClient.cluster.health).not.toHaveBeenCalled();
    expect(result.success).toBe(true);
  });

  it('returns the restored names and a clear error when the health wait times out', async () => {
    const esClient = createMockEsClient({ healthResponse: { timed_out: true } });

    const result = await restoreSnapshot({
      esClient,
      log,
      repository,
      snapshotName: 'test-snapshot',
      indexSettings: { 'index.auto_expand_replicas': '0-1' },
    });

    expect(result.success).toBe(false);
    expect(result.restoredIndices).toEqual(['logs-a', 'logs-b']);
    expect(result.errors).toEqual([
      'Restored indices did not become active within 120 seconds: logs-a, logs-b',
    ]);
    expect(esClient.snapshot.deleteRepository).toHaveBeenCalledTimes(1);
  });
});
