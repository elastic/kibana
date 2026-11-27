/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { HousekeepingResourceProvider } from '@kbn/housekeeping-plugin/server';
import { ILM_LOCATOR_ID } from '@kbn/index-lifecycle-management-common-shared';

interface PhaseActions {
  searchable_snapshot?: { snapshot_repository?: string };
  wait_for_snapshot?: { policy?: string };
}

interface PolicyEntry {
  policy: {
    _meta?: Record<string, unknown>;
    phases?: Record<string, { actions?: PhaseActions }>;
  };
  in_use_by?: { indices: string[]; data_streams: string[]; composable_templates: string[] };
}

/** The snapshot repositories and snapshot policies that the phases of a policy point at. */
const getReferences = (phases: PolicyEntry['policy']['phases'] = {}) =>
  Object.entries(phases).flatMap(([phase, { actions = {} }]) => [
    ...(actions.searchable_snapshot?.snapshot_repository
      ? [
          {
            targetType: 'snapshot_repository',
            targetId: actions.searchable_snapshot.snapshot_repository,
            via: `${phase}.searchable_snapshot.snapshot_repository`,
            impact: i18n.translate(
              'xpack.indexLifecycleMgmt.housekeeping.missingRepositoryImpact',
              {
                defaultMessage:
                  "Indices can't move to the {phase} phase until the repository exists.",
                values: { phase },
              }
            ),
          },
        ]
      : []),
    ...(actions.wait_for_snapshot?.policy
      ? [
          {
            targetType: 'slm_policy',
            targetId: actions.wait_for_snapshot.policy,
            via: `${phase}.wait_for_snapshot.policy`,
            impact: i18n.translate('xpack.indexLifecycleMgmt.housekeeping.missingSlmPolicyImpact', {
              defaultMessage: 'Indices wait in the {phase} phase until the snapshot policy exists.',
              values: { phase },
            }),
          },
        ]
      : []),
  ]);

export const policyResourceProvider: HousekeepingResourceProvider = {
  id: 'index_lifecycle_management',
  title: i18n.translate('xpack.indexLifecycleMgmt.housekeeping.providerTitle', {
    defaultMessage: 'Index Lifecycle Management',
  }),
  resourceTypes: [
    {
      id: 'ilm_policy',
      label: i18n.translate('xpack.indexLifecycleMgmt.housekeeping.policyLabel', {
        defaultMessage: 'Lifecycle policy',
      }),
      locator: {
        id: ILM_LOCATOR_ID,
        getParams: (name) => ({ page: 'policy_edit', policyName: name }),
      },
      describe: async (name, { esClient, abortSignal }) =>
        (await esClient.ilm.getLifecycle({ name }, { signal: abortSignal }))[name],
      unused: {
        message: i18n.translate('xpack.indexLifecycleMgmt.housekeeping.unusedPolicyMessage', {
          defaultMessage: 'No index, data stream or index template uses this policy.',
        }),
        getFix: (name) => ({
          description: i18n.translate(
            'xpack.indexLifecycleMgmt.housekeeping.deleteUnusedPolicyFix',
            {
              defaultMessage:
                'Deletes the lifecycle policy. No index, data stream or template uses it today.',
            }
          ),
          request: `DELETE _ilm/policy/${name}`,
        }),
      },
    },
  ],
  referencedTypes: ['snapshot_repository', 'slm_policy'],
  isAvailable: ({ isServerless }) => !isServerless,

  async listResources({ esClient, abortSignal }) {
    // in_use_by is missing from the client types
    const policies = (await esClient.ilm.getLifecycle(
      {},
      { ignore: [404], signal: abortSignal }
    )) as unknown as Record<string, PolicyEntry>;

    return Object.entries(policies).map(([name, { policy, in_use_by: inUseBy }]) => ({
      type: 'ilm_policy',
      id: name,
      isManaged: policy._meta?.managed === true || name.startsWith('.'),
      references: getReferences(policy.phases),
      // Counts indices the current user can't see, which the graph would miss.
      inUse: Boolean(
        inUseBy &&
          inUseBy.indices.length + inUseBy.data_streams.length + inUseBy.composable_templates.length
      ),
    }));
  },
};
