/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniq } from 'lodash';
import type { unitOfTime } from 'moment';
import moment from 'moment';
import pMap from 'p-map';
import type { ElasticsearchClient, KibanaRequest } from '@kbn/core/server';

import { PACKAGES_SAVED_OBJECT_TYPE, SO_SEARCH_LIMIT } from '../../../../common';

import type {
  BulkRollbackAvailableCheckResponse,
  Installation,
  RollbackAvailableCheckResponse,
} from '../../../../common/types';

import { PackageRollbackError } from '../../../errors';
import { getPackagePolicyIdsForCurrentUser } from '../../../routes/epm/bulk_handler';
import { agentPolicyService, appContextService, packagePolicyService } from '../..';

import type { PackageUpdateEvent } from '../../upgrade_sender';
import { UpdateEventType, sendTelemetryEvents } from '../../upgrade_sender';

import { MAX_CONCURRENT_EPM_PACKAGES_INSTALLATIONS } from '../../../constants/max_concurrency_constants';

import { getPackageSavedObjects } from './get';
import { installPackage } from './install';

const DEFAULT_INTEGRATION_ROLLBACK_TTL = '7d';

export const isIntegrationRollbackTTLExpired = (installStartedAt: string): boolean => {
  let { integrationRollbackTTL } = appContextService.getConfig() ?? {};
  if (!integrationRollbackTTL) {
    integrationRollbackTTL = DEFAULT_INTEGRATION_ROLLBACK_TTL;
  }
  const numberPart = integrationRollbackTTL.slice(0, -1);
  const unitPart = integrationRollbackTTL.slice(-1) as unitOfTime.DurationConstructor;
  const ttlDuration = moment.duration(Number(numberPart), unitPart).asMilliseconds();
  return Date.parse(installStartedAt) < Date.now() - ttlDuration;
};

export async function rollbackAvailableCheck(
  pkgName: string,
  currentUserPolicyIds: string[]
): Promise<RollbackAvailableCheckResponse> {
  // Need a less restrictive client than fleetContext.internalSoClient for SO operations in multiple spaces.
  const savedObjectsClient = appContextService.getInternalUserSOClientWithoutSpaceExtension();

  const packageSORes = await getPackageSavedObjects(savedObjectsClient, {
    searchFields: ['name'],
    search: pkgName,
    fields: ['version', 'previous_version', 'install_started_at', 'install_source'],
  });
  if (packageSORes.saved_objects.length === 0) {
    return {
      isAvailable: false,
      reason: `Package ${pkgName} not found`,
    };
  } else if (packageSORes.saved_objects.length > 1) {
    // This should not happen.
    return {
      isAvailable: false,
      reason: `Expected exactly one package saved object`,
    };
  }
  const packageSO = packageSORes.saved_objects[0];
  const previousVersion = packageSO.attributes.previous_version;

  if (!previousVersion) {
    return {
      isAvailable: false,
      reason: `No previous version found for package ${pkgName}`,
    };
  }
  if (isIntegrationRollbackTTLExpired(packageSO.attributes.install_started_at)) {
    return {
      isAvailable: false,
      reason: `Rollback not allowed as TTL expired`,
    };
  }

  if (packageSO.attributes.install_source !== 'registry') {
    return {
      isAvailable: false,
      reason: `${pkgName} was not installed from the registry (install source: ${packageSO.attributes.install_source})`,
    };
  }

  const packagePolicySORes = await packagePolicyService.getPackagePolicySavedObjects(
    savedObjectsClient,
    {
      searchFields: ['package.name'],
      search: pkgName,
      spaceIds: ['*'],
      fields: ['package.version', 'is_managed', 'policy_ids'],
    }
  );
  const packagePolicySOs = packagePolicySORes.saved_objects;
  const policyIds = packagePolicySOs.map((so) => so.id);

  const managedRollbackReason = `Cannot rollback integration with managed package policies`;
  if (packagePolicySOs.some((so) => so.attributes.is_managed)) {
    return {
      isAvailable: false,
      reason: managedRollbackReason,
    };
  }
  // checking is_managed flag on agent policy, it is not always set on package policy
  const agentPolicyIds = uniq(packagePolicySOs.flatMap((so) => so.attributes.policy_ids ?? []));
  const agentPolicies = await agentPolicyService.getByIds(
    savedObjectsClient,
    agentPolicyIds.map((id) => ({ id, spaceId: '*' }))
  );
  if (agentPolicies.some((agentPolicy) => agentPolicy.is_managed)) {
    return {
      isAvailable: false,
      reason: managedRollbackReason,
    };
  }

  const packageVersion = packageSO?.attributes.version;
  if (
    packagePolicySOs
      .filter((so) => !so.id.endsWith(':prev'))
      .some((so) => so.attributes.package?.version !== packageVersion)
  ) {
    return {
      isAvailable: false,
      reason: `Rollback not available because some integration policies are not upgraded to version ${packageVersion}`,
    };
  }

  if (packagePolicySOs.length > 0) {
    const policyIdsWithNoPreviousVersion = policyIds.filter((soId) => {
      if (!soId.endsWith(':prev')) {
        return !policyIds.includes(`${soId}:prev`);
      }
      return false;
    });
    if (policyIdsWithNoPreviousVersion.length > 0) {
      return {
        isAvailable: false,
        reason: `No previous version found for package policies: ${policyIdsWithNoPreviousVersion.join(
          ', '
        )}`,
      };
    }

    const policiesOnWrongPreviousVersion = packagePolicySOs.filter((so) => {
      if (so.id.endsWith(':prev')) {
        return so.attributes.package?.version !== previousVersion;
      }
      return false;
    });
    if (policiesOnWrongPreviousVersion.length > 0) {
      return {
        isAvailable: false,
        reason: `Rollback not available because not all integration policies were upgraded from the same previous version ${previousVersion}`,
      };
    }
  }

  if (currentUserPolicyIds.length < policyIds.length) {
    return {
      isAvailable: false,
      reason: `Not authorized to rollback integration policies in all spaces`,
    };
  }

  return {
    isAvailable: true,
  };
}

export async function bulkRollbackAvailableCheck(
  request: KibanaRequest
): Promise<BulkRollbackAvailableCheckResponse> {
  const savedObjectsClient = appContextService.getInternalUserSOClientWithoutSpaceExtension();

  const result = await savedObjectsClient.find<Installation>({
    type: PACKAGES_SAVED_OBJECT_TYPE,
    fields: ['name'],
    filter: `${PACKAGES_SAVED_OBJECT_TYPE}.attributes.install_status:installed`,
    perPage: SO_SEARCH_LIMIT,
  });
  const installedPackageNames = result.saved_objects.map((so) => so.attributes.name);
  const items: Record<string, RollbackAvailableCheckResponse> = {};

  const packagePolicyIdsForCurrentUser = await getPackagePolicyIdsForCurrentUser(
    request,
    installedPackageNames.map((name) => ({ name }))
  );

  await pMap(
    installedPackageNames,
    async (pkgName) => {
      const { isAvailable, reason } = await rollbackAvailableCheck(
        pkgName,
        packagePolicyIdsForCurrentUser[pkgName]
      );
      items[pkgName] = { isAvailable, reason };
    },
    {
      concurrency: MAX_CONCURRENT_EPM_PACKAGES_INSTALLATIONS,
    }
  );
  return items;
}

export async function rollbackInstallation(options: {
  esClient: ElasticsearchClient;
  currentUserPolicyIds: string[];
  pkgName: string;
  spaceId: string;
}): Promise<{
  version: string;
  success: boolean;
}> {
  const { esClient, currentUserPolicyIds, pkgName, spaceId } = options;
  const logger = appContextService.getLogger();
  logger.info(`Starting installation rollback for package: ${pkgName}`);

  // Need a less restrictive client than fleetContext.internalSoClient for SO operations in multiple spaces.
  const savedObjectsClient = appContextService.getInternalUserSOClientWithoutSpaceExtension();

  const { isAvailable, reason } = await rollbackAvailableCheck(pkgName, currentUserPolicyIds);
  if (!isAvailable) {
    throw new PackageRollbackError(
      reason ? reason : `Rollback not available for package ${pkgName}`
    );
  }

  // Retrieve the package saved object, throw if it doesn't exist or doesn't have a previous version.
  const packageSORes = await getPackageSavedObjects(savedObjectsClient, {
    searchFields: ['name'],
    search: pkgName,
  });

  const packageSO = packageSORes.saved_objects[0];
  const previousVersion = packageSO.attributes.previous_version!;

  logger.info(`Rolling back ${pkgName} from ${packageSO.attributes.version} to ${previousVersion}`);

  // Retrieve package policy saved objects, throw if any of them doesn't have a previous version or has a different one.
  const packagePolicySORes = await packagePolicyService.getPackagePolicySavedObjects(
    savedObjectsClient,
    {
      searchFields: ['package.name'],
      search: pkgName,
      spaceIds: ['*'],
    }
  );
  const packagePolicySOs = packagePolicySORes.saved_objects;

  try {
    // Roll back package policies.
    const rollbackResult = await packagePolicyService.rollback(
      savedObjectsClient,
      packagePolicySOs
    );

    // Roll back package.
    const res = await installPackage({
      esClient,
      savedObjectsClient,
      installSource: 'registry', // Can only rollback from the registry.
      pkgkey: `${pkgName}-${previousVersion}`,
      spaceId,
      force: true,
    });
    if (res.error) {
      await packagePolicyService.restoreRollback(savedObjectsClient, rollbackResult);
      throw new PackageRollbackError(
        `Failed to rollback package ${pkgName} to version ${previousVersion}: ${res.error.message}`
      );
    }

    // Clean up package policies previous revisions and package policies that were copied during rollback.
    await packagePolicyService.cleanupRollbackSavedObjects(savedObjectsClient, rollbackResult);
    // Bump agent policy revision for all package policies that were rolled back.
    await packagePolicyService.bumpAgentPolicyRevisionAfterRollback(
      savedObjectsClient,
      rollbackResult
    );
  } catch (error) {
    sendRollbackTelemetry({
      packageName: pkgName,
      currentVersion: packageSO.attributes.version,
      previousVersion,
      success: false,
      errorMessage: error.message,
    });
    throw error;
  }

  sendRollbackTelemetry({
    packageName: pkgName,
    currentVersion: packageSO.attributes.version,
    previousVersion,
    success: true,
  });

  logger.info(`Package: ${pkgName} successfully rolled back to version: ${previousVersion}`);
  return { version: previousVersion, success: true };
}

function sendRollbackTelemetry({
  packageName,
  currentVersion,
  previousVersion,
  success,
  errorMessage,
}: {
  packageName: string;
  currentVersion: string;
  previousVersion: string;
  success: boolean;
  errorMessage?: string;
}) {
  const upgradeTelemetry: PackageUpdateEvent = {
    packageName,
    currentVersion,
    newVersion: previousVersion,
    status: success ? 'success' : 'failure',
    eventType: UpdateEventType.PACKAGE_ROLLBACK,
    errorMessage,
  };
  sendTelemetryEvents(
    appContextService.getLogger(),
    appContextService.getTelemetryEventsSender(),
    upgradeTelemetry
  );
  appContextService
    .getLogger()
    .debug(`Send rollback telemetry: ${JSON.stringify(upgradeTelemetry)}`);
}
