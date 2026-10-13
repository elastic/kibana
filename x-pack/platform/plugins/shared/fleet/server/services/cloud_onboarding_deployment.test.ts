/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core/server/mocks';

import {
  CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
  CLOUD_ONBOARDING_DEPLOYMENT_SAVED_OBJECT_TYPE,
} from '../../common/constants';
import type { CloudOnboardingDeploymentSOAttributes } from '../types/so_attributes';

import { cloudOnboardingDeploymentService } from './cloud_onboarding_deployment';

function makeAttributes(
  overrides: Partial<CloudOnboardingDeploymentSOAttributes> = {}
): CloudOnboardingDeploymentSOAttributes {
  return {
    provider: 'aws',
    connectorId: 'conn-1',
    mechanisms: ['managed_integration'],
    services: ['cloudtrail'],
    status: 'pending',
    attemptCount: 1,
    serviceVars: {},
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

// Routes soClient.get by SO type so create() tests get a proper connector stub for the
// existence check and the correct deployment fixture for the getById retrieval.
function mockGetByType(
  soClient: ReturnType<typeof savedObjectsClientMock.create>,
  deploymentId: string,
  deploymentAttrs: CloudOnboardingDeploymentSOAttributes
) {
  soClient.get.mockImplementation((type: string, id: string) => {
    if (type === CLOUD_CONNECTOR_SAVED_OBJECT_TYPE) {
      return Promise.resolve({ id, type, references: [], attributes: {} } as any);
    }
    return Promise.resolve(makeSOResponse(deploymentId, deploymentAttrs));
  });
}

describe('cloudOnboardingDeploymentService', () => {
  let soClient: ReturnType<typeof savedObjectsClientMock.create>;

  beforeEach(() => {
    soClient = savedObjectsClientMock.create();
  });

  describe('create', () => {
    it('creates a deployment SO with server-set status/attemptCount and returns the mapped deployment', async () => {
      const attrs = makeAttributes();
      soClient.create.mockResolvedValue(makeSOResponse('deploy-1', attrs));
      mockGetByType(soClient, 'deploy-1', attrs);

      const result = await cloudOnboardingDeploymentService.create(soClient, {
        provider: 'aws',
        connectorId: 'conn-1',
        mechanisms: ['managed_integration'],
        services: ['cloudtrail'],
        serviceVars: {},
      });

      expect(soClient.get).toHaveBeenCalledWith(CLOUD_CONNECTOR_SAVED_OBJECT_TYPE, 'conn-1');
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
      expect(result.mechanisms).toEqual(['managed_integration']);
      expect(result.status).toBe('pending');
      expect(result.attemptCount).toBe(1);
    });

    it('propagates not-found error from connector check without creating the deployment', async () => {
      soClient.get.mockRejectedValue(
        new Error('Saved object [fleet-cloud-connector/missing] not found')
      );

      await expect(
        cloudOnboardingDeploymentService.create(soClient, {
          provider: 'aws',
          connectorId: 'missing',
          mechanisms: [],
          services: ['cloudtrail'],
        })
      ).rejects.toThrow('not found');

      expect(soClient.create).not.toHaveBeenCalled();
    });

    it('propagates errors thrown by soClient.create', async () => {
      const attrs = makeAttributes();
      mockGetByType(soClient, 'deploy-1', attrs);
      soClient.create.mockRejectedValue(new Error('write failed'));

      await expect(
        cloudOnboardingDeploymentService.create(soClient, {
          provider: 'aws',
          connectorId: 'conn-1',
          mechanisms: ['managed_integration'],
          services: [],
          serviceVars: {},
        })
      ).rejects.toThrow('write failed');
    });
  });

  describe('getById', () => {
    it('returns the deployment by ID', async () => {
      const attrs = makeAttributes({ status: 'succeeded' });
      soClient.get.mockResolvedValue(makeSOResponse('deploy-1', attrs));

      const result = await cloudOnboardingDeploymentService.getById(soClient, 'deploy-1');

      expect(soClient.get).toHaveBeenCalledWith(
        CLOUD_ONBOARDING_DEPLOYMENT_SAVED_OBJECT_TYPE,
        'deploy-1'
      );
      expect(result.id).toBe('deploy-1');
      expect(result.status).toBe('succeeded');
    });

    it('propagates errors thrown by soClient.get', async () => {
      soClient.get.mockRejectedValue(new Error('not found'));

      await expect(
        cloudOnboardingDeploymentService.getById(soClient, 'deploy-missing')
      ).rejects.toThrow('not found');
    });
  });

  describe('getByConnectorId', () => {
    it('returns all deployments for a connector using soClient PIT finder', async () => {
      const attrs1 = makeAttributes({ mechanisms: ['managed_integration'] });
      const attrs2 = makeAttributes({ mechanisms: ['agent_based'] });

      soClient.createPointInTimeFinder.mockReturnValue({
        async *find() {
          yield {
            saved_objects: [makeSOResponse('deploy-1', attrs1), makeSOResponse('deploy-2', attrs2)],
          };
        },
        close: jest.fn(),
      } as any);

      const results = await cloudOnboardingDeploymentService.getByConnectorId(soClient, 'conn-1');

      expect(results).toHaveLength(2);
      expect(results[0].id).toBe('deploy-1');
      expect(results[1].id).toBe('deploy-2');
      expect(soClient.createPointInTimeFinder).toHaveBeenCalledWith(
        expect.objectContaining({
          type: CLOUD_ONBOARDING_DEPLOYMENT_SAVED_OBJECT_TYPE,
          filter: expect.any(Object),
        })
      );
    });

    it('returns an empty array when no deployments exist', async () => {
      soClient.createPointInTimeFinder.mockReturnValue({
        async *find() {
          yield { saved_objects: [] };
        },
        close: jest.fn(),
      } as any);

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
      soClient.create.mockResolvedValue(makeSOResponse('deploy-1', updatedAttrs));
      soClient.get.mockResolvedValue(makeSOResponse('deploy-1', updatedAttrs));

      const result = await cloudOnboardingDeploymentService.update(soClient, 'deploy-1', {
        deploymentId,
        deploymentName,
        status: 'deploying',
      });

      expect(soClient.create).toHaveBeenCalledWith(
        CLOUD_ONBOARDING_DEPLOYMENT_SAVED_OBJECT_TYPE,
        expect.objectContaining({ deploymentId, deploymentName, status: 'deploying' }),
        expect.objectContaining({ id: 'deploy-1', overwrite: true })
      );
      expect(result.deploymentId).toBe(deploymentId);
      expect(result.deploymentName).toBe(deploymentName);
      expect(result.status).toBe('deploying');
    });

    it('persists serviceVars and returns the refreshed deployment', async () => {
      const serviceVars = {
        cloudtrail: {
          regions: ['us-east-1', 'eu-west-1'],
          s3_bucket_arn: 'arn:aws:s3:::bucket-1',
          cloudtrail_trail_arn: 'arn:aws:cloudtrail:us-east-1:123:trail/Trail1',
        },
        elb_logs: {
          regions: ['us-east-1'],
          s3_bucket_arn: 'arn:aws:s3:::elb-bucket',
        },
      };
      const updatedAttrs = makeAttributes({ serviceVars });
      soClient.create.mockResolvedValue(makeSOResponse('deploy-1', updatedAttrs));
      soClient.get.mockResolvedValue(makeSOResponse('deploy-1', updatedAttrs));

      const result = await cloudOnboardingDeploymentService.update(soClient, 'deploy-1', {
        serviceVars,
      });

      expect(soClient.create).toHaveBeenCalledWith(
        CLOUD_ONBOARDING_DEPLOYMENT_SAVED_OBJECT_TYPE,
        expect.objectContaining({ serviceVars }),
        expect.objectContaining({ id: 'deploy-1', overwrite: true })
      );
      expect(result.serviceVars).toEqual(serviceVars);
      expect(result.serviceVars?.cloudtrail).toHaveProperty('regions');
      expect(result.serviceVars?.elb_logs).toHaveProperty('s3_bucket_arn');
    });
  });

  describe('update — full-replace semantics', () => {
    it('removed serviceVars and policyIdsByInstance keys are absent from the written SO', async () => {
      // Initial record has stale keys that the update intentionally omits.
      const initialAttrs = makeAttributes({
        serviceVars: {
          cloudtrail: { regions: ['us-east-1'] },
          old_service: { regions: ['eu-west-1'] },
        },
        policyIdsByInstance: { elb: 'policy-1', removed_instance: 'policy-2' },
      });
      const updateInput = {
        serviceVars: { cloudtrail: { regions: ['us-east-1'] } },
        policyIdsByInstance: { elb: 'policy-1' },
      };
      const mergedAttrs = { ...initialAttrs, ...updateInput };

      // get returns the stale initial record; create receives the merged replacement.
      soClient.get.mockResolvedValue(makeSOResponse('deploy-1', initialAttrs));
      soClient.create.mockResolvedValue(makeSOResponse('deploy-1', mergedAttrs));

      await cloudOnboardingDeploymentService.update(soClient, 'deploy-1', updateInput);

      // Verify what was actually written, not what getById returned.
      const writtenAttrs = soClient.create.mock.calls.find((c) => c[2]?.overwrite)?.[1] as
        | CloudOnboardingDeploymentSOAttributes
        | undefined;
      expect(writtenAttrs?.serviceVars).not.toHaveProperty('old_service');
      expect(writtenAttrs?.policyIdsByInstance).not.toHaveProperty('removed_instance');
      expect(writtenAttrs?.serviceVars).toHaveProperty('cloudtrail');
      expect(writtenAttrs?.policyIdsByInstance).toHaveProperty('elb');
    });
  });

  describe('update (status transitions)', () => {
    describe('status transitions', () => {
      function mockUpdateAndGet(id: string, attrs: CloudOnboardingDeploymentSOAttributes) {
        soClient.create.mockResolvedValue(makeSOResponse(id, attrs));
        soClient.get.mockResolvedValue(makeSOResponse(id, attrs));
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
        expect(soClient.create).toHaveBeenCalledWith(
          CLOUD_ONBOARDING_DEPLOYMENT_SAVED_OBJECT_TYPE,
          expect.objectContaining({ status: 'succeeded', deploymentId: stackArn }),
          expect.objectContaining({ id: 'deploy-1', overwrite: true })
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
        soClient.get.mockResolvedValue(makeSOResponse('deploy-1', retriedAttrs));

        const result = await cloudOnboardingDeploymentService.update(soClient, 'deploy-1', {
          status: 'pending',
          attemptCount: 2,
        });

        expect(result.status).toBe('pending');
        expect(result.attemptCount).toBe(2);
        expect(soClient.create).toHaveBeenCalledWith(
          CLOUD_ONBOARDING_DEPLOYMENT_SAVED_OBJECT_TYPE,
          expect.objectContaining({ status: 'pending', attemptCount: 2 }),
          expect.objectContaining({ id: 'deploy-1', overwrite: true })
        );
      });

      it('does not modify serviceVars on retry', async () => {
        const serviceVars = { cloudtrail: { regions: ['us-east-1'] } };
        const retriedAttrs = makeAttributes({ status: 'pending', attemptCount: 2, serviceVars });
        soClient.get.mockResolvedValue(makeSOResponse('deploy-1', retriedAttrs));

        const result = await cloudOnboardingDeploymentService.update(soClient, 'deploy-1', {
          status: 'pending',
          attemptCount: 2,
        });

        expect(result.serviceVars).toEqual(serviceVars);
        expect(soClient.update).not.toHaveBeenCalled();
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
  // UC6: Agent-Based + CloudWatch Metrics
  describe('use case scenarios', () => {
    describe('UC1: agentless + cloudwatch_metrics + agentless', () => {
      it('sets agentless mechanism and packagePolicyIds', async () => {
        const attrs = makeAttributes({
          mechanisms: ['managed_integration'],
          services: ['cloudwatch_metrics'],
          serviceVars: { cloudwatch_metrics: { regions: ['us-east-1'], namespace: 'AWS/EC2' } },
          packagePolicyIds: ['pkg-aws-001'],
        });
        soClient.create.mockResolvedValue(makeSOResponse('deploy-uc1', attrs));
        mockGetByType(soClient, 'deploy-uc1', attrs);

        const result = await cloudOnboardingDeploymentService.create(soClient, {
          provider: 'aws',
          connectorId: 'conn-1',
          mechanisms: ['managed_integration'],
          services: ['cloudwatch_metrics'],
          serviceVars: { cloudwatch_metrics: { regions: ['us-east-1'], namespace: 'AWS/EC2' } },
        });

        expect(soClient.create).toHaveBeenCalledWith(
          CLOUD_ONBOARDING_DEPLOYMENT_SAVED_OBJECT_TYPE,
          expect.objectContaining({ status: 'pending', attemptCount: 1 })
        );
        expect(result.status).toBe('pending');
        expect(result.attemptCount).toBe(1);
        expect(result.mechanisms).toEqual(['managed_integration']);
      });
    });

    describe('UC2: static_keys + cloudwatch_metrics + agentless', () => {
      it('uses empty mechanisms and sets packagePolicyIds', async () => {
        const attrs = makeAttributes({
          mechanisms: [],
          services: ['cloudwatch_metrics'],
          serviceVars: { cloudwatch_metrics: { regions: ['us-east-1'], namespace: 'AWS/EC2' } },
          packagePolicyIds: ['pkg-aws-002'],
        });
        soClient.create.mockResolvedValue(makeSOResponse('deploy-uc2', attrs));
        mockGetByType(soClient, 'deploy-uc2', attrs);

        const result = await cloudOnboardingDeploymentService.create(soClient, {
          provider: 'aws',
          connectorId: 'conn-2',
          mechanisms: [],
          services: ['cloudwatch_metrics'],
          serviceVars: { cloudwatch_metrics: { regions: ['us-east-1'], namespace: 'AWS/EC2' } },
        });

        expect(soClient.create).toHaveBeenCalledWith(
          CLOUD_ONBOARDING_DEPLOYMENT_SAVED_OBJECT_TYPE,
          expect.objectContaining({ status: 'pending', attemptCount: 1 })
        );
        expect(result.status).toBe('pending');
        expect(result.attemptCount).toBe(1);
        expect(result.mechanisms).toEqual([]);
      });
    });

    describe('UC3: static_keys + cloudfront_logs + cloud_forwarder', () => {
      it('sets cloud_forwarder mechanism and no packagePolicyIds', async () => {
        const attrs = makeAttributes({
          mechanisms: ['ecf'],
          services: ['cloudfront_logs'],
          serviceVars: {
            cloudfront_logs: {
              regions: ['us-east-1'],
              s3_bucket_arn: 'arn:aws:s3:::cf-logs-bucket',
            },
          },
          packagePolicyIds: undefined,
        });
        soClient.create.mockResolvedValue(makeSOResponse('deploy-uc3', attrs));
        mockGetByType(soClient, 'deploy-uc3', attrs);

        const result = await cloudOnboardingDeploymentService.create(soClient, {
          provider: 'aws',
          connectorId: 'conn-3',
          mechanisms: ['ecf'],
          services: ['cloudfront_logs'],
          serviceVars: {
            cloudfront_logs: {
              regions: ['us-east-1'],
              s3_bucket_arn: 'arn:aws:s3:::cf-logs-bucket',
            },
          },
        });

        expect(soClient.create).toHaveBeenCalledWith(
          CLOUD_ONBOARDING_DEPLOYMENT_SAVED_OBJECT_TYPE,
          expect.objectContaining({ status: 'pending', attemptCount: 1 })
        );
        expect(result.status).toBe('pending');
        expect(result.attemptCount).toBe(1);
        expect(result.mechanisms).toEqual(['ecf']);
        expect(result.packagePolicyIds).toBeUndefined();
        expect(result.apiKeyId).toBeUndefined();
      });

      it('stores apiKeyId after ES API key is created for push service', async () => {
        const updatedAttrs = makeAttributes({
          mechanisms: ['ecf'],
          services: ['cloudfront_logs'],
          apiKeyId: 'es-key-abc123',
        });
        soClient.create.mockResolvedValue(makeSOResponse('deploy-uc3', updatedAttrs));
        soClient.get.mockResolvedValue(makeSOResponse('deploy-uc3', updatedAttrs));

        const result = await cloudOnboardingDeploymentService.update(soClient, 'deploy-uc3', {
          apiKeyId: 'es-key-abc123',
        });

        expect(soClient.create).toHaveBeenCalledWith(
          CLOUD_ONBOARDING_DEPLOYMENT_SAVED_OBJECT_TYPE,
          expect.objectContaining({ apiKeyId: 'es-key-abc123' }),
          expect.objectContaining({ id: 'deploy-uc3', overwrite: true })
        );
        expect(result.apiKeyId).toBe('es-key-abc123');
        expect(result.packagePolicyIds).toBeUndefined();
      });
    });

    describe('UC6: agent_based + cloudwatch_metrics', () => {
      it('creates with agent_based mechanism, authMethod, no packagePolicyIds, no agentPolicyIds initially', async () => {
        const attrs = makeAttributes({
          mechanisms: ['agent_based'],
          services: ['cloudwatch_metrics'],
          serviceVars: { cloudwatch_metrics: { regions: ['us-east-1'], namespace: 'AWS/EC2' } },
          authMethod: 'assume_role',
          packagePolicyIds: undefined,
          agentPolicyIds: undefined,
        });
        soClient.create.mockResolvedValue(makeSOResponse('deploy-uc6', attrs));
        mockGetByType(soClient, 'deploy-uc6', attrs);

        const result = await cloudOnboardingDeploymentService.create(soClient, {
          provider: 'aws',
          mechanisms: ['agent_based'],
          services: ['cloudwatch_metrics'],
          serviceVars: { cloudwatch_metrics: { regions: ['us-east-1'], namespace: 'AWS/EC2' } },
          authMethod: 'assume_role',
        });

        expect(soClient.create).toHaveBeenCalledWith(
          CLOUD_ONBOARDING_DEPLOYMENT_SAVED_OBJECT_TYPE,
          expect.objectContaining({ status: 'pending', attemptCount: 1 })
        );
        expect(result.status).toBe('pending');
        expect(result.mechanisms).toEqual(['agent_based']);
        expect(result.authMethod).toBe('assume_role');
        expect(result.packagePolicyIds).toBeUndefined();
        expect(result.agentPolicyIds).toBeUndefined();
      });

      it('stores agentPolicyIds after agent policies are selected via update', async () => {
        const updatedAttrs = makeAttributes({
          mechanisms: ['agent_based'],
          services: ['cloudwatch_metrics'],
          agentPolicyIds: ['agent-policy-123', 'agent-policy-456'],
          packagePolicyIds: ['pkg-policy-789'],
        });
        soClient.create.mockResolvedValue(makeSOResponse('deploy-uc6', updatedAttrs));
        soClient.get.mockResolvedValue(makeSOResponse('deploy-uc6', updatedAttrs));

        const result = await cloudOnboardingDeploymentService.update(soClient, 'deploy-uc6', {
          agentPolicyIds: ['agent-policy-123', 'agent-policy-456'],
          packagePolicyIds: ['pkg-policy-789'],
        });

        expect(soClient.create).toHaveBeenCalledWith(
          CLOUD_ONBOARDING_DEPLOYMENT_SAVED_OBJECT_TYPE,
          expect.objectContaining({
            agentPolicyIds: ['agent-policy-123', 'agent-policy-456'],
            packagePolicyIds: ['pkg-policy-789'],
          }),
          expect.objectContaining({ id: 'deploy-uc6', overwrite: true })
        );
        expect(result.agentPolicyIds).toEqual(['agent-policy-123', 'agent-policy-456']);
        expect(result.packagePolicyIds).toEqual(['pkg-policy-789']);
      });
    });
  });
});
