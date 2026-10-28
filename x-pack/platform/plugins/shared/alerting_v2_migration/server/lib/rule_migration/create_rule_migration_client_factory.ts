/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { AlertingServerStart as AlertingV2ServerStart } from '@kbn/alerting-v2-plugin/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { RuleMigrationClient, type RuleMigrationClientOptions } from './rule_migration_client';
import type { RuleMigrationRegistry } from './rule_migration_registry';

export interface RuleMigrationClientFactoryDeps {
  registry: RuleMigrationRegistry;
  workflowsManagement: RuleMigrationClientOptions['workflowsManagement'];
  alertingVTwo: Pick<
    AlertingV2ServerStart,
    'getRulesClientWithRequest' | 'getActionPolicyClientWithRequest'
  >;
  spacesService: Pick<SpacesPluginStart['spacesService'], 'getSpaceId'>;
  logger: Logger;
}

/** Returns a factory for migration clients that act with the request's credentials in its space. */
export const createRuleMigrationClientFactory =
  ({ registry, workflowsManagement, alertingVTwo, spacesService, logger }: RuleMigrationClientFactoryDeps) =>
  async (request: KibanaRequest): Promise<RuleMigrationClient> => {
    const [rulesClient, actionPolicyClient] = await Promise.all([
      alertingVTwo.getRulesClientWithRequest(request),
      alertingVTwo.getActionPolicyClientWithRequest(request),
    ]);
    return new RuleMigrationClient({
      request,
      spaceId: spacesService.getSpaceId(request),
      registry,
      rulesClient,
      actionPolicyClient,
      workflowsManagement,
      logger,
    });
  };
