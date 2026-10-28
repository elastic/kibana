/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { createRuleMigrationClientFactory } from './create_rule_migration_client_factory';
import { RuleMigrationClient } from './rule_migration_client';
import { RuleMigrationRegistry } from './rule_migration_registry';

describe('createRuleMigrationClientFactory', () => {
  it('builds a client from request-scoped v2 clients, the request space, and the registry', async () => {
    const registry = new RuleMigrationRegistry();
    registry.register({
      ruleTypeId: '.es-query',
      convertParams: () => ({ query: { base: 'FROM logs-*' } }),
    });
    const alertingVTwo = {
      getRulesClientWithRequest: jest.fn().mockResolvedValue({ createRule: jest.fn() }),
      getActionPolicyClientWithRequest: jest
        .fn()
        .mockResolvedValue({ createActionPolicy: jest.fn() }),
    };
    const spacesService = { getSpaceId: jest.fn().mockReturnValue('space-1') };
    const request = httpServerMock.createKibanaRequest();

    const getClient = createRuleMigrationClientFactory({
      registry,
      workflowsManagement: { createWorkflow: jest.fn(), deleteWorkflows: jest.fn() },
      alertingVTwo,
      spacesService,
      logger: loggingSystemMock.createLogger(),
    });
    const client = await getClient(request);

    expect(client).toBeInstanceOf(RuleMigrationClient);
    expect(client.canMigrate('.es-query')).toBe(true);
    expect(alertingVTwo.getRulesClientWithRequest).toHaveBeenCalledWith(request);
    expect(alertingVTwo.getActionPolicyClientWithRequest).toHaveBeenCalledWith(request);
    expect(spacesService.getSpaceId).toHaveBeenCalledWith(request);
  });
});
