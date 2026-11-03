/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsExtensionsServerPluginSetup } from '@kbn/workflows-extensions/server';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/server';
import type { EntityStoreSecurity } from '../../routes/apis/utils/check_and_format_privileges';
import type { EntityStoreStartContract } from '../../types';
import {
  getUpdateAssetCriticalityStepDefinition,
  type StepWorkflowsExtensions,
} from './update_asset_criticality';

/** What the steps need once started, from the `server` entry and the task pod entry alike. */
export interface StepStartServices {
  getCreateCRUDClient: () => Promise<EntityStoreStartContract['createCRUDClient']>;
  getWorkflowsExtensions: () => Promise<StepWorkflowsExtensions | undefined>;
  getLicensing: () => Promise<Pick<LicensingPluginStart, 'getLicense'>>;
  getSecurity: () => Promise<EntityStoreSecurity>;
}

export const registerSteps = (
  workflowsExtensions: Pick<WorkflowsExtensionsServerPluginSetup, 'registerStepDefinition'>,
  { getCreateCRUDClient, getWorkflowsExtensions, getLicensing, getSecurity }: StepStartServices
): void => {
  workflowsExtensions.registerStepDefinition(
    getUpdateAssetCriticalityStepDefinition(
      getCreateCRUDClient,
      getWorkflowsExtensions,
      getLicensing,
      getSecurity
    )
  );
};
