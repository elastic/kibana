/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';

import { FleetNotFoundError, PackagePolicyRequestError } from '../../errors';
import { appContextService, packagePolicyService } from '../../services';
import { getPackageInfo } from '../../services/epm/packages/get';
import type { DeletePackageInputAssetsRequestSchema, FleetRequestHandler } from '../../types';
import {
  checkExistingDataStreamsAreFromDifferentPackage,
  findDataStreamsFromDifferentPackages,
  getDatasetName,
  removeAssetsForInputPackagePolicy,
} from '../../services/epm/packages/input_type_packages';

export const deleteInputPackageAssetsHandler: FleetRequestHandler<
  TypeOf<typeof DeletePackageInputAssetsRequestSchema.params>,
  TypeOf<typeof DeletePackageInputAssetsRequestSchema.query>
> = async (context, request, response) => {
  const fleetContext = await context.fleet;
  const savedObjectsClient = fleetContext.internalSoClient;
  const coreContext = await context.core;
  const esClient = coreContext.elasticsearch.client.asInternalUser;
  const logger = appContextService.getLogger();
  const { pkgName, pkgVersion } = request.params;
  const { packagePolicyId } = request.query;

  const packageInfo = await getPackageInfo({
    savedObjectsClient,
    pkgName,
    pkgVersion,
  });

  if (!packageInfo || packageInfo.version !== pkgVersion) {
    throw new FleetNotFoundError('Version is not installed');
  }
  if (packageInfo?.type !== 'input') {
    throw new PackagePolicyRequestError(
      `Requested package ${pkgName}-${pkgVersion} is not an input package`
    );
  }

  const packagePolicy = await packagePolicyService.get(savedObjectsClient, packagePolicyId);
  if (!packagePolicy) {
    throw new FleetNotFoundError(`Package policy with id ${packagePolicyId} not found`);
  }

  const datasetName = getDatasetName(packagePolicy.inputs);
  const { existingDataStreams } = await findDataStreamsFromDifferentPackages(
    datasetName,
    packageInfo,
    esClient
  );

  const existingDataStreamsAreFromDifferentPackage =
    checkExistingDataStreamsAreFromDifferentPackage(packageInfo, existingDataStreams);

  if (!existingDataStreamsAreFromDifferentPackage) {
    await removeAssetsForInputPackagePolicy({
      packageInfo,
      logger,
      datasetName,
      esClient,
      savedObjectsClient,
    });
  }

  return response.ok({ body: { success: true } });
};
