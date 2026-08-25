/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import semverLt from 'semver/functions/lt';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import pRetry from 'p-retry';

import {
  PACKAGES_SAVED_OBJECT_TYPE,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
  SO_SEARCH_LIMIT,
  FLEET_INSTALL_FORMAT_VERSION,
} from '../../../../../constants';
import { GENERIC_DATASET_NAME } from '../../../../../../common/constants';
import { handleNamespaceTemplateRestoreAfterPackageInstall } from '../..';
import type { Installation, RegistryDataStream } from '../../../../../types';
import { getNormalizedDataStreams } from '../../../../../../common/services';

import { packagePolicyService } from '../../../../package_policy';

import { auditLoggingService } from '../../../../audit_logging';

import { withPackageSpan } from '../../utils';

import { clearLatestFailedAttempts } from '../../install_errors_helpers';
import { generateESIndexPatterns } from '../../../elasticsearch/template/template';

import type { InstallContext } from '../_state_machine_package_install';

const onlyRetryConflictErrors = (err: Error) => {
  if (!SavedObjectsErrorHelpers.isConflictError(err)) {
    throw err;
  }
};

export async function stepSaveSystemObject(context: InstallContext) {
  const {
    packageInstallContext,
    savedObjectsClient,
    logger,
    esClient,
    installedPkg,
    packageAssetRefs,
  } = context;
  const { packageInfo } = packageInstallContext;
  const { name: pkgName, version: pkgVersion } = packageInfo;

  auditLoggingService.writeCustomSoAuditLog({
    action: 'update',
    id: pkgName,
    name: pkgName,
    savedObjectType: PACKAGES_SAVED_OBJECT_TYPE,
  });
  await withPackageSpan('Update install status', () =>
    savedObjectsClient.update<Installation>(PACKAGES_SAVED_OBJECT_TYPE, pkgName, {
      version: pkgVersion,
      install_version: pkgVersion,
      install_status: 'installed',
      package_assets: packageAssetRefs,
      install_format_schema_version: FLEET_INSTALL_FORMAT_VERSION,
      latest_install_failed_attempts: clearLatestFailedAttempts(
        pkgVersion,
        installedPkg?.attributes.latest_install_failed_attempts ?? []
      ),
      rolled_back:
        !!installedPkg?.attributes.version &&
        semverLt(pkgVersion, installedPkg?.attributes.version),
    })
  );

  // Need to refetch the installation again to retrieve all the attributes
  const updatedPackage = await savedObjectsClient.get<Installation>(
    PACKAGES_SAVED_OBJECT_TYPE,
    pkgName
  );
  logger.debug(`Package install - Install status ${updatedPackage?.attributes?.install_status}`);

  // Recompute es_index_patterns from the manifest and merge over the stored map so install/
  // upgrade repairs stale entries (e.g. missing '.otel' suffixes). The merge base is re-read on
  // every retry attempt so this doesn't clobber entries other install flows add concurrently.
  const recomputedEsIndexPatterns = generateESIndexPatterns(
    getNormalizedDataStreams(packageInfo, GENERIC_DATASET_NAME).filter(
      (ds): ds is RegistryDataStream => !!ds.type
    ),
    packageInfo
  );

  const updateEsIndexPatterns = async () => {
    const latest = await savedObjectsClient.get<Installation>(PACKAGES_SAVED_OBJECT_TYPE, pkgName);

    auditLoggingService.writeCustomSoAuditLog({
      action: 'update',
      id: pkgName,
      name: pkgName,
      savedObjectType: PACKAGES_SAVED_OBJECT_TYPE,
    });

    return savedObjectsClient.update<Installation>(
      PACKAGES_SAVED_OBJECT_TYPE,
      pkgName,
      {
        es_index_patterns: { ...latest.attributes.es_index_patterns, ...recomputedEsIndexPatterns },
      },
      { version: latest.version }
    );
  };

  await withPackageSpan('Update es_index_patterns', () =>
    pRetry(updateEsIndexPatterns, { retries: 5, onFailedAttempt: onlyRetryConflictErrors })
  );
  // Recreate namespace-scoped index templates for every namespace opted in on this
  // package's Installation SO. On first install this is a no-op (opt-in list is empty).
  if (packageInfo.type === 'integration') {
    try {
      await handleNamespaceTemplateRestoreAfterPackageInstall({
        soClient: savedObjectsClient,
        esClient,
        packageName: pkgName,
        packageInfo,
        dataStreams: packageInfo.data_streams ?? [],
      });
    } catch (err: any) {
      logger.warn(
        `[stepSaveSystemObject] Failed to restore namespace templates for ${pkgName}: ${err.message}`
      );
    }
  }

  // If the package is flagged with the `keep_policies_up_to_date` flag, upgrade its
  // associated package policies after installation
  if (updatedPackage.attributes.keep_policies_up_to_date) {
    await withPackageSpan('Upgrade package policies', async () => {
      const policyIdsToUpgrade = await packagePolicyService.listIds(savedObjectsClient, {
        page: 1,
        perPage: SO_SEARCH_LIMIT,
        kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:${pkgName}`,
      });
      logger.debug(
        `Package install - Package is flagged with keep_policies_up_to_date, upgrading its associated package policies ${policyIdsToUpgrade}`
      );
      await packagePolicyService.bulkUpgrade(
        savedObjectsClient,
        esClient,
        policyIdsToUpgrade.items
      );
    });
  }
  logger.debug(
    `Install status ${updatedPackage?.attributes?.install_status} - Installation complete!`
  );
}
