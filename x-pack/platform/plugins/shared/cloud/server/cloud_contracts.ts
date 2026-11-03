/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { CloudConfigType } from './config';
import type { CloudSetup, CloudStart } from './plugin';
import type { DecodedCloudId } from '../common/decode_cloud_id';
import { getIsCloudEnabled } from '../common/is_cloud_enabled';
import { getIsEce } from '../common/get_is_ece';
import { parseDeploymentIdFromDeploymentUrl } from '../common/parse_deployment_id_from_deployment_url';
import { parseOnboardingSolution } from '../common/parse_onboarding_default_solution';
import { getFullCloudUrl, withTargetOrganization } from '../common/utils';
import { readInstanceSizeMb } from './env';

interface CloudContractOptions {
  config: CloudConfigType;
  logger: Logger;
}

const getCloudUrls = (config: CloudConfigType) => {
  const { base_url: baseUrl, organization_id: organizationId } = config;
  const projectsUrl = withTargetOrganization(
    getFullCloudUrl(baseUrl, config.projects_url),
    organizationId
  );
  return { baseUrl, projectsUrl };
};

const createTrial = ({ config, logger }: CloudContractOptions) => {
  const trialEndDate = config.trial_end_date ? new Date(config.trial_end_date) : undefined;

  const trialDaysLeft = (): number | undefined => {
    if (trialEndDate !== undefined && config.trial_end_date) {
      const endDateMs = trialEndDate.getTime();
      if (!Number.isNaN(endDateMs)) {
        const diff = endDateMs - Date.now();
        return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
      } else {
        logger.error('cloud.trial_end_date config value could not be parsed.');
      }
    }
    return undefined;
  };

  const isInTrial = (): boolean => {
    if (config.serverless?.in_trial) return true;
    const daysLeft = trialDaysLeft();
    return daysLeft !== undefined && daysLeft > 0;
  };

  return { trialEndDate, trialDaysLeft, isInTrial };
};

/**
 * The cloud setup contract, built from the plugin's config: shared by the plugin and by the
 * `server/tasks` entry (task pods), which have no routes, collectors or saved objects of cloud.
 */
export const createCloudSetup = ({
  config,
  logger,
  decodedId,
  elasticsearchUrl,
  deploymentId = parseDeploymentIdFromDeploymentUrl(config.deployment_url),
}: CloudContractOptions & {
  decodedId?: DecodedCloudId;
  deploymentId?: string;
  elasticsearchUrl?: string;
}): CloudSetup => {
  const isCloudEnabled = getIsCloudEnabled(config.id);
  const projectId = config.serverless?.project_id;
  const projectType = config.serverless?.project_type;
  const productTier = config.serverless?.product_tier;
  const orchestratorTarget = config.serverless?.orchestrator_target;
  const isServerlessEnabled = !!projectId;
  const isEce = getIsEce({
    isCloudEnabled,
    isServerlessEnabled,
    isSaasContainer: config.isSaasContainer,
  });
  const { trialEndDate, trialDaysLeft, isInTrial } = createTrial({ config, logger });
  return {
    ...getCloudUrls(config),
    cloudId: config.id,
    csp: config.csp,
    region: config.region,
    organizationId: config.organization_id,
    instanceSizeMb: readInstanceSizeMb(),
    deploymentId,
    elasticsearchClusterId: decodedId?.elasticsearchClusterId,
    elasticsearchUrl,
    kibanaUrl: decodedId?.kibanaUrl,
    cloudHost: decodedId?.host,
    cloudDefaultPort: decodedId?.defaultPort,
    isCloudEnabled,
    isEce,
    trialEndDate,
    isElasticStaffOwned: config.is_elastic_staff_owned,
    apm: {
      url: config.apm?.url,
      secretToken: config.apm?.secret_token,
    },
    managedOtlp: {
      url: config.managed_otlp?.url,
    },
    onboarding: {
      defaultSolution: parseOnboardingSolution(config.onboarding?.default_solution),
    },
    isServerlessEnabled,
    serverless: {
      projectId,
      projectName: config.serverless?.project_name,
      projectType,
      orchestratorTarget,
      // Hi fellow developer! Please, refrain from using `productTier` from this contract.
      // It is exposed for informational purposes (telemetry and feature flags). Do not use it for feature-gating.
      // Use `core.pricing` when checking if a feature is available for the current product tier.
      productTier,
      organizationInTrial: config.serverless?.in_trial,
    },
    isInTrial,
    trialDaysLeft,
  };
};

export const createCloudStart = (options: CloudContractOptions): CloudStart => {
  const { isInTrial, trialDaysLeft } = createTrial(options);
  return {
    ...getCloudUrls(options.config),
    isCloudEnabled: getIsCloudEnabled(options.config.id),
    isInTrial,
    trialDaysLeft,
  };
};
