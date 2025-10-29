/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren } from 'react';
import React from 'react';
import type { Logger } from '@kbn/logging';
import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';

import type { KibanaProductTier, KibanaSolution } from '@kbn/projects-solutions-groups';
import { registerCloudDeploymentMetadataAnalyticsContext } from '../common/register_cloud_deployment_id_analytics_context';
import { getIsCloudEnabled } from '../common/is_cloud_enabled';
import { parseDeploymentIdFromDeploymentUrl } from '../common/parse_deployment_id_from_deployment_url';
import { ELASTICSEARCH_CONFIG_ROUTE } from '../common/constants';
import { decodeCloudId, type DecodedCloudId } from '../common/decode_cloud_id';
import { parseOnboardingSolution } from '../common/parse_onboarding_default_solution';
import type { ElasticsearchConfigType } from '../common/types';
import type { CloudSetup, CloudStart, PublicElasticsearchConfigType } from './types';
import { CloudUrlsService } from './urls';
import { getSupportUrl } from './utils';

export interface CloudConfigType {
  id?: string;
  organization_id?: string;
  cname?: string;
  csp?: string;
  base_url?: string;
  profile_url?: string;
  deployments_url?: string;
  deployment_url?: string;
  projects_url?: string;
  billing_url?: string;
  organization_url?: string;
  users_and_roles_url?: string;
  performance_url?: string;
  trial_end_date?: string;
  is_elastic_staff_owned?: boolean;
  onboarding?: {
    default_solution?: string;
  };
  serverless?: {
    project_id: string;
    project_name?: string;
    project_type?: KibanaSolution;
    product_tier?: KibanaProductTier;
    orchestrator_target?: string;
    in_trial?: boolean;
  };
}

export class CloudPlugin implements Plugin<CloudSetup, CloudStart> {
  private readonly config: CloudConfigType;
  private readonly isCloudEnabled: boolean;
  private readonly isServerlessEnabled: boolean;
  private readonly contextProviders: Array<FC<PropsWithChildren<unknown>>> = [];
  private readonly logger: Logger;
  private elasticsearchConfig?: PublicElasticsearchConfigType;
  private readonly cloudUrls = new CloudUrlsService();

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.config = this.initializerContext.config.get<CloudConfigType>();
    this.isCloudEnabled = getIsCloudEnabled(this.config.id);
    this.isServerlessEnabled = !!this.config.serverless?.project_id;
    this.logger = initializerContext.logger.get();
    this.elasticsearchConfig = undefined;
  }

  public setup(core: CoreSetup): CloudSetup {
    registerCloudDeploymentMetadataAnalyticsContext(core.analytics, this.config);

    const {
      id,
      cname,
      trial_end_date: trialEndDate,
      is_elastic_staff_owned: isElasticStaffOwned,
      csp,
    } = this.config;

    let decodedId: DecodedCloudId | undefined;
    if (id) {
      decodedId = decodeCloudId(id, this.logger);
    }
    const kibanaUrl = decodedId?.kibanaUrl;

    this.cloudUrls.setup(this.config, core, kibanaUrl);

    return {
      cloudId: id,
      organizationId: this.config.organization_id,
      deploymentId: parseDeploymentIdFromDeploymentUrl(this.config.deployment_url),
      cname,
      csp,
      cloudHost: decodedId?.host,
      cloudDefaultPort: decodedId?.defaultPort,
      trialEndDate: trialEndDate ? new Date(trialEndDate) : undefined,
      isElasticStaffOwned,
      isCloudEnabled: this.isCloudEnabled,
      onboarding: {
        defaultSolution: parseOnboardingSolution(this.config.onboarding?.default_solution),
      },
      isServerlessEnabled: this.isServerlessEnabled,
      serverless: {
        projectId: this.config.serverless?.project_id,
        projectName: this.config.serverless?.project_name,
        projectType: this.config.serverless?.project_type,
        orchestratorTarget: this.config.serverless?.orchestrator_target,
        // Hi fellow developer! Please, refrain from using `productTier` from this contract.
        // It is exposed for informational purposes (telemetry and feature flags). Do not use it for feature-gating.
        // Use `core.pricing` when checking if a feature is available for the current product tier.
        productTier: this.config.serverless?.product_tier,
        organizationInTrial: this.config.serverless?.in_trial,
      },
      registerCloudService: (contextProvider) => {
        this.contextProviders.push(contextProvider);
      },
      fetchElasticsearchConfig: this.fetchElasticsearchConfig.bind(this, core.http),
      ...this.cloudUrls.getUrls(), // TODO: Deprecate directly accessing URLs, use `getUrls` instead
      getPrivilegedUrls: this.cloudUrls.getPrivilegedUrls.bind(this.cloudUrls),
      getUrls: this.cloudUrls.getUrls.bind(this.cloudUrls),
    };
  }

  public start(coreStart: CoreStart): CloudStart {
    coreStart.chrome.setHelpSupportUrl(getSupportUrl(this.config));

    // Nest all the registered context providers under the Cloud Services Provider.
    // This way, plugins only need to require Cloud's context provider to have all the enriched Cloud services.
    const CloudContextProvider: FC<PropsWithChildren<unknown>> = ({ children }) => {
      return (
        <>
          {this.contextProviders.reduce(
            (acc, ContextProvider) => (
              <ContextProvider> {acc} </ContextProvider>
            ),
            children
          )}
        </>
      );
    };

    return {
      CloudContextProvider,
      isCloudEnabled: this.isCloudEnabled,
      cloudId: this.config.id,
      isServerlessEnabled: this.isServerlessEnabled,
      serverless: {
        projectId: this.config.serverless?.project_id,
        projectName: this.config.serverless?.project_name,
        projectType: this.config.serverless?.project_type,
        organizationInTrial: this.config.serverless?.in_trial,
      },
      fetchElasticsearchConfig: this.fetchElasticsearchConfig.bind(this, coreStart.http),
      ...this.cloudUrls.getUrls(), // TODO: Deprecate directly accessing URLs, use `getUrls` instead
      getPrivilegedUrls: this.cloudUrls.getPrivilegedUrls.bind(this.cloudUrls),
      getUrls: this.cloudUrls.getUrls.bind(this.cloudUrls),
    };
  }

  public stop() {}

  private async fetchElasticsearchConfig(
    http: CoreStart['http']
  ): Promise<PublicElasticsearchConfigType> {
    if (this.elasticsearchConfig !== undefined) {
      // This config should be fully populated on first fetch, so we should avoid refetching from server
      return this.elasticsearchConfig;
    }
    try {
      const result = await http.get<ElasticsearchConfigType>(ELASTICSEARCH_CONFIG_ROUTE, {
        version: '1',
      });

      this.elasticsearchConfig = { elasticsearchUrl: result.elasticsearch_url || undefined };
      return this.elasticsearchConfig;
    } catch {
      this.logger.error('Failed to fetch Elasticsearch config');
      return {
        elasticsearchUrl: undefined,
      };
    }
  }
}
