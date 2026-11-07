/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstValueFrom } from 'rxjs';

import { ENABLE_WORKFLOW_ASSETS_FLAG } from '../../../../../common/constants';
import type { ManagedWorkflowsClient } from '../../../app_context';
import { appContextService } from '../../../app_context';

const isWorkflowAssetsFlagEnabled = async (): Promise<boolean> => {
  const featureFlags = appContextService.getFeatureFlags();
  if (!featureFlags) return false;
  return await firstValueFrom(featureFlags.getBooleanValue$(ENABLE_WORKFLOW_ASSETS_FLAG, false));
};

/**
 * Returns the managed workflows client when workflow assets can be installed: the
 * `fleet.enableWorkflowAssets` flag is on and Workflows is available. Otherwise `undefined`.
 */
export const getWorkflowAssetsClient = async (): Promise<ManagedWorkflowsClient | undefined> =>
  (await isWorkflowAssetsFlagEnabled())
    ? await appContextService.getManagedWorkflowsClient()
    : undefined;
