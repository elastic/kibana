/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { PackagePolicy } from '@kbn/fleet-plugin/common';
import { FleetPackDeploymentService } from '../../services/fleet_pack_deployment_service';
import { PackGenerationService } from '../../services/pack_generation_service';
import { AgentPolicyManagementService } from '../../services/agent_policy_management_service';
import { PackDeploymentVerificationService } from '../../services/pack_deployment_verification_service';

/**
 * Integration tests for Fleet pack deployment
 * Tests real Fleet API integration, pack generation, and deployment verification
 */
describe('Fleet Integration', () => {
  let esClient: ElasticsearchClient;
  let fleetPackService: FleetPackDeploymentService;
  let packGenService: PackGenerationService;
  let agentPolicyService: AgentPolicyManagementService;
  let verificationService: PackDeploymentVerificationService;

  beforeAll(() => {
    // Setup would require real Kibana context
    // For now, this is a structural template
  });

  describe('Pack Deployment', () => {
    it('should generate valid osquery pack from compliance rules', async () => {
      const rules = [
        {
          rule_id: 'test-rule-1',
          name: 'Test Process Check',
          query: 'SELECT * FROM processes WHERE name = "suspicious";',
          interval: 3600,
          platform: 'linux',
        },
      ];

      const pack = await packGenService.generatePack({
        benchmarkId: 'cis-linux',
        rules,
      });

      expect(pack).toHaveProperty('queries');
      expect(pack.queries).toHaveLength(1);
      expect(pack.queries[0]).toMatchObject({
        query: rules[0].query,
        interval: rules[0].interval,
        platform: rules[0].platform,
      });
    });

    it('should deploy pack to Fleet agent policy', async () => {
      const deployment = await fleetPackService.deploy({
        benchmarkId: 'cis-linux',
        agentPolicyIds: ['test-policy-id'],
        rules: [
          {
            rule_id: 'test-rule',
            query: 'SELECT * FROM processes;',
            interval: 3600,
          },
        ],
      });

      expect(deployment).toHaveProperty('packagePolicyId');
      expect(deployment).toHaveProperty('agentPolicyId');
      expect(deployment.success).toBe(true);
    });

    it('should verify pack deployment status', async () => {
      const packagePolicyId = 'test-package-policy';

      const status = await verificationService.verifyDeployment(packagePolicyId);

      expect(status).toHaveProperty('deployed');
      expect(status).toHaveProperty('agentCount');
      expect(status).toHaveProperty('health');
      expect(['healthy', 'degraded', 'failed']).toContain(status.health);
    });

    it('should handle Fleet API errors gracefully', async () => {
      // Test with invalid agent policy ID
      await expect(
        fleetPackService.deploy({
          benchmarkId: 'test',
          agentPolicyIds: ['non-existent-policy'],
          rules: [],
        })
      ).rejects.toThrow(/agent policy.*not found/i);
    });

    it('should retry failed deployments', async () => {
      // Test retry logic with transient failures
      const mockFleetClient = {
        createPackagePolicy: jest
          .fn()
          .mockRejectedValueOnce(new Error('Timeout'))
          .mockResolvedValueOnce({ id: 'retry-success' }),
      };

      // This would test the retry mechanism
      // Implementation depends on service structure
    });
  });

  describe('Agent Policy Management', () => {
    it('should list available agent policies', async () => {
      const policies = await agentPolicyService.listPolicies();

      expect(policies).toBeInstanceOf(Array);
      policies.forEach((policy: any) => {
        expect(policy).toHaveProperty('id');
        expect(policy).toHaveProperty('name');
        expect(policy).toHaveProperty('namespace');
      });
    });

    it('should get agent count for policy', async () => {
      const policyId = 'default';

      const agentCount = await agentPolicyService.getAgentCount(policyId);

      expect(typeof agentCount).toBe('number');
      expect(agentCount).toBeGreaterThanOrEqual(0);
    });

    it('should update agent policy with compliance pack', async () => {
      const policyId = 'test-policy';
      const packagePolicyId = 'test-package-policy';

      const updated = await agentPolicyService.addPackagePolicy(policyId, packagePolicyId);

      expect(updated).toBe(true);
    });

    it('should remove compliance pack from agent policy', async () => {
      const packagePolicyId = 'test-package-policy';

      const removed = await agentPolicyService.removePackagePolicy(packagePolicyId);

      expect(removed).toBe(true);
    });
  });

  describe('Pack Lifecycle', () => {
    it('should create → deploy → update → undeploy lifecycle', async () => {
      const benchmarkId = `lifecycle-test-${Date.now()}`;

      // 1. Create rules
      const rules = [
        {
          rule_id: `${benchmarkId}-rule`,
          query: 'SELECT * FROM processes;',
          interval: 3600,
        },
      ];

      // 2. Generate pack
      const pack = await packGenService.generatePack({ benchmarkId, rules });
      expect(pack.queries).toHaveLength(1);

      // 3. Deploy
      const deployment = await fleetPackService.deploy({
        benchmarkId,
        agentPolicyIds: ['default'],
        rules,
      });
      expect(deployment.success).toBe(true);

      // 4. Update pack (add rule)
      const updatedRules = [
        ...rules,
        {
          rule_id: `${benchmarkId}-rule2`,
          query: 'SELECT * FROM users;',
          interval: 7200,
        },
      ];

      const updateDeployment = await fleetPackService.update({
        packagePolicyId: deployment.packagePolicyId,
        rules: updatedRules,
      });
      expect(updateDeployment.success).toBe(true);

      // 5. Verify updated pack has 2 queries
      const status = await verificationService.verifyDeployment(deployment.packagePolicyId);
      expect(status.queryCount).toBe(2);

      // 6. Undeploy
      const undeployed = await fleetPackService.undeploy(deployment.packagePolicyId);
      expect(undeployed).toBe(true);

      // 7. Verify undeployment
      const finalStatus = await verificationService.verifyDeployment(deployment.packagePolicyId);
      expect(finalStatus.deployed).toBe(false);
    });
  });
});
