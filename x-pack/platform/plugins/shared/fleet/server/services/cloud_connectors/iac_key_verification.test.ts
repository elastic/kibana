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
  computeIacKeyMismatch,
  getCurrentIacKey,
  verifyCloudConnectorIacKey,
} from './iac_key_verification';

jest.mock('../app_context');
jest.mock('../iac_provisioner', () => ({ iacProvisionerService: { renderKey: jest.fn() } }));
jest.mock('../utils/iac_provisioner');
jest.mock('../telemetry/iac_provisioner_telemetry');
jest.mock('./iac_integrations', () => ({
  ...jest.requireActual('./iac_integrations'),
  getCloudConnectorIntegrationSelections: jest.fn(),
  resolveIacRenderIntegrations: jest.fn(),
}));

const mockedRenderKey = jest.mocked(iacProvisionerService.renderKey);
const mockedSupported = jest.mocked(isIacProvisionerSupportedFor);
const mockedSelections = jest.mocked(getCloudConnectorIntegrationSelections);
const mockedResolve = jest.mocked(resolveIacRenderIntegrations);

const STACK_ARN = 'arn:aws:cloudformation:us-east-1:123456789012:stack/s/uuid';
const soClient = savedObjectsClientMock.create();

const connector = (attributes: Partial<CloudConnectorSOAttributes>) =>
  ({
    id: 'cc-1',
    type: 'fleet-cloud-connector',
    references: [],
    attributes: { name: 'c', cloudProvider: 'aws', vars: {}, ...attributes },
  } as any);

describe('computeIacKeyMismatch', () => {
  it.each([
    [undefined, 'sha256:a', 'no_key'],
    ['', 'sha256:a', 'no_key'],
    ['  ', 'sha256:a', 'no_key'],
    ['sha256:a', 'sha256:a', undefined],
    ['sha256:a', 'sha256:b', 'key_mismatch'],
  ])('stored=%p current=%p → %p', (stored, current, expected) => {
    expect(computeIacKeyMismatch(stored, current)).toBe(expected);
  });
});

describe('getCurrentIacKey', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(appContextService, 'getLogger').mockReturnValue(loggingSystemMock.createLogger());
  });

  it('returns the rendered key and reports render requested and completed', async () => {
    mockedResolve.mockResolvedValueOnce({
      integrations: [
        {
          name: 'aws',
          version: '2.0.0',
          policyTemplates: [{ name: 'cloudtrail', enabledInputs: ['aws-s3'] }],
        },
      ],
      skipped: [],
    });
    mockedRenderKey.mockResolvedValueOnce({ key: 'sha256:k' });

    const key = await getCurrentIacKey(
      soClient,
      'aws',
      [{ name: 'aws', policyTemplates: ['cloudtrail'] }],
      { flow: IAC_UPGRADE_TASK_FLOW, contextForLog: 'connector x' }
    );

    expect(key).toBe('sha256:k');
    expect(reportIacProvisionerRenderRequested).toHaveBeenCalledWith(
      expect.objectContaining({ flow: 'iac_upgrade_task' })
    );
    expect(reportIacProvisionerRenderCompleted).toHaveBeenCalledWith(
      expect.objectContaining({ flow: 'iac_upgrade_task' })
    );
  });
});

describe('verifyCloudConnectorIacKey', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(appContextService, 'getLogger').mockReturnValue(loggingSystemMock.createLogger());
    mockedSupported.mockReturnValue(true);
    mockedSelections.mockResolvedValue([{ name: 'aws', policyTemplates: ['cloudtrail'] }]);
    mockedResolve.mockResolvedValue({
      integrations: [
        {
          name: 'aws',
          version: '2.0.0',
          policyTemplates: [{ name: 'cloudtrail', enabledInputs: ['aws-s3'] }],
        },
      ],
      skipped: [],
    });
  });

  it('returns matches:true without calling IaCP for unsupported providers', async () => {
    mockedSupported.mockReturnValue(false);
    soClient.get.mockResolvedValueOnce(connector({ cloudProvider: 'azure' }));

    const result = await verifyCloudConnectorIacKey(soClient, 'cc-1');

    expect(result.matches).toBe(true);
    expect(mockedRenderKey).not.toHaveBeenCalled();
    expect(reportIacProvisionerKeyVerificationCompleted).toHaveBeenCalledWith(
      expect.objectContaining({ surface: 'flyout', outcome: 'unsupported_provider' })
    );
  });

  it('merges the new integration into the connector set before rendering', async () => {
    soClient.get.mockResolvedValueOnce(connector({ iac_key: 'sha256:same' }));
    mockedRenderKey.mockResolvedValueOnce({ key: 'sha256:same' });

    const result = await verifyCloudConnectorIacKey(soClient, 'cc-1', {
      name: 'aws',
      policyTemplates: ['guardduty'],
    });

    expect(mockedResolve).toHaveBeenCalledWith(soClient, 'aws', [
      { name: 'aws', policyTemplates: ['cloudtrail', 'guardduty'] },
    ]);
    expect(result).toEqual({
      matches: true,
      deploymentId: undefined,
      region: undefined,
      integrations: [{ name: 'aws', policyTemplates: ['cloudtrail', 'guardduty'] }],
    });
    expect(reportIacProvisionerKeyVerificationCompleted).toHaveBeenCalledWith(
      expect.objectContaining({ surface: 'wizard', outcome: 'matches', integrationCount: 1 })
    );
  });

  it('reports key_mismatch with deployment id and region, and emits telemetry', async () => {
    soClient.get.mockResolvedValueOnce(
      connector({ iac_key: 'sha256:old', iac_deployment_id: STACK_ARN })
    );
    mockedRenderKey.mockResolvedValueOnce({ key: 'sha256:new' });

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
    mockedRenderKey.mockResolvedValueOnce({ key: 'sha256:new' });

    const result = await verifyCloudConnectorIacKey(soClient, 'cc-1');

    expect(result).toMatchObject({ matches: false, reason: 'no_key' });
  });

  it('fails open and emits key_unavailable when IaCP is unavailable', async () => {
    soClient.get.mockResolvedValueOnce(connector({}));
    mockedRenderKey.mockRejectedValueOnce(new IacProvisionerUnavailableError('down', 503));

    const result = await verifyCloudConnectorIacKey(soClient, 'cc-1', {
      name: 'aws',
      policyTemplates: ['s3'],
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
    expect(mockedRenderKey).not.toHaveBeenCalled();
    expect(reportIacProvisionerKeyVerificationCompleted).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: 'no_integrations' })
    );
  });

  it('fails open when nothing is renderable for the provider', async () => {
    soClient.get.mockResolvedValueOnce(connector({}));
    mockedResolve.mockResolvedValueOnce({ integrations: [], skipped: ['aws'] });

    const result = await verifyCloudConnectorIacKey(soClient, 'cc-1');

    expect(result.matches).toBe(true);
    expect(mockedRenderKey).not.toHaveBeenCalled();
    expect(reportIacProvisionerKeyVerificationCompleted).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: 'key_unavailable' })
    );
  });

  it('fails open and reports the provider status and codes on a 4xx', async () => {
    soClient.get.mockResolvedValueOnce(connector({}));
    mockedRenderKey.mockRejectedValueOnce(
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
    soClient.get.mockResolvedValueOnce(connector({}));
    mockedResolve.mockRejectedValueOnce(new PackageNotFoundError('gone'));

    const result = await verifyCloudConnectorIacKey(soClient, 'cc-1');

    expect(result.matches).toBe(true);
    expect(reportIacProvisionerRenderCompleted).toHaveBeenCalledWith(
      expect.objectContaining({ flow: 'iac_key_check', success: false, httpStatus: 404 })
    );
  });

  it('fails open when any attached package has no provider inputs', async () => {
    soClient.get.mockResolvedValueOnce(connector({}));
    mockedResolve.mockResolvedValueOnce({
      integrations: [
        {
          name: 'aws',
          version: '2.0.0',
          policyTemplates: [{ name: 'cloudtrail', enabledInputs: ['aws-s3'] }],
        },
      ],
      skipped: ['other_pkg'],
    });

    const result = await verifyCloudConnectorIacKey(soClient, 'cc-1');

    expect(result.matches).toBe(true);
    expect(mockedRenderKey).not.toHaveBeenCalled();
    expect(reportIacProvisionerKeyVerificationCompleted).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: 'key_unavailable' })
    );
  });

  it('treats a whitespace-only stored key as no_key', async () => {
    soClient.get.mockResolvedValueOnce(connector({ iac_key: '   ' }));
    mockedRenderKey.mockResolvedValueOnce({ key: 'sha256:new' });

    const result = await verifyCloudConnectorIacKey(soClient, 'cc-1');

    expect(result).toMatchObject({ matches: false, reason: 'no_key' });
  });

  it('omits region when the deployment id is malformed', async () => {
    soClient.get.mockResolvedValueOnce(
      connector({ iac_key: 'sha256:old', iac_deployment_id: 'not-an-arn' })
    );
    mockedRenderKey.mockResolvedValueOnce({ key: 'sha256:new' });

    const result = await verifyCloudConnectorIacKey(soClient, 'cc-1');

    expect(result).toMatchObject({ deploymentId: 'not-an-arn', region: undefined });
  });
});
