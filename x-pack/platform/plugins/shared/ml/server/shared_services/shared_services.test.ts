/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient, KibanaRequest } from '@kbn/core/server';
import {
  coreMock,
  elasticsearchServiceMock,
  httpServerMock,
  savedObjectsClientMock,
} from '@kbn/core/server/mocks';
import type { CloudSetup } from '@kbn/cloud-plugin/server';
import { createIndexPatternsStartMock } from '@kbn/data-views-plugin/server/mocks';
import type { MlCapabilities } from '@kbn/ml-common-types/capabilities';
import type { MlLicense } from '../../common/license';
import { InsufficientMLCapabilities } from '../lib/capabilities/errors';
import { createSharedServices } from './shared_services';
import { ML_INTERNAL_USER_REQUEST } from './internal_user_request';

const mockGetMlClient = jest.fn((client: IScopedClusterClient) => ({
  getJobs: async () => ({ count: 0, jobs: [] }),
}));

jest.mock('../lib/ml_client', () => ({
  getMlClient: (client: IScopedClusterClient) => mockGetMlClient(client),
  MlAuditLogger: jest.fn(),
}));

jest.mock('../saved_objects', () => ({
  mlSavedObjectServiceFactory: jest.fn(),
}));

const setup = () => {
  const clusterClient = elasticsearchServiceMock.createClusterClient();
  const coreStart = coreMock.createStart();
  const resolveMlCapabilities = jest
    .fn()
    .mockResolvedValue({ canGetJobs: true } as unknown as MlCapabilities);
  const mlLicense = {
    isFullLicense: () => true,
    isMinimumLicense: () => true,
  } as unknown as MlLicense;

  const { sharedServicesProviders } = createSharedServices(
    mlLicense,
    undefined,
    {} as CloudSetup,
    undefined,
    resolveMlCapabilities,
    () => clusterClient,
    () => savedObjectsClientMock.create(),
    () => coreStart.uiSettings,
    () => null,
    () => createIndexPatternsStartMock(),
    () => coreStart.security.audit,
    () => Promise.resolve(),
    null,
    { ad: true, dfa: true, nlp: true },
    { isServerless: false, cpsEnabled: false }
  );

  const getJobsEsClient = async (request: KibanaRequest) => {
    mockGetMlClient.mockClear();
    await sharedServicesProviders
      .anomalyDetectorsProvider(request, savedObjectsClientMock.create())
      .jobs();
    return mockGetMlClient.mock.calls[0][0].asCurrentUser;
  };

  return { clusterClient, resolveMlCapabilities, getJobsEsClient };
};

describe('ML shared services', () => {
  it('runs as the internal user without checking ML capabilities for ML_INTERNAL_USER_REQUEST', async () => {
    const { clusterClient, resolveMlCapabilities, getJobsEsClient } = setup();

    const esClient = await getJobsEsClient(ML_INTERNAL_USER_REQUEST);

    expect(esClient).toBe(clusterClient.asInternalUser);
    expect(clusterClient.asScoped).not.toHaveBeenCalled();
    expect(resolveMlCapabilities).not.toHaveBeenCalled();
  });

  it("runs as the current user after checking ML capabilities for a user's request", async () => {
    const { clusterClient, resolveMlCapabilities, getJobsEsClient } = setup();
    const request = httpServerMock.createKibanaRequest();

    const esClient = await getJobsEsClient(request);

    expect(esClient).toBe(clusterClient.asScoped.mock.results[0].value.asCurrentUser);
    expect(clusterClient.asScoped).toHaveBeenCalledWith(request);
    expect(resolveMlCapabilities).toHaveBeenCalledWith(request);
  });

  it('does not treat other fake requests as the internal user', async () => {
    const { clusterClient, getJobsEsClient } = setup();
    const request = httpServerMock.createFakeKibanaRequest({});

    await expect(getJobsEsClient(request)).rejects.toBeInstanceOf(InsufficientMLCapabilities);
    expect(clusterClient.asScoped).toHaveBeenCalledWith(request);
  });

  it('does not treat hand-built request objects as the internal user', async () => {
    const { clusterClient, getJobsEsClient } = setup();
    const request = { headers: {} } as KibanaRequest;

    const esClient = await getJobsEsClient(request);

    expect(esClient).not.toBe(clusterClient.asInternalUser);
    expect(clusterClient.asScoped).toHaveBeenCalledWith(request);
  });
});
