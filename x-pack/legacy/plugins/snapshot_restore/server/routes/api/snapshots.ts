/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Router, RouterRouteHandler } from '../../../../../server/lib/create_router';
import { SnapshotDetails } from '../../../common/types';
import { deserializeSnapshotDetails } from '../../lib';
import { SnapshotDetailsEs } from '../../types';

export function registerSnapshotsRoutes(router: Router) {
  router.get('snapshots', getAllHandler);
  router.get('snapshots/{repository}/{snapshot}', getOneHandler);
}

export const getAllHandler: RouterRouteHandler = async (
  req,
  callWithRequest
): Promise<{
  snapshots: SnapshotDetails[];
  errors: any[];
  repositories: string[];
}> => {
  const repositoriesByName = await callWithRequest('snapshot.getRepository', {
    repository: '_all',
  });

  const repositoryNames = Object.keys(repositoriesByName);

  if (repositoryNames.length === 0) {
    return { snapshots: [], errors: [], repositories: [] };
  }

  const snapshots: SnapshotDetails[] = [];
  const errors: any = {};
  const repositories: string[] = [];

  const fetchSnapshotsForRepository = async (repository: string) => {
    try {
      // If any of these repositories 504 they will cost the request significant time.
      const {
        snapshots: fetchedSnapshots,
      }: { snapshots: SnapshotDetailsEs[] } = await callWithRequest('snapshot.get', {
        repository,
        snapshot: '_all',
        ignore_unavailable: true, // Allow request to succeed even if some snapshots are unavailable.
      });

      // Decorate each snapshot with the repository with which it's associated.
      fetchedSnapshots.forEach((snapshot: SnapshotDetailsEs) => {
        snapshots.push(deserializeSnapshotDetails(repository, snapshot));
      });

      repositories.push(repository);
    } catch (error) {
      // These errors are commonly due to a misconfiguration in the repository or plugin errors,
      // which can result in a variety of 400, 404, and 500 errors.
      errors[repository] = error;
    }
  };

  await Promise.all(repositoryNames.map(fetchSnapshotsForRepository));

  return {
    snapshots,
    repositories,
    errors,
  };
};

export const getOneHandler: RouterRouteHandler = async (
  req,
  callWithRequest
): Promise<SnapshotDetails> => {
  const { repository, snapshot } = req.params;
  const { snapshots }: { snapshots: SnapshotDetailsEs[] } = await callWithRequest('snapshot.get', {
    repository,
    snapshot,
  });

  // If the snapshot is missing the endpoint will return a 404, so we'll never get to this point.
  return deserializeSnapshotDetails(repository, snapshots[0]);
};
