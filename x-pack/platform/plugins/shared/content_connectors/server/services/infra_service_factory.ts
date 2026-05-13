/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { CoreStart } from '@kbn/core/server';
import { SavedObjectsClient } from '@kbn/core/server';
import type { SearchConnectorsPluginStartDependencies } from '../types';
import { AgentlessConnectorsInfraService } from '.';

export interface AgentlessConnectorsInfraServiceContext {
  logger: Logger;
  coreStart: CoreStart;
  plugins: SearchConnectorsPluginStartDependencies;
}

export class AgentlessConnectorsInfraServiceFactory {
  private isInitialized = false;
  private agentlessConnectorsInfraService?: AgentlessConnectorsInfraService;

  public initialize({ coreStart, plugins, logger }: AgentlessConnectorsInfraServiceContext) {
    if (this.isInitialized) {
      throw new Error('AgentlessConnectorsInfraServiceFactory already initialized');
    }
    this.isInitialized = true;

    const esClient = coreStart.elasticsearch.client.asInternalUser;
    const savedObjects = coreStart.savedObjects;

    const agentlessPolicyService = plugins.fleet.agentlessPoliciesService;
    const packagePolicyService = plugins.fleet.packagePolicyService;
    const agentService = plugins.fleet.agentService;

    const soClient = new SavedObjectsClient(savedObjects.createInternalRepository());

    this.agentlessConnectorsInfraService = new AgentlessConnectorsInfraService(
      soClient,
      esClient,
      packagePolicyService,
      agentlessPolicyService,
      agentService,
      logger
    );
  }

  public getAgentlessConnectorsInfraService() {
    if (!this.isInitialized) {
      throw new Error('AgentlessConnectorsInfraServiceFactory not initialized');
    }

    return this.agentlessConnectorsInfraService;
  }
}
