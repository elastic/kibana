/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/public';
import { CLOUD_SNAPSHOTS_PATH, CLOUD_USER_BILLING_ADMIN_ROLE } from '../common/constants';
import { getFullCloudUrl } from '../common/utils';
import { CloudPrivilegedUrls, CloudUrls } from './types';
import { CloudConfigType } from '.';

/**
 * Service that manages all URLs for the Cloud plugin.
 */
export class CloudUrlsService {
  private config?: CloudConfigType;
  private coreSetup?: CoreSetup;

  public setup(config: CloudConfigType, coreSetup: CoreSetup) {
    this.config = config;
    this.coreSetup = coreSetup;
  }

  /**
   * Returns basic URLs for the Cloud plugin, such as deployments, deployment, profile,
   * organization, snapshots, performance, users and roles, and projects.
   */
  public getUrls(): CloudUrls {
    if (!this.config) {
      throw new Error('Cloud configuration is not set up');
    }

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
   * Returns privileged URLs that require specific user roles to access, such as billing.
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
   * Needed for determining access to privileged URLs like billing.
   */
  private async getCurrentUserRoles(): Promise<readonly string[]> {
    const [coreStart] = (await this.coreSetup?.getStartServices()) || [];
    if (!coreStart) {
      throw new Error('Core setup is not available');
    }

    const userRoles = (await coreStart.security.authc.getCurrentUser()).roles;

    return userRoles || [];
  }
}
