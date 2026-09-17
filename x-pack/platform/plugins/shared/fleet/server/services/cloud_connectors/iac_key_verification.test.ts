/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock, savedObjectsClientMock } from '@kbn/core/server/mocks';

import type { CloudConnectorSOAttributes } from '../../types/so_attributes';

import {
  IacProvisionerRequestError,
  IacProvisionerUnavailableError,
  PackageNotFoundError,
} from '../../errors';
import { appContextService } from '../app_context';
import { iacProvisionerService } from '../iac_provisioner';
import {
  reportIacProvisionerKeyVerificationCompleted,
  reportIacProvisionerRenderCompleted,
  reportIacProvisionerRenderRequested,
} from '../telemetry/iac_provisioner_telemetry';
import { isIacProvisionerSupportedFor } from '../utils/iac_provisioner';
import { buildIacProvisionerIntegrations } from '../iac_provisioner_integrations';

import { IAC_UPGRADE_TASK_FLOW } from '../../../common/telemetry/iac_provisioner_events';

import { getCloudConnectorIntegrationSelections } from './iac_integrations';
import { getIacKeyOutcome, verifyCloudConnectorIacKey } from './iac_key_verification';

jest.mock('../app_context');
jest.mock('../iac_provisioner', () => ({ iacProvisionerService: { renderTemplate: jest.fn() } }));
jest.mock('../iac_provisioner_integrations', () => ({
  ...jest.requireActual('../iac_provisioner_integrations'),
  buildIacProvisionerIntegrations: jest.fn(),
}));
jest.mock('../utils/iac_provisioner');
jest.mock('../telemetry/iac_provisioner_telemetry');
jest.mock('./iac_integrations', () => ({
  ...jest.requireActual('./iac_integrations'),
  getCloudConnectorIntegrationSelections: jest.fn(),
}));

const mockedRender = jest.mocked(iacProvisionerService.renderTemplate);
const mockedSupported = jest.mocked(isIacProvisionerSupportedFor);
const mockedSelections = jest.mocked(getCloudConnectorIntegrationSelections);
const mockedResolve = jest.mocked(buildIacProvisionerIntegrations);

/** The resolver call `getIacKeyOutcome` makes for a merged selection set. */
const resolveCall = (requestedIntegrations: unknown) => ({
  savedObjectsClient: soClient,
  requestedIntegrations,
});

const STACK_ARN = 'arn:aws:cloudformation:us-east-1:123456789012:stack/s/uuid';
const soClient = savedObjectsClientMock.create();

const RESOLVED_AWS = {
  integrations: [
    {
      name: 'aws',
      version: '2.0.0',
      policyTemplates: [{ name: 'cloudtrail', enabledInputs: ['aws-s3'] }],
    },
  ],
};

/** The resolver's answer for a connector whose policies enable an input the package dropped. */
const STALE_BUILD_ERROR = {
  errorMessage: 'aws policy template cloudtrail has no inputs named aws-old',
};

/** The provider's answer: `render` is its verdict on the digest we sent. */
const rendered = (render: boolean, templateSha = 'sha256:current') => ({
  artifactUrl: 'https://s3.example/x',
  expiresAt: '2026-01-01T00:00:00Z',
  templateSha,
  render,
  blueprint: { id: 'federated-identity', version: '1.0.0' },
});

const connector = (attributes: Partial<CloudConnectorSOAttributes>) =>
  ({
    id: 'cc-1',
    type: 'fleet-cloud-connector',
    references: [],
    attributes: { name: 'c', cloudProvider: 'aws', vars: {}, ...attributes },
  } as any);

describe('getIacKeyOutcome', () => {
  const selections = [
    { name: 'aws', policyTemplates: [{ name: 'cloudtrail', enabledInputs: ['aws-s3'] }] },
  ];
  const opts = { flow: IAC_UPGRADE_TASK_FLOW, contextForLog: 'connector cc-1' } as const;
  const keyed = { cloudProvider: 'aws', iac_key: 'sha256:stored' } as const;
  const keyless = { cloudProvider: 'aws', iac_key: undefined } as const;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(appContextService, 'getLogger').mockReturnValue(loggingSystemMock.createLogger());
    mockedSupported.mockResolvedValue(true);
    mockedResolve.mockResolvedValue(RESOLVED_AWS);
  });

  it('returns unsupported_provider for a non-AWS connector without resolving or rendering', async () => {
    const result = await getIacKeyOutcome(
      soClient,
      { cloudProvider: 'azure', iac_key: 'sha256:stored' },
      selections,
      opts
    );

    expect(result).toBe('unsupported_provider');
    expect(mockedSupported).not.toHaveBeenCalled();
    expect(mockedResolve).not.toHaveBeenCalled();
    expect(mockedRender).not.toHaveBeenCalled();
  });

  it('returns unsupported_provider when IaCP is not enabled for the provider', async () => {
    mockedSupported.mockResolvedValue(false);

    const result = await getIacKeyOutcome(soClient, keyed, selections, opts);

    expect(result).toBe('unsupported_provider');
    expect(mockedResolve).not.toHaveBeenCalled();
    expect(mockedRender).not.toHaveBeenCalled();
  });

  it('returns no_integrations when the selection list is empty', async () => {
    const result = await getIacKeyOutcome(soClient, keyed, [], opts);

    expect(result).toBe('no_integrations');
    expect(mockedResolve).not.toHaveBeenCalled();
    expect(mockedRender).not.toHaveBeenCalled();
  });

  it('returns no_key without asking the provider once the set resolves and nothing is stored', async () => {
    const result = await getIacKeyOutcome(soClient, keyless, selections, opts);

    expect(result).toBe('no_key');
    expect(mockedResolve).toHaveBeenCalledWith(resolveCall(selections));
    expect(mockedRender).not.toHaveBeenCalled();
    expect(reportIacProvisionerRenderRequested).not.toHaveBeenCalled();
  });

  it('returns key_unavailable, not no_key, for a keyless connector whose set no longer resolves', async () => {
    // The flyout's Update would otherwise send this very set through the strict render route,
    // which rejects it: a permanent callout the user could never clear.
    mockedResolve.mockResolvedValueOnce(STALE_BUILD_ERROR);

    const result = await getIacKeyOutcome(soClient, keyless, selections, opts);

    expect(result).toBe('key_unavailable');
    expect(mockedRender).not.toHaveBeenCalled();
    expect(reportIacProvisionerRenderRequested).not.toHaveBeenCalled();
    expect(reportIacProvisionerRenderCompleted).not.toHaveBeenCalled();
  });

  it('returns matches when the provider says the stored digest still holds, reporting telemetry', async () => {
    mockedRender.mockResolvedValueOnce(rendered(false, 'sha256:stored'));

    const result = await getIacKeyOutcome(soClient, keyed, selections, opts);

    expect(result).toBe('matches');
    expect(mockedRender).toHaveBeenCalledWith({
      provider: 'aws',
      workflow: 'federated_identity',
      integrations: RESOLVED_AWS.integrations,
      templateSha: 'sha256:stored',
    });
    expect(reportIacProvisionerRenderRequested).toHaveBeenCalledWith(
      expect.objectContaining({ flow: 'iac_upgrade_task', integrationCount: 1 })
    );
    expect(reportIacProvisionerRenderCompleted).toHaveBeenCalledWith(
      expect.objectContaining({ flow: 'iac_upgrade_task', success: true, httpStatus: 200 })
    );
  });

  it('returns key_mismatch when the provider says the template must be applied', async () => {
    mockedRender.mockResolvedValueOnce(rendered(true, 'sha256:new'));

    const result = await getIacKeyOutcome(soClient, keyed, selections, opts);

    expect(result).toBe('key_mismatch');
  });

  it('fails open with the provider status and codes when IaCP rejects the render', async () => {
    mockedRender.mockRejectedValueOnce(
      new IacProvisionerRequestError('rejected', 422, ['render.blueprint_not_found'])
    );

    const result = await getIacKeyOutcome(soClient, keyed, selections, opts);

    expect(result).toBe('key_unavailable');
    expect(reportIacProvisionerRenderCompleted).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        httpStatus: 422,
        errorCodes: ['render.blueprint_not_found'],
      })
    );
  });

  it('fails open with httpStatus 0 when the provider answers without render/templateSha', async () => {
    // A provider predating the contract cannot tell us whether the digest still holds; the
    // client rejects such a body as an availability problem with no status.
    mockedRender.mockRejectedValueOnce(
      new IacProvisionerUnavailableError('provider returned an invalid render body')
    );

    const result = await getIacKeyOutcome(soClient, keyed, selections, opts);

    expect(result).toBe('key_unavailable');
    expect(reportIacProvisionerRenderCompleted).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, httpStatus: 0 })
    );
  });

  it('fails open without render telemetry when a package of the connector is not found', async () => {
    mockedResolve.mockRejectedValueOnce(new PackageNotFoundError('[aws] package not found'));

    const result = await getIacKeyOutcome(soClient, keyed, selections, opts);

    expect(result).toBe('key_unavailable');
    expect(mockedRender).not.toHaveBeenCalled();
    expect(reportIacProvisionerRenderRequested).not.toHaveBeenCalled();
    expect(reportIacProvisionerRenderCompleted).not.toHaveBeenCalled();
  });

  it('fails open without rendering when a policy enables an entry its package no longer declares', async () => {
    // The render route the browser then calls rejects that very entry, so an "upgrade available"
    // verdict over the surviving entries would be a dead end.
    const logger = loggingSystemMock.createLogger();
    jest.spyOn(appContextService, 'getLogger').mockReturnValue(logger);
    mockedResolve.mockResolvedValueOnce(STALE_BUILD_ERROR);

    const result = await getIacKeyOutcome(soClient, keyed, selections, opts);

    expect(result).toBe('key_unavailable');
    expect(mockedRender).not.toHaveBeenCalled();
    expect(reportIacProvisionerRenderRequested).not.toHaveBeenCalled();
    expect(reportIacProvisionerRenderCompleted).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining(STALE_BUILD_ERROR.errorMessage)
    );
  });

  it('fails open with failed-render telemetry when the resolver fails for another reason', async () => {
    mockedResolve.mockRejectedValueOnce(new Error('registry unavailable'));

    const result = await getIacKeyOutcome(soClient, keyed, selections, opts);

    expect(result).toBe('key_unavailable');
    expect(mockedRender).not.toHaveBeenCalled();
    expect(reportIacProvisionerRenderCompleted).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, httpStatus: 500 })
    );
  });
});

describe('verifyCloudConnectorIacKey', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  beforeEach(() => {
    jest.clearAllMocks();
    logger = loggingSystemMock.createLogger();
    jest.spyOn(appContextService, 'getLogger').mockReturnValue(logger);
    soClient.update.mockResolvedValue({} as any);
    mockedSupported.mockResolvedValue(true);
    mockedSelections.mockResolvedValue([
      { name: 'aws', policyTemplates: [{ name: 'cloudtrail', enabledInputs: ['aws-s3'] }] },
    ]);
    mockedResolve.mockResolvedValue(RESOLVED_AWS);
  });

  it('returns matches:true without calling IaCP for unsupported providers', async () => {
    mockedSupported.mockResolvedValue(false);
    soClient.get.mockResolvedValueOnce(connector({ cloudProvider: 'azure' }));

    const result = await verifyCloudConnectorIacKey(soClient, 'cc-1');

    expect(result.matches).toBe(true);
    expect(mockedRender).not.toHaveBeenCalled();
    expect(reportIacProvisionerKeyVerificationCompleted).toHaveBeenCalledWith(
      expect.objectContaining({ surface: 'flyout', outcome: 'unsupported_provider' })
    );
  });

  it('merges the new integration into the connector set before rendering', async () => {
    soClient.get.mockResolvedValueOnce(connector({ iac_key: 'sha256:same' }));
    mockedRender.mockResolvedValueOnce(rendered(false, 'sha256:same'));

    const result = await verifyCloudConnectorIacKey(soClient, 'cc-1', [
      {
        name: 'aws',
        policyTemplates: [{ name: 'guardduty', enabledInputs: ['aws-cloudwatch'] }],
      },
    ]);

    const merged = [
      {
        name: 'aws',
        policyTemplates: [
          { name: 'cloudtrail', enabledInputs: ['aws-s3'] },
          { name: 'guardduty', enabledInputs: ['aws-cloudwatch'] },
        ],
      },
    ];
    expect(mockedResolve).toHaveBeenCalledWith(resolveCall(merged));
    expect(result).toEqual({
      matches: true,
      outcome: 'matches',
      deploymentId: undefined,
      region: undefined,
      integrations: merged,
    });
    expect(reportIacProvisionerKeyVerificationCompleted).toHaveBeenCalledWith(
      expect.objectContaining({ surface: 'onboarding', outcome: 'matches', integrationCount: 1 })
    );
  });

  it('merges several new integrations from different packages into one onboarding check', async () => {
    // The AWS onboarding selects across packages (aws, aws_logs, ...) in a single pass.
    soClient.get.mockResolvedValueOnce(connector({ iac_key: 'sha256:same' }));
    mockedRender.mockResolvedValueOnce(rendered(false, 'sha256:same'));

    const result = await verifyCloudConnectorIacKey(soClient, 'cc-1', [
      {
        name: 'aws',
        policyTemplates: [{ name: 'guardduty', enabledInputs: ['aws-cloudwatch'] }],
      },
      {
        name: 'aws_logs',
        policyTemplates: [{ name: 'generic', enabledInputs: ['aws-s3'] }],
      },
    ]);

    const merged = [
      {
        name: 'aws',
        policyTemplates: [
          { name: 'cloudtrail', enabledInputs: ['aws-s3'] },
          { name: 'guardduty', enabledInputs: ['aws-cloudwatch'] },
        ],
      },
      {
        name: 'aws_logs',
        policyTemplates: [{ name: 'generic', enabledInputs: ['aws-s3'] }],
      },
    ];
    expect(mockedResolve).toHaveBeenCalledWith(resolveCall(merged));
    expect(result.integrations).toEqual(merged);
    expect(reportIacProvisionerKeyVerificationCompleted).toHaveBeenCalledWith(
      expect.objectContaining({ surface: 'onboarding', outcome: 'matches', integrationCount: 2 })
    );
    expect(logger.info).toHaveBeenCalledWith(
      'IaC key check for connector cc-1 (onboarding, aws): matches — adding aws[guardduty], aws_logs[generic]'
    );
  });

  it('treats an empty integrations array as a flyout check', async () => {
    soClient.get.mockResolvedValueOnce(connector({ iac_key: 'sha256:same' }));
    mockedRender.mockResolvedValueOnce(rendered(false, 'sha256:same'));

    const result = await verifyCloudConnectorIacKey(soClient, 'cc-1', []);

    expect(result.matches).toBe(true);
    expect(mockedResolve).toHaveBeenCalledWith(
      resolveCall([
        { name: 'aws', policyTemplates: [{ name: 'cloudtrail', enabledInputs: ['aws-s3'] }] },
      ])
    );
    expect(reportIacProvisionerKeyVerificationCompleted).toHaveBeenCalledWith(
      expect.objectContaining({ surface: 'flyout', outcome: 'matches' })
    );
    expect(logger.info).toHaveBeenCalledWith(
      'IaC key check for connector cc-1 (flyout, aws): matches'
    );
  });

  it('reports key_mismatch with deployment id and region, and emits telemetry', async () => {
    soClient.get.mockResolvedValueOnce(
      connector({ iac_key: 'sha256:old', iac_deployment_id: STACK_ARN })
    );
    mockedRender.mockResolvedValueOnce(rendered(true, 'sha256:new'));

    const result = await verifyCloudConnectorIacKey(soClient, 'cc-1');

    expect(result).toMatchObject({
      matches: false,
      reason: 'key_mismatch',
      deploymentId: STACK_ARN,
      region: 'us-east-1',
    });
    expect(reportIacProvisionerKeyVerificationCompleted).toHaveBeenCalledWith(
      expect.objectContaining({
        surface: 'flyout',
        outcome: 'key_mismatch',
        hasDeploymentId: true,
        integrationCount: 1,
      })
    );
    expect(reportIacProvisionerRenderCompleted).toHaveBeenCalledWith(
      expect.objectContaining({ flow: 'iac_key_check', success: true })
    );
  });

  it('reports no_key when the connector deployed the static template', async () => {
    soClient.get.mockResolvedValueOnce(connector({}));
    // Two package policies on the same connector, so the returned set has to be merged.
    mockedSelections.mockResolvedValueOnce([
      { name: 'aws', policyTemplates: [{ name: 'cloudtrail', enabledInputs: ['aws-s3'] }] },
      { name: 'aws', policyTemplates: [{ name: 'guardduty', enabledInputs: ['aws-cloudwatch'] }] },
    ]);

    const result = await verifyCloudConnectorIacKey(soClient, 'cc-1');

    expect(result).toMatchObject({ matches: false, reason: 'no_key' });
    // The flyout's Update flow renders exactly this set, so it must be the connector's
    // merged integrations even on the path that never reaches the provider.
    expect(result.integrations).toEqual([
      {
        name: 'aws',
        policyTemplates: [
          { name: 'cloudtrail', enabledInputs: ['aws-s3'] },
          { name: 'guardduty', enabledInputs: ['aws-cloudwatch'] },
        ],
      },
    ]);
    // The static template is a fact about the connector, so no render is needed.
    expect(mockedRender).not.toHaveBeenCalled();
  });

  it('fails open and emits key_unavailable when IaCP is unavailable', async () => {
    soClient.get.mockResolvedValueOnce(connector({ iac_key: 'sha256:old' }));
    mockedRender.mockRejectedValueOnce(new IacProvisionerUnavailableError('down', 503));

    const result = await verifyCloudConnectorIacKey(soClient, 'cc-1', [
      { name: 'aws', policyTemplates: [{ name: 's3', enabledInputs: ['aws-s3'] }] },
    ]);

    expect(result.matches).toBe(true);
    expect(reportIacProvisionerKeyVerificationCompleted).toHaveBeenCalledWith(
      expect.objectContaining({ surface: 'onboarding', outcome: 'key_unavailable' })
    );
    expect(reportIacProvisionerRenderCompleted).toHaveBeenCalledWith(
      expect.objectContaining({ flow: 'iac_key_check', success: false, httpStatus: 503 })
    );
  });

  it('fails open when the connector has no integrations', async () => {
    soClient.get.mockResolvedValueOnce(connector({}));
    mockedSelections.mockResolvedValueOnce([]);

    const result = await verifyCloudConnectorIacKey(soClient, 'cc-1');

    expect(result.matches).toBe(true);
    expect(mockedRender).not.toHaveBeenCalled();
    expect(reportIacProvisionerKeyVerificationCompleted).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: 'no_integrations' })
    );
  });

  it('fails open when a package of the connector is not installed or in the registry', async () => {
    soClient.get.mockResolvedValueOnce(connector({ iac_key: 'sha256:old' }));
    mockedResolve.mockRejectedValueOnce(new PackageNotFoundError('[aws] package not found'));

    const result = await verifyCloudConnectorIacKey(soClient, 'cc-1');

    expect(result.matches).toBe(true);
    expect(mockedRender).not.toHaveBeenCalled();
    expect(reportIacProvisionerKeyVerificationCompleted).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: 'key_unavailable' })
    );
  });

  it('fails open and reports the provider status and codes on a 4xx', async () => {
    soClient.get.mockResolvedValueOnce(connector({ iac_key: 'sha256:old' }));
    mockedRender.mockRejectedValueOnce(
      new IacProvisionerRequestError('rejected', 422, ['unsupported'])
    );

    const result = await verifyCloudConnectorIacKey(soClient, 'cc-1');

    expect(result.matches).toBe(true);
    expect(reportIacProvisionerRenderCompleted).toHaveBeenCalledWith(
      expect.objectContaining({
        flow: 'iac_key_check',
        success: false,
        httpStatus: 422,
        errorCodes: ['unsupported'],
      })
    );
    expect(reportIacProvisionerKeyVerificationCompleted).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: 'key_unavailable' })
    );
  });

  it('fails open when a policy enables an entry its package no longer declares', async () => {
    soClient.get.mockResolvedValueOnce(
      connector({ iac_key: 'sha256:old', iac_upgrade_status: 'up_to_date' })
    );
    mockedResolve.mockResolvedValueOnce(STALE_BUILD_ERROR);

    const result = await verifyCloudConnectorIacKey(soClient, 'cc-1');

    expect(result).toMatchObject({ matches: true, outcome: 'key_unavailable' });
    expect(mockedRender).not.toHaveBeenCalled();
    // Nothing definite was learned, so the stored status stays as it was.
    expect(soClient.update).not.toHaveBeenCalled();
  });

  it('treats a whitespace-only stored key as no_key', async () => {
    soClient.get.mockResolvedValueOnce(connector({ iac_key: '   ' }));

    const result = await verifyCloudConnectorIacKey(soClient, 'cc-1');

    expect(result).toMatchObject({ matches: false, reason: 'no_key' });
    expect(mockedRender).not.toHaveBeenCalled();
  });

  it('omits region when the deployment id is malformed', async () => {
    soClient.get.mockResolvedValueOnce(
      connector({ iac_key: 'sha256:old', iac_deployment_id: 'not-an-arn' })
    );
    mockedRender.mockResolvedValueOnce(rendered(true, 'sha256:new'));

    const result = await verifyCloudConnectorIacKey(soClient, 'cc-1');

    expect(result).toMatchObject({ deploymentId: 'not-an-arn', region: undefined });
  });

  describe('compare: false (integration set only)', () => {
    it('returns the merged set, deployment id and region as not_checked without asking IaCP', async () => {
      soClient.get.mockResolvedValueOnce(
        connector({ iac_key: 'sha256:old', iac_deployment_id: STACK_ARN })
      );

      const result = await verifyCloudConnectorIacKey(soClient, 'cc-1', undefined, {
        compare: false,
      });

      expect(result).toEqual({
        matches: true,
        outcome: 'not_checked',
        deploymentId: STACK_ARN,
        region: 'us-east-1',
        integrations: [
          { name: 'aws', policyTemplates: [{ name: 'cloudtrail', enabledInputs: ['aws-s3'] }] },
        ],
      });
      expect(mockedRender).not.toHaveBeenCalled();
      expect(mockedResolve).not.toHaveBeenCalled();
    });

    it('persists nothing and reports no telemetry: it is a read', async () => {
      soClient.get.mockResolvedValueOnce(
        connector({ iac_key: 'sha256:old', iac_upgrade_status: 'upgrade_available' })
      );

      await verifyCloudConnectorIacKey(soClient, 'cc-1', [], { compare: false });

      expect(soClient.update).not.toHaveBeenCalled();
      expect(reportIacProvisionerKeyVerificationCompleted).not.toHaveBeenCalled();
      expect(reportIacProvisionerRenderRequested).not.toHaveBeenCalled();
      expect(logger.info).not.toHaveBeenCalled();
    });

    it('still merges added integrations into the returned set', async () => {
      soClient.get.mockResolvedValueOnce(connector({}));

      const result = await verifyCloudConnectorIacKey(
        soClient,
        'cc-1',
        [
          {
            name: 'aws',
            policyTemplates: [{ name: 'guardduty', enabledInputs: ['aws-cloudwatch'] }],
          },
        ],
        { compare: false }
      );

      expect(result.integrations).toEqual([
        {
          name: 'aws',
          policyTemplates: [
            { name: 'cloudtrail', enabledInputs: ['aws-s3'] },
            { name: 'guardduty', enabledInputs: ['aws-cloudwatch'] },
          ],
        },
      ]);
    });

    it('compares by default when the option is omitted', async () => {
      soClient.get.mockResolvedValueOnce(connector({ iac_key: 'sha256:same' }));
      mockedRender.mockResolvedValueOnce(rendered(false, 'sha256:same'));

      const result = await verifyCloudConnectorIacKey(soClient, 'cc-1', undefined, {});

      expect(result.outcome).toBe('matches');
      expect(mockedRender).toHaveBeenCalledTimes(1);
    });
  });

  describe('persisting the upgrade status', () => {
    const expectStatusWritten = (status: string) => {
      expect(soClient.update).toHaveBeenCalledWith('fleet-cloud-connector', 'cc-1', {
        iac_upgrade_status: status,
      });
    };

    it('writes the status only, never the checked-at stamp, which belongs to the daily task', async () => {
      // A re-check that stamped the time would make it look as if the task had just run.
      soClient.get.mockResolvedValueOnce(connector({ iac_key: 'sha256:same' }));
      mockedRender.mockResolvedValueOnce(rendered(false, 'sha256:same'));

      await verifyCloudConnectorIacKey(soClient, 'cc-1');

      expect(soClient.update).toHaveBeenCalledTimes(1);
      const [, , body] = soClient.update.mock.calls[0];
      expect(body).toEqual({ iac_upgrade_status: 'up_to_date' });
      expect(body).not.toHaveProperty('iac_upgrade_checked_at');
    });

    it('stores up_to_date when a re-check matches', async () => {
      soClient.get.mockResolvedValueOnce(
        connector({ iac_key: 'sha256:same', iac_upgrade_status: 'upgrade_available' })
      );
      mockedRender.mockResolvedValueOnce(rendered(false, 'sha256:same'));

      const result = await verifyCloudConnectorIacKey(soClient, 'cc-1');

      expect(result.matches).toBe(true);
      expectStatusWritten('up_to_date');
      expect(logger.info).toHaveBeenCalledWith(
        'IaC upgrade status for connector cc-1: upgrade_available → up_to_date (flyout verify)'
      );
    });

    it('stores upgrade_available when a re-check finds no stored key', async () => {
      soClient.get.mockResolvedValueOnce(connector({ iac_upgrade_status: 'up_to_date' }));

      await verifyCloudConnectorIacKey(soClient, 'cc-1');

      expectStatusWritten('upgrade_available');
    });

    it('stores upgrade_available when a re-check finds a key mismatch', async () => {
      soClient.get.mockResolvedValueOnce(connector({ iac_key: 'sha256:old' }));
      mockedRender.mockResolvedValueOnce(rendered(true, 'sha256:new'));

      await verifyCloudConnectorIacKey(soClient, 'cc-1');

      expectStatusWritten('upgrade_available');
      // Nothing was stored before, so the transition is worth an info line.
      expect(logger.info).toHaveBeenCalledWith(
        'IaC upgrade status for connector cc-1: <unset> → upgrade_available (flyout verify)'
      );
    });

    it('logs at debug when the status is unchanged', async () => {
      soClient.get.mockResolvedValueOnce(
        connector({ iac_key: 'sha256:old', iac_upgrade_status: 'upgrade_available' })
      );
      mockedRender.mockResolvedValueOnce(rendered(true, 'sha256:new'));

      await verifyCloudConnectorIacKey(soClient, 'cc-1');

      expect(logger.debug).toHaveBeenCalledWith(
        'IaC upgrade status for connector cc-1: upgrade_available → upgrade_available (flyout verify)'
      );
      expect(logger.info).not.toHaveBeenCalledWith(expect.stringContaining('flyout verify'));
    });

    it('leaves the stored status alone when IaCP cannot answer', async () => {
      soClient.get.mockResolvedValueOnce(connector({ iac_key: 'sha256:old' }));
      mockedRender.mockRejectedValueOnce(new IacProvisionerUnavailableError('down', 503));

      await verifyCloudConnectorIacKey(soClient, 'cc-1');

      expect(soClient.update).not.toHaveBeenCalled();
    });

    it('leaves the stored status alone for an unsupported provider', async () => {
      mockedSupported.mockResolvedValue(false);
      soClient.get.mockResolvedValueOnce(connector({ cloudProvider: 'azure' }));

      await verifyCloudConnectorIacKey(soClient, 'cc-1');

      expect(soClient.update).not.toHaveBeenCalled();
    });

    it('leaves the stored status alone when the connector has no integrations', async () => {
      soClient.get.mockResolvedValueOnce(connector({}));
      mockedSelections.mockResolvedValueOnce([]);

      await verifyCloudConnectorIacKey(soClient, 'cc-1');

      expect(soClient.update).not.toHaveBeenCalled();
    });

    it('does not persist an onboarding check, whose integrations are not saved yet', async () => {
      soClient.get.mockResolvedValueOnce(connector({ iac_key: 'sha256:old' }));
      mockedRender.mockResolvedValueOnce(rendered(true, 'sha256:new'));

      const result = await verifyCloudConnectorIacKey(soClient, 'cc-1', [
        {
          name: 'aws',
          policyTemplates: [{ name: 'guardduty', enabledInputs: ['aws-cloudwatch'] }],
        },
      ]);

      expect(result).toMatchObject({ matches: false, reason: 'key_mismatch' });
      expect(soClient.update).not.toHaveBeenCalled();
    });

    it('still returns the verification when the write fails', async () => {
      soClient.get.mockResolvedValueOnce(connector({ iac_key: 'sha256:old' }));
      mockedRender.mockResolvedValueOnce(rendered(true, 'sha256:new'));
      soClient.update.mockRejectedValueOnce(new Error('so is down'));

      const result = await verifyCloudConnectorIacKey(soClient, 'cc-1');

      expect(result).toMatchObject({ matches: false, reason: 'key_mismatch' });
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to store IaC upgrade status for connector cc-1: so is down'
      );
    });
  });
});
