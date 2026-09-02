/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';

import {
  IacProvisionerRequestError,
  IacProvisionerUnavailableError,
  PackageNotFoundError,
} from '../../errors';
import { appContextService } from '../../services/app_context';
import { iacProvisionerService } from '../../services';
import { getPackageInfo } from '../../services/epm/packages';
import { isIacProvisionerEnabled } from '../../services/utils/iac_provisioner';
import {
  reportIacProvisionerRenderCompleted,
  reportIacProvisionerRenderRequested,
  reportIacProvisionerResolveCompleted,
  reportIacProvisionerResolveRequested,
} from '../../services/telemetry/iac_provisioner_telemetry';

import { renderIacTemplateHandler, resolveIacBlueprintsHandler } from './handlers';

jest.mock('../../services/app_context');
jest.mock('../../services', () => ({
  iacProvisionerService: { renderTemplate: jest.fn(), resolveBlueprints: jest.fn() },
}));
jest.mock('../../services/epm/packages');
jest.mock('../../services/utils/iac_provisioner');
jest.mock('../../services/telemetry/iac_provisioner_telemetry');

const mockedRenderTemplate = jest.mocked(iacProvisionerService.renderTemplate);
const mockedResolveBlueprints = jest.mocked(iacProvisionerService.resolveBlueprints);
const mockedGetPackageInfo = jest.mocked(getPackageInfo);
const mockedIsEnabled = jest.mocked(isIacProvisionerEnabled);

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

const RENDERED = {
  artifactUrl: 'https://s3.example/rendered',
  expiresAt: '2026-07-28T12:00:00Z',
  blueprint: { id: 'federated-identity', version: 'v1' },
};

const cspmSelection = {
  name: 'cloud_security_posture',
  policyTemplates: [{ name: 'cspm', enabledInputs: ['cloudbeat/cis_aws'] }],
};

const renderBody = (overrides: Record<string, unknown> = {}) => ({
  provider: 'aws',
  flow: 'cloud_connector',
  blueprintId: 'federated-identity',
  integrations: [cspmSelection],
  ...overrides,
});

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

  it('returns 404 when the IaC Provisioner is not enabled', async () => {
    mockedIsEnabled.mockReturnValue(false);

    await renderIacTemplateHandler(buildContext(), buildRequest(renderBody()), response);

    expect(response.notFound).toHaveBeenCalled();
    expect(mockedRenderTemplate).not.toHaveBeenCalled();
  });

  it('passes caller-supplied enabledInputs through and fills the package version', async () => {
    mockedGetPackageInfo.mockImplementation(
      async ({ pkgName }) =>
        (pkgName === 'cloud_security_posture' ? CSPM_PACKAGE_INFO : CAI_PACKAGE_INFO) as any
    );
    mockedRenderTemplate.mockResolvedValue(RENDERED);

    await renderIacTemplateHandler(
      buildContext(),
      buildRequest(
        renderBody({
          integrations: [
            cspmSelection,
            {
              name: 'cloud_asset_inventory',
              policyTemplates: [
                { name: 'asset_inventory', enabledInputs: ['cloudbeat/asset_inventory_aws'] },
              ],
            },
          ],
        })
      ),
      response
    );

    expect(mockedRenderTemplate).toHaveBeenCalledWith({
      provider: 'aws',
      blueprintId: 'federated-identity',
      integrations: [
        {
          name: 'cloud_security_posture',
          version: '3.5.0',
          policyTemplates: [{ name: 'cspm', enabledInputs: ['cloudbeat/cis_aws'] }],
        },
        {
          name: 'cloud_asset_inventory',
          version: '1.7.0',
          policyTemplates: [
            { name: 'asset_inventory', enabledInputs: ['cloudbeat/asset_inventory_aws'] },
          ],
        },
      ],
    });
    expect(response.ok).toHaveBeenCalledWith({ body: RENDERED });
    expect(mockedGetPackageInfo).toHaveBeenCalledWith(
      expect.objectContaining({ skipArchive: true })
    );
    expect(reportIacProvisionerRenderRequested).toHaveBeenCalledWith(
      expect.objectContaining({ flow: 'cloud_connector', integrationCount: 2 })
    );
    expect(reportIacProvisionerRenderCompleted).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, httpStatus: 200 })
    );
  });

  it('does not invent inputs the caller did not enable', async () => {
    mockedGetPackageInfo.mockResolvedValue(CSPM_PACKAGE_INFO as any);
    mockedRenderTemplate.mockResolvedValue(RENDERED);

    await renderIacTemplateHandler(buildContext(), buildRequest(renderBody()), response);

    expect(mockedRenderTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        integrations: [
          expect.objectContaining({
            policyTemplates: [{ name: 'cspm', enabledInputs: ['cloudbeat/cis_aws'] }],
          }),
        ],
      })
    );
  });

  it('forwards userParams when the caller supplies them', async () => {
    mockedGetPackageInfo.mockResolvedValue(CSPM_PACKAGE_INFO as any);
    mockedRenderTemplate.mockResolvedValue(RENDERED);

    await renderIacTemplateHandler(
      buildContext(),
      buildRequest(renderBody({ userParams: { ElasticResourceId: 'abc' } })),
      response
    );

    expect(mockedRenderTemplate).toHaveBeenCalledWith(
      expect.objectContaining({ userParams: { ElasticResourceId: 'abc' } })
    );
  });

  it('merges duplicate package entries and unions enabledInputs per policy template', async () => {
    mockedGetPackageInfo.mockResolvedValue({
      name: 'aws',
      version: '7.1.0',
      policy_templates: [
        { name: 'guardduty', inputs: [{ type: 'aws-s3' }, { type: 'aws-cloudwatch' }] },
        { name: 's3', inputs: [{ type: 'aws-s3' }] },
      ],
    } as any);
    mockedRenderTemplate.mockResolvedValue(RENDERED);

    await renderIacTemplateHandler(
      buildContext(),
      buildRequest(
        renderBody({
          integrations: [
            { name: 'aws', policyTemplates: [{ name: 'guardduty', enabledInputs: ['aws-s3'] }] },
            {
              name: 'aws',
              policyTemplates: [
                { name: 's3', enabledInputs: ['aws-s3'] },
                { name: 'guardduty', enabledInputs: ['aws-cloudwatch'] },
              ],
            },
          ],
        })
      ),
      response
    );

    expect(mockedGetPackageInfo).toHaveBeenCalledTimes(1);
    expect(mockedRenderTemplate).toHaveBeenCalledWith({
      provider: 'aws',
      blueprintId: 'federated-identity',
      integrations: [
        {
          name: 'aws',
          version: '7.1.0',
          policyTemplates: [
            { name: 'guardduty', enabledInputs: ['aws-s3', 'aws-cloudwatch'] },
            { name: 's3', enabledInputs: ['aws-s3'] },
          ],
        },
      ],
    });
  });

  it('returns 400 when a requested policy template is not on the package', async () => {
    mockedGetPackageInfo.mockResolvedValue(CSPM_PACKAGE_INFO as any);

    await renderIacTemplateHandler(
      buildContext(),
      buildRequest(
        renderBody({
          integrations: [
            {
              name: 'cloud_security_posture',
              policyTemplates: [{ name: 'kspm', enabledInputs: ['cloudbeat/cis_k8s'] }],
            },
          ],
        })
      ),
      response
    );

    expect(response.badRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          message: expect.stringContaining('kspm'),
        }),
      })
    );
    expect(mockedRenderTemplate).not.toHaveBeenCalled();
  });

  it('returns 400 when an enabled input is not declared on the policy template', async () => {
    mockedGetPackageInfo.mockResolvedValue(CSPM_PACKAGE_INFO as any);

    await renderIacTemplateHandler(
      buildContext(),
      buildRequest(
        renderBody({
          integrations: [
            {
              name: 'cloud_security_posture',
              policyTemplates: [{ name: 'cspm', enabledInputs: ['cloudbeat/cis_azure'] }],
            },
          ],
        })
      ),
      response
    );

    expect(response.badRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          message: expect.stringContaining('cloudbeat/cis_azure'),
        }),
      })
    );
    expect(mockedRenderTemplate).not.toHaveBeenCalled();
  });

  it('sends multiple integrations each with their own nested policyTemplates', async () => {
    mockedGetPackageInfo.mockImplementation(async ({ pkgName }) => {
      if (pkgName === 'aws') {
        return {
          name: 'aws',
          version: '7.1.0',
          policy_templates: [
            { name: 'guardduty', inputs: [{ type: 'aws-s3' }, { type: 'aws-cloudwatch' }] },
          ],
        } as any;
      }
      if (pkgName === 'aws_guardduty') {
        return {
          name: 'aws_guardduty',
          version: '2.0.0',
          policy_templates: [{ name: 'guardduty', inputs: [{ type: 'aws-s3' }] }],
        } as any;
      }
      return CSPM_PACKAGE_INFO as any;
    });
    mockedRenderTemplate.mockResolvedValue(RENDERED);

    await renderIacTemplateHandler(
      buildContext(),
      buildRequest(
        renderBody({
          integrations: [
            { name: 'aws', policyTemplates: [{ name: 'guardduty', enabledInputs: ['aws-s3'] }] },
            {
              name: 'aws_guardduty',
              policyTemplates: [{ name: 'guardduty', enabledInputs: ['aws-s3'] }],
            },
            cspmSelection,
          ],
        })
      ),
      response
    );

    expect(mockedGetPackageInfo).toHaveBeenCalledTimes(3);
    expect(mockedRenderTemplate).toHaveBeenCalledWith({
      provider: 'aws',
      blueprintId: 'federated-identity',
      integrations: [
        {
          name: 'aws',
          version: '7.1.0',
          policyTemplates: [{ name: 'guardduty', enabledInputs: ['aws-s3'] }],
        },
        {
          name: 'aws_guardduty',
          version: '2.0.0',
          policyTemplates: [{ name: 'guardduty', enabledInputs: ['aws-s3'] }],
        },
        {
          name: 'cloud_security_posture',
          version: '3.5.0',
          policyTemplates: [{ name: 'cspm', enabledInputs: ['cloudbeat/cis_aws'] }],
        },
      ],
    });
    expect(response.ok).toHaveBeenCalled();
  });

  it('passes provider 4xx through with error codes so the client can fall back', async () => {
    mockedGetPackageInfo.mockResolvedValue(CSPM_PACKAGE_INFO as any);
    mockedRenderTemplate.mockRejectedValue(
      new IacProvisionerRequestError('unrenderable', 422, ['render.unknown_blueprint'])
    );

    await renderIacTemplateHandler(buildContext(), buildRequest(renderBody()), response);

    expect(response.customError).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 422,
        body: expect.objectContaining({
          attributes: { errorCodes: ['render.unknown_blueprint'] },
        }),
      })
    );
    expect(reportIacProvisionerRenderCompleted).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        httpStatus: 422,
        errorCodes: ['render.unknown_blueprint'],
      })
    );
  });

  it('maps non-422 provider 4xx to 502 so auth-like statuses never reach the browser', async () => {
    mockedGetPackageInfo.mockResolvedValue(CSPM_PACKAGE_INFO as any);
    mockedRenderTemplate.mockRejectedValue(
      new IacProvisionerRequestError('mTLS rejected', 401, [])
    );

    await renderIacTemplateHandler(buildContext(), buildRequest(renderBody()), response);

    expect(response.customError).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 502 }));
    expect(reportIacProvisionerRenderCompleted).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, httpStatus: 401 })
    );
  });

  it('returns 404 without an error log when a requested package does not exist', async () => {
    mockedGetPackageInfo.mockRejectedValue(
      new PackageNotFoundError('[no_such_package] package not installed or found in registry')
    );

    await renderIacTemplateHandler(
      buildContext(),
      buildRequest(
        renderBody({
          integrations: [
            {
              name: 'no_such_package',
              policyTemplates: [{ name: 'whatever', enabledInputs: ['x'] }],
            },
          ],
        })
      ),
      response
    );

    expect(response.notFound).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({ message: expect.stringContaining('no_such_package') }),
      })
    );
    expect(appContextService.getLogger().get().error).not.toHaveBeenCalled();
    expect(reportIacProvisionerRenderCompleted).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, httpStatus: 404 })
    );
  });

  it('maps provider unavailability to 502', async () => {
    mockedGetPackageInfo.mockResolvedValue(CSPM_PACKAGE_INFO as any);
    mockedRenderTemplate.mockRejectedValue(new IacProvisionerUnavailableError('no response'));

    await renderIacTemplateHandler(buildContext(), buildRequest(renderBody()), response);

    expect(response.customError).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 502 }));
    expect(reportIacProvisionerRenderCompleted).toHaveBeenCalledWith(
      expect.objectContaining({ success: false })
    );
  });

  it('maps unexpected errors to 500 with an error log', async () => {
    mockedGetPackageInfo.mockResolvedValue(CSPM_PACKAGE_INFO as any);
    mockedRenderTemplate.mockRejectedValue(new Error('unexpected boom'));

    await renderIacTemplateHandler(buildContext(), buildRequest(renderBody()), response);

    expect(response.customError).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        body: expect.objectContaining({
          message: 'An unexpected error occurred while rendering the IaC template',
        }),
      })
    );
    expect(appContextService.getLogger().get().error).toHaveBeenCalledWith(
      expect.stringContaining('unexpected boom')
    );
  });
});

describe('resolveIacBlueprintsHandler', () => {
  let response: ReturnType<typeof httpServerMock.createResponseFactory>;

  const resolveBody = (overrides: Record<string, unknown> = {}) => ({
    provider: 'aws',
    flow: 'cloud_connector',
    integrations: [cspmSelection],
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    response = httpServerMock.createResponseFactory();
    mockedIsEnabled.mockReturnValue(true);
    const logger = { info: jest.fn(), error: jest.fn(), get: jest.fn() };
    logger.get.mockReturnValue(logger);
    jest.spyOn(appContextService, 'getLogger').mockReturnValue(logger as any);
  });

  it('returns 404 when the IaC Provisioner is not enabled', async () => {
    mockedIsEnabled.mockReturnValue(false);

    await resolveIacBlueprintsHandler(buildContext(), buildRequest(resolveBody()), response);

    expect(response.notFound).toHaveBeenCalled();
    expect(mockedResolveBlueprints).not.toHaveBeenCalled();
  });

  it('forwards caller-supplied inputs and returns blueprint coverage', async () => {
    mockedGetPackageInfo.mockResolvedValue(CSPM_PACKAGE_INFO as any);
    mockedResolveBlueprints.mockResolvedValue({
      blueprints: [
        {
          id: 'federated-identity',
          resolvedVersion: 'v1',
          deployable: true,
          notCovered: [],
        },
      ],
    });

    await resolveIacBlueprintsHandler(buildContext(), buildRequest(resolveBody()), response);

    expect(mockedResolveBlueprints).toHaveBeenCalledWith({
      provider: 'aws',
      integrations: [
        {
          name: 'cloud_security_posture',
          version: '3.5.0',
          policyTemplates: [{ name: 'cspm', enabledInputs: ['cloudbeat/cis_aws'] }],
        },
      ],
    });
    expect(response.ok).toHaveBeenCalledWith({
      body: {
        blueprints: [
          {
            id: 'federated-identity',
            resolvedVersion: 'v1',
            deployable: true,
            notCovered: [],
          },
        ],
      },
    });
    expect(reportIacProvisionerResolveRequested).toHaveBeenCalledWith(
      expect.objectContaining({ flow: 'cloud_connector', integrationCount: 1 })
    );
    expect(reportIacProvisionerResolveCompleted).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        httpStatus: 200,
        blueprintCount: 1,
        deployableCount: 1,
      })
    );
  });

  it('maps a 501 from the provisioner to an empty not-deployable result', async () => {
    mockedGetPackageInfo.mockResolvedValue(CSPM_PACKAGE_INFO as any);
    mockedResolveBlueprints.mockRejectedValue(
      new IacProvisionerUnavailableError('not implemented', 501)
    );

    await resolveIacBlueprintsHandler(buildContext(), buildRequest(resolveBody()), response);

    expect(response.ok).toHaveBeenCalledWith({ body: { blueprints: [] } });
    expect(reportIacProvisionerResolveCompleted).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, httpStatus: 501, blueprintCount: 0 })
    );
  });

  it('maps other unavailability to 502', async () => {
    mockedGetPackageInfo.mockResolvedValue(CSPM_PACKAGE_INFO as any);
    mockedResolveBlueprints.mockRejectedValue(new IacProvisionerUnavailableError('timeout', 504));

    await resolveIacBlueprintsHandler(buildContext(), buildRequest(resolveBody()), response);

    expect(response.customError).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 502 }));
  });
});
