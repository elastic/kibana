/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';

import { CLOUD_ONBOARDING_DEPLOYMENT_SAVED_OBJECT_TYPE } from '../../../common/constants';
import type { AwsStackCallback } from '../../../common/types/models/cloud_onboarding_deployment';
import type { CloudOnboardingDeploymentSOAttributes } from '../../types/so_attributes';
import {
  CloudConnectorCreateError,
  IacProvisionerRequestError,
  IacProvisionerUnavailableError,
} from '../../errors';
import { cloudConnectorService } from '../cloud_connector';
import { iacProvisionerService } from '../iac_provisioner';

import { checkAwsStackCallback, startAwsStackCallback } from './aws_stack_callback';

jest.mock('../iac_provisioner', () => ({
  iacProvisionerService: { createCallback: jest.fn(), getCallback: jest.fn() },
}));
jest.mock('../cloud_connector', () => ({
  cloudConnectorService: { create: jest.fn() },
}));

const mockCreateCallback = jest.mocked(iacProvisionerService.createCallback);
const mockGetCallback = jest.mocked(iacProvisionerService.getCallback);
const mockCreateConnector = jest.mocked(cloudConnectorService.create);

const DEPLOYMENT_ID = 'deployment-1';
const ONBOARDING_ID = '3f2b8c1e-5d4a-4e7b-9c0d-1a2b3c4d5e6f';
const STACK_ID =
  'arn:aws:cloudformation:us-east-1:123456789012:stack/elastic/0a1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d';
const ROLE_ARN =
  'arn:aws:iam::123456789012:role/ElasticWorkloadIdentity-0a1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d';
const REPORT = {
  onboardingId: ONBOARDING_ID,
  requestType: 'Create' as const,
  stackId: STACK_ID,
  roleArn: ROLE_ARN,
  accountId: '123456789012',
  region: 'us-east-1',
  receivedAt: '2026-10-09T12:05:00Z',
};

const waiting = (overrides: Partial<AwsStackCallback> = {}): AwsStackCallback => ({
  onboardingId: ONBOARDING_ID,
  status: 'waiting',
  startedAt: '2026-10-09T12:00:00Z',
  expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  accountType: 'single-account',
  iac_key: 'sha256:abc',
  iac_blueprint_id: 'workload_identity_federation',
  iac_blueprint_version: '1.3.0',
  ...overrides,
});

const attributes = (
  overrides: Partial<CloudOnboardingDeploymentSOAttributes> = {}
): CloudOnboardingDeploymentSOAttributes => ({
  provider: 'aws',
  mechanisms: ['managed_integration'],
  services: ['cloudtrail'],
  status: 'pending',
  attemptCount: 1,
  ...overrides,
});

describe('AWS stack callback', () => {
  let soClient: ReturnType<typeof savedObjectsClientMock.create>;
  const logger = loggingSystemMock.createLogger();

  const mockDeployment = (attrs: CloudOnboardingDeploymentSOAttributes, version = 'v1') =>
    soClient.get.mockResolvedValue({
      id: DEPLOYMENT_ID,
      type: CLOUD_ONBOARDING_DEPLOYMENT_SAVED_OBJECT_TYPE,
      references: [],
      version,
      attributes: attrs,
    });

  /** The awsStackCallback of each full-replace write, in order. */
  const writtenCallbacks = () =>
    soClient.create.mock.calls.map(
      ([, attrs]) => (attrs as CloudOnboardingDeploymentSOAttributes).awsStackCallback
    );

  beforeEach(() => {
    jest.clearAllMocks();
    soClient = savedObjectsClientMock.create();
    soClient.create.mockResolvedValue({} as any);
  });

  describe('startAwsStackCallback', () => {
    it('records a waiting callback over the whole deployment and returns the stack parameters', async () => {
      mockDeployment(
        attributes({
          awsStackCallback: waiting({ status: 'failed', error: 'old failure' }),
        })
      );
      mockCreateCallback.mockResolvedValue({
        onboardingId: 'new-onboarding-id',
        callback: 'c2lnbmVkLWZvcm0=',
        expiresAt: '2026-10-09T14:00:00Z',
      });

      const result = await startAwsStackCallback(soClient, DEPLOYMENT_ID, {
        connectorName: '  Production  ',
        accountType: 'single-account',
        iac_key: 'sha256:abc',
        iac_blueprint_id: 'workload_identity_federation',
        iac_blueprint_version: '1.3.0',
      });

      expect(result).toEqual({
        stackParams: {
          ElasticOnboardingId: 'new-onboarding-id',
          ElasticCallback: 'c2lnbmVkLWZvcm0=',
        },
        expiresAt: '2026-10-09T14:00:00Z',
      });
      const [type, attrs, options] = soClient.create.mock.calls[0];
      expect(type).toBe(CLOUD_ONBOARDING_DEPLOYMENT_SAVED_OBJECT_TYPE);
      expect(options).toEqual(
        expect.objectContaining({ id: DEPLOYMENT_ID, overwrite: true, version: 'v1' })
      );
      const callback = (attrs as CloudOnboardingDeploymentSOAttributes).awsStackCallback;
      expect(callback).toEqual(
        expect.objectContaining({
          onboardingId: 'new-onboarding-id',
          status: 'waiting',
          expiresAt: '2026-10-09T14:00:00Z',
          connectorName: 'Production',
          iac_key: 'sha256:abc',
        })
      );
      // The earlier callback's failure must not carry over.
      expect(callback?.error).toBeUndefined();
      // The signed form never goes into the saved object.
      expect(JSON.stringify(attrs)).not.toContain('c2lnbmVkLWZvcm0=');
    });

    it('refuses while an identity is being created from an earlier stack', async () => {
      mockDeployment(attributes({ awsStackCallback: waiting({ status: 'completing' }) }));

      await expect(startAwsStackCallback(soClient, DEPLOYMENT_ID, {})).rejects.toMatchObject({
        statusCode: 409,
      });
      expect(mockCreateCallback).not.toHaveBeenCalled();
    });
  });

  describe('checkAwsStackCallback', () => {
    it('returns a callback that is not waiting as is', async () => {
      const completed = waiting({ status: 'completed', connectorId: 'connector-1' });
      mockDeployment(attributes({ awsStackCallback: completed }));

      await expect(checkAwsStackCallback(soClient, DEPLOYMENT_ID, logger)).resolves.toEqual(
        completed
      );
      expect(mockGetCallback).not.toHaveBeenCalled();
    });

    it('keeps waiting while no report has arrived and the form is still valid', async () => {
      const callback = waiting();
      mockDeployment(attributes({ awsStackCallback: callback }));
      mockGetCallback.mockResolvedValue(undefined);

      await expect(checkAwsStackCallback(soClient, DEPLOYMENT_ID, logger)).resolves.toEqual(
        callback
      );
      expect(soClient.create).not.toHaveBeenCalled();
    });

    it('expires once the form has expired without a report', async () => {
      mockDeployment(
        attributes({ awsStackCallback: waiting({ expiresAt: '2020-01-01T00:00:00Z' }) })
      );
      mockGetCallback.mockResolvedValue(undefined);

      const result = await checkAwsStackCallback(soClient, DEPLOYMENT_ID, logger);

      expect(result?.status).toBe('expired');
      expect(writtenCallbacks()).toEqual([expect.objectContaining({ status: 'expired' })]);
    });

    it('creates the identity from the report and links it to the deployment', async () => {
      mockDeployment(attributes({ awsStackCallback: waiting({ connectorName: 'Production' }) }));
      mockGetCallback.mockResolvedValue(REPORT);
      mockCreateConnector.mockResolvedValue({ id: 'connector-1', name: 'Production' } as any);

      const result = await checkAwsStackCallback(soClient, DEPLOYMENT_ID, logger);

      expect(mockCreateConnector).toHaveBeenCalledWith(soClient, {
        name: 'Production',
        cloudProvider: 'aws',
        accountType: 'single-account',
        vars: { role_arn: { value: ROLE_ARN, type: 'text' } },
        iac_key: 'sha256:abc',
        iac_blueprint_id: 'workload_identity_federation',
        iac_blueprint_version: '1.3.0',
        iac_deployment_id: STACK_ID,
      });
      expect(result).toEqual(
        expect.objectContaining({ status: 'completed', connectorId: 'connector-1' })
      );
      // Claimed against the version that was read, then completed.
      expect(soClient.create.mock.calls[0][2]).toEqual(expect.objectContaining({ version: 'v1' }));
      expect(writtenCallbacks().map((c) => c?.status)).toEqual(['completing', 'completed']);
      const [, finalAttrs] = soClient.create.mock.calls[1];
      expect(finalAttrs).toEqual(
        expect.objectContaining({ connectorId: 'connector-1', authMethod: 'identity_federation' })
      );
    });

    it('names the identity after the account when no name was given', async () => {
      mockDeployment(attributes({ awsStackCallback: waiting() }));
      mockGetCallback.mockResolvedValue(REPORT);
      mockCreateConnector.mockResolvedValue({ id: 'connector-1', name: 'n' } as any);

      await checkAwsStackCallback(soClient, DEPLOYMENT_ID, logger);

      expect(mockCreateConnector.mock.calls[0][1].name).toBe('AWS 123456789012 0a1b2c3d');
    });

    it('disambiguates a name that is already taken', async () => {
      mockDeployment(attributes({ awsStackCallback: waiting({ connectorName: 'Production' }) }));
      mockGetCallback.mockResolvedValue(REPORT);
      mockCreateConnector
        .mockRejectedValueOnce(
          new CloudConnectorCreateError('A cloud connector with this name already exists')
        )
        .mockResolvedValueOnce({ id: 'connector-1', name: 'Production (0a1b2c3d)' } as any);

      const result = await checkAwsStackCallback(soClient, DEPLOYMENT_ID, logger);

      expect(mockCreateConnector.mock.calls[1][1].name).toBe('Production (0a1b2c3d)');
      expect(result?.status).toBe('completed');
    });

    it('creates nothing when another check claimed the report first', async () => {
      mockDeployment(attributes({ awsStackCallback: waiting() }));
      mockGetCallback.mockResolvedValue(REPORT);
      soClient.create.mockRejectedValueOnce(
        SavedObjectsErrorHelpers.createConflictError(
          CLOUD_ONBOARDING_DEPLOYMENT_SAVED_OBJECT_TYPE,
          DEPLOYMENT_ID
        )
      );

      await checkAwsStackCallback(soClient, DEPLOYMENT_ID, logger);

      expect(mockCreateConnector).not.toHaveBeenCalled();
    });

    it('does not replace an identity the deployment already uses', async () => {
      mockDeployment(attributes({ connectorId: 'manual', awsStackCallback: waiting() }));
      mockGetCallback.mockResolvedValue(REPORT);

      const result = await checkAwsStackCallback(soClient, DEPLOYMENT_ID, logger);

      expect(mockCreateConnector).not.toHaveBeenCalled();
      expect(result?.status).toBe('failed');
    });

    it('fails when the provider rejects the report', async () => {
      mockDeployment(attributes({ awsStackCallback: waiting() }));
      mockGetCallback.mockRejectedValue(
        new IacProvisionerRequestError('role is in another account', 422, [
          'callbacks.invalid_report',
        ])
      );

      const result = await checkAwsStackCallback(soClient, DEPLOYMENT_ID, logger);

      expect(result).toEqual(
        expect.objectContaining({ status: 'failed', error: expect.stringContaining('another') })
      );
    });

    it.each([
      ['unavailable', new IacProvisionerUnavailableError('down', 503)],
      ['throttled', new IacProvisionerRequestError('slow down', 429, [])],
    ])('leaves the callback waiting when the provider is %s', async (_, error) => {
      mockDeployment(attributes({ awsStackCallback: waiting() }));
      mockGetCallback.mockRejectedValue(error);

      await expect(checkAwsStackCallback(soClient, DEPLOYMENT_ID, logger)).rejects.toBe(error);
      expect(soClient.create).not.toHaveBeenCalled();
    });

    it('fails when the identity cannot be created', async () => {
      mockDeployment(attributes({ awsStackCallback: waiting() }));
      mockGetCallback.mockResolvedValue(REPORT);
      mockCreateConnector.mockRejectedValue(new Error('boom'));

      const result = await checkAwsStackCallback(soClient, DEPLOYMENT_ID, logger);

      expect(result).toEqual(expect.objectContaining({ status: 'failed', error: 'boom' }));
      expect(writtenCallbacks().map((c) => c?.status)).toEqual(['completing', 'failed']);
    });
  });
});
