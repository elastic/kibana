/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import type { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';

import { CLOUD_ONBOARDING_DEPLOYMENT_SAVED_OBJECT_TYPE } from '../../common/constants';
import type { CloudOnboardingDeploymentSOAttributes } from '../types/so_attributes';

import { cloudOnboardingDeploymentService } from './cloud_onboarding_deployment';
import { appContextService } from './app_context';

jest.mock('./app_context');

const mockedAppContextService = appContextService as jest.Mocked<typeof appContextService>;

function makeAttributes(
  overrides: Partial<CloudOnboardingDeploymentSOAttributes> = {}
): CloudOnboardingDeploymentSOAttributes {
  return {
    provider: 'aws',
    connectionId: 'conn-1',
    mechanisms: ['identity_federation'],
    services: ['cloudtrail'],
    status: 'pending',
    attemptCount: 1,
    vars: { role_arn: 'arn:aws:iam::123:role/Role' },
    serviceVars: {},
    secrets: { external_id: 'ext-123' },
    createdAt: '2026-05-13T10:00:00.000Z',
    updatedAt: '2026-05-13T10:00:00.000Z',
    ...overrides,
  };
}

function makeSOResponse(id: string, attributes: CloudOnboardingDeploymentSOAttributes) {
  return {
    id,
    type: CLOUD_ONBOARDING_DEPLOYMENT_SAVED_OBJECT_TYPE,
    references: [],
    attributes,
  };
}

function makeMockedEncryptedSoClient(
  id: string,
  attributes: CloudOnboardingDeploymentSOAttributes
) {
  const esoClientMock: jest.Mocked<EncryptedSavedObjectsClient> = {
    getDecryptedAsInternalUser: jest.fn().mockResolvedValue(makeSOResponse(id, attributes)),
    createPointInTimeFinderDecryptedAsInternalUser: jest.fn(),
  };
  mockedAppContextService.getEncryptedSavedObjects.mockReturnValue(esoClientMock);
  return esoClientMock;
}

describe('cloudOnboardingDeploymentService', () => {
  let soClient: ReturnType<typeof savedObjectsClientMock.create>;

  beforeEach(() => {
    soClient = savedObjectsClientMock.create();
  });

  describe('create', () => {
    it('creates a deployment SO and returns the mapped deployment', async () => {
      const attrs = makeAttributes();
      soClient.create.mockResolvedValue(makeSOResponse('deploy-1', attrs));

      const result = await cloudOnboardingDeploymentService.create(soClient, {
        provider: 'aws',
        connectionId: 'conn-1',
        mechanisms: ['identity_federation'],
        services: ['cloudtrail'],
        status: 'pending',
        attemptCount: 1,
        vars: { role_arn: 'arn:aws:iam::123:role/Role' },
        serviceVars: {},
        secrets: { external_id: 'ext-123' },
        createdAt: attrs.createdAt,
        updatedAt: attrs.updatedAt,
      });

      expect(soClient.create).toHaveBeenCalledWith(
        CLOUD_ONBOARDING_DEPLOYMENT_SAVED_OBJECT_TYPE,
        expect.objectContaining({ connectionId: 'conn-1', status: 'pending' })
      );
      expect(result.id).toBe('deploy-1');
      expect(result.connectionId).toBe('conn-1');
      expect(result.mechanisms).toEqual(['identity_federation']);
      expect(result.secrets).toEqual({ external_id: 'ext-123' });
    });

    it('throws FleetError when SO creation returns an error', async () => {
      soClient.create.mockResolvedValue({
        id: 'deploy-1',
        type: CLOUD_ONBOARDING_DEPLOYMENT_SAVED_OBJECT_TYPE,
        references: [],
        attributes: makeAttributes(),
        error: { statusCode: 500, error: 'Internal Server Error', message: 'write failed' },
      });

      await expect(
        cloudOnboardingDeploymentService.create(soClient, {
          provider: 'aws',
          connectionId: 'conn-1',
          mechanisms: ['identity_federation'],
          services: [],
          status: 'pending',
          attemptCount: 1,
          vars: {},
          serviceVars: {},
          secrets: {},
          createdAt: '2026-05-13T10:00:00.000Z',
          updatedAt: '2026-05-13T10:00:00.000Z',
        })
      ).rejects.toThrow('write failed');
    });
  });

  describe('getById', () => {
    it('returns the decrypted deployment', async () => {
      const attrs = makeAttributes({ status: 'succeeded' });
      makeMockedEncryptedSoClient('deploy-1', attrs);

      const result = await cloudOnboardingDeploymentService.getById('deploy-1');

      expect(result.id).toBe('deploy-1');
      expect(result.status).toBe('succeeded');
      expect(result.secrets).toEqual({ external_id: 'ext-123' });
    });

    it('throws FleetError when the SO has an error field', async () => {
      const esoClientMock: jest.Mocked<EncryptedSavedObjectsClient> = {
        getDecryptedAsInternalUser: jest.fn().mockResolvedValue({
          id: 'deploy-1',
          type: CLOUD_ONBOARDING_DEPLOYMENT_SAVED_OBJECT_TYPE,
          references: [],
          attributes: makeAttributes(),
          error: { statusCode: 404, error: 'Not Found', message: 'not found' },
        }),
        createPointInTimeFinderDecryptedAsInternalUser: jest.fn(),
      };
      mockedAppContextService.getEncryptedSavedObjects.mockReturnValue(esoClientMock);

      await expect(cloudOnboardingDeploymentService.getById('deploy-missing')).rejects.toThrow(
        'not found'
      );
    });
  });

  describe('getByConnectionId', () => {
    it('returns all deployments for a connection', async () => {
      const attrs1 = makeAttributes({ mechanisms: ['identity_federation'] });
      const attrs2 = makeAttributes({ mechanisms: ['firehose'] });

      const esoClientMock: jest.Mocked<EncryptedSavedObjectsClient> = {
        getDecryptedAsInternalUser: jest.fn(),
        createPointInTimeFinderDecryptedAsInternalUser: jest.fn().mockResolvedValue({
          async *find() {
            yield {
              saved_objects: [
                makeSOResponse('deploy-1', attrs1),
                makeSOResponse('deploy-2', attrs2),
              ],
            };
          },
          close: jest.fn(),
        }),
      };
      mockedAppContextService.getEncryptedSavedObjects.mockReturnValue(esoClientMock);

      const results = await cloudOnboardingDeploymentService.getByConnectionId('conn-1');

      expect(results).toHaveLength(2);
      expect(results[0].id).toBe('deploy-1');
      expect(results[1].id).toBe('deploy-2');
      expect(esoClientMock.createPointInTimeFinderDecryptedAsInternalUser).toHaveBeenCalledWith(
        expect.objectContaining({
          type: CLOUD_ONBOARDING_DEPLOYMENT_SAVED_OBJECT_TYPE,
          filter: expect.stringContaining('conn-1'),
        })
      );
    });

    it('returns an empty array when no deployments exist', async () => {
      const esoClientMock: jest.Mocked<EncryptedSavedObjectsClient> = {
        getDecryptedAsInternalUser: jest.fn(),
        createPointInTimeFinderDecryptedAsInternalUser: jest.fn().mockResolvedValue({
          async *find() {
            yield { saved_objects: [] };
          },
          close: jest.fn(),
        }),
      };
      mockedAppContextService.getEncryptedSavedObjects.mockReturnValue(esoClientMock);

      const results = await cloudOnboardingDeploymentService.getByConnectionId('conn-none');
      expect(results).toEqual([]);
    });
  });

  describe('update', () => {
    it('persists deploymentId and deploymentName after stack is deployed', async () => {
      const deploymentId =
        'arn:aws:cloudformation:us-east-1:123456789012:stack/elastic-aws-onboarding/aaa-bbb';
      const deploymentName = 'elastic-aws-onboarding';
      const updatedAttrs = makeAttributes({ deploymentId, deploymentName, status: 'deploying' });
      soClient.update.mockResolvedValue({
        id: 'deploy-1',
        type: CLOUD_ONBOARDING_DEPLOYMENT_SAVED_OBJECT_TYPE,
        references: [],
        attributes: updatedAttrs,
      });
      makeMockedEncryptedSoClient('deploy-1', updatedAttrs);

      const result = await cloudOnboardingDeploymentService.update(soClient, 'deploy-1', {
        deploymentId,
        deploymentName,
        status: 'deploying',
      });

      expect(soClient.update).toHaveBeenCalledWith(
        CLOUD_ONBOARDING_DEPLOYMENT_SAVED_OBJECT_TYPE,
        'deploy-1',
        expect.objectContaining({ deploymentId, deploymentName, status: 'deploying' })
      );
      expect(result.deploymentId).toBe(deploymentId);
      expect(result.deploymentName).toBe(deploymentName);
      expect(result.status).toBe('deploying');
    });

    it('persists serviceVars and returns the refreshed deployment', async () => {
      const serviceVars = {
        cloudtrail: [
          {
            regions: ['us-east-1'],
            s3_bucket_arn: 'arn:aws:s3:::bucket-1',
            cloudtrail_trail_arn: 'arn:aws:cloudtrail:us-east-1:123:trail/Trail1',
          },
          {
            regions: ['eu-west-1'],
            s3_bucket_arn: 'arn:aws:s3:::bucket-2',
            cloudtrail_trail_arn: 'arn:aws:cloudtrail:eu-west-1:123:trail/Trail2',
          },
        ],
        elb_logs: [{ regions: ['us-east-1'], s3_bucket_arn: 'arn:aws:s3:::elb-bucket' }],
      };
      const updatedAttrs = makeAttributes({ serviceVars });
      soClient.update.mockResolvedValue({
        id: 'deploy-1',
        type: CLOUD_ONBOARDING_DEPLOYMENT_SAVED_OBJECT_TYPE,
        references: [],
        attributes: updatedAttrs,
      });
      makeMockedEncryptedSoClient('deploy-1', updatedAttrs);

      const result = await cloudOnboardingDeploymentService.update(soClient, 'deploy-1', {
        serviceVars,
      });

      expect(soClient.update).toHaveBeenCalledWith(
        CLOUD_ONBOARDING_DEPLOYMENT_SAVED_OBJECT_TYPE,
        'deploy-1',
        expect.objectContaining({ serviceVars })
      );
      expect(result.serviceVars).toEqual(serviceVars);
      expect(result.serviceVars.cloudtrail).toHaveLength(2);
      expect(result.serviceVars.elb_logs).toHaveLength(1);
    });
  });

  describe('updateStatus', () => {
    it('updates status and returns the refreshed deployment', async () => {
      const updatedAttrs = makeAttributes({ status: 'deploying' });
      soClient.update.mockResolvedValue({
        id: 'deploy-1',
        type: CLOUD_ONBOARDING_DEPLOYMENT_SAVED_OBJECT_TYPE,
        references: [],
        attributes: updatedAttrs,
      });
      makeMockedEncryptedSoClient('deploy-1', updatedAttrs);

      const result = await cloudOnboardingDeploymentService.updateStatus(
        soClient,
        'deploy-1',
        'deploying'
      );

      expect(soClient.update).toHaveBeenCalledWith(
        CLOUD_ONBOARDING_DEPLOYMENT_SAVED_OBJECT_TYPE,
        'deploy-1',
        expect.objectContaining({ status: 'deploying' })
      );
      expect(result.status).toBe('deploying');
    });

    it('includes statusMessage when provided', async () => {
      const updatedAttrs = makeAttributes({ status: 'failed', statusMessage: 'stack rollback' });
      soClient.update.mockResolvedValue({
        id: 'deploy-1',
        type: CLOUD_ONBOARDING_DEPLOYMENT_SAVED_OBJECT_TYPE,
        references: [],
        attributes: updatedAttrs,
      });
      makeMockedEncryptedSoClient('deploy-1', updatedAttrs);

      await cloudOnboardingDeploymentService.updateStatus(
        soClient,
        'deploy-1',
        'failed',
        'stack rollback'
      );

      expect(soClient.update).toHaveBeenCalledWith(
        CLOUD_ONBOARDING_DEPLOYMENT_SAVED_OBJECT_TYPE,
        'deploy-1',
        expect.objectContaining({ status: 'failed', statusMessage: 'stack rollback' })
      );
    });

    describe('status transitions', () => {
      function mockUpdateAndGet(id: string, attrs: CloudOnboardingDeploymentSOAttributes) {
        soClient.update.mockResolvedValue({
          id,
          type: CLOUD_ONBOARDING_DEPLOYMENT_SAVED_OBJECT_TYPE,
          references: [],
          attributes: attrs,
        });
        makeMockedEncryptedSoClient(id, attrs);
      }

      it('pending → deploying: sets status without deploymentId', async () => {
        mockUpdateAndGet('deploy-1', makeAttributes({ status: 'deploying' }));

        const result = await cloudOnboardingDeploymentService.updateStatus(
          soClient,
          'deploy-1',
          'deploying'
        );

        expect(result.status).toBe('deploying');
        expect(result.deploymentId).toBeUndefined();
      });

      it('deploying → succeeded: status is succeeded and deploymentId is persisted', async () => {
        const stackArn =
          'arn:aws:cloudformation:us-east-1:123456789012:stack/elastic-aws-onboarding/aaa-bbb';
        mockUpdateAndGet(
          'deploy-1',
          makeAttributes({ status: 'succeeded', deploymentId: stackArn })
        );

        const result = await cloudOnboardingDeploymentService.update(soClient, 'deploy-1', {
          status: 'succeeded',
          deploymentId: stackArn,
        });

        expect(result.status).toBe('succeeded');
        expect(result.deploymentId).toBe(stackArn);
        expect(soClient.update).toHaveBeenCalledWith(
          CLOUD_ONBOARDING_DEPLOYMENT_SAVED_OBJECT_TYPE,
          'deploy-1',
          expect.objectContaining({ status: 'succeeded', deploymentId: stackArn })
        );
      });

      it('deploying → failed: status is failed and statusMessage is set', async () => {
        mockUpdateAndGet(
          'deploy-1',
          makeAttributes({ status: 'failed', statusMessage: 'ROLLBACK_COMPLETE' })
        );

        const result = await cloudOnboardingDeploymentService.updateStatus(
          soClient,
          'deploy-1',
          'failed',
          'ROLLBACK_COMPLETE'
        );

        expect(result.status).toBe('failed');
        expect(result.statusMessage).toBe('ROLLBACK_COMPLETE');
      });
    });

    describe('retry semantics', () => {
      it('resets status to pending and increments attemptCount', async () => {
        const retriedAttrs = makeAttributes({ status: 'pending', attemptCount: 2 });
        soClient.update.mockResolvedValue({
          id: 'deploy-1',
          type: CLOUD_ONBOARDING_DEPLOYMENT_SAVED_OBJECT_TYPE,
          references: [],
          attributes: retriedAttrs,
        });
        makeMockedEncryptedSoClient('deploy-1', retriedAttrs);

        const result = await cloudOnboardingDeploymentService.update(soClient, 'deploy-1', {
          status: 'pending',
          attemptCount: 2,
        });

        expect(result.status).toBe('pending');
        expect(result.attemptCount).toBe(2);
        expect(soClient.update).toHaveBeenCalledWith(
          CLOUD_ONBOARDING_DEPLOYMENT_SAVED_OBJECT_TYPE,
          'deploy-1',
          expect.objectContaining({ status: 'pending', attemptCount: 2 })
        );
      });

      it('does not modify vars or secrets on retry', async () => {
        const vars = { role_arn: 'arn:aws:iam::123:role/Role' };
        const secrets = { external_id: 'ext-123' };
        const retriedAttrs = makeAttributes({ status: 'pending', attemptCount: 2, vars, secrets });
        soClient.update.mockResolvedValue({
          id: 'deploy-1',
          type: CLOUD_ONBOARDING_DEPLOYMENT_SAVED_OBJECT_TYPE,
          references: [],
          attributes: retriedAttrs,
        });
        makeMockedEncryptedSoClient('deploy-1', retriedAttrs);

        const result = await cloudOnboardingDeploymentService.update(soClient, 'deploy-1', {
          status: 'pending',
          attemptCount: 2,
        });

        expect(result.vars).toEqual(vars);
        expect(result.secrets).toEqual(secrets);
        expect(soClient.update).not.toHaveBeenCalledWith(
          expect.anything(),
          expect.anything(),
          expect.objectContaining({ vars: expect.anything(), secrets: expect.anything() })
        );
      });

      it('increments attemptCount on each retry', async () => {
        for (const attempt of [2, 3]) {
          const attrs = makeAttributes({ status: 'pending', attemptCount: attempt });
          soClient.update.mockResolvedValue({
            id: 'deploy-1',
            type: CLOUD_ONBOARDING_DEPLOYMENT_SAVED_OBJECT_TYPE,
            references: [],
            attributes: attrs,
          });
          makeMockedEncryptedSoClient('deploy-1', attrs);

          const result = await cloudOnboardingDeploymentService.update(soClient, 'deploy-1', {
            status: 'pending',
            attemptCount: attempt,
          });

          expect(result.attemptCount).toBe(attempt);
        }
      });
    });
  });

  describe('delete', () => {
    it('calls soClient.delete with the correct type and id', async () => {
      soClient.delete.mockResolvedValue({});

      await cloudOnboardingDeploymentService.delete(soClient, 'deploy-1');

      expect(soClient.delete).toHaveBeenCalledWith(
        CLOUD_ONBOARDING_DEPLOYMENT_SAVED_OBJECT_TYPE,
        'deploy-1'
      );
    });
  });

  // UC1: Identity Federation + CloudWatch Metrics + Agentless
  // UC2: Static Keys + CloudWatch Metrics + Agentless
  // UC3: Static Keys + CloudFront Logs + EDOT Cloud Forwarder
  // UC4: Identity Federation + CloudFront Logs + Firehose
  // UC5: Identity Federation + CloudFront Logs + EDOT Cloud Forwarder
  describe('use case scenarios', () => {
    describe('UC1: identity_federation + cloudwatch_metrics + agentless', () => {
      it('stores external_id in secrets, no api_key_id, and sets packagePolicyIds after agentless stack succeeds', async () => {
        const attrs = makeAttributes({
          mechanisms: ['identity_federation'],
          services: ['cloudwatch_metrics'],
          serviceVars: { cloudwatch_metrics: [{ regions: ['us-east-1'], namespace: 'AWS/EC2' }] },
          vars: { role_arn: 'arn:aws:iam::123456789012:role/ElasticIFRole' },
          secrets: { external_id: 'ext-uc1' },
          packagePolicyIds: ['pkg-aws-001'],
          status: 'succeeded',
        });
        soClient.create.mockResolvedValue(makeSOResponse('deploy-uc1', attrs));

        const result = await cloudOnboardingDeploymentService.create(soClient, {
          provider: 'aws',
          connectionId: 'conn-1',
          mechanisms: ['identity_federation'],
          services: ['cloudwatch_metrics'],
          serviceVars: { cloudwatch_metrics: [{ regions: ['us-east-1'], namespace: 'AWS/EC2' }] },
          vars: { role_arn: 'arn:aws:iam::123456789012:role/ElasticIFRole' },
          secrets: { external_id: 'ext-uc1' },
          packagePolicyIds: ['pkg-aws-001'],
          status: 'succeeded',
          attemptCount: 1,
          createdAt: attrs.createdAt,
          updatedAt: attrs.updatedAt,
        });

        expect(result.mechanisms).toEqual(['identity_federation']);
        expect(result.secrets).toEqual({ external_id: 'ext-uc1' });
        expect(result.vars).not.toHaveProperty('api_key_id');
        expect(result.packagePolicyIds).toEqual(['pkg-aws-001']);
      });
    });

    describe('UC2: static_keys + cloudwatch_metrics + agentless', () => {
      it('stores no external_id or api_key_id, uses empty mechanisms, and sets packagePolicyIds', async () => {
        const attrs = makeAttributes({
          mechanisms: [],
          services: ['cloudwatch_metrics'],
          serviceVars: { cloudwatch_metrics: [{ regions: ['us-east-1'], namespace: 'AWS/EC2' }] },
          vars: {},
          secrets: {},
          packagePolicyIds: ['pkg-aws-002'],
          status: 'succeeded',
        });
        soClient.create.mockResolvedValue(makeSOResponse('deploy-uc2', attrs));

        const result = await cloudOnboardingDeploymentService.create(soClient, {
          provider: 'aws',
          connectionId: 'conn-2',
          mechanisms: [],
          services: ['cloudwatch_metrics'],
          serviceVars: { cloudwatch_metrics: [{ regions: ['us-east-1'], namespace: 'AWS/EC2' }] },
          vars: {},
          secrets: {},
          packagePolicyIds: ['pkg-aws-002'],
          status: 'succeeded',
          attemptCount: 1,
          createdAt: attrs.createdAt,
          updatedAt: attrs.updatedAt,
        });

        expect(result.mechanisms).toEqual([]);
        expect(result.secrets).toEqual({});
        expect(result.vars).not.toHaveProperty('api_key_id');
        expect(result.vars).not.toHaveProperty('role_arn');
        expect(result.packagePolicyIds).toEqual(['pkg-aws-002']);
      });
    });

    describe('UC3: static_keys + cloudfront_logs + cloud_forwarder', () => {
      it('stores api_key_id in vars, no external_id in secrets, and no packagePolicyIds', async () => {
        const attrs = makeAttributes({
          mechanisms: ['cloud_forwarder'],
          services: ['cloudfront_logs'],
          serviceVars: {
            cloudfront_logs: [
              { regions: ['us-east-1'], s3_bucket_arn: 'arn:aws:s3:::cf-logs-bucket' },
            ],
          },
          vars: { api_key_id: 'abc123keyid' },
          secrets: {},
          packagePolicyIds: undefined,
          status: 'succeeded',
        });
        soClient.create.mockResolvedValue(makeSOResponse('deploy-uc3', attrs));

        const result = await cloudOnboardingDeploymentService.create(soClient, {
          provider: 'aws',
          connectionId: 'conn-3',
          mechanisms: ['cloud_forwarder'],
          services: ['cloudfront_logs'],
          serviceVars: {
            cloudfront_logs: [
              { regions: ['us-east-1'], s3_bucket_arn: 'arn:aws:s3:::cf-logs-bucket' },
            ],
          },
          vars: { api_key_id: 'abc123keyid' },
          secrets: {},
          status: 'succeeded',
          attemptCount: 1,
          createdAt: attrs.createdAt,
          updatedAt: attrs.updatedAt,
        });

        expect(result.mechanisms).toEqual(['cloud_forwarder']);
        expect(result.vars).toEqual({ api_key_id: 'abc123keyid' });
        expect(result.secrets).toEqual({});
        expect(result.packagePolicyIds).toBeUndefined();
      });

      it('stores per-service S3 config in serviceVars', async () => {
        const serviceVars = {
          cloudfront_logs: [
            { regions: ['us-east-1'], s3_bucket_arn: 'arn:aws:s3:::cf-logs-bucket' },
          ],
        };
        const attrs = makeAttributes({
          mechanisms: ['cloud_forwarder'],
          services: ['cloudfront_logs'],
          serviceVars,
        });
        soClient.create.mockResolvedValue(makeSOResponse('deploy-uc3b', attrs));

        const result = await cloudOnboardingDeploymentService.create(soClient, {
          provider: 'aws',
          connectionId: 'conn-3',
          mechanisms: ['cloud_forwarder'],
          services: ['cloudfront_logs'],
          serviceVars,
          vars: {},
          secrets: {},
          status: 'pending',
          attemptCount: 1,
          createdAt: attrs.createdAt,
          updatedAt: attrs.updatedAt,
        });

        expect(result.serviceVars.cloudfront_logs).toHaveLength(1);
        expect(result.serviceVars.cloudfront_logs[0]).toMatchObject({
          regions: ['us-east-1'],
          s3_bucket_arn: 'arn:aws:s3:::cf-logs-bucket',
        });
      });
    });

    describe('UC4: identity_federation + cloudfront_logs + firehose', () => {
      it('stores external_id in secrets and api_key_id in vars, with no packagePolicyIds', async () => {
        const attrs = makeAttributes({
          mechanisms: ['identity_federation', 'firehose'],
          services: ['cloudfront_logs'],
          serviceVars: {
            cloudfront_logs: [
              { regions: ['us-east-1', 'eu-west-1'], s3_bucket_arn: 'arn:aws:s3:::cf-logs' },
            ],
          },
          vars: {
            role_arn: 'arn:aws:iam::123456789012:role/ElasticIFRole',
            api_key_id: 'abc123keyid',
          },
          secrets: { external_id: 'ext-uc4' },
          packagePolicyIds: undefined,
          status: 'succeeded',
        });
        soClient.create.mockResolvedValue(makeSOResponse('deploy-uc4', attrs));

        const result = await cloudOnboardingDeploymentService.create(soClient, {
          provider: 'aws',
          connectionId: 'conn-4',
          mechanisms: ['identity_federation', 'firehose'],
          services: ['cloudfront_logs'],
          serviceVars: {
            cloudfront_logs: [
              { regions: ['us-east-1', 'eu-west-1'], s3_bucket_arn: 'arn:aws:s3:::cf-logs' },
            ],
          },
          vars: {
            role_arn: 'arn:aws:iam::123456789012:role/ElasticIFRole',
            api_key_id: 'abc123keyid',
          },
          secrets: { external_id: 'ext-uc4' },
          status: 'succeeded',
          attemptCount: 1,
          createdAt: attrs.createdAt,
          updatedAt: attrs.updatedAt,
        });

        expect(result.mechanisms).toEqual(['identity_federation', 'firehose']);
        expect(result.vars).toEqual({
          role_arn: 'arn:aws:iam::123456789012:role/ElasticIFRole',
          api_key_id: 'abc123keyid',
        });
        expect(result.secrets).toEqual({ external_id: 'ext-uc4' });
        expect(result.packagePolicyIds).toBeUndefined();
      });
    });

    describe('UC5: identity_federation + cloudfront_logs + cloud_forwarder', () => {
      it('stores external_id in secrets and api_key_id in vars, with no packagePolicyIds', async () => {
        const attrs = makeAttributes({
          mechanisms: ['identity_federation', 'cloud_forwarder'],
          services: ['cloudfront_logs'],
          serviceVars: {
            cloudfront_logs: [
              { regions: ['us-east-1'], s3_bucket_arn: 'arn:aws:s3:::cf-logs-bucket' },
            ],
          },
          vars: {
            role_arn: 'arn:aws:iam::123456789012:role/ElasticIFRole',
            api_key_id: 'abc123keyid',
          },
          secrets: { external_id: 'ext-uc5' },
          packagePolicyIds: undefined,
          status: 'succeeded',
        });
        soClient.create.mockResolvedValue(makeSOResponse('deploy-uc5', attrs));

        const result = await cloudOnboardingDeploymentService.create(soClient, {
          provider: 'aws',
          connectionId: 'conn-5',
          mechanisms: ['identity_federation', 'cloud_forwarder'],
          services: ['cloudfront_logs'],
          serviceVars: {
            cloudfront_logs: [
              { regions: ['us-east-1'], s3_bucket_arn: 'arn:aws:s3:::cf-logs-bucket' },
            ],
          },
          vars: {
            role_arn: 'arn:aws:iam::123456789012:role/ElasticIFRole',
            api_key_id: 'abc123keyid',
          },
          secrets: { external_id: 'ext-uc5' },
          status: 'succeeded',
          attemptCount: 1,
          createdAt: attrs.createdAt,
          updatedAt: attrs.updatedAt,
        });

        expect(result.mechanisms).toEqual(['identity_federation', 'cloud_forwarder']);
        expect(result.vars).toEqual({
          role_arn: 'arn:aws:iam::123456789012:role/ElasticIFRole',
          api_key_id: 'abc123keyid',
        });
        expect(result.secrets).toEqual({ external_id: 'ext-uc5' });
        expect(result.packagePolicyIds).toBeUndefined();
      });

      it('differs from UC3 by including identity_federation in mechanisms and external_id in secrets', async () => {
        const uc3Attrs = makeAttributes({ mechanisms: ['cloud_forwarder'], secrets: {} });
        const uc5Attrs = makeAttributes({
          mechanisms: ['identity_federation', 'cloud_forwarder'],
          secrets: { external_id: 'ext-uc5' },
        });
        soClient.create
          .mockResolvedValueOnce(makeSOResponse('deploy-uc3', uc3Attrs))
          .mockResolvedValueOnce(makeSOResponse('deploy-uc5', uc5Attrs));

        const uc3 = await cloudOnboardingDeploymentService.create(soClient, {
          provider: 'aws',
          connectionId: 'conn-3',
          mechanisms: ['cloud_forwarder'],
          services: ['cloudfront_logs'],
          serviceVars: {},
          vars: {},
          secrets: {},
          status: 'pending',
          attemptCount: 1,
          createdAt: uc3Attrs.createdAt,
          updatedAt: uc3Attrs.updatedAt,
        });
        const uc5 = await cloudOnboardingDeploymentService.create(soClient, {
          provider: 'aws',
          connectionId: 'conn-5',
          mechanisms: ['identity_federation', 'cloud_forwarder'],
          services: ['cloudfront_logs'],
          serviceVars: {},
          vars: { role_arn: 'arn:aws:iam::123456789012:role/ElasticIFRole' },
          secrets: { external_id: 'ext-uc5' },
          status: 'pending',
          attemptCount: 1,
          createdAt: uc5Attrs.createdAt,
          updatedAt: uc5Attrs.updatedAt,
        });

        expect(uc3.mechanisms).not.toContain('identity_federation');
        expect(uc3.secrets).toEqual({});
        expect(uc5.mechanisms).toContain('identity_federation');
        expect(uc5.secrets).toHaveProperty('external_id');
      });
    });
  });
});
