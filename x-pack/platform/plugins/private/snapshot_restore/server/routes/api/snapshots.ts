/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import type { SnapshotDetailsEs } from '../../../common/types';
import { deserializeSnapshotDetails } from '../../../common/lib';
import type { RouteDependencies } from '../../types';
import { getManagedRepositoryName } from '../../lib';
import { addBasePath } from '../helpers';
import { snapshotListSchema } from './validate_schemas';
import { getSnapshotSearchWildcard } from '../../lib/get_snapshot_search_wildcard';

const sortFieldToESParams = {
  snapshot: 'name',
  repository: 'repository',
  indices: 'index_count',
  startTimeInMillis: 'start_time',
  durationInMillis: 'duration',
  'shards.total': 'shard_count',
  'shards.failed': 'failed_shard_count',
};

const isSearchingForNonExistentRepository = (
  repositories: string[],
  value: string,
  match?: string,
  operator?: string
): boolean => {
  // only check if searching for an exact match (repository=test)
  if (match === 'must' && operator === 'exact') {
    return !(repositories || []).includes(value);
  }
  // otherwise we will use a wildcard, so allow the request
  return false;
};

export function registerSnapshotsRoutes({
  router,
  license,
  lib: { wrapEsError, handleEsError },
}: RouteDependencies) {
  // GET all snapshots
  router.get(
    { path: addBasePath('snapshots'), validate: { query: snapshotListSchema } },
    license.guardApiRoute(async (ctx, req, res) => {
      const { client: clusterClient } = (await ctx.core).elasticsearch;
      const sortField =
        sortFieldToESParams[(req.query as TypeOf<typeof snapshotListSchema>).sortField];
      const sortDirection = (req.query as TypeOf<typeof snapshotListSchema>).sortDirection;
      const pageIndex = (req.query as TypeOf<typeof snapshotListSchema>).pageIndex;
      const pageSize = (req.query as TypeOf<typeof snapshotListSchema>).pageSize;
      const searchField = (req.query as TypeOf<typeof snapshotListSchema>).searchField;
      const searchValue = (req.query as TypeOf<typeof snapshotListSchema>).searchValue;
      const searchMatch = (req.query as TypeOf<typeof snapshotListSchema>).searchMatch;
      const searchOperator = (req.query as TypeOf<typeof snapshotListSchema>).searchOperator;

      const managedRepository = await getManagedRepositoryName(clusterClient.asCurrentUser);

      let policies: string[] = [];

      // Attempt to retrieve policies
      // This could fail if user doesn't have access to read SLM policies
      try {
        const policiesByName = await clusterClient.asCurrentUser.slm.getLifecycle();
        policies = Object.keys(policiesByName);
      } catch (e) {
        // Silently swallow error as policy names aren't required in UI
      }

      let repositories: string[] = [];

      try {
        const repositoriesByName = await clusterClient.asCurrentUser.snapshot.getRepository({
          name: '_all',
        });
        repositories = Object.keys(repositoriesByName);

        if (repositories.length === 0) {
          return res.ok({
            body: { snapshots: [], repositories: [], policies },
          });
        }
      } catch (e) {
        return handleEsError({ error: e, response: res });
      }

      // if the search is for a repository name with exact match (repository=test)
      // and that repository doesn't exist, ES request throws an error
      // that is why we return an empty snapshots array instead of sending an ES request
      if (
        searchField === 'repository' &&
        isSearchingForNonExistentRepository(repositories, searchValue!, searchMatch, searchOperator)
      ) {
        return res.ok({
          body: {
            snapshots: [],
            policies,
            repositories,
            errors: [],
            total: 0,
          },
        });
      }
      try {
        // If any of these repositories 504 they will cost the request significant time.
        const fetchedSnapshots = await clusterClient.asCurrentUser.snapshot.get({
          repository:
            searchField === 'repository'
              ? getSnapshotSearchWildcard({
                  field: searchField,
                  value: searchValue!,
                  match: searchMatch,
                  operator: searchOperator,
                })
              : '_all',
          ignore_unavailable: true, // Allow request to succeed even if some snapshots are unavailable.
          snapshot:
            searchField === 'snapshot'
              ? getSnapshotSearchWildcard({
                  field: searchField,
                  value: searchValue!,
                  match: searchMatch,
                  operator: searchOperator,
                })
              : '_all',
          slm_policy_filter:
            searchField === 'policyName'
              ? getSnapshotSearchWildcard({
                  field: searchField,
                  value: searchValue!,
                  match: searchMatch,
                  operator: searchOperator,
                })
              : '*,_none',
          order: sortDirection,
          // @ts-expect-error sortField: string is not compatible with SnapshotSnapshotSort type
          sort: sortField,
          size: pageSize,
          offset: pageIndex * pageSize,
        });

        // Decorate each snapshot with the repository with which it's associated.
        const snapshots = fetchedSnapshots?.snapshots?.map((snapshot) => {
          return deserializeSnapshotDetails(snapshot as SnapshotDetailsEs, managedRepository);
        });

        return res.ok({
          body: {
            snapshots: snapshots || [],
            policies,
            repositories,
            // @ts-expect-error @elastic/elasticsearch https://github.com/elastic/elasticsearch-specification/issues/845
            errors: fetchedSnapshots?.failures,
            total: fetchedSnapshots?.total,
          },
        });
      } catch (e) {
        return handleEsError({ error: e, response: res });
      }
    })
  );

  const getOneParamsSchema = schema.object({
    repository: schema.string(),
    snapshot: schema.string(),
  });

  // GET one snapshot
  router.get(
    {
      path: addBasePath('snapshots/{repository}/{snapshot}'),
      validate: { params: getOneParamsSchema },
    },
    license.guardApiRoute(async (ctx, req, res) => {
      const { client: clusterClient } = (await ctx.core).elasticsearch;
      const { repository, snapshot } = req.params as TypeOf<typeof getOneParamsSchema>;
      const managedRepository = await getManagedRepositoryName(clusterClient.asCurrentUser);

      try {
        const response = await clusterClient.asCurrentUser.snapshot.get({
          repository,
          snapshot: '_all',
          ignore_unavailable: true,
        });

        const { snapshots: snapshotsList } = response;

        if (!snapshotsList || snapshotsList.length === 0) {
          return res.notFound({ body: 'Snapshot not found' });
        }

        const selectedSnapshot = snapshotsList.find(
          ({ snapshot: snapshotName }) => snapshot === snapshotName
        ) as SnapshotDetailsEs;

        if (!selectedSnapshot) {
          // If snapshot doesn't exist, manually throw 404 here
          return res.notFound({ body: 'Snapshot not found' });
        }

        const successfulSnapshots = snapshotsList
          .filter(({ state }) => state === 'SUCCESS')
          .sort((a, b) => {
            return +new Date(b.end_time!) - +new Date(a.end_time!);
          }) as SnapshotDetailsEs[];

        return res.ok({
          body: deserializeSnapshotDetails(
            selectedSnapshot,
            managedRepository,
            successfulSnapshots
          ),
        });
      } catch (e) {
        return handleEsError({ error: e, response: res });
      }
    })
  );

  const deleteSchema = schema.arrayOf(
    schema.object({
      repository: schema.string(),
      snapshot: schema.string(),
    })
  );

  // DELETE one or multiple snapshots
  router.post(
    { path: addBasePath('snapshots/bulk_delete'), validate: { body: deleteSchema } },
    license.guardApiRoute(async (ctx, req, res) => {
      const { client: clusterClient } = (await ctx.core).elasticsearch;

      const response: {
        itemsDeleted: Array<{ snapshot: string; repository: string }>;
        errors: any[];
      } = {
        itemsDeleted: [],
        errors: [],
      };

      const snapshots = req.body;

      try {
        // We intentionally perform deletion requests sequentially (blocking) instead of in parallel (non-blocking)
        // because there can only be one snapshot deletion task performed at a time (ES restriction).
        for (let i = 0; i < snapshots.length; i++) {
          const { snapshot, repository } = snapshots[i];

          await clusterClient.asCurrentUser.snapshot
            .delete({ snapshot, repository })
            .then(() => response.itemsDeleted.push({ snapshot, repository }))
            .catch((e) =>
              response.errors.push({
                id: { snapshot, repository },
                error: wrapEsError(e),
              })
            );
        }

        return res.ok({ body: response });
      } catch (e) {
        return handleEsError({ error: e, response: res });
      }
    })
  );
}
