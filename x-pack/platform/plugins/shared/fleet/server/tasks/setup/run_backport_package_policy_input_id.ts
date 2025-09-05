/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract, Logger } from '@kbn/core/server';

import { appContextService, packagePolicyService } from '../../services';
import type { PackagePolicy } from '../../types';
import { getPackageInfo } from '../../services/epm/packages';
import { getInputsWithIds } from '../../services/package_policies/get_input_with_ids';
import { getPackagePolicySavedObjectType } from '../../services/package_policy';

export async function runBackportPackagePolicyInputId(params: {
  abortController: AbortController;
  logger: Logger;
}) {
  const esClient = appContextService.getInternalUserESClient();
  const savedObjectsClient = appContextService.getInternalUserSOClient();
  return _runBackportPackagePolicyInputId(savedObjectsClient, esClient);
}

export async function _runBackportPackagePolicyInputId(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient
) {
  for await (const items of await packagePolicyService.fetchAllItems(soClient)) {
    const packagePolicyToUpdate = items.reduce((acc, packagePolicy) => {
      if (packagePolicy.inputs.some((input) => !input.id)) {
        acc.push(packagePolicy);
      }
      return acc;
    }, [] as PackagePolicy[]);
    if (packagePolicyToUpdate.length === 0) {
      continue;
    }
    try {
      const updates: Pick<PackagePolicy, 'id' | 'inputs'>[] = [];
      for (const packagePolicy of packagePolicyToUpdate) {
        if (!packagePolicy.package) {
          continue;
        }

        try {
          const pkgInfo = await getPackageInfo({
            savedObjectsClient: soClient,
            pkgName: packagePolicy.package.name,
            pkgVersion: packagePolicy.package.version,
            ignoreUnverified: true,
            prerelease: true,
          });

          const inputs = getInputsWithIds(packagePolicy, packagePolicy.id, undefined, pkgInfo);
          updates.push({ id: packagePolicy.id, inputs });
        } catch (e) {
          //  TODO log error
        }
      }

      const soType = await getPackagePolicySavedObjectType();

      await soClient.bulkUpdate(
        updates.map((update) => ({
          type: soType,
          id: update.id,
          attributes: {
            inputs: update.inputs,
          },
        }))
      );
    } catch (e) {
      // TODO log errors
    }
  }
}
