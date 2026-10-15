/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';

import { KibanaSavedObjectType } from '../../../../../../common/types';
import { appContextService } from '../../../../app_context';
import { withPackageSpan } from '../../utils';
import type { InstallContext } from '../_state_machine_package_install';
import { saveKibanaAssetsRefs } from '../../install';
import { installWorkflows, isWorkflowAssetPath } from '../../../kibana/workflows/install';

export const stepInstallWorkflows = async (
  context: Pick<
    InstallContext,
    'logger' | 'savedObjectsClient' | 'packageInstallContext' | 'spaceId' | 'installedPkg'
  > & { installAsAdditionalSpace?: boolean }
) => {
  const {
    logger,
    savedObjectsClient,
    packageInstallContext,
    spaceId,
    installAsAdditionalSpace: explicitInstallAsAdditionalSpace,
    installedPkg,
  } = context;

  // The state machine does not set the flag; derive it from the package's primary space so
  // secondary-space reinstalls save refs to additional_spaces_installed_kibana.
  const installAsAdditionalSpace =
    explicitInstallAsAdditionalSpace ??
    (installedPkg
      ? (installedPkg.attributes.installed_kibana_space_id ?? DEFAULT_SPACE_ID) !== spaceId
      : false);
  const { name: pkgName } = packageInstallContext.packageInfo;

  const previousWorkflowRefs = (
    installAsAdditionalSpace
      ? installedPkg?.attributes.additional_spaces_installed_kibana?.[spaceId]
      : installedPkg?.attributes.installed_kibana
  )?.filter(({ type }) => type === KibanaSavedObjectType.workflow);

  const hasWorkflowAssets = packageInstallContext.paths.some(isWorkflowAssetPath);
  if (!hasWorkflowAssets && !previousWorkflowRefs?.length) {
    return;
  }

  const saveRefs = (refs: typeof previousWorkflowRefs = []) =>
    saveKibanaAssetsRefs(
      savedObjectsClient,
      pkgName,
      refs,
      spaceId,
      installAsAdditionalSpace,
      true,
      [KibanaSavedObjectType.workflow]
    );

  const client = await appContextService.waitForManagedWorkflowsClient();
  if (appContextService.getExperimentalFeatures().enableWorkflowAssets !== true || !client) {
    logger.warn('Workflows are not available, skipping workflow assets installation');
    // The kibana assets step replaced the saved refs, put back the workflows that are still installed
    await saveRefs(previousWorkflowRefs);
    return;
  }

  await withPackageSpan('Install workflows', async () => {
    const assetRefs = await installWorkflows({
      client,
      packageInstallContext,
      spaceId,
      logger,
      previousRefs: previousWorkflowRefs,
    });
    await saveRefs(assetRefs);
  });
};
