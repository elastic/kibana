/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import semverValid from 'semver/functions/valid';

import { FleetError, FleetNotFoundError, PackagePolicyRequestError } from '../../errors';
import { appContextService, packagePolicyService } from '../../services';
import { getPackageInfo } from '../../services/epm/packages/get';
import type { DeletePackageDatastreamAssetsRequestSchema, FleetRequestHandler } from '../../types';
import {
  checkExistingDataStreamsAreFromDifferentPackage,
  findDataStreamsFromDifferentPackages,
  getDatasetName,
  isInputPackageDatasetUsedByMultiplePolicies,
  removeAssetsForInputPackagePolicy,
} from '../../services/epm/packages/input_type_packages';
import { PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '../../constants';

export const deletePackageDatastreamAssetsHandler: FleetRequestHandler<
  TypeOf<typeof DeletePackageDatastreamAssetsRequestSchema.params>,
  TypeOf<typeof DeletePackageDatastreamAssetsRequestSchema.query>
> = async (context, request, response) => {
  const fleetContext = await context.fleet;
  const savedObjectsClient = fleetContext.internalSoClient;
  const coreContext = await context.core;
  const esClient = coreContext.elasticsearch.client.asInternalUser;
  const logger = appContextService.getLogger();
  const { pkgName, pkgVersion } = request.params;
  const { packagePolicyId } = request.query;

  try {
    const packageInfo = await getPackageInfo({
      savedObjectsClient,
      pkgName,
      pkgVersion,
    });
    if (pkgVersion && !semverValid(pkgVersion)) {
      throw new PackagePolicyRequestError('Package version is not a valid semver');
    }

    if (!packageInfo || packageInfo.version !== pkgVersion) {
      throw new FleetNotFoundError('Version is not installed');
    }
    if (packageInfo?.type !== 'input') {
      throw new PackagePolicyRequestError(
        `Requested package ${pkgName}-${pkgVersion} is not an input package`
      );
    }

    const allSpacesSoClient = appContextService.getInternalUserSOClientWithoutSpaceExtension();
    const { items: allPackagePolicies } = await packagePolicyService.list(allSpacesSoClient, {
      kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:${pkgName}`,
      spaceId: '*',
    });

    const packagePolicy = allPackagePolicies.find((policy) => policy.id === packagePolicyId);
    if (!packagePolicy) {
      throw new FleetNotFoundError(`Package policy with id ${packagePolicyId} not found`);
    }

    const datasetName = getDatasetName(packagePolicy?.inputs);
    const datasetNameUsedByMultiplePolicies = isInputPackageDatasetUsedByMultiplePolicies(
      allPackagePolicies,
      datasetName,
      pkgName
    );

    if (datasetNameUsedByMultiplePolicies) {
      throw new FleetError(
        `Datastreams matching ${datasetName} are in use by other package policies and cannot be removed`
      );
    }

    const { existingDataStreams } = await findDataStreamsFromDifferentPackages(
      datasetName,
      packageInfo,
      esClient
    );

    const existingDataStreamsAreFromDifferentPackage =
      checkExistingDataStreamsAreFromDifferentPackage(packageInfo, existingDataStreams);

    if (existingDataStreamsAreFromDifferentPackage) {
      throw new FleetError(
        `Datastreams matching ${datasetName} exist on other packages and cannot be removed`
      );
    }

    logger.info(`Removing datastreams matching ${datasetName}`);
    await removeAssetsForInputPackagePolicy({
      packageInfo,
      logger,
      datasetName,
      esClient,
      savedObjectsClient,
    });

    return response.ok({ body: { success: true } });
  } catch (error) {
    logger.error(`error ${error.message}`);
    throw error;
  }
};
