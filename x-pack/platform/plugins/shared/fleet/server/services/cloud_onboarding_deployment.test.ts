/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import type { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';

import { CLOUD_ONBOARDING_DEPLOYMENT_SAVED_OBJECT_TYPE } from '../../common/constants';
import type { CloudOnboardingDeploymentMechanism } from '../../common/types/models/cloud_onboarding_deployment';
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
    connectorId: 'conn-1',
    mechanisms: ['identity_federation'],
    services: ['cloudtrail'],
    status: 'pending',
    attemptCount: 1,
    vars: { role_arn: 'arn:aws:iam::123:role/Role' },
    serviceVars: {},
    secrets: { external_id: 'ext-123' },
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
  const esoClientMock = {
    getDecryptedAsInternalUser: jest.fn().mockResolvedValue(makeSOResponse(id, attributes)),
    createPointInTimeFinderDecryptedAsInternalUser: jest.fn(),
  } as jest.Mocked<EncryptedSavedObjectsClient>;
  mockedAppContextService.getEncryptedSavedObjects.mockReturnValue(esoClientMock);
  return esoClientMock;
}

describe('cloudOnboardingDeploymentService', () => {
  let soClient: ReturnType<typeof savedObjectsClientMock.create>;

  beforeEach(() => {
    soClient = savedObjectsClientMock.create();
  });

  describe('create', () => {
    it('creates a deployment SO with server-set status/attemptCount/timestamps and returns the mapped deployment', async () => {
      const attrs = makeAttributes();
      soClient.create.mockResolvedValue(makeSOResponse('deploy-1', attrs));

      const result = await cloudOnboardingDeploymentService.create(soClient, {
        provider: 'aws',
        connectorId: 'conn-1',
        mechanisms: ['identity_federation'],
        services: ['cloudtrail'],
        vars: { role_arn: 'arn:aws:iam::123:role/Role' },
        serviceVars: {},
        secrets: { external_id: 'ext-123' },
      });

      expect(soClient.create).toHaveBeenCalledWith(
        CLOUD_ONBOARDING_DEPLOYMENT_SAVED_OBJECT_TYPE,
        expect.objectContaining({
          connectorId: 'conn-1',
          status: 'pending',
          attemptCount: 1,
        })
      );
      expect(result.id).toBe('deploy-1');
      expect(result.connectorId).toBe('conn-1');
      expect(result.mechanisms).toEqual(['identity_federation']);
      expect(result.status).toBe('pending');
      expect(result.attemptCount).toBe(1);
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
          connectorId: 'conn-1',
          mechanisms: ['identity_federation'],
          services: [],
          vars: {},
          serviceVars: {},
          secrets: {},
        })
      ).rejects.toThrow('write failed');
    });
  });

  describe('getById', () => {
    it('returns the decrypted deployment scoped to the request namespace', async () => {
      const attrs = makeAttributes({ status: 'succeeded' });
      const esoClientMock = makeMockedEncryptedSoClient('deploy-1', attrs);
      soClient.getCurrentNamespace.mockReturnValue('space-a');

      const result = await cloudOnboardingDeploymentService.getById(soClient, 'deploy-1');

      expect(esoClientMock.getDecryptedAsInternalUser).toHaveBeenCalledWith(
        CLOUD_ONBOARDING_DEPLOYMENT_SAVED_OBJECT_TYPE,
        'deploy-1',
        { namespace: 'space-a' }
      );
      expect(result.id).toBe('deploy-1');
      expect(result.status).toBe('succeeded');
      expect(result.secrets).toEqual({ external_id: 'ext-123' });
    });

    it('uses undefined namespace for the default space', async () => {
      const attrs = makeAttributes();
      const esoClientMock = makeMockedEncryptedSoClient('deploy-1', attrs);
      soClient.getCurrentNamespace.mockReturnValue(undefined);

      await cloudOnboardingDeploymentService.getById(soClient, 'deploy-1');

      expect(esoClientMock.getDecryptedAsInternalUser).toHaveBeenCalledWith(
        CLOUD_ONBOARDING_DEPLOYMENT_SAVED_OBJECT_TYPE,
        'deploy-1',
        { namespace: undefined }
      );
    });

    it('throws FleetError when the SO has an error field', async () => {
      const esoClientMock = {
        getDecryptedAsInternalUser: jest.fn().mockResolvedValue({
          id: 'deploy-1',
          type: CLOUD_ONBOARDING_DEPLOYMENT_SAVED_OBJECT_TYPE,
          references: [],
          attributes: makeAttributes(),
          error: { statusCode: 404, error: 'Not Found', message: 'not found' },
        }),
        createPointInTimeFinderDecryptedAsInternalUser: jest.fn(),
      } as jest.Mocked<EncryptedSavedObjectsClient>;
      mockedAppContextService.getEncryptedSavedObjects.mockReturnValue(esoClientMock);

      await expect(
        cloudOnboardingDeploymentService.getById(soClient, 'deploy-missing')
      ).rejects.toThrow('not found');
    });
  });

  describe('getByConnectorId', () => {
    it('passes soClient as PIT finder dependency for namespace scoping', async () => {
      const attrs1 = makeAttributes({ mechanisms: ['identity_federation'] });
      const attrs2 = makeAttributes({ mechanisms: ['firehose'] });

      const esoClientMock = {
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
      } as jest.Mocked<EncryptedSavedObjectsClient>;
      mockedAppContextService.getEncryptedSavedObjects.mockReturnValue(esoClientMock);

      const results = await cloudOnboardingDeploymentService.getByConnectorId(soClient, 'conn-1');

      expect(results).toHaveLength(2);
      expect(results[0].id).toBe('deploy-1');
      expect(results[1].id).toBe('deploy-2');
      expect(esoClientMock.createPointInTimeFinderDecryptedAsInternalUser).toHaveBeenCalledWith(
        expect.objectContaining({
          type: CLOUD_ONBOARDING_DEPLOYMENT_SAVED_OBJECT_TYPE,
          filter: expect.any(Object),
        }),
        { client: soClient }
      );
    });

    it('returns an empty array when no deployments exist', async () => {
      const esoClientMock = {
        getDecryptedAsInternalUser: jest.fn(),
        createPointInTimeFinderDecryptedAsInternalUser: jest.fn().mockResolvedValue({
          async *find() {
            yield { saved_objects: [] };
          },
          close: jest.fn(),
        }),
      } as jest.Mocked<EncryptedSavedObjectsClient>;
      mockedAppContextService.getEncryptedSavedObjects.mockReturnValue(esoClientMock);

      const results = await cloudOnboardingDeploymentService.getByConnectorId(
        soClient,
        'conn-none'
      );
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
      expect(result.serviceVars?.cloudtrail).toHaveLength(2);
      expect(result.serviceVars?.elb_logs).toHaveLength(1);
    });
  });

  describe('update (status transitions)', () => {
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

        const result = await cloudOnboardingDeploymentService.update(soClient, 'deploy-1', {
          status: 'deploying',
        });

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

        const result = await cloudOnboardingDeploymentService.update(soClient, 'deploy-1', {
          status: 'failed',
          statusMessage: 'ROLLBACK_COMPLETE',
        });

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
      it('stores external_id in secrets, no api_key_id, and sets packagePolicyIds', async () => {
        const attrs = makeAttributes({
          mechanisms: ['identity_federation'],
          services: ['cloudwatch_metrics'],
          serviceVars: { cloudwatch_metrics: [{ regions: ['us-east-1'], namespace: 'AWS/EC2' }] },
          vars: { role_arn: 'arn:aws:iam::123456789012:role/ElasticIFRole' },
          secrets: { external_id: 'ext-uc1' },
          packagePolicyIds: ['pkg-aws-001'],
        });
        soClient.create.mockResolvedValue(makeSOResponse('deploy-uc1', attrs));

        const result = await cloudOnboardingDeploymentService.create(soClient, {
          provider: 'aws',
          connectorId: 'conn-1',
          mechanisms: ['identity_federation'],
          services: ['cloudwatch_metrics'],
          serviceVars: { cloudwatch_metrics: [{ regions: ['us-east-1'], namespace: 'AWS/EC2' }] },
          vars: { role_arn: 'arn:aws:iam::123456789012:role/ElasticIFRole' },
          secrets: { external_id: 'ext-uc1' },
        });

        expect(soClient.create).toHaveBeenCalledWith(
          CLOUD_ONBOARDING_DEPLOYMENT_SAVED_OBJECT_TYPE,
          expect.objectContaining({ status: 'pending', attemptCount: 1 })
        );
        expect(result.status).toBe('pending');
        expect(result.attemptCount).toBe(1);
        expect(result.mechanisms).toEqual(['identity_federation']);
        expect(result.secrets).toEqual({ external_id: 'ext-uc1' });
        expect(result.vars).not.toHaveProperty('api_key_id');
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
        });
        soClient.create.mockResolvedValue(makeSOResponse('deploy-uc2', attrs));

        const result = await cloudOnboardingDeploymentService.create(soClient, {
          provider: 'aws',
          connectorId: 'conn-2',
          mechanisms: [],
          services: ['cloudwatch_metrics'],
          serviceVars: { cloudwatch_metrics: [{ regions: ['us-east-1'], namespace: 'AWS/EC2' }] },
          vars: {},
          secrets: {},
        });

        expect(soClient.create).toHaveBeenCalledWith(
          CLOUD_ONBOARDING_DEPLOYMENT_SAVED_OBJECT_TYPE,
          expect.objectContaining({ status: 'pending', attemptCount: 1 })
        );
        expect(result.status).toBe('pending');
        expect(result.attemptCount).toBe(1);
        expect(result.mechanisms).toEqual([]);
        expect(result.secrets).toEqual({});
        expect(result.vars).not.toHaveProperty('api_key_id');
        expect(result.vars).not.toHaveProperty('role_arn');
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
        });
        soClient.create.mockResolvedValue(makeSOResponse('deploy-uc3', attrs));

        const result = await cloudOnboardingDeploymentService.create(soClient, {
          provider: 'aws',
          connectorId: 'conn-3',
          mechanisms: ['cloud_forwarder'],
          services: ['cloudfront_logs'],
          serviceVars: {
            cloudfront_logs: [
              { regions: ['us-east-1'], s3_bucket_arn: 'arn:aws:s3:::cf-logs-bucket' },
            ],
          },
          vars: { api_key_id: 'abc123keyid' },
          secrets: {},
        });

        expect(soClient.create).toHaveBeenCalledWith(
          CLOUD_ONBOARDING_DEPLOYMENT_SAVED_OBJECT_TYPE,
          expect.objectContaining({ status: 'pending', attemptCount: 1 })
        );
        expect(result.status).toBe('pending');
        expect(result.attemptCount).toBe(1);
        expect(result.mechanisms).toEqual(['cloud_forwarder']);
        expect(result.vars).toEqual({ api_key_id: 'abc123keyid' });
        expect(result.secrets).toEqual({});
        expect(result.packagePolicyIds).toBeUndefined();
      });
    });

    describe('UC4/UC5: identity_federation + cloudfront_logs + push mechanism', () => {
      it.each([
        [
          'firehose',
          ['identity_federation', 'firehose'] as CloudOnboardingDeploymentMechanism[],
          'ext-uc4',
        ],
        [
          'cloud_forwarder',
          ['identity_federation', 'cloud_forwarder'] as CloudOnboardingDeploymentMechanism[],
          'ext-uc5',
        ],
      ])(
        '%s: stores external_id in secrets and api_key_id in vars, with no packagePolicyIds',
        async (_pushMechanism, mechanisms, extId) => {
          const attrs = makeAttributes({
            mechanisms,
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
            secrets: { external_id: extId },
            packagePolicyIds: undefined,
          });
          soClient.create.mockResolvedValue(makeSOResponse(`deploy-${_pushMechanism}`, attrs));

          const result = await cloudOnboardingDeploymentService.create(soClient, {
            provider: 'aws',
            connectorId: `conn-${_pushMechanism}`,
            mechanisms,
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
            secrets: { external_id: extId },
          });

          expect(soClient.create).toHaveBeenCalledWith(
            CLOUD_ONBOARDING_DEPLOYMENT_SAVED_OBJECT_TYPE,
            expect.objectContaining({ status: 'pending', attemptCount: 1 })
          );
          expect(result.status).toBe('pending');
          expect(result.attemptCount).toBe(1);
          expect(result.mechanisms).toEqual(mechanisms);
          expect(result.vars).toEqual({
            role_arn: 'arn:aws:iam::123456789012:role/ElasticIFRole',
            api_key_id: 'abc123keyid',
          });
          expect(result.secrets).toEqual({ external_id: extId });
          expect(result.packagePolicyIds).toBeUndefined();
        }
      );
    });
  });
});
