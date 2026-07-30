/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';

import {
  IacProviderRenderError,
  IacProviderUnavailableError,
  PackageNotFoundError,
} from '../../errors';
import { appContextService } from '../../services/app_context';
import { iacProviderService } from '../../services';
import { getPackageInfo } from '../../services/epm/packages';
import { isIacProviderEnabled } from '../../services/utils/iac_provider';
import {
  reportIacProviderRenderCompleted,
  reportIacProviderRenderRequested,
} from '../../services/telemetry/iac_provider_telemetry';

import { renderIacTemplateHandler } from './handlers';

jest.mock('../../services/app_context');
jest.mock('../../services', () => ({
  iacProviderService: { renderTemplate: jest.fn() },
}));
jest.mock('../../services/epm/packages');
jest.mock('../../services/utils/iac_provider');
jest.mock('../../services/telemetry/iac_provider_telemetry');

const mockedRenderTemplate = jest.mocked(iacProviderService.renderTemplate);
const mockedGetPackageInfo = jest.mocked(getPackageInfo);
const mockedIsEnabled = jest.mocked(isIacProviderEnabled);

const buildContext = () =>
  ({
    fleet: Promise.resolve({ internalSoClient: {} }),
  } as any);

const buildRequest = (body: Record<string, unknown>) =>
  httpServerMock.createKibanaRequest({ body });

const CSPM_PACKAGE_INFO = {
  name: 'cloud_security_posture',
  version: '3.5.0',
  policy_templates: [
    {
      name: 'cspm',
      inputs: [
        { type: 'cloudbeat/cis_aws', title: '', description: '' },
        { type: 'cloudbeat/cis_gcp', title: '', description: '' },
      ],
    },
  ],
};

const CAI_PACKAGE_INFO = {
  name: 'cloud_asset_inventory',
  version: '1.7.0',
  policy_templates: [
    {
      name: 'asset_inventory',
      inputs: [{ type: 'cloudbeat/asset_inventory_aws', title: '', description: '' }],
    },
  ],
};

describe('renderIacTemplateHandler', () => {
  let response: ReturnType<typeof httpServerMock.createResponseFactory>;

  beforeEach(() => {
    jest.clearAllMocks();
    response = httpServerMock.createResponseFactory();
    mockedIsEnabled.mockReturnValue(true);
    const logger = { info: jest.fn(), error: jest.fn(), get: jest.fn() };
    logger.get.mockReturnValue(logger);
    jest.spyOn(appContextService, 'getLogger').mockReturnValue(logger as any);
  });

  it('returns 404 when the IaC Provider is not enabled', async () => {
    mockedIsEnabled.mockReturnValue(false);

    await renderIacTemplateHandler(
      buildContext(),
      buildRequest({
        provider: 'aws',
        flow: 'cloud_connector',
        integrations: [{ name: 'cloud_security_posture', policyTemplates: ['cspm'] }],
      }),
      response
    );

    expect(response.notFound).toHaveBeenCalled();
    expect(mockedRenderTemplate).not.toHaveBeenCalled();
  });

  it('resolves version and provider-relevant inputs for each requested integration', async () => {
    mockedGetPackageInfo.mockImplementation(
      async ({ pkgName }) =>
        (pkgName === 'cloud_security_posture' ? CSPM_PACKAGE_INFO : CAI_PACKAGE_INFO) as any
    );
    mockedRenderTemplate.mockResolvedValue({
      artifactUrl: 'https://s3.example/rendered',
      expiresAt: '2026-07-28T12:00:00Z',
    });

    await renderIacTemplateHandler(
      buildContext(),
      buildRequest({
        provider: 'aws',
        flow: 'cloud_connector',
        integrations: [
          { name: 'cloud_security_posture', policyTemplates: ['cspm'] },
          { name: 'cloud_asset_inventory', policyTemplates: ['asset_inventory'] },
        ],
      }),
      response
    );

    expect(mockedRenderTemplate).toHaveBeenCalledWith({
      provider: 'aws',
      integrations: [
        {
          name: 'cloud_security_posture',
          version: '3.5.0',
          // cis_gcp filtered out — not an aws input
          enabledInputs: ['cloudbeat/cis_aws'],
        },
        {
          name: 'cloud_asset_inventory',
          version: '1.7.0',
          enabledInputs: ['cloudbeat/asset_inventory_aws'],
        },
      ],
    });
    expect(response.ok).toHaveBeenCalledWith({
      body: { artifactUrl: 'https://s3.example/rendered', expiresAt: '2026-07-28T12:00:00Z' },
    });
    expect(reportIacProviderRenderRequested).toHaveBeenCalledWith(
      expect.objectContaining({ flow: 'cloud_connector', integrationCount: 2 })
    );
    expect(reportIacProviderRenderCompleted).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, httpStatus: 200 })
    );
  });

  it('merges multiple policyTemplates for the same package into one integration', async () => {
    mockedGetPackageInfo.mockResolvedValue({
      name: 'aws',
      version: '7.1.0',
      policy_templates: [
        { name: 'guardduty', inputs: [{ type: 'aws-s3' }, { type: 'aws-cloudwatch' }] },
        { name: 's3', inputs: [{ type: 'aws-s3' }] },
        { name: 'cloudtrail', inputs: [{ type: 'aws-cloudtrail' }] },
      ],
    } as any);
    mockedRenderTemplate.mockResolvedValue({
      artifactUrl: 'https://s3.example/rendered',
      expiresAt: '2026-07-28T12:00:00Z',
    });

    await renderIacTemplateHandler(
      buildContext(),
      buildRequest({
        provider: 'aws',
        flow: 'cloud_connector',
        integrations: [{ name: 'aws', policyTemplates: ['guardduty', 's3'] }],
      }),
      response
    );

    expect(mockedGetPackageInfo).toHaveBeenCalledTimes(1);
    expect(mockedRenderTemplate).toHaveBeenCalledWith({
      provider: 'aws',
      integrations: [
        {
          name: 'aws',
          version: '7.1.0',
          // guardduty + s3 inputs, deduplicated; cloudtrail (not requested) excluded
          enabledInputs: ['aws-s3', 'aws-cloudwatch'],
        },
      ],
    });
  });

  it('passes provider 4xx through with error codes so the client can fall back', async () => {
    mockedGetPackageInfo.mockResolvedValue(CSPM_PACKAGE_INFO as any);
    mockedRenderTemplate.mockRejectedValue(
      new IacProviderRenderError('unrenderable', 422, ['render.blueprint_not_found'])
    );

    await renderIacTemplateHandler(
      buildContext(),
      buildRequest({
        provider: 'aws',
        flow: 'cloud_connector',
        integrations: [{ name: 'cloud_security_posture', policyTemplates: ['cspm'] }],
      }),
      response
    );

    expect(response.customError).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 422,
        body: expect.objectContaining({
          attributes: { errorCodes: ['render.blueprint_not_found'] },
        }),
      })
    );
    expect(reportIacProviderRenderCompleted).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        httpStatus: 422,
        errorCodes: ['render.blueprint_not_found'],
      })
    );
  });

  it('returns 404 without an error log when a requested package does not exist', async () => {
    mockedGetPackageInfo.mockRejectedValue(
      new PackageNotFoundError('[no_such_package] package not installed or found in registry')
    );

    await renderIacTemplateHandler(
      buildContext(),
      buildRequest({
        provider: 'aws',
        flow: 'cloud_connector',
        integrations: [{ name: 'no_such_package', policyTemplates: ['whatever'] }],
      }),
      response
    );

    expect(response.notFound).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({ message: expect.stringContaining('no_such_package') }),
      })
    );
    expect(appContextService.getLogger().get().error).not.toHaveBeenCalled();
    expect(reportIacProviderRenderCompleted).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, httpStatus: 404 })
    );
  });

  it('maps provider unavailability to 502', async () => {
    mockedGetPackageInfo.mockResolvedValue(CSPM_PACKAGE_INFO as any);
    mockedRenderTemplate.mockRejectedValue(new IacProviderUnavailableError('no response'));

    await renderIacTemplateHandler(
      buildContext(),
      buildRequest({
        provider: 'aws',
        flow: 'cloud_connector',
        integrations: [{ name: 'cloud_security_posture', policyTemplates: ['cspm'] }],
      }),
      response
    );

    expect(response.customError).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 502 }));
    expect(reportIacProviderRenderCompleted).toHaveBeenCalledWith(
      expect.objectContaining({ success: false })
    );
  });
});
