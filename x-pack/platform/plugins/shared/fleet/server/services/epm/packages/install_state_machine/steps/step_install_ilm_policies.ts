/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { appContextService } from '../../../..';

import { installIlmForDataStream } from '../../../elasticsearch/datastream_ilm/install';
import { installILMPolicy } from '../../../elasticsearch/ilm/install';

import { withPackageSpan } from '../../utils';

import type { InstallContext } from '../_state_machine_package_install';
import { deletePrerequisiteAssets, splitESAssets, deleteILMPolicies } from '../../remove';
import { INSTALL_STATES } from '../../../../../../common/types';

export async function stepInstallILMPolicies(context: InstallContext) {
  const { logger, packageInstallContext, esClient, savedObjectsClient, installedPkg } = context;

  // Array that gets updated by each operation. This allows each operation to accurately update the
  // installation object with its references without requiring a refresh of the SO index on each update (faster).
  let esReferences = installedPkg?.attributes.installed_es ?? [];

  // currently only the base package has an ILM policy
  // at some point ILM policies can be installed/modified
  // per data stream and we should then save them
  const isILMPoliciesDisabled =
    appContextService.getConfig()?.internal?.disableILMPolicies ?? false;
  if (!isILMPoliciesDisabled) {
    esReferences = await withPackageSpan('Install ILM policies', () =>
      installILMPolicy(packageInstallContext, esClient, savedObjectsClient, logger, esReferences)
    );
    ({ esReferences } = await withPackageSpan('Install Data Stream ILM policies', () =>
      installIlmForDataStream(
        packageInstallContext,
        esClient,
        savedObjectsClient,
        logger,
        esReferences
      )
    ));
  }
  // always return esReferences even when isILMPoliciesDisabled is false as it's the first time we are writing to it
  return { esReferences };
}

export async function cleanupILMPoliciesStep(context: InstallContext) {
  const { logger, esClient, installedPkg, retryFromLastState, force, initialState } = context;

  // In case of retry clean up previous installed assets
  if (
    !force &&
    retryFromLastState &&
    initialState === INSTALL_STATES.INSTALL_ILM_POLICIES &&
    installedPkg?.attributes?.installed_es &&
    installedPkg.attributes.installed_es.length > 0
  ) {
    const { installed_es: installedEs } = installedPkg.attributes;
    const { indexTemplatesAndPipelines, indexAssets, transformAssets } = splitESAssets(installedEs);

    logger.debug('Retry transition - clean up prerequisite ES assets first');
    await withPackageSpan('Retry transition - clean up prerequisite ES assets first', async () => {
      await deletePrerequisiteAssets(
        {
          indexAssets,
          transformAssets,
          indexTemplatesAndPipelines,
        },
        esClient
      );
    });
    logger.debug('Retry transition - clean up ilm Policies and datastream ilm policies');
    await withPackageSpan(
      'Retry transition - clean up ilm Policies and datastream ilm policies',
      async () => {
        await deleteILMPolicies(installedEs, esClient);
      }
    );
  }
}
