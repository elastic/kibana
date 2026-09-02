/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsExtensionsServerPluginSetup } from '@kbn/workflows-extensions/server';
import type { EntityStoreCoreSetup } from '../../types';
import { getUpdateAssetCriticalityStepDefinition } from './update_asset_criticality';

export const registerSteps = (
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup,
  core: EntityStoreCoreSetup
): void => {
  const startServices = core.getStartServices();

  workflowsExtensions.registerStepDefinition(
    getUpdateAssetCriticalityStepDefinition(
      () => startServices.then(([, , startContract]) => startContract.createCRUDClient),
      () => startServices.then(([, pluginsStart]) => pluginsStart.workflowsExtensions),
      () => startServices.then(([, pluginsStart]) => pluginsStart.licensing),
      () => startServices.then(([, pluginsStart]) => pluginsStart.security)
    )
  );
};
