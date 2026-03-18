/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import {
  GCS_BUCKET,
  OTEL_DEMO_GCS_BASE_PATH_PREFIX,
} from '../../scripts/significant_events_snapshots/lib/constants';
import type { GcsConfig } from './snapshot_run_config';

const mockCreateGcsRepository = jest.fn(() => ({ mocked: true }));
const mockRestoreSnapshot = jest.fn();

jest.mock('@kbn/es-snapshot-loader', () => ({
  createGcsRepository: mockCreateGcsRepository,
  restoreSnapshot: mockRestoreSnapshot,
}));

describe('load_kis_from_snapshot', () => {
  interface EsClientMock {
    indices: {
      delete: jest.MockedFunction<Client['indices']['delete']>;
    };
    search: jest.MockedFunction<Client['search']>;
  }

  const log: jest.Mocked<Pick<ToolingLog, 'info' | 'debug' | 'warning' | 'error'>> = {
    info: jest.fn(),
    debug: jest.fn(),
    warning: jest.fn(),
    error: jest.fn(),
  };

  const gcs: GcsConfig = { bucket: GCS_BUCKET, basePathPrefix: OTEL_DEMO_GCS_BASE_PATH_PREFIX };

  const makeEsClient = (): EsClientMock => ({
    indices: {
      delete: jest.fn(),
    },
    search: jest.fn(),
  });

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
    const { loadKIsFromSnapshot } = await import('./load_kis_from_snapshot');
    esClient.indices.delete.mockResolvedValue({} as never);
    esClient.search.mockResolvedValue({ hits: { hits: [] } } as never);

    const kis = await loadKIsFromSnapshot(
      esClient as unknown as Client,
      log as unknown as ToolingLog,
      'payment-unreachable',
      gcs,
      'logs'
    );

    expect(kis).toEqual([]);
    expect(esClient.search).not.toHaveBeenCalled();
  });

  it('restores into temp index and returns matching KI docs', async () => {
    mockRestoreSnapshot.mockResolvedValue({
      success: true,
      snapshotName: 'payment-unreachable',
      restoredIndices: ['sigevents-replay-temp-features'],
      errors: [],
    });

    const esClient = makeEsClient();
    esClient.indices.delete.mockResolvedValue({} as never);
    esClient.search.mockResolvedValue({
      hits: {
        hits: [
          { _source: { uuid: 'u1', id: 'f1', stream_name: 'logs', type: 'entity' } },
          { _source: { uuid: 'u2', id: 'f2', stream_name: 'logs', type: 'dependency' } },
        ],
      },
    } as never);

    const { loadKIsFromSnapshot, KIS_TEMP_INDEX } = await import('./load_kis_from_snapshot');
    const kis = await loadKIsFromSnapshot(
      esClient as unknown as Client,
      log as unknown as ToolingLog,
      'payment-unreachable',
      gcs,
      'logs'
    );

    expect(kis).toHaveLength(2);

    expect(mockCreateGcsRepository).toHaveBeenCalledWith({
      bucket: GCS_BUCKET,
      basePath: `2026-02-26-test/${OTEL_DEMO_GCS_BASE_PATH_PREFIX}`,
    });

    expect(mockRestoreSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        snapshotName: 'payment-unreachable',
        renamePattern: '(.+)',
        renameReplacement: KIS_TEMP_INDEX,
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
    const { loadKIsFromSnapshot } = await import('./load_kis_from_snapshot');
    esClient.indices.delete.mockResolvedValue({} as never);
    esClient.search.mockResolvedValue({ hits: { hits: [] } } as never);

    await expect(
      loadKIsFromSnapshot(
        esClient as unknown as Client,
        log as unknown as ToolingLog,
        'healthy-baseline',
        gcs,
        'logs'
      )
    ).rejects.toThrow(/did not produce expected temp index/i);
  });

  it('cleans up the temp index at the end even if search throws', async () => {
    const { loadKIsFromSnapshot, KIS_TEMP_INDEX } = await import('./load_kis_from_snapshot');
    mockRestoreSnapshot.mockResolvedValue({
      success: true,
      snapshotName: 'payment-unreachable',
      restoredIndices: [KIS_TEMP_INDEX],
      errors: [],
    });

    const esClient = makeEsClient();
    esClient.indices.delete.mockResolvedValue({} as never);
    esClient.search.mockRejectedValue(new Error('boom'));

    await expect(
      loadKIsFromSnapshot(
        esClient as unknown as Client,
        log as unknown as ToolingLog,
        'payment-unreachable',
        gcs,
        'logs'
      )
    ).rejects.toThrow('boom');

    expect(esClient.indices.delete.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(esClient.indices.delete).toHaveBeenCalledWith({
      index: KIS_TEMP_INDEX,
      ignore_unavailable: true,
    });
  });
});
