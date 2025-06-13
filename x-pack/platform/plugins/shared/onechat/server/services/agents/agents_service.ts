/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { Runner } from '@kbn/onechat-server';
import type { AgentsServiceSetup, AgentsServiceStart } from './types';
import { createInternalRegistry } from './utils';
import { createDefaultAgentProvider } from './conversational';

export interface AgentsServiceSetupDeps {
  logger: Logger;
}

export interface AgentsServiceStartDeps {
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
    const { getRunner } = startDeps;
    const defaultAgentProvider = createDefaultAgentProvider({ logger });
    const registry = createInternalRegistry({ providers: [defaultAgentProvider], getRunner });

    return {
      registry,
      execute: async (args) => {
        return getRunner().runAgent(args);
      },
    };
  }
}
