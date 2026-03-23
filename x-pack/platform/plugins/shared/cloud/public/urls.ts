/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/public';
import type { CloudConfigType } from '.';
import { CLOUD_SNAPSHOTS_PATH, CLOUD_USER_BILLING_ADMIN_ROLE } from '../common/constants';
import { getFullCloudUrl } from '../common/utils';
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
      performance_url: performanceUrl,
      users_and_roles_url: usersAndRolesUrl,
      projects_url: projectsUrl,
    } = this.config;

    const fullCloudDeploymentsUrl = getFullCloudUrl(baseUrl, deploymentsUrl);
    const fullCloudDeploymentUrl = getFullCloudUrl(baseUrl, deploymentUrl);
    const fullCloudProfileUrl = getFullCloudUrl(baseUrl, profileUrl);
    const fullCloudOrganizationUrl = getFullCloudUrl(baseUrl, organizationUrl);
    const fullCloudPerformanceUrl = getFullCloudUrl(baseUrl, performanceUrl);
    const fullCloudUsersAndRolesUrl = getFullCloudUrl(baseUrl, usersAndRolesUrl);
    const fullCloudProjectsUrl = getFullCloudUrl(baseUrl, projectsUrl);
    const fullCloudSnapshotsUrl = `${fullCloudDeploymentUrl}/${CLOUD_SNAPSHOTS_PATH}`;

    return {
      baseUrl,
      kibanaUrl,
      deploymentsUrl: fullCloudDeploymentsUrl,
      deploymentUrl: fullCloudDeploymentUrl,
      profileUrl: fullCloudProfileUrl,
      organizationUrl: fullCloudOrganizationUrl,
      snapshotsUrl: fullCloudSnapshotsUrl,
      performanceUrl: fullCloudPerformanceUrl,
      usersAndRolesUrl: fullCloudUsersAndRolesUrl,
      projectsUrl: fullCloudProjectsUrl,
    };
  }

  /**
   * Returns the set of "privilged" URLs. Each requires a specific privilege to access.
   */
  public async getPrivilegedUrls(): Promise<CloudPrivilegedUrls> {
    if (!this.config) {
      throw new Error('Cloud configuration is not set up');
    }

    const showBillingUrl = (await this.getCurrentUserRoles()).includes(
      CLOUD_USER_BILLING_ADMIN_ROLE
    );
    const conditionalFullCloudBillingUrl = showBillingUrl
      ? getFullCloudUrl(this.config.base_url, this.config.billing_url)
      : undefined;

    return {
      billingUrl: conditionalFullCloudBillingUrl,
    };
  }

  /**
   * Needed for determining access to privileged URLs, such as billing.
   */
  private async getCurrentUserRoles(): Promise<readonly string[]> {
    const [coreStart] = (await this.coreSetup?.getStartServices()) || [];
    if (!coreStart) {
      throw new Error('Core setup is not available');
    }

    let userRoles: readonly string[] = [];
    try {
      userRoles = (await coreStart.security.authc.getCurrentUser()).roles;
    } catch (e) {
      // If if no user is available, we just return an empty array of roles
    }

    return userRoles;
  }
}
