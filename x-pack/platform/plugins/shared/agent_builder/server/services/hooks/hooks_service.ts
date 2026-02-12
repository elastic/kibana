/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { HooksServiceSetup, HooksServiceStart } from '@kbn/agent-builder-server';
import { createHooksRunner } from './hooks_runner';
import { createHookRegistry } from './hooks_registry';
import type { HookRegistry } from './hooks_registry';

export interface HooksServiceSetupDeps {
  logger: Logger;
}

export class HooksService {
  private setupDeps?: HooksServiceSetupDeps;

  private readonly registry: HookRegistry;

  constructor() {
    this.registry = createHookRegistry();
  }

  setup(deps: HooksServiceSetupDeps): HooksServiceSetup {
    this.setupDeps = deps;

    return {
      register: (bundle) => this.registry.register(bundle),
    };
  }

  start(): HooksServiceStart {
    if (!this.setupDeps) {
      throw new Error('#start called before #setup');
    }

    return createHooksRunner({
      logger: this.setupDeps.logger.get('hooks'),
      getHooksForLifecycle: (lifecycle) => this.registry.getHooksForLifecycle(lifecycle),
    });
  }
}
