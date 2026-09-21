/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';
import { ToolingLog, ToolingLogCollectingWriter } from '@kbn/tooling-log';
import type { GcsConfig, ReplayStats } from '../src/data_generators/replay';
import {
  SIGEVENTS_SNAPSHOT_RUN,
  replayIntoManagedStream,
  replaySignificantEventsSnapshot,
} from '../src/data_generators/replay';
import type { DatasetConfig } from '../src/datasets';
import { INCIDENTS_NAMESPACE, OTEL_DEMO_NAMESPACE } from '../src/constants';
import { getDatasetById, snapshotCatalogKey } from '../src/datasets';
import {
  hasAvailableSnapshot,
  replayDatasetIntoManagedStream,
  replayDatasetSnapshot,
} from './shared';

jest.mock('../src/data_generators/replay', () => ({
  ...jest.requireActual('../src/data_generators/replay'),
  replayIntoManagedStream: jest.fn(),
  replaySignificantEventsSnapshot: jest.fn(),
}));

const BUCKET = 'significant-events-datasets';

interface SnapshotSource {
  snapshotName: string;
  gcs: GcsConfig;
}

const runScopedSource: SnapshotSource = {
  snapshotName: 'healthy-baseline',
  gcs: { bucket: BUCKET, basePathPrefix: 'otel-demo' },
};

const fixedPathSource: SnapshotSource = {
  snapshotName: 'incident-3048',
  gcs: { bucket: BUCKET, basePathPrefix: 'customer0-incidents', runScoped: false },
};

const catalogWith = (source: SnapshotSource, snapshotNames: string[]): Map<string, Set<string>> =>
  new Map([[snapshotCatalogKey(source.gcs), new Set(snapshotNames)]]);

const log = new ToolingLog();
const logWriter = new ToolingLogCollectingWriter();
log.setWriters([logWriter]);

const registeredDataset = (id: string): DatasetConfig => {
  const dataset = getDatasetById(id);
  if (!dataset) {
    throw new Error(`Dataset "${id}" is not registered`);
  }
  return dataset;
};

describe('hasAvailableSnapshot', () => {
  beforeEach(() => {
    logWriter.messages.length = 0;
  });

  it('reports the snapshot as available when the resolved source lists it', () => {
    expect(
      hasAvailableSnapshot({
        availableSnapshotsBySource: catalogWith(runScopedSource, ['healthy-baseline']),
        source: runScopedSource,
        datasetId: 'otel-demo',
        failOnMissingSnapshot: false,
        log,
      })
    ).toBe(true);
    expect(logWriter.messages).toEqual([]);
  });

  it('logs one path-aware skip message for an implicit selection', () => {
    expect(
      hasAvailableSnapshot({
        availableSnapshotsBySource: catalogWith(runScopedSource, ['ledger-db-disconnect']),
        source: runScopedSource,
        datasetId: 'otel-demo',
        failOnMissingSnapshot: false,
        log,
      })
    ).toBe(false);
    expect(logWriter.messages).toHaveLength(1);
    expect(logWriter.messages[0]).toContain(
      `Snapshot "healthy-baseline" for dataset "otel-demo" was not found at "${BUCKET}/${SIGEVENTS_SNAPSHOT_RUN}/otel-demo"`
    );
  });

  it('reports the snapshot as missing when the source has no catalog entry', () => {
    expect(
      hasAvailableSnapshot({
        availableSnapshotsBySource: new Map(),
        source: runScopedSource,
        datasetId: 'otel-demo',
        failOnMissingSnapshot: false,
        log,
      })
    ).toBe(false);
  });

  it('throws a path-aware error for an explicit selection', () => {
    expect(() =>
      hasAvailableSnapshot({
        availableSnapshotsBySource: catalogWith(runScopedSource, []),
        source: runScopedSource,
        datasetId: 'otel-demo',
        failOnMissingSnapshot: true,
        log,
      })
    ).toThrow(
      `Snapshot "healthy-baseline" for dataset "otel-demo" was not found at "${BUCKET}/${SIGEVENTS_SNAPSHOT_RUN}/otel-demo".`
    );
  });

  it('names the fixed path of a run-independent source instead of the snapshot run', () => {
    expect(() =>
      hasAvailableSnapshot({
        availableSnapshotsBySource: catalogWith(fixedPathSource, []),
        source: fixedPathSource,
        datasetId: 'incidents',
        failOnMissingSnapshot: true,
        log,
      })
    ).toThrow(
      `Snapshot "incident-3048" for dataset "incidents" was not found at "${BUCKET}/customer0-incidents".`
    );
    expect(() =>
      hasAvailableSnapshot({
        availableSnapshotsBySource: catalogWith(fixedPathSource, []),
        source: fixedPathSource,
        datasetId: 'incidents',
        failOnMissingSnapshot: true,
        log,
      })
    ).not.toThrow(new RegExp(SIGEVENTS_SNAPSHOT_RUN));
  });
});

describe('dataset-aware replay', () => {
  const esClient = new Client({ node: 'http://localhost:9200' });
  const replayStats: ReplayStats = {
    total: 12,
    created: 10,
    skipped: 2,
    maxTimestamp: '2026-03-27T10:00:00.000Z',
    replayNow: '2026-09-10T10:00:00.000Z',
  };

  beforeEach(() => {
    jest.mocked(replayIntoManagedStream).mockReset().mockResolvedValue(replayStats);
    jest.mocked(replaySignificantEventsSnapshot).mockReset().mockResolvedValue(undefined);
  });

  it('replays a standard dataset from its own snapshot path', async () => {
    await replayDatasetSnapshot({
      esClient,
      log,
      dataset: registeredDataset(OTEL_DEMO_NAMESPACE),
      source: runScopedSource,
    });

    expect(replaySignificantEventsSnapshot).toHaveBeenCalledWith(
      esClient,
      log,
      'healthy-baseline',
      runScopedSource.gcs
    );
    expect(replayIntoManagedStream).not.toHaveBeenCalled();
  });

  it('replays a managed-stream dataset into the managed stream', async () => {
    await replayDatasetSnapshot({
      esClient,
      log,
      dataset: registeredDataset(INCIDENTS_NAMESPACE),
      source: fixedPathSource,
    });

    expect(replayIntoManagedStream).toHaveBeenCalledWith(
      esClient,
      log,
      'incident-3048',
      fixedPathSource.gcs,
      { includeOriginalNameIndices: true }
    );
    expect(replaySignificantEventsSnapshot).not.toHaveBeenCalled();
  });

  it('keeps the strict index filter when a standard dataset is forced into the managed stream', async () => {
    const stats = await replayDatasetIntoManagedStream({
      esClient,
      log,
      dataset: registeredDataset(OTEL_DEMO_NAMESPACE),
      source: runScopedSource,
    });

    expect(replayIntoManagedStream).toHaveBeenCalledWith(
      esClient,
      log,
      'healthy-baseline',
      runScopedSource.gcs,
      { includeOriginalNameIndices: false }
    );
    expect(stats).toEqual(replayStats);
  });

  it('includes original-name indices when a managed-stream dataset is replayed into the managed stream', async () => {
    const stats = await replayDatasetIntoManagedStream({
      esClient,
      log,
      dataset: registeredDataset(INCIDENTS_NAMESPACE),
      source: fixedPathSource,
    });

    expect(replayIntoManagedStream).toHaveBeenCalledWith(
      esClient,
      log,
      'incident-3048',
      fixedPathSource.gcs,
      { includeOriginalNameIndices: true }
    );
    expect(stats).toEqual(replayStats);
  });
});
