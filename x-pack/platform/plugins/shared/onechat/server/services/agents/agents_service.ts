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
import type { ToolsServiceStart } from '../tools';
import { createClient } from './client';

export interface AgentsServiceSetupDeps {
  logger: Logger;
}

export interface AgentsServiceStartDeps {
  security: SecurityServiceStart;
  elasticsearch: ElasticsearchServiceStart;
  getRunner: () => Runner;
  toolsService: ToolsServiceStart;
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
    const { getRunner, security, elasticsearch, toolsService } = startDeps;

    const getScopedClient: AgentsServiceStart['getScopedClient'] = ({ request }) => {
      return createClient({
        request,
        toolsService,
        logger,
        security,
        elasticsearch,
      });
    };

    return {
      getScopedClient,
      execute: async (args) => {
        return getRunner().runAgent(args);
      },
    };
  }
}
