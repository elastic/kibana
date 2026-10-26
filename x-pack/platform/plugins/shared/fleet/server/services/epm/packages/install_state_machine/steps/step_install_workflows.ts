/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstValueFrom } from 'rxjs';

import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';

import { ENABLE_WORKFLOW_ASSETS_FLAG } from '../../../../../../common/constants';

import { KibanaSavedObjectType } from '../../../../../../common/types';
import { FleetError } from '../../../../../errors';
import { appContextService } from '../../../../app_context';
import { withPackageSpan } from '../../utils';
import type { InstallContext } from '../_state_machine_package_install';
import { saveKibanaAssetsRefs } from '../../install';
import {
  getInstalledWorkflowRefs,
  installWorkflows,
  isWorkflowAssetPath,
} from '../../../kibana/workflows/install';

const isWorkflowAssetsFlagEnabled = async (): Promise<boolean> => {
  const featureFlags = appContextService.getFeatureFlags();
  if (!featureFlags) return false;
  return await firstValueFrom(featureFlags.getBooleanValue$(ENABLE_WORKFLOW_ASSETS_FLAG, false));
};

export const stepInstallWorkflows = async (
  context: Pick<
    InstallContext,
    'logger' | 'savedObjectsClient' | 'packageInstallContext' | 'spaceId' | 'installedPkg'
  > & {
    installAsAdditionalSpace?: boolean;
    throwIfUnavailable?: boolean;
    upgradeAdditionalSpaces?: boolean;
  }
) => {
  const {
    logger,
    savedObjectsClient,
    packageInstallContext,
    spaceId,
    installAsAdditionalSpace: explicitInstallAsAdditionalSpace,
    installedPkg,
    throwIfUnavailable = false,
    upgradeAdditionalSpaces = true,
  } = context;

  // The state machine does not set the flag; derive it from the package's primary space so
  // secondary-space reinstalls save refs to additional_spaces_installed_kibana.
  const installAsAdditionalSpace =
    explicitInstallAsAdditionalSpace ??
    (installedPkg
      ? (installedPkg.attributes.installed_kibana_space_id ?? DEFAULT_SPACE_ID) !== spaceId
      : false);
  const { name: pkgName } = packageInstallContext.packageInfo;

  const hasWorkflowAssets = packageInstallContext.paths.some(isWorkflowAssetPath);
  const primarySpaceId = installedPkg?.attributes.installed_kibana_space_id ?? DEFAULT_SPACE_ID;
  // A primary-space upgrade also upgrades every additional space, like the Kibana assets step.
  // HTTP callers opt out: route authz only covers the request's space.
  const additionalSpaceIds =
    upgradeAdditionalSpaces && installedPkg && !installAsAdditionalSpace
      ? Object.keys(installedPkg.attributes.additional_spaces_installed_kibana ?? {}).filter(
          (additionalSpaceId) => additionalSpaceId !== primarySpaceId
        )
      : [];
  const targets = [
    { targetSpaceId: spaceId, asAdditionalSpace: installAsAdditionalSpace },
    ...additionalSpaceIds.map((targetSpaceId) => ({ targetSpaceId, asAdditionalSpace: true })),
  ].map((target) => ({
    ...target,
    previousRefs: getInstalledWorkflowRefs(
      installedPkg,
      target.targetSpaceId,
      target.asAdditionalSpace
    ),
  }));

  if (!hasWorkflowAssets && targets.every(({ previousRefs }) => !previousRefs.length)) {
    return;
  }

  const client = (await isWorkflowAssetsFlagEnabled())
    ? await appContextService.getManagedWorkflowsClient()
    : undefined;
  if (!client) {
    if (throwIfUnavailable) {
      throw new FleetError('Workflows are not available, cannot install workflow assets');
    }
    // Intentional: when the workflows plugin is unavailable or fleet.enableWorkflowAssets is
    // off, skip install entirely — no deferred refs and nothing shown in the Assets tab.
    logger.warn('Workflows are not available, skipping workflow assets installation');
    return;
  }

  await withPackageSpan('Install workflows', async () => {
    for (const { targetSpaceId, asAdditionalSpace, previousRefs } of targets) {
      if (!hasWorkflowAssets && !previousRefs.length) continue;
      const assetRefs = await installWorkflows({
        client,
        packageInstallContext,
        spaceId: targetSpaceId,
        logger,
        previousRefs,
      });
      await saveKibanaAssetsRefs(
        savedObjectsClient,
        pkgName,
        assetRefs,
        targetSpaceId,
        asAdditionalSpace,
        true,
        [KibanaSavedObjectType.workflow]
      );
    }
  });
};
