/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock, securityServiceMock } from '@kbn/core/public/mocks';
import { CLOUD_USER_BILLING_ADMIN_ROLE } from '../common/constants';
import { CloudUrlsService } from './urls';

const baseConfig = {
  base_url: 'https://cloud.elastic.co',
  billing_url: '/billing/',
  deployments_url: '/user/deployments',
  deployment_url: '/abc123',
  profile_url: '/user/settings/',
  organization_url: '/account/',
  performance_url: '/performance/',
  projects_url: '/projects/',
  users_and_roles_url: '/users_and_roles/',
};

const kibanaUrl = 'https://cloud.elastic.co/abc123/kibana';

describe('Cloud Plugin URLs Service', () => {
  const setupServiceWithRoles = (userRoles: string[] = []) => {
    const urls = new CloudUrlsService();

    const coreSetup = coreMock.createSetup();
    coreSetup.http.get.mockResolvedValue({ elasticsearch_url: 'elasticsearch-url' });

    const coreStart = coreMock.createStart();
    coreStart.security.authc.getCurrentUser.mockResolvedValue(
      securityServiceMock.createMockAuthenticatedUser({
        roles: userRoles,
      })
    );
    coreSetup.getStartServices.mockResolvedValue([coreStart, {}, {}]);

    urls.setup(baseConfig, coreSetup, kibanaUrl);

    return { urls };
  };

  const setupService = () => {
    return setupServiceWithRoles([]);
  };

  it('exposes basic Cloud URLs', () => {
    const { urls } = setupService();

    expect(urls.getUrls()).toEqual({
      baseUrl: 'https://cloud.elastic.co',
      deploymentUrl: 'https://cloud.elastic.co/abc123',
      deploymentsUrl: 'https://cloud.elastic.co/user/deployments',
      kibanaUrl: 'https://cloud.elastic.co/abc123/kibana',
      organizationUrl: 'https://cloud.elastic.co/account/',
      performanceUrl: 'https://cloud.elastic.co/performance/',
      profileUrl: 'https://cloud.elastic.co/user/settings/',
      projectsUrl: 'https://cloud.elastic.co/projects/',
      snapshotsUrl: 'https://cloud.elastic.co/abc123/elasticsearch/snapshots/',
      usersAndRolesUrl: 'https://cloud.elastic.co/users_and_roles/',
    });
  });

  it('exposes privileged billing URL', () => {
    const { urls } = setupServiceWithRoles([CLOUD_USER_BILLING_ADMIN_ROLE, 'other_role']); // Include specially-named billing admin role

    expect(urls.getPrivilegedUrls()).resolves.toEqual({
      billingUrl: 'https://cloud.elastic.co/billing/',
    });
  });

  it('does not expose privileged billing URL if user does not have billing admin role', async () => {
    const { urls } = setupServiceWithRoles(['other_role']);

    expect(urls.getPrivilegedUrls()).resolves.toEqual({
      billingUrl: undefined,
    });
  });
});
