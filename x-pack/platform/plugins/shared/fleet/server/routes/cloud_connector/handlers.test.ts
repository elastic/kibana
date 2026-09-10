/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';

import { appContextService } from '../../services/app_context';
import { verifyCloudConnectorIacKey } from '../../services/cloud_connectors';

import { verifyCloudConnectorIacKeyHandler } from './handlers';

jest.mock('../../services/app_context');
jest.mock('../../services', () => ({
  cloudConnectorService: {},
  packagePolicyService: {},
}));
jest.mock('../../services/cloud_connectors', () => ({
  verifyCloudConnectorIacKey: jest.fn(),
}));

const mockedVerify = jest.mocked(verifyCloudConnectorIacKey);

const buildContext = () => ({ fleet: Promise.resolve({ internalSoClient: {} }) } as any);

describe('verifyCloudConnectorIacKeyHandler', () => {
  let response: ReturnType<typeof httpServerMock.createResponseFactory>;

  beforeEach(() => {
    jest.clearAllMocks();
    response = httpServerMock.createResponseFactory();
    jest.spyOn(appContextService, 'getLogger').mockReturnValue(loggingSystemMock.createLogger());
  });

  it('returns the verification result', async () => {
    mockedVerify.mockResolvedValueOnce({
      matches: false,
      reason: 'no_key',
      outcome: 'no_key',
      integrations: [],
    });
    const request = httpServerMock.createKibanaRequest({
      params: { cloudConnectorId: 'cc-1' },
      body: {
        integration: {
          name: 'aws',
          policyTemplates: [{ name: 'guardduty', enabledInputs: ['aws-s3'] }],
        },
      },
    });

    await verifyCloudConnectorIacKeyHandler(buildContext(), request, response);

    expect(mockedVerify).toHaveBeenCalledWith({}, 'cc-1', {
      name: 'aws',
      policyTemplates: [{ name: 'guardduty', enabledInputs: ['aws-s3'] }],
    });
    expect(response.ok).toHaveBeenCalledWith({
      body: { matches: false, reason: 'no_key', outcome: 'no_key', integrations: [] },
    });
  });

  it('passes no integration when the body omits it (flyout)', async () => {
    mockedVerify.mockResolvedValueOnce({ matches: true, outcome: 'matches', integrations: [] });
    const request = httpServerMock.createKibanaRequest({
      params: { cloudConnectorId: 'cc-1' },
      body: {},
    });

    await verifyCloudConnectorIacKeyHandler(buildContext(), request, response);

    expect(mockedVerify).toHaveBeenCalledWith({}, 'cc-1', undefined);
  });

  it('returns 404 when the connector does not exist', async () => {
    mockedVerify.mockRejectedValueOnce(
      SavedObjectsErrorHelpers.createGenericNotFoundError('fleet-cloud-connector', 'cc-1')
    );
    const request = httpServerMock.createKibanaRequest({
      params: { cloudConnectorId: 'cc-1' },
      body: {},
    });

    await verifyCloudConnectorIacKeyHandler(buildContext(), request, response);

    expect(response.notFound).toHaveBeenCalledWith({
      body: { message: 'Cloud connector cc-1 not found' },
    });
  });

  it('returns 500 with a generic message on unexpected errors', async () => {
    mockedVerify.mockRejectedValueOnce(new Error('boom with internal hostnames'));
    const request = httpServerMock.createKibanaRequest({
      params: { cloudConnectorId: 'cc-1' },
      body: {},
    });

    await verifyCloudConnectorIacKeyHandler(buildContext(), request, response);

    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 500,
      body: { message: 'An unexpected error occurred while verifying the IaC key' },
    });
  });
});
