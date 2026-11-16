/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';

import { appContextService } from '../../services/app_context';
import { iacProvisionerService } from '../../services/iac_provisioner';
import { isAwsManagedOnboardingEnabled } from '../../services/utils/aws_onboarding';
import { isIacProvisionerEnabled } from '../../services/utils/iac_provisioner';
import { IacProvisionerUnavailableError } from '../../errors';

import { getBootstrapLaunchHandler } from './handlers';

jest.mock('../../services/app_context');
jest.mock('../../services/aws_onboarding', () => ({
  awsOnboardingCredentialsService: {},
  awsOnboardingDiscoveryService: {},
  awsOnboardingStackService: {},
  isAwsSdkError: jest.fn(),
}));
jest.mock('../../services/utils/aws_onboarding', () => ({
  isAwsManagedOnboardingEnabled: jest.fn(),
}));
jest.mock('../../services/utils/iac_provisioner', () => ({
  isIacProvisionerEnabled: jest.fn(),
}));
jest.mock('../../services/iac_provisioner', () => ({
  iacProvisionerService: { renderAccountTemplate: jest.fn() },
}));

const mockedRender = jest.mocked(iacProvisionerService.renderAccountTemplate);

describe('getBootstrapLaunchHandler', () => {
  let response: ReturnType<typeof httpServerMock.createResponseFactory>;
  const request = httpServerMock.createKibanaRequest({ query: { mode: 'fully-managed' } });

  beforeEach(() => {
    jest.clearAllMocks();
    response = httpServerMock.createResponseFactory();
    jest.spyOn(appContextService, 'getLogger').mockReturnValue(loggingSystemMock.createLogger());
    jest.mocked(isAwsManagedOnboardingEnabled).mockResolvedValue(true);
    jest.mocked(isIacProvisionerEnabled).mockResolvedValue(true);
  });

  it('returns 404 when managed onboarding is disabled', async () => {
    jest.mocked(isAwsManagedOnboardingEnabled).mockResolvedValue(false);

    await getBootstrapLaunchHandler({} as any, request as any, response);

    expect(response.notFound).toHaveBeenCalled();
    expect(mockedRender).not.toHaveBeenCalled();
  });

  it('returns 503 when the IaC Provisioner is disabled', async () => {
    jest.mocked(isIacProvisionerEnabled).mockResolvedValue(false);

    await getBootstrapLaunchHandler({} as any, request as any, response);

    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 503,
      body: { message: 'The IaC Provisioner is not available' },
    });
    expect(mockedRender).not.toHaveBeenCalled();
  });

  it('returns 502 with the provider message when the render fails', async () => {
    const error = new IacProvisionerUnavailableError('request failed with status 404');
    mockedRender.mockRejectedValueOnce(error);

    await getBootstrapLaunchHandler({} as any, request as any, response);

    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 502,
      body: { message: error.message },
    });
  });

  it('returns the quick-create url, expiry and blueprint on success', async () => {
    mockedRender.mockResolvedValueOnce({
      render: true,
      artifactUrl: 'https://bucket/x?sig=1',
      expiresAt: '2026-11-16T12:00:00Z',
      templateSha: 'abc',
      blueprint: { id: 'bp', version: '1' },
    });

    await getBootstrapLaunchHandler(
      {} as any,
      httpServerMock.createKibanaRequest({ query: { mode: 'partially-managed' } }) as any,
      response
    );

    expect(mockedRender).toHaveBeenCalledWith({
      provider: 'aws',
      workflow: 'managed_onboarding_bootstrap',
    });
    expect(response.ok).toHaveBeenCalledWith({
      body: {
        quickCreateUrl:
          'https://console.aws.amazon.com/cloudformation/home#/stacks/quickcreate?templateURL=https%3A%2F%2Fbucket%2Fx%3Fsig%3D1&stackName=elastic-onboarding-bootstrap&param_ManagementMode=partially-managed',
        expiresAt: '2026-11-16T12:00:00Z',
        blueprint: { id: 'bp', version: '1' },
      },
    });
  });
});
