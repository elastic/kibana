/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';

import {
  IacProvisionerRenderError,
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
} from '../../services/telemetry/iac_provisioner_telemetry';

import { renderIacTemplateHandler } from './handlers';

jest.mock('../../services/app_context');
jest.mock('../../services', () => ({
  iacProvisionerService: { render: jest.fn() },
}));
jest.mock('../../services/epm/packages');
jest.mock('../../services/utils/iac_provisioner');
jest.mock('../../services/telemetry/iac_provisioner_telemetry');

const mockedRender = jest.mocked(iacProvisionerService.render);
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

// What the browser sends: the policy templates the user enabled, each carrying only the
// input types the user enabled under it.
const CSPM_SELECTION = {
  name: 'cloud_security_posture',
  policyTemplates: [{ name: 'cspm', enabledInputs: ['cloudbeat/cis_aws', 'cloudbeat/cis_gcp'] }],
};

const CAI_SELECTION = {
  name: 'cloud_asset_inventory',
  policyTemplates: [{ name: 'asset_inventory', enabledInputs: ['cloudbeat/asset_inventory_aws'] }],
};

describe('renderIacTemplateHandler', () => {
  let response: ReturnType<typeof httpServerMock.createResponseFactory>;

  beforeEach(() => {
    jest.clearAllMocks();
    response = httpServerMock.createResponseFactory();
    mockedIsEnabled.mockReturnValue(true);
    jest.spyOn(appContextService, 'getLogger').mockReturnValue(loggingSystemMock.createLogger());
  });

  it('returns 404 when the IaC Provisioner is not enabled', async () => {
    mockedIsEnabled.mockReturnValue(false);

    await renderIacTemplateHandler(
      buildContext(),
      buildRequest({
        provider: 'aws',
        flow: 'cloud_connector',
        integrations: [CSPM_SELECTION],
      }),
      response
    );

    expect(response.notFound).toHaveBeenCalled();
    expect(mockedRender).not.toHaveBeenCalled();
  });

  it('resolves the package version and forwards the inputs the user enabled', async () => {
    mockedGetPackageInfo.mockImplementation(
      async ({ pkgName }) =>
        (pkgName === 'cloud_security_posture' ? CSPM_PACKAGE_INFO : CAI_PACKAGE_INFO) as any
    );
    mockedRender.mockResolvedValue({
      artifactUrl: 'https://s3.example/rendered',
      expiresAt: '2026-07-28T12:00:00Z',
      templateSha: 'sha256:abc',
      render: true,
      blueprint: { id: 'aws-federated-identity', version: '1.2.0' },
    });

    await renderIacTemplateHandler(
      buildContext(),
      buildRequest({
        provider: 'aws',
        flow: 'cloud_connector',
        integrations: [CSPM_SELECTION, CAI_SELECTION],
      }),
      response
    );

    // mergeIntegrationSelections sorts packages in code-point order for stable output;
    // cloud_asset_inventory (a) sorts before cloud_security_posture (s).
    expect(mockedRender).toHaveBeenCalledWith({
      provider: 'aws',
      integrations: [
        {
          name: 'cloud_asset_inventory',
          version: '1.7.0',
          policyTemplates: [
            { name: 'asset_inventory', enabledInputs: ['cloudbeat/asset_inventory_aws'] },
          ],
        },
        {
          name: 'cloud_security_posture',
          version: '3.5.0',
          policyTemplates: [
            { name: 'cspm', enabledInputs: ['cloudbeat/cis_aws', 'cloudbeat/cis_gcp'] },
          ],
        },
      ],
    });
    // The provider's response is passed through unchanged, templateSha included.
    expect(response.ok).toHaveBeenCalledWith({
      body: {
        artifactUrl: 'https://s3.example/rendered',
        expiresAt: '2026-07-28T12:00:00Z',
        templateSha: 'sha256:abc',
        render: true,
        blueprint: { id: 'aws-federated-identity', version: '1.2.0' },
      },
    });
    // The browser is about to apply the template, so no stored digest is sent.
    expect(mockedRender.mock.calls[0][0]).not.toHaveProperty('templateSha');
    // Registry info covers everything the handler reads; without skipArchive
    // each request would download and unpack the full package archive.
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

  it('never sends a manifest input the user did not enable', async () => {
    mockedGetPackageInfo.mockResolvedValue(CSPM_PACKAGE_INFO as any);
    mockedRender.mockResolvedValue({
      artifactUrl: 'https://s3.example/rendered',
      expiresAt: '2026-07-28T12:00:00Z',
    });

    await renderIacTemplateHandler(
      buildContext(),
      buildRequest({
        provider: 'aws',
        flow: 'cloud_connector',
        integrations: [
          {
            name: 'cloud_security_posture',
            policyTemplates: [{ name: 'cspm', enabledInputs: ['cloudbeat/cis_aws'] }],
          },
        ],
      }),
      response
    );

    // The manifest also declares cloudbeat/cis_gcp. IaCP builds a blueprint patch from
    // every input it is given, so sending one the user did not enable over-grants
    // permissions. https://github.com/elastic/ingest-dev/issues/9415
    expect(mockedRender).toHaveBeenCalledWith({
      provider: 'aws',
      integrations: [
        {
          name: 'cloud_security_posture',
          version: '3.5.0',
          policyTemplates: [{ name: 'cspm', enabledInputs: ['cloudbeat/cis_aws'] }],
        },
      ],
    });
  });

  it('merges duplicate package entries in the request into one integration', async () => {
    mockedGetPackageInfo.mockResolvedValue({
      name: 'aws',
      version: '7.1.0',
      policy_templates: [
        { name: 'guardduty', inputs: [{ type: 'aws-s3' }, { type: 'aws-cloudwatch' }] },
        { name: 's3', inputs: [{ type: 'aws-s3' }] },
      ],
    } as any);
    mockedRender.mockResolvedValue({
      artifactUrl: 'https://s3.example/rendered',
      expiresAt: '2026-07-28T12:00:00Z',
    });

    // The provider contract forbids repeating a package name; the broker must
    // enforce that regardless of how the client shapes the request.
    await renderIacTemplateHandler(
      buildContext(),
      buildRequest({
        provider: 'aws',
        flow: 'cloud_connector',
        integrations: [
          {
            name: 'aws',
            policyTemplates: [{ name: 'guardduty', enabledInputs: ['aws-s3', 'aws-cloudwatch'] }],
          },
          { name: 'aws', policyTemplates: [{ name: 's3', enabledInputs: ['aws-s3'] }] },
        ],
      }),
      response
    );

    expect(mockedGetPackageInfo).toHaveBeenCalledTimes(1);
    expect(mockedRender).toHaveBeenCalledWith({
      provider: 'aws',
      integrations: [
        {
          name: 'aws',
          version: '7.1.0',
          policyTemplates: [
            { name: 'guardduty', enabledInputs: ['aws-cloudwatch', 'aws-s3'] },
            { name: 's3', enabledInputs: ['aws-s3'] },
          ],
        },
      ],
    });
  });

  it('returns 400 when the package declares none of the requested policy templates', async () => {
    // Nothing the caller asked for exists in this version of the package, so there is
    // nothing to render from.
    mockedGetPackageInfo.mockResolvedValue({
      name: 'cloud_security_posture',
      version: '3.5.0',
      policy_templates: [{ name: 'kspm', inputs: [{ type: 'cloudbeat/cis_k8s' }] }],
    } as any);

    await renderIacTemplateHandler(
      buildContext(),
      buildRequest({
        provider: 'aws',
        flow: 'cloud_connector',
        integrations: [CSPM_SELECTION],
      }),
      response
    );

    expect(response.badRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          message: expect.stringContaining('declares none of the requested policy templates'),
        }),
      })
    );
    expect(mockedRender).not.toHaveBeenCalled();
  });

  it('sends non-AWS input types too, leaving the match to the provider', async () => {
    // A package whose inputs name no cloud provider (cel/httpjson) must still be
    // sent: IaCP compares them with the manifest and answers
    // render.no_matching_inputs_for_policy_template itself.
    mockedGetPackageInfo.mockResolvedValue({
      name: 'some_saas',
      version: '1.0.0',
      policy_templates: [
        {
          name: 'logs',
          inputs: [
            { type: 'cel', title: '', description: '' },
            { type: 'httpjson', title: '', description: '' },
          ],
        },
      ],
    } as any);
    mockedRender.mockResolvedValue({
      artifactUrl: 'https://s3.example/rendered',
      expiresAt: '2026-07-28T12:00:00Z',
      templateSha: 'sha256:abc',
      render: true,
    });

    await renderIacTemplateHandler(
      buildContext(),
      buildRequest({
        provider: 'aws',
        flow: 'cloud_connector',
        integrations: [
          {
            name: 'some_saas',
            policyTemplates: [{ name: 'logs', enabledInputs: ['cel', 'httpjson'] }],
          },
        ],
      }),
      response
    );

    expect(mockedRender).toHaveBeenCalledWith({
      provider: 'aws',
      integrations: [
        {
          name: 'some_saas',
          version: '1.0.0',
          policyTemplates: [{ name: 'logs', enabledInputs: ['cel', 'httpjson'] }],
        },
      ],
    });
    expect(response.badRequest).not.toHaveBeenCalled();
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
    mockedRender.mockResolvedValue({
      artifactUrl: 'https://s3.example/rendered',
      expiresAt: '2026-07-28T12:00:00Z',
    });

    await renderIacTemplateHandler(
      buildContext(),
      buildRequest({
        provider: 'aws',
        flow: 'cloud_connector',
        integrations: [
          {
            name: 'aws',
            policyTemplates: [
              { name: 'guardduty', enabledInputs: ['aws-s3', 'aws-cloudwatch'] },
              { name: 's3', enabledInputs: ['aws-s3'] },
            ],
          },
        ],
      }),
      response
    );

    expect(mockedGetPackageInfo).toHaveBeenCalledTimes(1);
    expect(mockedRender).toHaveBeenCalledWith({
      provider: 'aws',
      integrations: [
        {
          name: 'aws',
          version: '7.1.0',
          // Per-template inputs; cloudtrail (not enabled by the user) excluded
          policyTemplates: [
            { name: 'guardduty', enabledInputs: ['aws-cloudwatch', 'aws-s3'] },
            { name: 's3', enabledInputs: ['aws-s3'] },
          ],
        },
      ],
    });
  });

  describe('multi-integration and multi-policy-template outbound shape', () => {
    const AWS_PACKAGE_INFO = {
      name: 'aws',
      version: '7.1.0',
      policy_templates: [
        { name: 'guardduty', inputs: [{ type: 'aws-s3' }, { type: 'aws-cloudwatch' }] },
        { name: 's3', inputs: [{ type: 'aws-s3' }] },
        { name: 'cloudtrail', inputs: [{ type: 'aws-cloudtrail' }] },
      ],
    };

    const GUARDDUTY_PACKAGE_INFO = {
      name: 'aws_guardduty',
      version: '2.0.0',
      policy_templates: [{ name: 'guardduty', inputs: [{ type: 'aws-s3' }] }],
    };

    it('sends multiple integrations each with their own nested policyTemplates', async () => {
      mockedGetPackageInfo.mockImplementation(async ({ pkgName }) => {
        if (pkgName === 'aws') {
          return AWS_PACKAGE_INFO as any;
        }
        if (pkgName === 'aws_guardduty') {
          return GUARDDUTY_PACKAGE_INFO as any;
        }
        return CSPM_PACKAGE_INFO as any;
      });
      mockedRender.mockResolvedValue({
        artifactUrl: 'https://s3.example/rendered',
        expiresAt: '2026-07-28T12:00:00Z',
      });

      await renderIacTemplateHandler(
        buildContext(),
        buildRequest({
          provider: 'aws',
          flow: 'cloud_connector',
          integrations: [
            {
              name: 'aws',
              policyTemplates: [{ name: 'guardduty', enabledInputs: ['aws-s3', 'aws-cloudwatch'] }],
            },
            {
              name: 'aws_guardduty',
              policyTemplates: [{ name: 'guardduty', enabledInputs: ['aws-s3'] }],
            },
            CSPM_SELECTION,
          ],
        }),
        response
      );

      expect(mockedGetPackageInfo).toHaveBeenCalledTimes(3);
      expect(mockedRender).toHaveBeenCalledWith({
        provider: 'aws',
        integrations: [
          {
            name: 'aws',
            version: '7.1.0',
            policyTemplates: [{ name: 'guardduty', enabledInputs: ['aws-cloudwatch', 'aws-s3'] }],
          },
          {
            name: 'aws_guardduty',
            version: '2.0.0',
            policyTemplates: [{ name: 'guardduty', enabledInputs: ['aws-s3'] }],
          },
          {
            name: 'cloud_security_posture',
            version: '3.5.0',
            policyTemplates: [
              { name: 'cspm', enabledInputs: ['cloudbeat/cis_aws', 'cloudbeat/cis_gcp'] },
            ],
          },
        ],
      });
      expect(reportIacProvisionerRenderRequested).toHaveBeenCalledWith(
        expect.objectContaining({ integrationCount: 3 })
      );
      expect(response.ok).toHaveBeenCalled();
    });

    it('keeps enabledInputs scoped per policy template (not flattened across templates)', async () => {
      mockedGetPackageInfo.mockResolvedValue(AWS_PACKAGE_INFO as any);
      mockedRender.mockResolvedValue({
        artifactUrl: 'https://s3.example/rendered',
        expiresAt: '2026-07-28T12:00:00Z',
      });

      await renderIacTemplateHandler(
        buildContext(),
        buildRequest({
          provider: 'aws',
          flow: 'cloud_connector',
          integrations: [
            {
              name: 'aws',
              policyTemplates: [
                { name: 'guardduty', enabledInputs: ['aws-s3', 'aws-cloudwatch'] },
                { name: 's3', enabledInputs: ['aws-s3'] },
                { name: 'cloudtrail', enabledInputs: ['aws-cloudtrail'] },
              ],
            },
          ],
        }),
        response
      );

      expect(mockedRender).toHaveBeenCalledWith({
        provider: 'aws',
        integrations: [
          {
            name: 'aws',
            version: '7.1.0',
            policyTemplates: [
              { name: 'cloudtrail', enabledInputs: ['aws-cloudtrail'] },
              { name: 'guardduty', enabledInputs: ['aws-cloudwatch', 'aws-s3'] },
              { name: 's3', enabledInputs: ['aws-s3'] },
            ],
          },
        ],
      });
    });

    it('combines multi-integration with multi-policy-template packages', async () => {
      mockedGetPackageInfo.mockImplementation(async ({ pkgName }) =>
        pkgName === 'aws' ? (AWS_PACKAGE_INFO as any) : (CSPM_PACKAGE_INFO as any)
      );
      mockedRender.mockResolvedValue({
        artifactUrl: 'https://s3.example/rendered',
        expiresAt: '2026-07-28T12:00:00Z',
      });

      await renderIacTemplateHandler(
        buildContext(),
        buildRequest({
          provider: 'aws',
          flow: 'cloud_connector',
          integrations: [
            {
              name: 'aws',
              policyTemplates: [
                { name: 'guardduty', enabledInputs: ['aws-s3', 'aws-cloudwatch'] },
                { name: 's3', enabledInputs: ['aws-s3'] },
              ],
            },
            CSPM_SELECTION,
          ],
        }),
        response
      );

      expect(mockedRender).toHaveBeenCalledWith({
        provider: 'aws',
        integrations: [
          {
            name: 'aws',
            version: '7.1.0',
            policyTemplates: [
              { name: 'guardduty', enabledInputs: ['aws-cloudwatch', 'aws-s3'] },
              { name: 's3', enabledInputs: ['aws-s3'] },
            ],
          },
          {
            name: 'cloud_security_posture',
            version: '3.5.0',
            policyTemplates: [
              { name: 'cspm', enabledInputs: ['cloudbeat/cis_aws', 'cloudbeat/cis_gcp'] },
            ],
          },
        ],
      });
      expect(reportIacProvisionerRenderRequested).toHaveBeenCalledWith(
        expect.objectContaining({ integrationCount: 2 })
      );
    });

    it('drops policy templates the manifest does not declare but keeps the rest', async () => {
      mockedGetPackageInfo.mockResolvedValue({
        name: 'mixed_package',
        version: '1.0.0',
        policy_templates: [
          {
            name: 'aws_tpl',
            inputs: [{ type: 'aws-s3', title: '', description: '' }],
          },
        ],
      } as any);
      mockedRender.mockResolvedValue({
        artifactUrl: 'https://s3.example/rendered',
        expiresAt: '2026-07-28T12:00:00Z',
      });

      await renderIacTemplateHandler(
        buildContext(),
        buildRequest({
          provider: 'aws',
          flow: 'cloud_connector',
          integrations: [
            {
              name: 'mixed_package',
              policyTemplates: [
                { name: 'aws_tpl', enabledInputs: ['aws-s3'] },
                // Not in this version of the package: dropped rather than passed on.
                { name: 'removed_tpl', enabledInputs: ['aws-s3'] },
              ],
            },
          ],
        }),
        response
      );

      expect(mockedRender).toHaveBeenCalledWith({
        provider: 'aws',
        integrations: [
          {
            name: 'mixed_package',
            version: '1.0.0',
            policyTemplates: [{ name: 'aws_tpl', enabledInputs: ['aws-s3'] }],
          },
        ],
      });
      expect(response.ok).toHaveBeenCalled();
    });

    it('returns 400 when one of several integrations has nothing renderable', async () => {
      mockedGetPackageInfo.mockImplementation(async ({ pkgName }) => {
        if (pkgName === 'inputless') {
          return {
            name: 'inputless',
            version: '1.0.0',
            policy_templates: [{ name: 'something_else', inputs: [] }],
          } as any;
        }
        return CSPM_PACKAGE_INFO as any;
      });

      await renderIacTemplateHandler(
        buildContext(),
        buildRequest({
          provider: 'aws',
          flow: 'cloud_connector',
          integrations: [
            CSPM_SELECTION,
            {
              name: 'inputless',
              policyTemplates: [{ name: 'cspm', enabledInputs: ['cloudbeat/cis_aws'] }],
            },
          ],
        }),
        response
      );

      expect(response.badRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            message: expect.stringContaining('inputless'),
          }),
        })
      );
      expect(mockedRender).not.toHaveBeenCalled();
    });
  });

  it('passes provider 4xx through with error codes so the client can fall back', async () => {
    mockedGetPackageInfo.mockResolvedValue(CSPM_PACKAGE_INFO as any);
    mockedRender.mockRejectedValue(
      new IacProvisionerRenderError('unrenderable', 422, ['render.blueprint_not_found'])
    );

    await renderIacTemplateHandler(
      buildContext(),
      buildRequest({
        provider: 'aws',
        flow: 'cloud_connector',
        integrations: [CSPM_SELECTION],
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
    expect(reportIacProvisionerRenderCompleted).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        httpStatus: 422,
        errorCodes: ['render.blueprint_not_found'],
      })
    );
  });

  it('maps non-422 provider 4xx to 502 so auth-like statuses never reach the browser', async () => {
    mockedGetPackageInfo.mockResolvedValue(CSPM_PACKAGE_INFO as any);
    mockedRender.mockRejectedValue(new IacProvisionerRenderError('mTLS rejected', 401, []));

    await renderIacTemplateHandler(
      buildContext(),
      buildRequest({
        provider: 'aws',
        flow: 'cloud_connector',
        integrations: [CSPM_SELECTION],
      }),
      response
    );

    // A provider 401/403 surfacing verbatim from an internal Kibana route
    // could trip the browser's session-expiry handling.
    expect(response.customError).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 502 }));
    // Telemetry keeps the provider's real status.
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
      buildRequest({
        provider: 'aws',
        flow: 'cloud_connector',
        integrations: [
          {
            name: 'no_such_package',
            policyTemplates: [{ name: 'whatever', enabledInputs: ['x'] }],
          },
        ],
      }),
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
    mockedRender.mockRejectedValue(new IacProvisionerUnavailableError('no response'));

    await renderIacTemplateHandler(
      buildContext(),
      buildRequest({
        provider: 'aws',
        flow: 'cloud_connector',
        integrations: [CSPM_SELECTION],
      }),
      response
    );

    expect(response.customError).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 502 }));
    expect(reportIacProvisionerRenderCompleted).toHaveBeenCalledWith(
      expect.objectContaining({ success: false })
    );
  });

  it('maps unexpected errors to 500 with an error log', async () => {
    mockedGetPackageInfo.mockResolvedValue(CSPM_PACKAGE_INFO as any);
    mockedRender.mockRejectedValue(new Error('unexpected boom'));

    await renderIacTemplateHandler(
      buildContext(),
      buildRequest({
        provider: 'aws',
        flow: 'cloud_connector',
        integrations: [CSPM_SELECTION],
      }),
      response
    );

    // The client gets a stable, generic message — the raw error (which may
    // carry internal details) stays in the server log only.
    expect(response.customError).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        body: expect.objectContaining({
          message: 'An unexpected error occurred while rendering the IaC template',
        }),
      })
    );
    expect(response.customError).not.toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({ message: expect.stringContaining('unexpected boom') }),
      })
    );
    expect(appContextService.getLogger().get().error).toHaveBeenCalledWith(
      expect.stringContaining('unexpected boom')
    );
    expect(reportIacProvisionerRenderCompleted).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, httpStatus: 500 })
    );
  });
});
