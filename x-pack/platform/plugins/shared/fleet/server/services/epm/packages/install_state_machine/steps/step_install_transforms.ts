/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { installTransforms } from '../../../elasticsearch/transform/install';

import { withPackageSpan } from '../../utils';

import type { InstallContext } from '../_state_machine_package_install';
import { cleanupTransforms } from '../../remove';
import { INSTALL_STATES } from '../../../../../../common/types';

export async function stepInstallTransforms(context: InstallContext) {
  const {
    packageInstallContext,
    esClient,
    savedObjectsClient,
    logger,
    force,
    authorizationHeader,
  } = context;
  let esReferences = context.esReferences ?? [];

  ({ esReferences } = await withPackageSpan('Install transforms', () =>
    installTransforms({
      packageInstallContext,
      esClient,
      savedObjectsClient,
      logger,
      esReferences,
      force,
      authorizationHeader,
    })
  ));
  return { esReferences };
}

export async function cleanupTransformsStep(context: InstallContext) {
  const { logger, esClient, installedPkg, retryFromLastState, force, initialState } = context;

  // In case of retry clean up previous installed assets
  if (
    !force &&
    retryFromLastState &&
    initialState === INSTALL_STATES.INSTALL_TRANSFORMS &&
    installedPkg?.attributes?.installed_es &&
    installedPkg.attributes.installed_es.length > 0
  ) {
    const { installed_es: installedEs } = installedPkg.attributes;

    logger.debug('Retry transition - clean up transforms');
    await withPackageSpan('Retry transition - clean up ilm transforms', async () => {
      await cleanupTransforms(installedEs, esClient);
    });
  }
}
