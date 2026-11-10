/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type {
  HousekeepingContext,
  HousekeepingResourceProvider,
} from '@kbn/housekeeping-plugin/server';
import { SNAPSHOT_RESTORE_LOCATOR_ID } from '../../common';

/** Created and managed by Elastic Cloud. */
const CLOUD_REPOSITORY = 'found-snapshots';
const CLOUD_POLICY = 'cloud-snapshot-policy';

export const isManagedPolicy = (name: string) => name === CLOUD_POLICY || name.startsWith('.');

export const getSlmPolicies = ({ esClient, fetchOnce }: HousekeepingContext) =>
  fetchOnce('snapshot_restore:slm_policies', (signal) =>
    esClient.slm.getLifecycle({}, { ignore: [404], signal })
  );

/** Repositories with snapshots are kept even when nothing points at them: they hold backups. */
const hasSnapshots = async (repository: string, { esClient, abortSignal }: HousekeepingContext) => {
  try {
    const { total } = await esClient.snapshot.get(
      // Elasticsearch rejects `size` with `verbose: false`.
      { repository, snapshot: '_all', size: 1 },
      { signal: abortSignal }
    );
    return (total ?? 0) > 0;
  } catch {
    // An unreachable repository is not reported as unused.
    return true;
  }
};

export const repositoryResourceProvider: HousekeepingResourceProvider = {
  id: 'snapshot_restore_repositories',
  title: i18n.translate('xpack.snapshotRestore.housekeeping.repositoriesProviderTitle', {
    defaultMessage: 'Snapshot repositories',
  }),
  resourceTypes: [
    {
      id: 'snapshot_repository',
      label: i18n.translate('xpack.snapshotRestore.housekeeping.repositoryLabel', {
        defaultMessage: 'Snapshot repository',
      }),
      locator: {
        id: SNAPSHOT_RESTORE_LOCATOR_ID,
        getParams: (name) => ({ page: 'repository', repositoryName: name }),
      },
      describe: async (name, { esClient, abortSignal }) =>
        (await esClient.snapshot.getRepository({ name }, { signal: abortSignal }))[name],
      unused: {
        message: i18n.translate('xpack.snapshotRestore.housekeeping.unusedRepositoryMessage', {
          defaultMessage:
            'No snapshot or lifecycle policy uses this repository, and it has no snapshots.',
        }),
        getFix: (name) => ({
          description: i18n.translate('xpack.snapshotRestore.housekeeping.deleteRepositoryFix', {
            defaultMessage:
              'Unregisters the repository. Nothing is deleted from its storage, so you can register it again.',
          }),
          request: `DELETE _snapshot/${name}`,
        }),
      },
    },
  ],
  // Snapshot and Restore is not available in serverless.
  isAvailable: ({ isServerless }) => !isServerless,

  async listResources(context) {
    const repositories = await context.esClient.snapshot.getRepository(
      { name: '_all' },
      { signal: context.abortSignal }
    );
    return Promise.all(
      Object.keys(repositories).map(async (name) => ({
        type: 'snapshot_repository',
        id: name,
        isManaged: name === CLOUD_REPOSITORY || name.startsWith('.'),
        inUse: await hasSnapshots(name, context),
      }))
    );
  },
};

export const slmPolicyResourceProvider: HousekeepingResourceProvider = {
  id: 'snapshot_restore_slm_policies',
  title: i18n.translate('xpack.snapshotRestore.housekeeping.policiesProviderTitle', {
    defaultMessage: 'Snapshot lifecycle policies',
  }),
  resourceTypes: [
    {
      id: 'slm_policy',
      label: i18n.translate('xpack.snapshotRestore.housekeeping.policyLabel', {
        defaultMessage: 'Snapshot policy',
      }),
      locator: {
        id: SNAPSHOT_RESTORE_LOCATOR_ID,
        getParams: (name) => ({ page: 'policy', policyName: name }),
      },
      describe: async (name, { esClient, abortSignal }) =>
        (await esClient.slm.getLifecycle({ policy_id: name }, { signal: abortSignal }))[name],
    },
  ],
  referencedTypes: ['snapshot_repository'],
  isAvailable: ({ isServerless }) => !isServerless,

  async listResources(context) {
    const policies = await getSlmPolicies(context);
    return Object.entries(policies).map(([name, { policy }]) => ({
      type: 'slm_policy',
      id: name,
      isManaged: isManagedPolicy(name),
      references: [
        {
          targetType: 'snapshot_repository',
          targetId: policy.repository,
          via: 'repository',
          impact: i18n.translate('xpack.snapshotRestore.housekeeping.missingRepositoryImpact', {
            defaultMessage: 'The policy fails to take snapshots until the repository exists.',
          }),
        },
      ],
    }));
  },
};
