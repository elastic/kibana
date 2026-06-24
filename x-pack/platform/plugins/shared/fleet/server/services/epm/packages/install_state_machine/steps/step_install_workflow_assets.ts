/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';

import pMap from 'p-map';

import { KibanaAssetType, KibanaSavedObjectType } from '../../../../../../common/types';
import type { KibanaAssetReference } from '../../../../../../common/types';
import { getPathParts } from '../../../archive';
import { appContextService } from '../../../../app_context';
import { saveKibanaAssetsRefs } from '../../install';
import { withPackageSpan } from '../../utils';
import type { InstallContext } from '../_state_machine_package_install';

export const getFleetPackageWorkflowId = (params: {
  pkgName: string;
  spaceId: string;
  fileName: string;
}): string => {
  const baseName = params.fileName.replace(/\.ya?ml$/i, '');
  return `fleet-${params.spaceId}-${params.pkgName}-${baseName}`;
};

export async function stepInstallWorkflowAssets(
  context: Pick<
    InstallContext,
    'logger' | 'savedObjectsClient' | 'packageInstallContext' | 'spaceId' | 'request'
  > & { installAsAdditionalSpace?: boolean }
) {
  const { logger, savedObjectsClient, packageInstallContext, spaceId, installAsAdditionalSpace } =
    context;
  const { packageInfo } = packageInstallContext;
  const { name: pkgName } = packageInfo;
  const workflowsApi = appContextService.getWorkflowsManagementSetup()?.management;

  if (!workflowsApi) {
    logger.debug(
      `Skipping workflow asset installation for ${pkgName}: workflowsManagement unavailable`
    );
    return;
  }

  if (!context.request) {
    logger.debug(
      `Skipping workflow asset installation for ${pkgName}: missing install request context`
    );
    return;
  }

  await withPackageSpan(`Install package workflows for ${pkgName}`, async () => {
    const workflowEntries: Array<{ fileName: string; yaml: string }> = [];

    await packageInstallContext.archiveIterator.traverseEntries(
      async (entry) => {
        if (!entry.buffer) {
          return;
        }

        workflowEntries.push({
          fileName: path.basename(entry.path),
          yaml: entry.buffer.toString('utf8'),
        });
      },
      (entryPath) => {
        const parts = getPathParts(entryPath);
        return parts.service === 'kibana' && parts.type === KibanaAssetType.workflow;
      }
    );

    if (workflowEntries.length === 0) {
      return;
    }

    const assetRefs: KibanaAssetReference[] = [];

    await pMap(
      workflowEntries,
      async ({ fileName, yaml }) => {
        const workflowId = getFleetPackageWorkflowId({ pkgName, spaceId, fileName });
        const existingWorkflow = await workflowsApi.getWorkflow(workflowId, spaceId);

        if (existingWorkflow) {
          await workflowsApi.updateWorkflow(workflowId, { yaml }, spaceId, context.request!);
        } else {
          await workflowsApi.createWorkflow({ id: workflowId, yaml }, spaceId, context.request!);
        }

        assetRefs.push({
          id: workflowId,
          type: KibanaSavedObjectType.workflow,
        });
      },
      { concurrency: 3 }
    );

    await saveKibanaAssetsRefs(
      savedObjectsClient,
      pkgName,
      assetRefs,
      spaceId,
      installAsAdditionalSpace,
      true
    );
  });
}
