/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';

import pMap from 'p-map';

import type { KibanaRequest, SavedObjectsClientContract } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';

import type { AssetsMap, PackageInfo } from '../../../common/types';
import { KibanaAssetType } from '../../../common/types';
import { getPathParts } from '../epm/archive';
import { appContextService } from '../app_context';
import {
  getFleetPackageWorkflowId,
  substituteFleetAgentIds,
  substituteWorkflowConnectorIds,
} from '../epm/packages/install_state_machine/steps/step_install_workflow_assets';

export interface UpdateWorkflowAssetsOptions {
  savedObjectsClient: SavedObjectsClientContract;
  packageInfo: PackageInfo;
  assetsMap: AssetsMap;
  vars: Record<string, unknown>;
  request: KibanaRequest;
  logger: Logger;
}

export async function updateWorkflowAssets(options: UpdateWorkflowAssetsOptions): Promise<void> {
  const { savedObjectsClient, packageInfo, assetsMap, vars, request, logger } = options;
  const pkgName = packageInfo.name;
  const spaceId = savedObjectsClient.getCurrentNamespace() ?? DEFAULT_SPACE_ID;

  const workflowsApi = appContextService.getWorkflowsManagementSetup()?.management;

  if (!workflowsApi) {
    logger.debug(`Skipping workflow asset update for ${pkgName}: workflowsManagement unavailable`);
    return;
  }

  const workflowEntries = [...assetsMap.entries()].flatMap(([assetPath, buffer]) => {
    if (!buffer) {
      return [];
    }

    const parts = getPathParts(assetPath);
    if (parts.service !== 'kibana' || parts.type !== KibanaAssetType.workflow) {
      return [];
    }

    return [{ fileName: path.basename(assetPath), yaml: buffer.toString('utf8') }];
  });

  if (workflowEntries.length === 0) {
    return;
  }

  await pMap(
    workflowEntries,
    async ({ fileName, yaml }) => {
      const workflowId = getFleetPackageWorkflowId({ pkgName, spaceId, fileName });
      let workflowYaml = substituteWorkflowConnectorIds(yaml, vars, logger);
      workflowYaml = substituteFleetAgentIds(workflowYaml, { pkgName, spaceId });

      const existingWorkflow = await workflowsApi.getWorkflow(workflowId, spaceId);

      if (!existingWorkflow) {
        logger.debug(`Skipping workflow asset update for ${workflowId}: workflow does not exist`);
        return;
      }

      await workflowsApi.updateWorkflow(workflowId, { yaml: workflowYaml }, spaceId, request);
    },
    { concurrency: 3 }
  );
}
