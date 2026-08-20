/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import semverGt from 'semver/functions/gt';
import semverLt from 'semver/functions/lt';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';

import { ConcurrentInstallOperationError } from '../../../../../errors';
import { MAX_TIME_COMPLETE_INSTALL } from '../../../../../constants';

import { restartInstallation, createInstallation } from '../../install';
import { getInstallationObject } from '../../get';
import { hasLiveReservation } from '../../dataset_ownership/reservation';

import type { InstallContext } from '../_state_machine_package_install';
import { withPackageSpan } from '../../utils';
import { getPackageDependencies } from '../../dependencies';

export async function stepCreateRestartInstallation(context: InstallContext) {
  const {
    savedObjectsClient,
    logger,
    installSource,
    packageInstallContext,
    spaceId,
    force,
    verificationResult,
    installedAsDependencyOf,
    datasetClaimAttemptId,
  } = context;
  const { packageInfo } = packageInstallContext;
  const { name: pkgName, version: pkgVersion } = packageInfo;
  const dependencies = getPackageDependencies(packageInfo);

  const current = await getInstallationObject({ savedObjectsClient, pkgName });
  context.installedPkg = current;

  const concurrentError = () =>
    new ConcurrentInstallOperationError(
      `Concurrent installation or upgrade of ${pkgName || 'unknown'}-${
        pkgVersion || 'unknown'
      } detected, aborting.`
    );

  if (!current) {
    logger.debug(`Package install - Create installation`);
    try {
      await withPackageSpan('Creating installation', () =>
        createInstallation({
          savedObjectsClient,
          packageInfo,
          installSource,
          spaceId,
          verificationResult,
          installedAsDependencyOf,
          dependencies,
          datasetClaimAttemptId,
        })
      );
    } catch (error) {
      if (!SavedObjectsErrorHelpers.isConflictError(error)) throw error;
      const raced = await getInstallationObject({ savedObjectsClient, pkgName });
      if (
        hasLiveReservation(raced?.attributes) &&
        raced?.attributes.dataset_claim_attempt_id !== datasetClaimAttemptId &&
        !force
      ) {
        throw concurrentError();
      }
      if (!raced) throw error;
      context.installedPkg = raced;
      await restartCurrent(context, raced);
    }
    return;
  }

  if (
    hasLiveReservation(current.attributes) &&
    current.attributes.dataset_claim_attempt_id !== datasetClaimAttemptId &&
    !force
  ) {
    throw concurrentError();
  }

  const isStatusInstalling = current.attributes.install_status === 'installing';
  const stillWithinTimeout =
    Date.now() - Date.parse(current.attributes.install_started_at) < MAX_TIME_COMPLETE_INSTALL;
  if (
    isStatusInstalling &&
    stillWithinTimeout &&
    !force &&
    !hasLiveReservation(current.attributes)
  ) {
    throw concurrentError();
  }

  await restartCurrent(context, current);
}

async function restartCurrent(
  context: InstallContext,
  current: NonNullable<InstallContext['installedPkg']>
) {
  const {
    savedObjectsClient,
    logger,
    installSource,
    packageInstallContext,
    force,
    verificationResult,
    installedAsDependencyOf,
    datasetClaimAttemptId,
  } = context;
  const { packageInfo } = packageInstallContext;
  const { name: pkgName, version: pkgVersion } = packageInfo;
  const dependencies = getPackageDependencies(packageInfo);

  let previousVersion: string | null | undefined;
  if (semverGt(pkgVersion, current.attributes.install_version)) {
    previousVersion = current.attributes.install_version;
  } else if (semverLt(pkgVersion, current.attributes.install_version)) {
    previousVersion = null;
  }

  logger.debug(`Package install - Install status ${current.attributes.install_status}`);
  await withPackageSpan(
    force ? 'Restarting installation with force flag' : 'Restarting installation',
    () =>
      restartInstallation({
        savedObjectsClient,
        pkgName,
        pkgVersion,
        installSource,
        verificationResult,
        previousVersion,
        installedAsDependencyOf,
        existingIsDependencyOf: current.attributes.is_dependency_of ?? [],
        dependencies,
        datasetClaimAttemptId,
        version: current.version,
        previousAttemptId: current.attributes.dataset_claim_attempt_id ?? undefined,
      })
  );
}
