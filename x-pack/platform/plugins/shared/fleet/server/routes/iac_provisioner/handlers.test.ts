/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { AuthenticatedUser } from '@kbn/core/server';

import {
  IacProvisionerRequestError,
  IacProvisionerUnavailableError,
  PackageNotFoundError,
} from '../../errors';
import { appContextService } from '../../services/app_context';
import { iacProvisionerService } from '../../services';
import { provisioningCallbackService } from '../../services/provisioning_callback';
import { getPackageInfo } from '../../services/epm/packages';
import { isIacProvisionerEnabled } from '../../services/utils/iac_provisioner';
import { isAwsIdentityFederationEnabled } from '../../services/utils/aws_identity_federation';
import { getProvisioningCallbackAvailability } from '../../services/utils/provisioning_callback_availability';
import { deployProvisioningCallback } from '../../services/provisioning_callback_deploy';
import { IAC_FEDERATED_IDENTITY_WORKFLOW } from '../../../common/types/rest_spec/iac_provisioner';
import { PROVISIONING_CALLBACK_TOKEN_HEADER } from '../../../common/constants';
import type { CloudConnectorCallback } from '../../../common/types/models/provisioning_callback';
import {
  reportIacProvisionerRenderCompleted,
  reportIacProvisionerRenderRequested,
} from '../../services/telemetry/iac_provisioner_telemetry';

import {
  createProvisioningCallbackHandler,
  getProvisioningCallbackAvailabilityHandler,
  deleteProvisioningCallbackHandler,
  getProvisioningCallbackHandler,
  receiveProvisioningCallbackHandler,
  renderIacTemplateHandler,
} from './handlers';

jest.mock('../../services/app_context');
jest.mock('../../services', () => ({
  iacProvisionerService: { renderTemplate: jest.fn() },
}));
jest.mock('../../services/epm/packages');
jest.mock('../../services/utils/iac_provisioner');
jest.mock('../../services/utils/aws_identity_federation');
jest.mock('../../services/utils/provisioning_callback_availability');
jest.mock('../../services/telemetry/iac_provisioner_telemetry');
jest.mock('../../services/provisioning_callback_deploy');
jest.mock('../../services/provisioning_callback', () => ({
  provisioningCallbackService: {
    create: jest.fn(),
    get: jest.fn(),
    cancel: jest.fn(),
    receive: jest.fn(),
  },
}));

const mockedRenderTemplate = jest.mocked(iacProvisionerService.renderTemplate);
const mockedGetPackageInfo = jest.mocked(getPackageInfo);
const mockedIsEnabled = jest.mocked(isIacProvisionerEnabled);
const mockedIsAwsIdentityFederationEnabled = jest.mocked(isAwsIdentityFederationEnabled);
const mockedGetAvailability = jest.mocked(getProvisioningCallbackAvailability);
const mockedDeploy = jest.mocked(deployProvisioningCallback);

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
  templateSha: 'sha256:661cb7def1c7101f',
  render: true,
  blueprint: { id: 'federated-identity', version: 'v1' },
};

const cspmSelection = {
  name: 'cloud_security_posture',
  policyTemplates: [{ name: 'cspm', enabledInputs: ['cloudbeat/cis_aws'] }],
};

const renderBody = (overrides: Record<string, unknown> = {}) => ({
  provider: 'aws',
  flow: 'cloud_connector',
  workflow: IAC_FEDERATED_IDENTITY_WORKFLOW,
  integrations: [cspmSelection],
  ...overrides,
});

describe('renderIacTemplateHandler', () => {
  let response: ReturnType<typeof httpServerMock.createResponseFactory>;

  beforeEach(() => {
    jest.clearAllMocks();
    response = httpServerMock.createResponseFactory();
    mockedIsEnabled.mockResolvedValue(true);
    const logger = { info: jest.fn(), error: jest.fn(), get: jest.fn() };
    logger.get.mockReturnValue(logger);
    jest.spyOn(appContextService, 'getLogger').mockReturnValue(logger as any);
  });

  it('returns 404 when the IaC Provisioner is not enabled', async () => {
    mockedIsEnabled.mockResolvedValue(false);

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
      workflow: IAC_FEDERATED_IDENTITY_WORKFLOW,
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

  it('forwards templateSha when the caller supplies it', async () => {
    mockedGetPackageInfo.mockResolvedValue(CSPM_PACKAGE_INFO as any);
    mockedRenderTemplate.mockResolvedValue(RENDERED);

    await renderIacTemplateHandler(
      buildContext(),
      buildRequest(renderBody({ templateSha: 'sha256:661cb7def1c7101f' })),
      response
    );

    expect(mockedRenderTemplate).toHaveBeenCalledWith(
      expect.objectContaining({ templateSha: 'sha256:661cb7def1c7101f' })
    );
  });

  it('omits templateSha when the caller does not supply it', async () => {
    mockedGetPackageInfo.mockResolvedValue(CSPM_PACKAGE_INFO as any);
    mockedRenderTemplate.mockResolvedValue(RENDERED);

    await renderIacTemplateHandler(buildContext(), buildRequest(renderBody()), response);

    expect(mockedRenderTemplate).toHaveBeenCalledWith(
      expect.not.objectContaining({ templateSha: expect.anything() })
    );
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
      workflow: IAC_FEDERATED_IDENTITY_WORKFLOW,
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
    expect(response.customError).not.toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          message: expect.stringContaining('unexpected boom'),
        }),
      })
    );
    expect(reportIacProvisionerRenderCompleted).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, httpStatus: 500 })
    );
  });

  it('returns a render:false body without requiring artifactUrl or expiresAt', async () => {
    mockedGetPackageInfo.mockResolvedValue(CSPM_PACKAGE_INFO as any);
    const alreadyCurrent = {
      templateSha: 'sha256:661cb7def1c7101f',
      render: false,
      blueprint: { id: 'federated-identity', version: 'v1' },
    };
    mockedRenderTemplate.mockResolvedValue(alreadyCurrent);

    await renderIacTemplateHandler(buildContext(), buildRequest(renderBody()), response);

    expect(response.ok).toHaveBeenCalledWith({ body: alreadyCurrent });
  });
});

const mockedService = jest.mocked(provisioningCallbackService);
const mockedAppContext = jest.mocked(appContextService);

const PAYLOAD = {
  role_arn: 'arn:aws:iam::123456789012:role/ElasticWorkloadIdentity-abc',
  stack_arn: 'arn:aws:cloudformation:us-east-1:123456789012:stack/elastic/uuid-1',
};

const ITEM: CloudConnectorCallback = {
  id: 'cb-1',
  provider: 'aws',
  status: 'pending',
  created_at: '2026-10-13T10:00:00.000Z',
  created_by: 'elastic',
  space_id: 'default',
  expires_at: '2026-10-13T12:00:00.000Z',
};

const realmUser = () =>
  ({ username: 'elastic', authentication_type: 'realm' } as unknown as AuthenticatedUser);

const buildCallbackContext = (
  spaceId = 'default',
  authz: { writeIntegrationPolicies: boolean } = { writeIntegrationPolicies: true }
) =>
  ({
    fleet: Promise.resolve({
      spaceId,
      internalSoClient: {},
      authz: {
        // Fleet All is deliberately false: the create-agentless-policy route does not need it.
        fleet: { all: false },
        integrations: { all: true, writeIntegrationPolicies: authz.writeIntegrationPolicies },
      },
    }),
  } as any);

describe('Provisioning callback handlers', () => {
  let response: ReturnType<typeof httpServerMock.createResponseFactory>;
  let getCurrentUser: jest.Mock;
  const soClient = { tag: 'internal-so-client' };

  beforeEach(() => {
    jest.clearAllMocks();
    response = httpServerMock.createResponseFactory();
    getCurrentUser = jest.fn();
    mockedAppContext.getLogger.mockReturnValue(loggingSystemMock.createLogger());
    mockedAppContext.getSecurityCore.mockReturnValue({ authc: { getCurrentUser } } as any);
    mockedAppContext.getInternalUserSOClientWithoutSpaceExtension.mockReturnValue(soClient as any);
    mockedIsAwsIdentityFederationEnabled.mockResolvedValue(true);
    mockedGetAvailability.mockReturnValue({
      available: true,
      kibanaUrl: 'https://kb.example.com',
    });
  });

  describe('getProvisioningCallbackAvailabilityHandler', () => {
    it('returns 404 when AWS identity federation is not enabled', async () => {
      mockedIsAwsIdentityFederationEnabled.mockResolvedValue(false);

      await getProvisioningCallbackAvailabilityHandler(
        buildCallbackContext(),
        httpServerMock.createKibanaRequest(),
        response
      );

      expect(response.notFound).toHaveBeenCalledWith({
        body: { message: 'AWS identity federation is not enabled' },
      });
      expect(mockedGetAvailability).not.toHaveBeenCalled();
    });

    it('returns the URL the stack is given when the callback is available', async () => {
      await getProvisioningCallbackAvailabilityHandler(
        buildCallbackContext(),
        httpServerMock.createKibanaRequest(),
        response
      );

      expect(response.ok).toHaveBeenCalledWith({
        body: { available: true, kibana_url: 'https://kb.example.com' },
      });
    });

    it('returns the reason when the callback is not available', async () => {
      mockedGetAvailability.mockReturnValue({
        available: false,
        kibanaUrl: 'http://kb.example.com',
        reason:
          'The public Kibana URL http://kb.example.com is not https. CloudFormation only accepts an https callback URL.',
      });

      await getProvisioningCallbackAvailabilityHandler(
        buildCallbackContext(),
        httpServerMock.createKibanaRequest(),
        response
      );

      expect(response.ok).toHaveBeenCalledWith({
        body: {
          available: false,
          kibana_url: 'http://kb.example.com',
          reason:
            'The public Kibana URL http://kb.example.com is not https. CloudFormation only accepts an https callback URL.',
        },
      });
    });
  });

  describe('createProvisioningCallbackHandler', () => {
    it('returns 412 and mints nothing when the public URL is not https', async () => {
      mockedGetAvailability.mockReturnValue({
        available: false,
        kibanaUrl: 'http://kb.example.com',
        reason:
          'The public Kibana URL http://kb.example.com is not https. CloudFormation only accepts an https callback URL.',
      });
      const request = httpServerMock.createKibanaRequest({ body: { provider: 'aws' } });

      await createProvisioningCallbackHandler(buildCallbackContext(), request, response);

      expect(response.customError).toHaveBeenCalledWith({
        statusCode: 412,
        body: {
          message:
            'The public Kibana URL http://kb.example.com is not https. CloudFormation only accepts an https callback URL.',
        },
      });
      expect(mockedService.create).not.toHaveBeenCalled();
    });

    it('creates the record when no public URL is configured, since there is nothing to check', async () => {
      mockedGetAvailability.mockReturnValue({
        available: false,
        reason: 'Kibana has no public URL: server.publicBaseUrl is not set.',
      });
      getCurrentUser.mockReturnValue(realmUser());
      mockedService.create.mockResolvedValue({ item: ITEM, token: 'tok-1' });
      const request = httpServerMock.createKibanaRequest({ body: { provider: 'aws' } });

      await createProvisioningCallbackHandler(buildCallbackContext(), request, response);

      expect(mockedService.create).toHaveBeenCalled();
      expect(response.ok).toHaveBeenCalledWith({ body: { item: ITEM, token: 'tok-1' } });
    });

    it('returns 404 when AWS identity federation is not enabled', async () => {
      mockedIsAwsIdentityFederationEnabled.mockResolvedValue(false);
      const request = httpServerMock.createKibanaRequest({ body: { provider: 'aws' } });

      await createProvisioningCallbackHandler(buildCallbackContext(), request, response);

      expect(response.notFound).toHaveBeenCalledWith({
        body: { message: 'AWS identity federation is not enabled' },
      });
      expect(mockedService.create).not.toHaveBeenCalled();
    });

    it('creates the record when the IaC Provisioner is off', async () => {
      mockedIsEnabled.mockResolvedValue(false);
      getCurrentUser.mockReturnValue(realmUser());
      mockedService.create.mockResolvedValue({ item: ITEM, token: 'tok-1' });
      const request = httpServerMock.createKibanaRequest({ body: { provider: 'aws' } });

      await createProvisioningCallbackHandler(buildCallbackContext(), request, response);

      expect(mockedService.create).toHaveBeenCalled();
      expect(response.ok).toHaveBeenCalledWith({ body: { item: ITEM, token: 'tok-1' } });
    });

    it('creates the record for the request, tagged with the caller and space', async () => {
      getCurrentUser.mockReturnValue(realmUser());
      mockedService.create.mockResolvedValue({ item: ITEM, token: 'tok-1' });
      const request = httpServerMock.createKibanaRequest({ body: { provider: 'aws' } });

      await createProvisioningCallbackHandler(buildCallbackContext('marketing'), request, response);

      expect(mockedService.create).toHaveBeenCalledWith(soClient, {
        provider: 'aws',
        createdBy: 'elastic',
        spaceId: 'marketing',
        identity: {},
      });
      expect(response.ok).toHaveBeenCalledWith({ body: { item: ITEM, token: 'tok-1' } });
    });

    it('passes an attached onboarding deployment to the record', async () => {
      getCurrentUser.mockReturnValue(realmUser());
      mockedService.create.mockResolvedValue({ item: ITEM, token: 'tok-1' });
      const request = httpServerMock.createKibanaRequest({
        body: { provider: 'aws', onboarding_deployment_id: 'dep-1' },
      });

      await createProvisioningCallbackHandler(buildCallbackContext(), request, response);

      expect(mockedService.create).toHaveBeenCalledWith(
        soClient,
        expect.objectContaining({ identity: { onboarding_deployment_id: 'dep-1' } })
      );
    });

    it('refuses a deployment id without the privilege to write integration policies', async () => {
      getCurrentUser.mockReturnValue(realmUser());
      const request = httpServerMock.createKibanaRequest({
        body: { provider: 'aws', onboarding_deployment_id: 'dep-1' },
      });

      await createProvisioningCallbackHandler(
        buildCallbackContext('default', { writeIntegrationPolicies: false }),
        request,
        response
      );

      expect(response.forbidden).toHaveBeenCalled();
      expect(mockedService.create).not.toHaveBeenCalled();
    });

    it('passes the name, account type and template details to the record', async () => {
      getCurrentUser.mockReturnValue(realmUser());
      mockedService.create.mockResolvedValue({ item: ITEM, token: 'tok-1' });
      const request = httpServerMock.createKibanaRequest({
        body: {
          provider: 'aws',
          connector_name: 'my-identity',
          account_type: 'single-account',
          iac_key: 'sha256:abc',
          iac_blueprint_id: 'federated-identity',
          iac_blueprint_version: '1.0.0',
        },
      });

      await createProvisioningCallbackHandler(buildCallbackContext(), request, response);

      expect(mockedService.create).toHaveBeenCalledWith(
        soClient,
        expect.objectContaining({
          provider: 'aws',
          identity: {
            connector_name: 'my-identity',
            account_type: 'single-account',
            iac_key: 'sha256:abc',
            iac_blueprint_id: 'federated-identity',
            iac_blueprint_version: '1.0.0',
          },
        })
      );
    });
  });

  describe('getProvisioningCallbackHandler', () => {
    it('returns the item without any key material', async () => {
      mockedService.get.mockResolvedValue(ITEM);
      const request = httpServerMock.createKibanaRequest({ params: { callbackId: 'cb-1' } });

      await getProvisioningCallbackHandler(buildCallbackContext(), request, response);

      expect(mockedService.get).toHaveBeenCalledWith(soClient, 'cb-1');
      expect(response.ok).toHaveBeenCalledWith({ body: { item: ITEM } });
    });

    it('returns 404 for a record created in another space', async () => {
      mockedService.get.mockResolvedValue({ ...ITEM, space_id: 'marketing' });
      const request = httpServerMock.createKibanaRequest({ params: { callbackId: 'cb-1' } });

      await getProvisioningCallbackHandler(buildCallbackContext('default'), request, response);

      expect(response.notFound).toHaveBeenCalledWith({ body: { message: 'Callback not found' } });
    });

    it('returns 404 for an unknown record', async () => {
      mockedService.get.mockResolvedValue(undefined);
      const request = httpServerMock.createKibanaRequest({ params: { callbackId: 'nope' } });

      await getProvisioningCallbackHandler(buildCallbackContext(), request, response);

      expect(response.notFound).toHaveBeenCalledWith({ body: { message: 'Callback not found' } });
    });
  });

  describe('deleteProvisioningCallbackHandler', () => {
    it('cancels the record and returns it', async () => {
      mockedService.get.mockResolvedValue(ITEM);
      mockedService.cancel.mockResolvedValue({ ...ITEM, status: 'cancelled' });
      const request = httpServerMock.createKibanaRequest({ params: { callbackId: 'cb-1' } });

      await deleteProvisioningCallbackHandler(buildCallbackContext(), request, response);

      expect(mockedService.cancel).toHaveBeenCalledWith(soClient, 'cb-1');
      expect(response.ok).toHaveBeenCalledWith({
        body: { item: { ...ITEM, status: 'cancelled' } },
      });
    });

    it('returns the record as the stack left it when it had already reported', async () => {
      const received = {
        ...ITEM,
        status: 'received' as const,
        ...PAYLOAD,
        cloud_connector_id: 'cb-1',
      };
      mockedService.get.mockResolvedValue(ITEM);
      mockedService.cancel.mockResolvedValue(received);
      const request = httpServerMock.createKibanaRequest({ params: { callbackId: 'cb-1' } });

      await deleteProvisioningCallbackHandler(buildCallbackContext(), request, response);

      expect(response.ok).toHaveBeenCalledWith({ body: { item: received } });
    });

    it('returns 404 for a record created in another space without cancelling it', async () => {
      mockedService.get.mockResolvedValue({ ...ITEM, space_id: 'marketing' });
      const request = httpServerMock.createKibanaRequest({ params: { callbackId: 'cb-1' } });

      await deleteProvisioningCallbackHandler(buildCallbackContext('default'), request, response);

      expect(mockedService.cancel).not.toHaveBeenCalled();
      expect(response.notFound).toHaveBeenCalledWith({ body: { message: 'Callback not found' } });
    });

    it('returns 404 for an unknown record', async () => {
      mockedService.get.mockResolvedValue(undefined);
      const request = httpServerMock.createKibanaRequest({ params: { callbackId: 'nope' } });

      await deleteProvisioningCallbackHandler(buildCallbackContext(), request, response);

      expect(response.notFound).toHaveBeenCalledWith({ body: { message: 'Callback not found' } });
    });
  });

  describe('receiveProvisioningCallbackHandler', () => {
    // The route is not authenticated: the handler only sees the record's token, in a header.
    const receive = (headers: Record<string, string | string[]> = {}) => {
      getCurrentUser.mockReturnValue(null);
      const request = httpServerMock.createKibanaRequest({
        params: { callbackId: 'cb-1' },
        body: PAYLOAD,
        // A repeated header reaches the handler as an array; the mock's type only knows strings.
        headers: headers as Record<string, string>,
      });
      return receiveProvisioningCallbackHandler(buildCallbackContext(), request, response);
    };
    const withToken = { [PROVISIONING_CALLBACK_TOKEN_HEADER]: 'tok-1' };

    it('passes the presented token to the service and answers 200 on receive', async () => {
      mockedService.receive.mockResolvedValue({
        outcome: 'received',
        item: { ...ITEM, status: 'received' },
      });

      await receive(withToken);

      expect(mockedService.receive).toHaveBeenCalledWith(soClient, 'cb-1', {
        token: 'tok-1',
        payload: PAYLOAD,
      });
      expect(response.ok).toHaveBeenCalledWith({ body: { status: 'received' } });
    });

    it('never logs the token', async () => {
      const logger = loggingSystemMock.createLogger();
      mockedAppContext.getLogger.mockReturnValue(logger);
      mockedService.receive.mockResolvedValue({ outcome: 'not_found' });

      await receive(withToken);

      expect(JSON.stringify(loggingSystemMock.collect(logger))).not.toContain('tok-1');
    });

    it('starts the deploy after answering when the record carries a deployment', async () => {
      mockedDeploy.mockResolvedValue(undefined);
      mockedService.receive.mockResolvedValue({
        outcome: 'received',
        item: {
          ...ITEM,
          status: 'received',
          onboarding_deployment_id: 'dep-1',
          deploy_status: 'pending',
        },
      });

      await receive(withToken);

      expect(response.ok).toHaveBeenCalledWith({ body: { status: 'received' } });
      expect(mockedDeploy).toHaveBeenCalledWith('cb-1');
    });

    it('does not start a deploy for a record without a deployment', async () => {
      mockedService.receive.mockResolvedValue({
        outcome: 'received',
        item: { ...ITEM, status: 'received' },
      });

      await receive(withToken);

      expect(mockedDeploy).not.toHaveBeenCalled();
    });

    it('does not start a deploy again for a record already deploying', async () => {
      mockedService.receive.mockResolvedValue({
        outcome: 'received',
        item: {
          ...ITEM,
          status: 'received',
          onboarding_deployment_id: 'dep-1',
          deploy_status: 'deploying',
        },
      });

      await receive(withToken);

      expect(mockedDeploy).not.toHaveBeenCalled();
    });

    it('passes no token when the header is missing', async () => {
      mockedService.receive.mockResolvedValue({ outcome: 'not_found' });

      await receive();

      expect(mockedService.receive).toHaveBeenCalledWith(soClient, 'cb-1', {
        token: undefined,
        payload: PAYLOAD,
      });
      expect(response.notFound).toHaveBeenCalledWith({ body: { message: 'Callback not found' } });
    });

    it('passes no token when the header is repeated', async () => {
      mockedService.receive.mockResolvedValue({ outcome: 'not_found' });

      await receive({ [PROVISIONING_CALLBACK_TOKEN_HEADER]: ['tok-1', 'tok-2'] });

      expect(mockedService.receive).toHaveBeenCalledWith(soClient, 'cb-1', {
        token: undefined,
        payload: PAYLOAD,
      });
    });

    it('answers 409 on a conflicting payload', async () => {
      mockedService.receive.mockResolvedValue({ outcome: 'conflict', item: ITEM });
      await receive(withToken);
      expect(response.conflict).toHaveBeenCalledWith({
        body: { message: 'Callback already received with different values' },
      });
    });

    it('answers 410 when the record has expired', async () => {
      mockedService.receive.mockResolvedValue({ outcome: 'gone' });
      await receive(withToken);
      expect(response.customError).toHaveBeenCalledWith({
        statusCode: 410,
        body: { message: 'Callback is no longer accepting values' },
      });
    });

    it('answers 400 on cross-field validation failure', async () => {
      mockedService.receive.mockResolvedValue({ outcome: 'invalid', message: 'mismatch' });
      await receive(withToken);
      expect(response.badRequest).toHaveBeenCalledWith({ body: { message: 'mismatch' } });
    });
  });
});
