/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { getSnapshotMetadata } from './repository';
import { ToolingLog } from '@kbn/tooling-log';

const log = new ToolingLog({
  level: 'silent',
  writeTo: {
    write: () => {},
  },
});

describe('getSnapshotMetadata', () => {
  it('defaults to the latest SUCCESS snapshot (skips FAILED and in-progress snapshots)', async () => {
    const esClient = {
      snapshot: {
        get: jest.fn().mockResolvedValue({
          snapshots: [
            { snapshot: 'snap-failed', state: 'FAILED', end_time_in_millis: 1704326400000 },
            { snapshot: 'snap-in-progress', state: 'SUCCESS' }, // no end_time
            {
              snapshot: 'snap-old-success',
              state: 'SUCCESS',
              end_time_in_millis: 1704067200000,
              end_time: '2024-01-01T00:00:00.000Z',
            },
            {
              snapshot: 'snap-new-success',
              state: 'SUCCESS',
              end_time_in_millis: 1704240000000,
              end_time: '2024-01-03T00:00:00.000Z',
            },
          ],
        }),
      },
    } as unknown as Client;

    const result = await getSnapshotMetadata({ esClient, log, repoName: 'repo-1' });

    expect(esClient.snapshot.get).toHaveBeenCalledWith({ repository: 'repo-1', snapshot: '*' });
    expect(result.snapshot).toBe('snap-new-success');
    expect(result.state).toBe('SUCCESS');
    expect(result.endTime).toBe('2024-01-03T00:00:00.000Z');
  });

  it('uses the provided snapshotName when specified', async () => {
    const esClient = {
      snapshot: {
        get: jest.fn().mockResolvedValue({
          snapshots: [
            {
              snapshot: 'my-snap',
              state: 'SUCCESS',
              end_time_in_millis: 1706745600000,
              end_time: '2024-02-01T00:00:00.000Z',
            },
          ],
        }),
      },
    } as unknown as Client;

    const result = await getSnapshotMetadata({
      esClient,
      log,
      repoName: 'repo-1',
      snapshotName: 'my-snap',
    });

    expect(esClient.snapshot.get).toHaveBeenCalledWith({
      repository: 'repo-1',
      snapshot: 'my-snap',
    });
    expect(result.snapshot).toBe('my-snap');
  });

  it('throws a clear error when the snapshotName is not found', async () => {
    const esClient = {
      snapshot: {
        get: jest.fn().mockResolvedValue({ snapshots: [] }),
      },
    } as unknown as Client;

    await expect(
      getSnapshotMetadata({
        esClient,
        log,
        repoName: 'repo-1',
        snapshotName: 'missing-snap',
      })
    ).rejects.toThrow('Snapshot "missing-snap" was not found in repository repo-1');
  });

  it('selects the latest SUCCESS snapshot when snapshotName matches multiple snapshots', async () => {
    const esClient = {
      snapshot: {
        get: jest.fn().mockResolvedValue({
          snapshots: [
            {
              snapshot: 'match-1',
              state: 'SUCCESS',
              end_time_in_millis: 1704067200000,
              end_time: '2024-01-01T00:00:00.000Z',
            },
            { snapshot: 'match-2', state: 'FAILED', end_time_in_millis: 1704153600000 },
            {
              snapshot: 'match-3',
              state: 'SUCCESS',
              end_time_in_millis: 1704240000000,
              end_time: '2024-01-03T00:00:00.000Z',
            },
          ],
        }),
      },
    } as unknown as Client;

    const result = await getSnapshotMetadata({
      esClient,
      log,
      repoName: 'repo-1',
      snapshotName: 'match-*',
    });

    expect(esClient.snapshot.get).toHaveBeenCalledWith({
      repository: 'repo-1',
      snapshot: 'match-*',
    });
    expect(result.snapshot).toBe('match-3');
  });

  it('throws when no SUCCESS snapshots exist', async () => {
    const esClient = {
      snapshot: {
        get: jest.fn().mockResolvedValue({
          snapshots: [
            { snapshot: 'snap-failed', state: 'FAILED', end_time_in_millis: 1704067200000 },
            { snapshot: 'snap-in-progress', state: 'SUCCESS' }, // no end_time
          ],
        }),
      },
    } as unknown as Client;

    await expect(getSnapshotMetadata({ esClient, log, repoName: 'repo-1' })).rejects.toThrow(
      'No restorable snapshots found in repository repo-1'
    );
  });
});
