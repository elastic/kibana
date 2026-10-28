/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { parse } from 'yaml';
import { RuleMigrationClient } from './rule_migration_client';
import { RuleMigrationRegistry } from './rule_migration_registry';
import type { ClassicRule } from './types';

const classicRule: ClassicRule = {
  id: 'classic-1',
  ruleTypeId: '.es-query',
  name: 'High error count',
  tags: [],
  schedule: { interval: '1m' },
  params: {},
  actions: [
    {
      uuid: 'email-action',
      id: 'email-connector',
      actionTypeId: '.email',
      params: { to: ['ops@example.com'], subject: 'Alert', message: 'Body' },
    },
    {
      uuid: 'slack2-action',
      id: 'slack2-connector',
      actionTypeId: '.slack2',
      params: { subActionParams: { channel: 'C1', text: 'hi' } },
    },
    {
      uuid: 'slack-api-action',
      id: 'slack-api-connector',
      actionTypeId: '.slack_api',
      params: { subActionParams: { channelIds: ['C2'], text: 'hi' } },
    },
    { uuid: 'webhook-action', id: 'webhook', actionTypeId: '.webhook', params: {} },
  ],
};

describe('RuleMigrationClient', () => {
  const request = httpServerMock.createKibanaRequest();
  let registry: RuleMigrationRegistry;
  let rulesClient: { createRule: jest.Mock; deleteRule: jest.Mock };
  let actionPolicyClient: { createActionPolicy: jest.Mock; deleteActionPolicy: jest.Mock };
  let workflowsManagement: { createWorkflow: jest.Mock; deleteWorkflows: jest.Mock };
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let client: RuleMigrationClient;

  beforeEach(() => {
    registry = new RuleMigrationRegistry();
    registry.register({
      ruleTypeId: '.es-query',
      convertParams: () => ({ query: { base: 'FROM logs-*' } }),
    });

    let workflowCount = 0;
    let policyCount = 0;
    rulesClient = {
      createRule: jest.fn().mockResolvedValue({ id: 'rule-1' }),
      deleteRule: jest.fn().mockResolvedValue(undefined),
    };
    actionPolicyClient = {
      createActionPolicy: jest.fn(async () => ({ id: `policy-${++policyCount}` })),
      deleteActionPolicy: jest.fn().mockResolvedValue(undefined),
    };
    workflowsManagement = {
      createWorkflow: jest.fn(async () => ({ id: `workflow-${++workflowCount}` })),
      deleteWorkflows: jest.fn().mockResolvedValue({}),
    };

    logger = loggingSystemMock.createLogger();
    client = new RuleMigrationClient({
      request,
      spaceId: 'space-1',
      registry,
      rulesClient,
      actionPolicyClient,
      workflowsManagement,
      logger,
    });
  });

  describe('canMigrate', () => {
    it('reflects the registry', () => {
      expect(client.canMigrate('.es-query')).toBe(true);
      expect(client.canMigrate('.index-threshold')).toBe(false);
    });
  });

  describe('convert', () => {
    it('converts without creating anything', () => {
      const migration = client.convert(classicRule);

      expect(migration?.rule.metadata.routing_tags).toEqual(['migrated-rule:classic-1']);
      expect(migration?.actionPolicies).toHaveLength(3);
      expect(migration?.skippedActions).toHaveLength(1);
      expect(rulesClient.createRule).not.toHaveBeenCalled();
    });

    it('returns undefined for an unregistered rule type', () => {
      expect(client.convert({ ...classicRule, ruleTypeId: '.index-threshold' })).toBeUndefined();
    });
  });

  describe('migrate', () => {
    it('creates the rule, then a workflow and action policy per ready action', async () => {
      const result = await client.migrate(classicRule);

      expect(rulesClient.createRule).toHaveBeenCalledWith({
        data: expect.objectContaining({
          metadata: { name: 'High error count', routing_tags: ['migrated-rule:classic-1'] },
        }),
      });

      expect(workflowsManagement.createWorkflow).toHaveBeenCalledTimes(2);
      const [[{ yaml }, spaceId, workflowRequest]] = workflowsManagement.createWorkflow.mock.calls;
      expect(spaceId).toBe('space-1');
      expect(workflowRequest).toBe(request);
      expect(parse(yaml).steps[0]).toMatchObject({
        type: 'email',
        'connector-id': 'email-connector',
      });

      expect(actionPolicyClient.createActionPolicy).toHaveBeenNthCalledWith(1, {
        data: expect.objectContaining({
          matcher: { tags: ['migrated-rule:classic-1'] },
          destinations: [{ type: 'workflow', id: 'workflow-1' }],
        }),
      });

      expect(result).toEqual({
        ruleId: 'rule-1',
        actionPolicyIds: ['policy-1', 'policy-2'],
        pendingActionPolicies: [
          expect.objectContaining({ sourceActionId: 'slack-api-action', connectorId: null }),
        ],
        skippedActions: [
          {
            sourceActionId: 'webhook-action',
            sourceConnectorTypeId: '.webhook',
            reason: 'unsupported_connector',
          },
        ],
      });
    });

    it('throws for an unregistered rule type', async () => {
      await expect(
        client.migrate({ ...classicRule, ruleTypeId: '.index-threshold' })
      ).rejects.toThrow('Rule type ".index-threshold" has no registered migration');
      expect(rulesClient.createRule).not.toHaveBeenCalled();
    });

    it('deletes everything it created when an action policy fails', async () => {
      const error = new Error('policy failed');
      actionPolicyClient.createActionPolicy
        .mockResolvedValueOnce({ id: 'policy-1' })
        .mockRejectedValueOnce(error);

      await expect(client.migrate(classicRule)).rejects.toBe(error);

      expect(actionPolicyClient.deleteActionPolicy).toHaveBeenCalledWith({ id: 'policy-1' });
      expect(workflowsManagement.deleteWorkflows.mock.calls).toEqual([
        [['workflow-1'], 'space-1', request],
        [['workflow-2'], 'space-1', request],
      ]);
      expect(rulesClient.deleteRule).toHaveBeenCalledWith({ id: 'rule-1' });
    });

    it('creates nothing else when the rule fails', async () => {
      const error = new Error('rule failed');
      rulesClient.createRule.mockRejectedValueOnce(error);

      await expect(client.migrate(classicRule)).rejects.toBe(error);

      expect(workflowsManagement.createWorkflow).not.toHaveBeenCalled();
      expect(rulesClient.deleteRule).not.toHaveBeenCalled();
    });

    it('keeps rolling back and logs when a cleanup step fails', async () => {
      const error = new Error('workflow failed');
      workflowsManagement.createWorkflow
        .mockResolvedValueOnce({ id: 'workflow-1' })
        .mockRejectedValueOnce(error);
      actionPolicyClient.deleteActionPolicy.mockRejectedValueOnce(new Error('delete failed'));

      await expect(client.migrate(classicRule)).rejects.toBe(error);

      expect(workflowsManagement.deleteWorkflows).toHaveBeenCalledWith(
        ['workflow-1'],
        'space-1',
        request
      );
      expect(rulesClient.deleteRule).toHaveBeenCalledWith({ id: 'rule-1' });
      expect(logger.warn).toHaveBeenCalledTimes(1);
      expect(logger.warn).toHaveBeenCalledWith(
        'Failed to undo part of a rule migration',
        expect.objectContaining({
          labels: expect.objectContaining({
            policy_id: 'policy-1',
            space_id: 'space-1',
            code: 'RULE_MIGRATION_ROLLBACK_FAILED',
          }),
        })
      );
    });
  });
});
