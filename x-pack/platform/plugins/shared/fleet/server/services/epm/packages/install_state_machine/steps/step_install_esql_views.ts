/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { appContextService } from '../../../../app_context';
import { withPackageSpan } from '../../utils';
import type { InstallContext } from '../_state_machine_package_install';
import { cleanupEsqlViews } from '../../remove';
import { INSTALL_STATES } from '../../../../../../common/types';
import { installEsqlViews } from '../../../elasticsearch/esql_views/install';

export async function stepInstallEsqlViews(context: InstallContext) {
  const { savedObjectsClient, esClient, logger, packageInstallContext, installedPkg } = context;

  let esReferences =
    context.esReferences ?? context.esReferences ?? installedPkg?.attributes.installed_es ?? [];

  if (appContextService.getExperimentalFeatures().enableEsqlViewInstall !== true) {
    return { esReferences };
  }

  esReferences = await withPackageSpan('Install ESQL views', () =>
    installEsqlViews({
      packageInstallContext,
      esClient,
      savedObjectsClient,
      logger,
      esReferences,
    })
  );

  return { esReferences };
}

export async function cleanupEsqlViewsStep(context: InstallContext) {
  const { logger, installedPkg, esClient, retryFromLastState, force, initialState } = context;

  // In case of retry clean up previous installed esql views
  if (
    !force &&
    retryFromLastState &&
    initialState === INSTALL_STATES.INSTALL_ESQL_VIEWS &&
    installedPkg?.attributes?.installed_es &&
    installedPkg.attributes.installed_es.length > 0
  ) {
    const { installed_es: installedEs } = installedPkg.attributes;

    logger.debug('Retry transition - clean up ESQL views');
    await withPackageSpan('Retry transition - clean up ESQL views', async () => {
      await cleanupEsqlViews(installedEs, esClient);
    });
  }
}
