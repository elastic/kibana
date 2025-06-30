/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { SecurityServiceStart, ElasticsearchServiceStart } from '@kbn/core/server';
import type { Runner } from '@kbn/onechat-server';
import type { AgentsServiceSetup, AgentsServiceStart } from './types';
import { createInternalRegistry } from './utils';
import { createDefaultAgentProvider, creatProfileProvider } from './providers';
import { createClient, createStorage } from './profiles';

export interface AgentsServiceSetupDeps {
  logger: Logger;
}

export interface AgentsServiceStartDeps {
  security: SecurityServiceStart;
  elasticsearch: ElasticsearchServiceStart;
  getRunner: () => Runner;
}

export class AgentsService {
  private setupDeps?: AgentsServiceSetupDeps;

  setup(setupDeps: AgentsServiceSetupDeps): AgentsServiceSetup {
    this.setupDeps = setupDeps;

    return {};
  }

  start(startDeps: AgentsServiceStartDeps): AgentsServiceStart {
    if (!this.setupDeps) {
      throw new Error('#start called before #setup');
    }

    const { logger } = this.setupDeps;
    const { getRunner, security, elasticsearch } = startDeps;

    const getProfileClient: AgentsServiceStart['getProfileClient'] = async (request) => {
      const authUser = security.authc.getCurrentUser(request);
      if (!authUser) {
        throw new Error('No user bound to the provided request');
      }

      const esClient = elasticsearch.client.asScoped(request).asInternalUser;
      const storage = createStorage({ logger, esClient });
      const user = { id: authUser.profile_uid!, username: authUser.username };

      return createClient({ user, storage });
    };

    const defaultAgentProvider = createDefaultAgentProvider();
    const profileAgentsProvider = creatProfileProvider({ getProfileClient });

    const registry = createInternalRegistry({
      providers: [defaultAgentProvider, profileAgentsProvider],
      getRunner,
    });

    return {
      registry,
      getProfileClient,
      execute: async (args) => {
        return getRunner().runAgent(args);
      },
    };
  }
}
