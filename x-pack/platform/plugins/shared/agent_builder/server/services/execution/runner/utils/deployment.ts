/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/server';
import type { DeploymentContext } from '@kbn/agent-builder-server';
import type { DeploymentInfo } from '../../../../utils/deployment_info';

const getSpaceSolution = async ({
  request,
  spaces,
  logger,
}: {
  request: KibanaRequest;
  spaces: SpacesPluginStart | undefined;
  logger: Logger;
}): Promise<DeploymentContext['solution']> => {
  if (!spaces) {
    return undefined;
  }
  try {
    const { solution } = await spaces.spacesService.getActiveSpace(request);
    return solution;
  } catch (error) {
    logger.debug(`Unable to resolve the active space solution: ${error.message}`);
    return undefined;
  }
};

const getLicense = async ({
  licensing,
  logger,
}: {
  licensing: LicensingPluginStart;
  logger: Logger;
}): Promise<DeploymentContext['license']> => {
  try {
    const { isAvailable, type, status } = await licensing.getLicense();
    return isAvailable ? { type, status } : undefined;
  } catch (error) {
    logger.debug(`Unable to resolve the license: ${error.message}`);
    return undefined;
  }
};

/**
 * Builds the deployment context of an agent run by merging the static deployment information
 * with the per-request space solution and license.
 */
export const resolveDeploymentContext = async ({
  deploymentInfo,
  request,
  spaces,
  licensing,
  logger,
}: {
  deploymentInfo: DeploymentInfo;
  request: KibanaRequest;
  spaces: SpacesPluginStart | undefined;
  licensing: LicensingPluginStart;
  logger: Logger;
}): Promise<DeploymentContext> => {
  if (deploymentInfo.environment === 'serverless') {
    return deploymentInfo;
  }

  const [solution, license] = await Promise.all([
    getSpaceSolution({ request, spaces, logger }),
    getLicense({ licensing, logger }),
  ]);

  return {
    ...deploymentInfo,
    ...(solution ? { solution } : {}),
    ...(license ? { license } : {}),
  };
};
