/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/public';
import type { CloudConfigType } from '.';
import {
  CLOUD_BILLING_ROLES,
  CLOUD_PROJECT_SEARCH_POWER_QUERY,
  CLOUD_SNAPSHOTS_PATH,
  SEARCH_POWER_EDITOR_ROLES,
} from '../common/constants';
import { getFullCloudUrl, getProjectPageUrl, withTargetOrganization } from '../common/utils';
import type { CloudBasicUrls, CloudPrivilegedUrls } from './types';

/**
 * Service that manages all URLs for the Cloud plugin.
 */
export class CloudUrlsService {
  private config?: CloudConfigType;
  private coreSetup?: CoreSetup;
  private kibanaUrl?: string;

  public setup(config: CloudConfigType, coreSetup: CoreSetup, kibanaUrl: string | undefined) {
    this.config = config;
    this.coreSetup = coreSetup;
    this.kibanaUrl = kibanaUrl;
  }

  /**
   * Returns the set of "basic" URLs. No special privileges needed
   */
  public getUrls(): CloudBasicUrls {
    if (!this.config) {
      throw new Error('Cloud configuration is not set up');
    }

    const kibanaUrl = this.kibanaUrl;
    const {
      base_url: baseUrl,
      profile_url: profileUrl,
      organization_url: organizationUrl,
      deployments_url: deploymentsUrl,
      deployment_url: deploymentUrl,
      create_deployment_url: createDeploymentUrl,
      performance_url: performanceUrl,
      projects_url: projectsUrl,
      create_project_url: createProjectUrl,
      organization_id: organizationId,
    } = this.config;

    const withOrganization = (url: string) => withTargetOrganization(url, organizationId);
    const fullCloudDeploymentUrl = getFullCloudUrl(baseUrl, deploymentUrl);
    const getDeploymentPageUrl = (suffix: string) =>
      fullCloudDeploymentUrl ? withOrganization(`${fullCloudDeploymentUrl}${suffix}`) : undefined;

    return {
      baseUrl,
      kibanaUrl,
      deploymentsUrl: withOrganization(getFullCloudUrl(baseUrl, deploymentsUrl)),
      deploymentUrl: withOrganization(fullCloudDeploymentUrl),
      deploymentEditUrl: getDeploymentPageUrl('/edit'),
      deploymentSecurityUrl: getDeploymentPageUrl('/security'),
      deploymentUpgradeUrl: getDeploymentPageUrl('?show_upgrade=true'),
      createDeploymentUrl: withOrganization(getFullCloudUrl(baseUrl, createDeploymentUrl)),
      // Cloud UI ignores the target organization on user-scoped pages.
      profileUrl: getFullCloudUrl(baseUrl, profileUrl),
      organizationUrl: withOrganization(getFullCloudUrl(baseUrl, organizationUrl)),
      snapshotsUrl: getDeploymentPageUrl(`/${CLOUD_SNAPSHOTS_PATH}`),
      performanceUrl: withOrganization(getFullCloudUrl(baseUrl, performanceUrl)),
      projectsUrl: withOrganization(getFullCloudUrl(baseUrl, projectsUrl)),
      createProjectUrl: withOrganization(getFullCloudUrl(baseUrl, createProjectUrl)),
    };
  }

  /**
   * Returns the set of "privilged" URLs. Each requires a specific privilege to access.
   */
  public async getPrivilegedUrls(): Promise<CloudPrivilegedUrls> {
    if (!this.config) {
      throw new Error('Cloud configuration is not set up');
    }

    const coreStart = await this.getCoreStart();

    const userRoles = await this.getCurrentUserRoles(coreStart);
    // TODO: treat admins as billing admins until we can check billing access. The `_ec_billing_admin`
    // role doesn't reach Kibana on Serverless and was never set on ECH. This matches role names, so on
    // ECH a custom role named `admin` also gets billing links:
    // https://github.com/elastic/kibana-team/issues/4343
    const { base_url: baseUrl, organization_id: organizationId } = this.config;
    const showBillingUrl = userRoles.some((role) => CLOUD_BILLING_ROLES.includes(role));
    const conditionalFullCloudBillingUrl = showBillingUrl
      ? withTargetOrganization(getFullCloudUrl(baseUrl, this.config.billing_url), organizationId)
      : undefined;

    const hasManageSecurity = Boolean(coreStart.application.capabilities.users?.save);
    const conditionalFullCloudUsersAndRolesUrl = hasManageSecurity
      ? withTargetOrganization(
          getFullCloudUrl(baseUrl, this.config.users_and_roles_url),
          organizationId
        )
      : undefined;

    const showSearchPowerUrl =
      Boolean(this.config.serverless?.project_id) &&
      userRoles.some((role) => SEARCH_POWER_EDITOR_ROLES.includes(role));
    const searchPowerUrl = showSearchPowerUrl
      ? getProjectPageUrl(
          getFullCloudUrl(baseUrl, this.config.deployment_url),
          CLOUD_PROJECT_SEARCH_POWER_QUERY
        )
      : undefined;
    const conditionalFullCloudSearchPowerUrl =
      searchPowerUrl && withTargetOrganization(searchPowerUrl, organizationId);

    return {
      billingUrl: conditionalFullCloudBillingUrl,
      usersAndRolesUrl: conditionalFullCloudUsersAndRolesUrl,
      searchPowerUrl: conditionalFullCloudSearchPowerUrl,
    };
  }

  private async getCoreStart() {
    const [coreStart] = (await this.coreSetup?.getStartServices()) || [];
    if (!coreStart) {
      throw new Error('Core setup is not available');
    }
    return coreStart;
  }

  /**
   * Needed for determining access to privileged URLs, such as billing.
   */
  private async getCurrentUserRoles(
    coreStart: Awaited<ReturnType<CoreSetup['getStartServices']>>[0]
  ): Promise<readonly string[]> {
    let userRoles: readonly string[] = [];
    try {
      userRoles = (await coreStart.security.authc.getCurrentUser()).roles ?? [];
    } catch (e) {
      // If no user is available, we just return an empty array of roles
    }

    return userRoles;
  }
}
