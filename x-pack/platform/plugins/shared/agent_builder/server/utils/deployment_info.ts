/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PackageInfo } from '@kbn/core/server';
import type { CloudSetup } from '@kbn/cloud-plugin/server';
import type { DeploymentContext, DeploymentEnvironment } from '@kbn/agent-builder-server';

/**
 * Part of the {@link DeploymentContext} that is static for the lifetime of the Kibana process.
 */
export type DeploymentInfo = Omit<DeploymentContext, 'solution' | 'license'>;

type DeploymentCloudInfo = Pick<
  CloudSetup,
  'isCloudEnabled' | 'isServerlessEnabled' | 'isEce' | 'serverless'
>;

const getEnvironment = ({
  cloud,
  isServerlessBuild,
}: {
  cloud?: DeploymentCloudInfo;
  isServerlessBuild: boolean;
}): DeploymentEnvironment => {
  if (isServerlessBuild || cloud?.isServerlessEnabled) {
    return 'serverless';
  }
  if (cloud?.isCloudEnabled) {
    return cloud.isEce ? 'ece' : 'ech';
  }
  return 'self_managed';
};

/**
 * Resolves the static deployment information exposed to agents.
 *
 * @param cloud - Setup contract of the optional `cloud` plugin. When absent, the environment is
 * derived from the build flavor only (`serverless` or `self_managed`).
 * @param packageInfo - Kibana package info, from `PluginInitializerContext.env.packageInfo`.
 * @param airgapped - From `PluginInitializerContext.env.airgapped`.
 * @returns The deployment information. `version` is omitted on serverless, `serverless` is only
 * set on serverless when the project type is known.
 */
export const getDeploymentInfo = ({
  cloud,
  packageInfo,
  airgapped,
}: {
  cloud?: DeploymentCloudInfo;
  packageInfo: Pick<PackageInfo, 'version' | 'buildFlavor'>;
  airgapped: boolean;
}): DeploymentInfo => {
  const environment = getEnvironment({
    cloud,
    isServerlessBuild: packageInfo.buildFlavor === 'serverless',
  });

  if (environment === 'serverless') {
    const { projectType, productTier } = cloud?.serverless ?? {};
    return {
      environment,
      airgapped,
      ...(projectType ? { serverless: { projectType, productTier } } : {}),
    };
  }

  return {
    environment,
    airgapped,
    version: packageInfo.version,
  };
};
