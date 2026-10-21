/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient } from '@kbn/scout';

/**
 * The managed snapshot repository every Elastic Cloud (ECH) deployment ships with. Cloud has no
 * node-local filesystem path (`path.repo` is empty), so tests must reuse this repository instead
 * of registering an `fs` repository the way the local Scout cluster can.
 */
export const CLOUD_DEFAULT_SNAPSHOT_REPOSITORY = 'found-snapshots';
const LOCAL_FS_SNAPSHOT_REPOSITORY_LOCATION = 'temp';

export interface ManagedSnapshotRepository {
  /** Name of the repository to use in the test. */
  name: string;
  /** Removes anything this helper created (never deletes the managed Cloud repository). */
  cleanup: () => Promise<void>;
}

/**
 * Ensures a usable snapshot repository, branching on the deployment (pass `config.isCloud`):
 *
 * - Local Scout stateful cluster: registers an `fs` repository at `path.repo` (`temp`).
 * - Elastic Cloud (ECH): has no node-local `path.repo`, so reuses the managed `found-snapshots`
 *   repository that every deployment ships with (never creates or deletes it).
 */
export async function ensureSnapshotRepository(
  esClient: EsClient,
  isCloud: boolean,
  fsRepositoryName: string
): Promise<ManagedSnapshotRepository> {
  const name = isCloud ? CLOUD_DEFAULT_SNAPSHOT_REPOSITORY : fsRepositoryName;

  if (!isCloud) {
    await esClient.snapshot.createRepository({
      name: fsRepositoryName,
      verify: true,
      repository: { type: 'fs', settings: { location: LOCAL_FS_SNAPSHOT_REPOSITORY_LOCATION } },
    });
  }

  return {
    name,
    cleanup: async () => {
      // Only remove what we created; never delete the managed Cloud repository.
      if (!isCloud) {
        await esClient.snapshot.deleteRepository({ name: [fsRepositoryName] }).catch(() => {});
      }
    },
  };
}
