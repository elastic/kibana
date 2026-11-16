/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { ToolingLog } from '@kbn/tooling-log';
import { restoreSnapshot } from '@kbn/es-snapshot-loader';
import { ensureRegressionCorporaRestored } from './ensure_corpus_restored';
import { ALL_REGRESSION_CORPORA, ANALYTICAL_CORPUS } from './regression_corpora';

jest.mock('@kbn/es-snapshot-loader', () => ({
  createGcsRepository: jest.fn(() => ({ type: 'gcs' })),
  restoreSnapshot: jest.fn(),
}));

const restoreSnapshotMock = restoreSnapshot as jest.MockedFunction<typeof restoreSnapshot>;

const log = new ToolingLog({ level: 'silent', writeTo: { write: () => {} } });

const ALL_INDICES = ALL_REGRESSION_CORPORA.flatMap((corpus) => [...corpus.indices]);

const createEsClientMock = ({ existing }: { existing: Set<string> }) => {
  const exists = jest.fn(async ({ index }: { index: string }) => existing.has(index));
  const health = jest.fn(async (_request: Record<string, unknown>) => ({ timed_out: false }));
  const putSettings = jest.fn(async () => ({}));
  const esClient = {
    indices: { exists },
    cluster: { health, putSettings },
  } as unknown as Client;
  return { esClient, exists, health, putSettings };
};

const ensure = (esClient: Client, datasetIndices: string[] = ['users']) =>
  ensureRegressionCorporaRestored({
    esClient,
    log,
    suite: 'test-suite',
    corpus: ANALYTICAL_CORPUS,
    datasetIndices,
  });

describe('ensureRegressionCorporaRestored', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GCS_CREDENTIALS = '{"fake":"credentials"}';
  });

  afterAll(() => {
    delete process.env.GCS_CREDENTIALS;
  });

  it('rejects a dataset that references indices outside its own corpus', async () => {
    const { esClient } = createEsClientMock({ existing: new Set(ALL_INDICES) });
    await expect(ensure(esClient, ['users', 'not_in_corpus'])).rejects.toThrow(
      'dataset references indices not in the "analytical" corpus snapshot: not_in_corpus'
    );
    expect(restoreSnapshotMock).not.toHaveBeenCalled();
  });

  it('with every corpus present, waits for searchable primaries and never restores', async () => {
    const { esClient, health } = createEsClientMock({ existing: new Set(ALL_INDICES) });
    await ensure(esClient);

    expect(restoreSnapshotMock).not.toHaveBeenCalled();
    // One readiness wait per corpus — all corpora are checked, not just the caller's.
    expect(health).toHaveBeenCalledTimes(ALL_REGRESSION_CORPORA.length);
    expect(health.mock.calls[0][0]).toMatchObject({ wait_for_status: 'yellow' });
  });

  it('restores exactly the missing indices of every corpus', async () => {
    const missing = new Set(['users', 'browsecomp_plus_documents_semantic']);
    const { esClient, putSettings } = createEsClientMock({
      existing: new Set(ALL_INDICES.filter((index) => !missing.has(index))),
    });
    restoreSnapshotMock.mockResolvedValue({
      success: true,
      snapshotName: 'snap',
      restoredIndices: [],
      errors: [],
    });

    await ensure(esClient);

    expect(restoreSnapshotMock).toHaveBeenCalledTimes(2);
    expect(restoreSnapshotMock.mock.calls.map(([config]) => config.indices)).toEqual([
      ['users'],
      ['browsecomp_plus_documents_semantic'],
    ]);
    // Single-node CI clusters need replicas dropped to go green.
    expect(restoreSnapshotMock.mock.calls[0][0].indexSettings).toEqual({
      'index.number_of_replicas': 0,
    });
    expect(putSettings).toHaveBeenCalledWith({
      persistent: { 'indices.recovery.max_bytes_per_sec': '500mb' },
    });
  });

  it('fails fast when indices are missing and GCS credentials are not available', async () => {
    delete process.env.GCS_CREDENTIALS;
    const { esClient } = createEsClientMock({
      existing: new Set(ALL_INDICES.filter((index) => index !== 'users')),
    });

    await expect(ensure(esClient)).rejects.toThrow('GCS_CREDENTIALS is not set');
    expect(restoreSnapshotMock).not.toHaveBeenCalled();
  });

  it('treats a lost restore race as success and waits for the winning restore', async () => {
    // "users" is missing at the existence check, but by the time our restore fails,
    // another worker's restore has created it.
    const existing = new Set(ALL_INDICES.filter((index) => index !== 'users'));
    const { esClient, exists, health } = createEsClientMock({ existing });
    exists.mockImplementation(async ({ index }: { index: string }) => {
      if (index === 'users') {
        const missingNow = restoreSnapshotMock.mock.calls.length === 0;
        return !missingNow;
      }
      return existing.has(index);
    });
    restoreSnapshotMock.mockResolvedValue({
      success: false,
      snapshotName: 'snap',
      restoredIndices: [],
      errors: ['cannot restore index [users] because an open index with same name already exists'],
    });

    await ensure(esClient);

    expect(restoreSnapshotMock).toHaveBeenCalledTimes(1);
    // The loser waits for the winner's restore: one extra readiness wait for the
    // analytical corpus on top of the per-corpus presence waits.
    expect(health).toHaveBeenCalledTimes(ALL_REGRESSION_CORPORA.length);
  });

  it('propagates a genuine restore failure when the indices are still missing', async () => {
    const { esClient } = createEsClientMock({
      existing: new Set(ALL_INDICES.filter((index) => index !== 'users')),
    });
    restoreSnapshotMock.mockResolvedValue({
      success: false,
      snapshotName: 'snap',
      restoredIndices: [],
      errors: ['repository unreachable'],
    });

    await expect(ensure(esClient)).rejects.toThrow(
      '"analytical" snapshot restore failed: repository unreachable'
    );
  });

  it('gives up when primaries never become searchable', async () => {
    const { esClient, health } = createEsClientMock({ existing: new Set(ALL_INDICES) });
    health.mockImplementation(async () => ({ timed_out: true }));

    await expect(ensure(esClient)).rejects.toThrow(
      '"analytical" corpus primaries did not become active'
    );
    expect(health).toHaveBeenCalledTimes(20);
  });
});
