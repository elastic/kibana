/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { appContextService } from '../../../../app_context';
import { withPackageSpan } from '../../utils';
import type { InstallContext } from '../_state_machine_package_install';
import { cleanupIndexAliases } from '../../remove';
import { INSTALL_STATES } from '../../../../../../common/types';
import { installIndexAliases } from '../../../elasticsearch/index_alias/install';

export async function stepInstallIndexAliases(context: InstallContext) {
  const { savedObjectsClient, esClient, logger, packageInstallContext, installedPkg } = context;

  let esReferences =
    context.esReferences ?? context.esReferences ?? installedPkg?.attributes.installed_es ?? [];

  if (appContextService.getExperimentalFeatures().enableIndexAliasInstall !== true) {
    return { esReferences };
  }

  esReferences = await withPackageSpan('Install index aliases', () =>
    installIndexAliases({
      packageInstallContext,
      esClient,
      savedObjectsClient,
      logger,
      esReferences,
    })
  );

  return { esReferences };
}

export async function cleanupIndexAliasesStep(context: InstallContext) {
  const { logger, installedPkg, esClient, retryFromLastState, force, initialState } = context;

  // In case of retry clean up previous installed index aliases
  if (
    !force &&
    retryFromLastState &&
    initialState === INSTALL_STATES.INSTALL_INDEX_ALIASES &&
    installedPkg?.attributes?.installed_es &&
    installedPkg.attributes.installed_es.length > 0
  ) {
    const { installed_es: installedEs } = installedPkg.attributes;

    logger.debug('Retry transition - clean up index aliases');
    await withPackageSpan('Retry transition - clean up index aliases', async () => {
      await cleanupIndexAliases(installedEs, esClient);
    });
  }
}
