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
import { IacProvisionerRequestError, IacProvisionerUnavailableError } from '../../errors';

import { awsOnboardingStackService } from '../../services/aws_onboarding';

import {
  getBootstrapLaunchHandler,
  getBootstrapTemplateHandler,
  getStackHandler,
} from './handlers';

jest.mock('../../services/app_context');
jest.mock('../../services/aws_onboarding', () => ({
  awsOnboardingCredentialsService: {},
  awsOnboardingDiscoveryService: {},
  awsOnboardingStackService: { status: jest.fn() },
  isAwsSdkError: jest.fn(),
  BOOTSTRAP_TEMPLATE_YAML: 'Parameters:\n  ManagementMode:\n    Default: fully-managed\n',
  BOOTSTRAP_TEMPLATE_FILENAME: 'kibana-managed-onboarding-bootstrap.yml',
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

  it('answers download when the IaC Provisioner is disabled', async () => {
    jest.mocked(isIacProvisionerEnabled).mockResolvedValue(false);

    await getBootstrapLaunchHandler({} as any, request as any, response);

    expect(response.ok).toHaveBeenCalledWith({ body: { kind: 'download' } });
    expect(mockedRender).not.toHaveBeenCalled();
  });

  it('answers download when the provisioner has no account-render endpoint', async () => {
    mockedRender.mockRejectedValueOnce(
      new IacProvisionerRequestError('request rejected with status 404', 404)
    );

    await getBootstrapLaunchHandler({} as any, request as any, response);

    expect(response.ok).toHaveBeenCalledWith({ body: { kind: 'download' } });
    expect(response.customError).not.toHaveBeenCalled();
  });

  it('answers download when the provisioner does not know the bootstrap workflow', async () => {
    mockedRender.mockRejectedValueOnce(
      new IacProvisionerRequestError(
        'request rejected with status 422, account_render.unknown_workflow: unknown workflow',
        422,
        ['account_render.unknown_workflow']
      )
    );

    await getBootstrapLaunchHandler({} as any, request as any, response);

    expect(response.ok).toHaveBeenCalledWith({ body: { kind: 'download' } });
    expect(response.customError).not.toHaveBeenCalled();
  });

  it('still returns 502 for other provisioner rejections', async () => {
    const error = new IacProvisionerRequestError(
      'request rejected with status 400, render.invalid_request: bad request',
      400,
      ['render.invalid_request']
    );
    mockedRender.mockRejectedValueOnce(error);

    await getBootstrapLaunchHandler({} as any, request as any, response);

    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 502,
      body: { message: error.message },
    });
    expect(response.ok).not.toHaveBeenCalled();
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

  it('returns 502 when the provider answers without a rendered artifact', async () => {
    mockedRender.mockResolvedValueOnce({
      render: false,
      blueprint: { id: 'bp', version: '1' },
    } as any);

    await getBootstrapLaunchHandler({} as any, request as any, response);

    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 502,
      body: { message: 'The IaC Provisioner did not render the bootstrap template' },
    });
    expect(response.ok).not.toHaveBeenCalled();
  });

  it('puts the region on the console url when one is given', async () => {
    mockedRender.mockResolvedValueOnce({
      render: true,
      artifactUrl: 'https://bucket/x?sig=1',
      expiresAt: '2026-11-16T12:00:00Z',
      templateSha: 'abc',
      blueprint: { id: 'bp', version: '1' },
    });

    await getBootstrapLaunchHandler(
      {} as any,
      httpServerMock.createKibanaRequest({
        query: { mode: 'fully-managed', region: 'eu-west-1' },
      }) as any,
      response
    );

    expect(response.ok).toHaveBeenCalledWith({
      body: expect.objectContaining({
        kind: 'quick_create',
        quickCreateUrl:
          'https://console.aws.amazon.com/cloudformation/home?region=eu-west-1#/stacks/quickcreate?templateURL=https%3A%2F%2Fbucket%2Fx%3Fsig%3D1&stackName=elastic-bootstrap-onboarding&param_ManagementMode=fully-managed',
      }),
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
        kind: 'quick_create',
        quickCreateUrl:
          'https://console.aws.amazon.com/cloudformation/home#/stacks/quickcreate?templateURL=https%3A%2F%2Fbucket%2Fx%3Fsig%3D1&stackName=elastic-bootstrap-onboarding&param_ManagementMode=partially-managed',
        expiresAt: '2026-11-16T12:00:00Z',
        blueprint: { id: 'bp', version: '1' },
      },
    });
  });
});

describe('getBootstrapTemplateHandler', () => {
  let response: ReturnType<typeof httpServerMock.createResponseFactory>;

  beforeEach(() => {
    jest.clearAllMocks();
    response = httpServerMock.createResponseFactory();
    jest.mocked(isAwsManagedOnboardingEnabled).mockResolvedValue(true);
  });

  it('returns 404 when managed onboarding is disabled', async () => {
    jest.mocked(isAwsManagedOnboardingEnabled).mockResolvedValue(false);
    const request = httpServerMock.createKibanaRequest({ query: { mode: 'fully-managed' } });

    await getBootstrapTemplateHandler({} as any, request as any, response);

    expect(response.notFound).toHaveBeenCalled();
    expect(response.ok).not.toHaveBeenCalled();
  });

  it('pre-sets the ManagementMode default to the requested mode', async () => {
    const request = httpServerMock.createKibanaRequest({ query: { mode: 'partially-managed' } });

    await getBootstrapTemplateHandler({} as any, request as any, response);

    expect(response.ok).toHaveBeenCalledWith({
      body: {
        filename: 'kibana-managed-onboarding-bootstrap.yml',
        template: 'Parameters:\n  ManagementMode:\n    Default: partially-managed\n',
      },
    });
  });
});

describe('getStackHandler', () => {
  const stackArn = 'arn:aws:cloudformation:us-east-1:123456789012:stack/elastic-onboarding-x/id';
  const request = httpServerMock.createKibanaRequest({ params: { stackId: stackArn } });
  let response: ReturnType<typeof httpServerMock.createResponseFactory>;

  beforeEach(() => {
    jest.clearAllMocks();
    response = httpServerMock.createResponseFactory();
    jest.mocked(isAwsManagedOnboardingEnabled).mockResolvedValue(true);
  });

  it("returns the stack's status and resources", async () => {
    const status = {
      status: 'in_progress' as const,
      stackStatus: 'CREATE_IN_PROGRESS',
      resources: [
        {
          logicalId: 'WiiOidcProviderFunctionRole',
          status: 'CREATE_COMPLETE',
          updatedAt: '2026-11-17T10:00:02.000Z',
        },
      ],
    };
    jest.mocked(awsOnboardingStackService.status).mockResolvedValue(status);

    await getStackHandler({} as any, request as any, response);

    expect(awsOnboardingStackService.status).toHaveBeenCalledWith(stackArn);
    expect(response.ok).toHaveBeenCalledWith({ body: status });
  });

  it('answers a stack that no longer exists with not_found instead of a 404', async () => {
    jest
      .mocked(awsOnboardingStackService.status)
      .mockResolvedValue({ status: 'not_found', resources: [] });

    await getStackHandler({} as any, request as any, response);

    expect(response.ok).toHaveBeenCalledWith({ body: { status: 'not_found', resources: [] } });
    expect(response.notFound).not.toHaveBeenCalled();
  });
});
