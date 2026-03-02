/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import {
  GCS_BUCKET,
  OTEL_DEMO_GCS_BASE_PATH_PREFIX,
} from '../../scripts/significant_events_snapshots/lib/constants';

const mockCreateGcsRepository = jest.fn(() => ({ mocked: true }));
const mockRestoreSnapshot = jest.fn();

jest.mock('@kbn/es-snapshot-loader', () => ({
  createGcsRepository: mockCreateGcsRepository,
  restoreSnapshot: mockRestoreSnapshot,
}));

describe('load_features_from_snapshot', () => {
  const log = {
    info: jest.fn(),
    debug: jest.fn(),
    warning: jest.fn(),
    error: jest.fn(),
  } as any;

  const gcs = { bucket: GCS_BUCKET, basePathPrefix: OTEL_DEMO_GCS_BASE_PATH_PREFIX };

  const makeEsClient = (): Client =>
    ({
      indices: {
        delete: jest.fn().mockResolvedValue({}),
      },
      search: jest.fn().mockResolvedValue({
        hits: { hits: [] },
      }),
    } as any);

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.SIGEVENTS_SNAPSHOT_RUN = '2026-02-26-test';
    jest.resetModules();
  });

  it('returns an empty array when allowNoMatches results in zero restored indices', async () => {
    mockRestoreSnapshot.mockResolvedValue({
      success: true,
      snapshotName: 'payment-unreachable',
      restoredIndices: [],
      errors: [],
    });

    const esClient = makeEsClient();
    const { loadFeaturesFromSnapshot } = await import('./load_features_from_snapshot');
    const features = await loadFeaturesFromSnapshot(
      esClient,
      log,
      'payment-unreachable',
      gcs,
      'logs'
    );

    expect(features).toEqual([]);
    expect(esClient.search).not.toHaveBeenCalled();
  });

  it('restores into temp index and returns matching Feature docs', async () => {
    mockRestoreSnapshot.mockResolvedValue({
      success: true,
      snapshotName: 'payment-unreachable',
      restoredIndices: ['sigevents-replay-temp-features'],
      errors: [],
    });

    const esClient = makeEsClient();
    (esClient.search as any).mockResolvedValue({
      hits: {
        hits: [
          { _source: { uuid: 'u1', id: 'f1', stream_name: 'logs', type: 'entity' } },
          { _source: { uuid: 'u2', id: 'f2', stream_name: 'logs', type: 'dependency' } },
        ],
      },
    });

    const { loadFeaturesFromSnapshot, FEATURES_TEMP_INDEX } = await import(
      './load_features_from_snapshot'
    );
    const features = await loadFeaturesFromSnapshot(
      esClient,
      log,
      'payment-unreachable',
      gcs,
      'logs'
    );

    expect(features).toHaveLength(2);

    expect(mockCreateGcsRepository).toHaveBeenCalledWith({
      bucket: GCS_BUCKET,
      basePath: `${OTEL_DEMO_GCS_BASE_PATH_PREFIX}/2026-02-26-test`,
    });

    expect(mockRestoreSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        snapshotName: 'payment-unreachable',
        renamePattern: '(.+)',
        renameReplacement: FEATURES_TEMP_INDEX,
        allowNoMatches: true,
      })
    );
  });

  it('throws if restore succeeds but did not produce the expected temp index', async () => {
    mockRestoreSnapshot.mockResolvedValue({
      success: true,
      snapshotName: 'healthy-baseline',
      restoredIndices: ['some-other-index'],
      errors: [],
    });

    const esClient = makeEsClient();
    const { loadFeaturesFromSnapshot } = await import('./load_features_from_snapshot');

    await expect(
      loadFeaturesFromSnapshot(esClient, log, 'healthy-baseline', gcs, 'logs')
    ).rejects.toThrow(/did not produce expected temp index/i);
  });

  it('cleans up the temp index at the end even if search throws', async () => {
    const { loadFeaturesFromSnapshot, FEATURES_TEMP_INDEX } = await import(
      './load_features_from_snapshot'
    );
    mockRestoreSnapshot.mockResolvedValue({
      success: true,
      snapshotName: 'payment-unreachable',
      restoredIndices: [FEATURES_TEMP_INDEX],
      errors: [],
    });

    const esClient = makeEsClient();
    (esClient.search as any).mockRejectedValue(new Error('boom'));

    await expect(
      loadFeaturesFromSnapshot(esClient, log, 'payment-unreachable', gcs, 'logs')
    ).rejects.toThrow('boom');

    expect((esClient.indices.delete as any).mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(esClient.indices.delete).toHaveBeenCalledWith({
      index: FEATURES_TEMP_INDEX,
      ignore_unavailable: true,
    });
  });
});
