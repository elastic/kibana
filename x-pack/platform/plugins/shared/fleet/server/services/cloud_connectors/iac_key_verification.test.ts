/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock, savedObjectsClientMock } from '@kbn/core/server/mocks';

import type { CloudConnectorSOAttributes } from '../../types/so_attributes';

import {
  IacProvisionerRenderError,
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

import { IAC_UPGRADE_TASK_FLOW } from '../../../common/telemetry/iac_provisioner_events';

import {
  getCloudConnectorIntegrationSelections,
  resolveIacRenderIntegrations,
} from './iac_integrations';
import {
  checkIacTemplate,
  compareIacKey,
  verifyCloudConnectorIacKey,
} from './iac_key_verification';

jest.mock('../app_context');
jest.mock('../iac_provisioner', () => ({ iacProvisionerService: { render: jest.fn() } }));
jest.mock('../utils/iac_provisioner');
jest.mock('../telemetry/iac_provisioner_telemetry');
jest.mock('./iac_integrations', () => ({
  ...jest.requireActual('./iac_integrations'),
  getCloudConnectorIntegrationSelections: jest.fn(),
  resolveIacRenderIntegrations: jest.fn(),
}));

const mockedRender = jest.mocked(iacProvisionerService.render);
const mockedSupported = jest.mocked(isIacProvisionerSupportedFor);
const mockedSelections = jest.mocked(getCloudConnectorIntegrationSelections);
const mockedResolve = jest.mocked(resolveIacRenderIntegrations);

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
  skipped: [] as string[],
};

/** The provider's answer: `render` is its verdict on the digest we sent. */
const rendered = (render: boolean, templateSha = 'sha256:current') => ({
  artifactUrl: 'https://s3.example/x',
  expiresAt: '2026-01-01T00:00:00Z',
  templateSha,
  render,
});

const connector = (attributes: Partial<CloudConnectorSOAttributes>) =>
  ({
    id: 'cc-1',
    type: 'fleet-cloud-connector',
    references: [],
    attributes: { name: 'c', cloudProvider: 'aws', vars: {}, ...attributes },
  } as any);

describe('checkIacTemplate', () => {
  const selections = [
    { name: 'aws', policyTemplates: [{ name: 'cloudtrail', enabledInputs: ['aws-s3'] }] },
  ];
  const opts = { flow: IAC_UPGRADE_TASK_FLOW, contextForLog: 'connector x' } as const;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(appContextService, 'getLogger').mockReturnValue(loggingSystemMock.createLogger());
    mockedResolve.mockResolvedValue(RESOLVED_AWS);
  });

  it('sends the stored digest and returns the provider verdict, reporting telemetry', async () => {
    mockedRender.mockResolvedValueOnce(rendered(false, 'sha256:stored'));

    const result = await checkIacTemplate(soClient, 'aws', selections, 'sha256:stored', opts);

    expect(result).toEqual({ render: false, templateSha: 'sha256:stored' });
    expect(mockedRender).toHaveBeenCalledWith({
      provider: 'aws',
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

  it('returns render:true when the provider says the template must be applied', async () => {
    mockedRender.mockResolvedValueOnce(rendered(true));

    const result = await checkIacTemplate(soClient, 'aws', selections, 'sha256:stored', opts);

    expect(result).toEqual({ render: true, templateSha: 'sha256:current' });
  });

  it('fails open when the provider answers without render/templateSha', async () => {
    // A provider predating the contract cannot tell us whether the digest still holds.
    mockedRender.mockResolvedValueOnce({
      artifactUrl: 'https://s3.example/x',
      expiresAt: '2026-01-01T00:00:00Z',
    });

    const result = await checkIacTemplate(soClient, 'aws', selections, 'sha256:stored', opts);

    expect(result).toBeUndefined();
  });

  it('fails open when nothing is renderable for the provider', async () => {
    mockedResolve.mockResolvedValueOnce({ integrations: [], skipped: ['aws'] });

    const result = await checkIacTemplate(soClient, 'aws', selections, 'sha256:stored', opts);

    expect(result).toBeUndefined();
    expect(mockedRender).not.toHaveBeenCalled();
  });

  it('fails open and reports the provider status and codes on a render error', async () => {
    mockedRender.mockRejectedValueOnce(
      new IacProvisionerRenderError('rejected', 422, ['render.blueprint_not_found'])
    );

    const result = await checkIacTemplate(soClient, 'aws', selections, 'sha256:stored', opts);

    expect(result).toBeUndefined();
    expect(reportIacProvisionerRenderCompleted).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        httpStatus: 422,
        errorCodes: ['render.blueprint_not_found'],
      })
    );
  });

  it('reports httpStatus 0 when no response arrived at all', async () => {
    mockedRender.mockRejectedValueOnce(new IacProvisionerUnavailableError('no response'));

    expect(
      await checkIacTemplate(soClient, 'aws', selections, 'sha256:stored', opts)
    ).toBeUndefined();
    expect(reportIacProvisionerRenderCompleted).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, httpStatus: 0 })
    );
  });

  it('reports httpStatus 404 when a package no longer exists', async () => {
    mockedResolve.mockRejectedValueOnce(new PackageNotFoundError('gone'));

    expect(
      await checkIacTemplate(soClient, 'aws', selections, 'sha256:stored', opts)
    ).toBeUndefined();
    expect(reportIacProvisionerRenderCompleted).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, httpStatus: 404 })
    );
  });

  it('reports httpStatus 500 for an unexpected failure', async () => {
    mockedRender.mockRejectedValueOnce(new Error('boom'));

    expect(
      await checkIacTemplate(soClient, 'aws', selections, 'sha256:stored', opts)
    ).toBeUndefined();
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
    mockedSupported.mockReturnValue(true);
    mockedSelections.mockResolvedValue([
      { name: 'aws', policyTemplates: [{ name: 'cloudtrail', enabledInputs: ['aws-s3'] }] },
    ]);
    mockedResolve.mockResolvedValue(RESOLVED_AWS);
  });

  it('returns matches:true without calling IaCP for unsupported providers', async () => {
    mockedSupported.mockReturnValue(false);
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

    const result = await verifyCloudConnectorIacKey(soClient, 'cc-1', {
      name: 'aws',
      policyTemplates: [{ name: 'guardduty', enabledInputs: ['aws-cloudwatch'] }],
    });

    const merged = [
      {
        name: 'aws',
        policyTemplates: [
          { name: 'cloudtrail', enabledInputs: ['aws-s3'] },
          { name: 'guardduty', enabledInputs: ['aws-cloudwatch'] },
        ],
      },
    ];
    expect(mockedResolve).toHaveBeenCalledWith(soClient, 'aws', merged);
    expect(result).toEqual({
      matches: true,
      outcome: 'matches',
      deploymentId: undefined,
      region: undefined,
      integrations: merged,
    });
    expect(reportIacProvisionerKeyVerificationCompleted).toHaveBeenCalledWith(
      expect.objectContaining({ surface: 'wizard', outcome: 'matches', integrationCount: 1 })
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

    const result = await verifyCloudConnectorIacKey(soClient, 'cc-1', {
      name: 'aws',
      policyTemplates: [{ name: 's3', enabledInputs: ['aws-s3'] }],
    });

    expect(result.matches).toBe(true);
    expect(reportIacProvisionerKeyVerificationCompleted).toHaveBeenCalledWith(
      expect.objectContaining({ surface: 'wizard', outcome: 'key_unavailable' })
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

  it('fails open when nothing is renderable for the provider', async () => {
    soClient.get.mockResolvedValueOnce(connector({ iac_key: 'sha256:old' }));
    mockedResolve.mockResolvedValueOnce({ integrations: [], skipped: ['aws'] });

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
      new IacProvisionerRenderError('rejected', 422, ['unsupported'])
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

  it('fails open with httpStatus 404 when a package no longer exists', async () => {
    soClient.get.mockResolvedValueOnce(connector({ iac_key: 'sha256:old' }));
    mockedResolve.mockRejectedValueOnce(new PackageNotFoundError('gone'));

    const result = await verifyCloudConnectorIacKey(soClient, 'cc-1');

    expect(result.matches).toBe(true);
    expect(reportIacProvisionerRenderCompleted).toHaveBeenCalledWith(
      expect.objectContaining({ flow: 'iac_key_check', success: false, httpStatus: 404 })
    );
  });

  it('fails open when any attached package has no inputs to render from', async () => {
    soClient.get.mockResolvedValueOnce(connector({ iac_key: 'sha256:old' }));
    mockedResolve.mockResolvedValueOnce({ ...RESOLVED_AWS, skipped: ['other_pkg'] });

    const result = await verifyCloudConnectorIacKey(soClient, 'cc-1');

    expect(result.matches).toBe(true);
    expect(mockedRender).not.toHaveBeenCalled();
    expect(reportIacProvisionerKeyVerificationCompleted).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: 'key_unavailable' })
    );
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

  describe('persisting the upgrade status', () => {
    const expectStatusWritten = (status: string) => {
      expect(soClient.update).toHaveBeenCalledWith('fleet-cloud-connector', 'cc-1', {
        iac_upgrade_status: status,
        iac_upgrade_checked_at: expect.any(String),
      });
    };

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
      mockedSupported.mockReturnValue(false);
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

    it('does not persist a wizard check, whose integration is not saved yet', async () => {
      soClient.get.mockResolvedValueOnce(connector({ iac_key: 'sha256:old' }));
      mockedRender.mockResolvedValueOnce(rendered(true, 'sha256:new'));

      const result = await verifyCloudConnectorIacKey(soClient, 'cc-1', {
        name: 'aws',
        policyTemplates: [{ name: 'guardduty', enabledInputs: ['aws-cloudwatch'] }],
      });

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

describe('compareIacKey', () => {
  const selections = [
    { name: 'aws', policyTemplates: [{ name: 'cloudtrail', enabledInputs: ['aws-s3'] }] },
  ];
  const opts = { flow: IAC_UPGRADE_TASK_FLOW, contextForLog: 'connector cc-1' } as const;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(appContextService, 'getLogger').mockReturnValue(loggingSystemMock.createLogger());
    mockedSupported.mockReturnValue(true);
    mockedResolve.mockResolvedValue(RESOLVED_AWS);
  });

  it('returns unsupported_provider when IaCP does not support the provider', async () => {
    mockedSupported.mockReturnValue(false);
    const result = await compareIacKey(
      soClient,
      { cloudProvider: 'aws', iac_key: 'sha256:old' },
      selections,
      opts
    );
    expect(result).toBe('unsupported_provider');
    expect(mockedRender).not.toHaveBeenCalled();
  });

  it('returns no_integrations when the selection list is empty', async () => {
    const result = await compareIacKey(
      soClient,
      { cloudProvider: 'aws', iac_key: 'sha256:old' },
      [],
      opts
    );
    expect(result).toBe('no_integrations');
    expect(mockedRender).not.toHaveBeenCalled();
  });

  it('returns no_key without asking the provider when nothing is stored', async () => {
    const result = await compareIacKey(
      soClient,
      { cloudProvider: 'aws', iac_key: undefined },
      selections,
      opts
    );
    expect(result).toBe('no_key');
    expect(mockedRender).not.toHaveBeenCalled();
  });

  it('returns key_unavailable when IaCP cannot render (fail open)', async () => {
    mockedResolve.mockResolvedValueOnce({ integrations: [], skipped: ['aws'] });
    const result = await compareIacKey(
      soClient,
      { cloudProvider: 'aws', iac_key: 'sha256:old' },
      selections,
      opts
    );
    expect(result).toBe('key_unavailable');
  });

  it('returns key_mismatch when the provider says the template must be applied', async () => {
    mockedRender.mockResolvedValueOnce(rendered(true, 'sha256:new'));
    const result = await compareIacKey(
      soClient,
      { cloudProvider: 'aws', iac_key: 'sha256:old' },
      selections,
      opts
    );
    expect(result).toBe('key_mismatch');
    expect(mockedRender).toHaveBeenCalledWith(
      expect.objectContaining({ templateSha: 'sha256:old' })
    );
  });

  it('returns matches when the provider says the stored digest still holds', async () => {
    mockedRender.mockResolvedValueOnce(rendered(false, 'sha256:same'));
    const result = await compareIacKey(
      soClient,
      { cloudProvider: 'aws', iac_key: 'sha256:same' },
      selections,
      opts
    );
    expect(result).toBe('matches');
  });
});
