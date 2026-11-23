/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  elasticsearchServiceMock,
  savedObjectsClientMock,
  securityServiceMock,
  uiSettingsServiceMock,
} from '@kbn/core/server/mocks';
import { kibanaRequestFactory } from '@kbn/core-http-server-utils';
import { cloudMock } from '@kbn/cloud-plugin/server/mocks';
import { securityMock } from '@kbn/security-plugin/server/mocks';
import type { PluginStart as DataViewsPluginStart } from '@kbn/data-views-plugin/server';
import type { MlFeatures } from '../../common/constants/app';
import type { MlLicense } from '../../common/license';
import { createSharedServices } from './shared_services';

const mlLicense = {
  isSecurityEnabled: () => true,
  isMlEnabled: () => true,
  isMinimumLicense: () => true,
  isFullLicense: () => true,
} as MlLicense;

const enabledFeatures: MlFeatures = { ad: true, dfa: true, nlp: true };

describe('createSharedServices', () => {
  // Same shape as the requests Task Manager builds for user-scoped tasks (e.g. workflows)
  const fakeRequest = kibanaRequestFactory({
    headers: { authorization: 'ApiKey dGVzdDp0ZXN0' },
    path: '/',
  });

  const setup = ({ hasAllRequested }: { hasAllRequested: boolean }) => {
    const clusterClient = elasticsearchServiceMock.createClusterClient();
    const scopedClient = elasticsearchServiceMock.createScopedClusterClient();
    clusterClient.asScoped.mockReturnValue(scopedClient);
    const authorization = securityMock.createSetup().authz;
    const checkPrivileges = jest.fn().mockResolvedValue({ hasAllRequested });
    authorization.checkPrivilegesDynamicallyWithRequest.mockReturnValue(checkPrivileges);
    const resolveMlCapabilities = jest.fn();

    const { sharedServicesProviders } = createSharedServices(
      mlLicense,
      undefined,
      cloudMock.createSetup(),
      authorization,
      resolveMlCapabilities,
      () => clusterClient,
      () => savedObjectsClientMock.create(),
      () => uiSettingsServiceMock.createStartContract(),
      () => null,
      () => ({} as DataViewsPluginStart),
      () => securityServiceMock.createStart().audit,
      () => Promise.resolve(),
      null,
      enabledFeatures,
      { isServerless: false, cpsEnabled: false }
    );

    const mlSystem = sharedServicesProviders.mlSystemProvider(
      fakeRequest,
      savedObjectsClientMock.create()
    );

    return { mlSystem, authorization, checkPrivileges, resolveMlCapabilities, scopedClient };
  };

  it('authorizes fake requests against the request credentials instead of UI capabilities', async () => {
    const { mlSystem, authorization, checkPrivileges, resolveMlCapabilities, scopedClient } = setup(
      { hasAllRequested: true }
    );

    await mlSystem.mlAnomalySearch({ query: { match_all: {} } }, []);

    expect(authorization.checkPrivilegesDynamicallyWithRequest).toHaveBeenCalledWith(fakeRequest);
    expect(checkPrivileges).toHaveBeenCalledWith({
      kibana: [authorization.actions.ui.get('ml', 'canGetJobs')],
    });
    expect(resolveMlCapabilities).not.toHaveBeenCalled();
    expect(scopedClient.asInternalUser.search).toHaveBeenCalledTimes(1);
  });

  it('rejects fake requests when the request credentials lack the ML privileges', async () => {
    const { mlSystem, scopedClient } = setup({ hasAllRequested: false });

    await expect(mlSystem.mlAnomalySearch({ query: { match_all: {} } }, [])).rejects.toThrow(
      'Insufficient privileges to access feature'
    );
    expect(scopedClient.asInternalUser.search).not.toHaveBeenCalled();
  });
});
