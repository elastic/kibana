/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';

import { CloudConnectorRoleArnPropagationError, FleetUnauthorizedError } from '../../errors';
import { appContextService } from '../../services/app_context';
import { cloudConnectorService } from '../../services';
import { verifyCloudConnectorIacKey } from '../../services/cloud_connectors';

import { updateCloudConnectorHandler, verifyCloudConnectorIacKeyHandler } from './handlers';

jest.mock('../../services/app_context');
jest.mock('../../services', () => ({
  cloudConnectorService: {
    update: jest.fn(),
  },
  packagePolicyService: {},
}));
jest.mock('../../services/cloud_connectors', () => ({
  verifyCloudConnectorIacKey: jest.fn(),
}));

const mockedVerify = jest.mocked(verifyCloudConnectorIacKey);
const mockedUpdate = jest.mocked(cloudConnectorService.update);

const buildContext = () => ({ fleet: Promise.resolve({ internalSoClient: {} }) } as any);

const buildUpdateContext = (canWriteIntegrationPolicies = true) =>
  ({
    fleet: Promise.resolve({
      internalSoClient: {},
      authz: { integrations: { writeIntegrationPolicies: canWriteIntegrationPolicies } },
    }),
    core: Promise.resolve({
      elasticsearch: {
        client: {
          asInternalUser: {},
        },
      },
    }),
  } as any);

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
    const integrations = [
      { name: 'aws', policyTemplates: [{ name: 'guardduty', enabledInputs: ['aws-s3'] }] },
      { name: 'aws_logs', policyTemplates: [{ name: 'generic', enabledInputs: ['aws-s3'] }] },
    ];
    const request = httpServerMock.createKibanaRequest({
      params: { cloudConnectorId: 'cc-1' },
      body: { integrations },
    });

    await verifyCloudConnectorIacKeyHandler(buildContext(), request, response);

    // Forwarded as the array it arrived as, so the service merges every package at once.
    expect(mockedVerify).toHaveBeenCalledWith({}, 'cc-1', integrations, { compare: true });
    expect(response.ok).toHaveBeenCalledWith({
      body: { matches: false, reason: 'no_key', outcome: 'no_key', integrations: [] },
    });
  });

  it('passes no integrations when the body omits them (flyout)', async () => {
    mockedVerify.mockResolvedValueOnce({ matches: true, outcome: 'matches', integrations: [] });
    const request = httpServerMock.createKibanaRequest({
      params: { cloudConnectorId: 'cc-1' },
      body: {},
    });

    await verifyCloudConnectorIacKeyHandler(buildContext(), request, response);

    expect(mockedVerify).toHaveBeenCalledWith({}, 'cc-1', undefined, { compare: true });
  });

  it('forwards compare:false so the service returns the integration set without a comparison', async () => {
    const notChecked = { matches: true, outcome: 'not_checked' as const, integrations: [] };
    mockedVerify.mockResolvedValueOnce(notChecked);
    const request = httpServerMock.createKibanaRequest({
      params: { cloudConnectorId: 'cc-1' },
      body: { compare: false },
    });

    await verifyCloudConnectorIacKeyHandler(buildContext(), request, response);

    expect(mockedVerify).toHaveBeenCalledWith({}, 'cc-1', undefined, { compare: false });
    expect(response.ok).toHaveBeenCalledWith({ body: notChecked });
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

describe('updateCloudConnectorHandler', () => {
  let response: ReturnType<typeof httpServerMock.createResponseFactory>;
  const mockUser = { username: 'sean' };

  beforeEach(() => {
    jest.clearAllMocks();
    response = httpServerMock.createResponseFactory();
    jest.spyOn(appContextService, 'getLogger').mockReturnValue(loggingSystemMock.createLogger());
    jest.spyOn(appContextService, 'getSecurityCore').mockReturnValue({
      authc: { getCurrentUser: jest.fn().mockReturnValue(mockUser) },
    } as any);
  });

  it('passes the current user into cloudConnectorService.update', async () => {
    mockedUpdate.mockResolvedValueOnce({ id: 'cc-1' } as any);
    const request = httpServerMock.createKibanaRequest({
      params: { cloudConnectorId: 'cc-1' },
      body: {
        vars: { role_arn: { type: 'text', value: 'arn:aws:iam::123456789012:role/New' } },
      },
    });

    await updateCloudConnectorHandler(buildUpdateContext(), request, response);

    expect(mockedUpdate).toHaveBeenCalledWith(
      {},
      'cc-1',
      expect.objectContaining({
        vars: { role_arn: { type: 'text', value: 'arn:aws:iam::123456789012:role/New' } },
      }),
      expect.objectContaining({
        user: mockUser,
        canWriteIntegrationPolicies: true,
        request,
        listSpaces: expect.any(Function),
      })
    );
    expect(response.ok).toHaveBeenCalled();
  });

  it('surfaces CloudConnectorRoleArnPropagationError as 500 with detail', async () => {
    const propagationMessage =
      'Failed to update role ARN on 1 policy (ids: p1). All previously updated policies were reverted successfully; the connector is unchanged.';
    mockedUpdate.mockRejectedValueOnce(
      new CloudConnectorRoleArnPropagationError(propagationMessage, {
        updateFailed: ['p1'],
        revertFailed: [],
        bumpFailed: false,
      })
    );
    const request = httpServerMock.createKibanaRequest({
      params: { cloudConnectorId: 'cc-1' },
      body: {
        vars: { role_arn: { type: 'text', value: 'arn:aws:iam::123456789012:role/New' } },
      },
    });

    await updateCloudConnectorHandler(buildUpdateContext(), request, response);

    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 500,
      body: {
        message: propagationMessage,
        attributes: {
          updateFailed: ['p1'],
          revertFailed: [],
          bumpFailed: false,
        },
      },
    });
  });

  it('surfaces a saved-object conflict as 409', async () => {
    mockedUpdate.mockRejectedValueOnce(
      SavedObjectsErrorHelpers.createConflictError('fleet-cloud-connector', 'cc-1')
    );
    const request = httpServerMock.createKibanaRequest({
      params: { cloudConnectorId: 'cc-1' },
      body: {
        vars: { role_arn: { type: 'text', value: 'arn:aws:iam::123456789012:role/New' } },
      },
    });

    await updateCloudConnectorHandler(buildUpdateContext(), request, response);

    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 409,
      body: {
        message: expect.stringMatching(/conflict/i),
      },
    });
  });

  it('surfaces a missing integration-policy write as 403', async () => {
    mockedUpdate.mockRejectedValueOnce(
      new FleetUnauthorizedError(
        'Role ARN updates require permission to write integration policies.'
      )
    );
    const request = httpServerMock.createKibanaRequest({
      params: { cloudConnectorId: 'cc-1' },
      body: {
        vars: { role_arn: { type: 'text', value: 'arn:aws:iam::123456789012:role/New' } },
      },
    });

    await updateCloudConnectorHandler(buildUpdateContext(false), request, response);

    expect(mockedUpdate).toHaveBeenCalledWith(
      {},
      'cc-1',
      expect.any(Object),
      expect.objectContaining({ canWriteIntegrationPolicies: false })
    );
    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 403,
      body: {
        message: 'Role ARN updates require permission to write integration policies.',
      },
    });
  });

  it('surfaces other errors as 400', async () => {
    mockedUpdate.mockRejectedValueOnce(new Error('boom'));
    const request = httpServerMock.createKibanaRequest({
      params: { cloudConnectorId: 'cc-1' },
      body: { vars: {} },
    });

    await updateCloudConnectorHandler(buildUpdateContext(), request, response);

    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 400,
      body: { message: 'boom' },
    });
  });
});
