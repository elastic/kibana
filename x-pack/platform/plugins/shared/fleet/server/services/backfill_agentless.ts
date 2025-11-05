/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

import pMap from 'p-map';

import { SO_SEARCH_LIMIT } from '../constants';

import type { AgentPolicySOAttributes, PackagePolicy, PackagePolicySOAttributes } from '../types';

import { getAgentPolicySavedObjectType } from './agent_policy';

import { appContextService } from '.';
import { getPackagePolicySavedObjectType, packagePolicyService } from './package_policy';
import { mapPackagePolicySavedObjectToPackagePolicy } from './package_policies';

export async function backfillPackagePolicySupportsAgentless(esClient: ElasticsearchClient) {
  const apSavedObjectType = await getAgentPolicySavedObjectType();
  const internalSoClientWithoutSpaceExtension =
    appContextService.getInternalUserSOClientWithoutSpaceExtension();
  const findRes = await internalSoClientWithoutSpaceExtension.find<AgentPolicySOAttributes>({
    type: apSavedObjectType,
    page: 1,
    perPage: SO_SEARCH_LIMIT,
    filter: `${apSavedObjectType}.attributes.supports_agentless:true`,
    fields: [`id`],
    namespaces: ['*'],
  });

  const agentPolicyIds = findRes.saved_objects.map((so) => so.id);

  if (agentPolicyIds.length === 0) {
    return;
  }

  const savedObjectType = await getPackagePolicySavedObjectType();
  const packagePoliciesToUpdate = (
    await appContextService
      .getInternalUserSOClientWithoutSpaceExtension()
      .find<PackagePolicySOAttributes>({
        type: savedObjectType,
        fields: [
          'name',
          'policy_ids',
          'supports_agentless',
          'enabled',
          'policy_ids',
          'inputs',
          'package',
        ],
        filter: `(NOT ${savedObjectType}.attributes.supports_agentless:true) AND ${savedObjectType}.attributes.policy_ids:(${agentPolicyIds.join(
          ' OR '
        )})`,
        perPage: SO_SEARCH_LIMIT,
        namespaces: ['*'],
      })
  ).saved_objects.map((so) => mapPackagePolicySavedObjectToPackagePolicy(so, so.namespaces));

  appContextService
    .getLogger()
    .debug(
      `Backfilling supports_agentless on package policies: ${packagePoliciesToUpdate.map(
        (policy: PackagePolicy) => policy.id
      )}`
    );

  if (packagePoliciesToUpdate.length > 0) {
    const getPackagePolicyUpdate = (packagePolicy: PackagePolicy) => ({
      name: packagePolicy.name,
      enabled: packagePolicy.enabled,
      policy_ids: packagePolicy.policy_ids,
      inputs: packagePolicy.inputs,
      supports_agentless: true,
    });

    await pMap(
      packagePoliciesToUpdate,
      (packagePolicy: PackagePolicy) => {
        const soClient = appContextService.getInternalUserSOClientForSpaceId(
          packagePolicy.spaceIds?.[0]
        );
        return packagePolicyService.update(
          soClient,
          esClient,
          packagePolicy.id,
          getPackagePolicyUpdate(packagePolicy)
        );
      },
      {
        concurrency: 50,
      }
    );
  }
}
