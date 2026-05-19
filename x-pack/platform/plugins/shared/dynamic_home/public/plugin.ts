/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';

interface StartDeps {
  agentBuilder?: AgentBuilderPluginStart;
}

export class DynamicHomePublicPlugin implements Plugin<void, void, {}, StartDeps> {
  setup(core: CoreSetup<StartDeps>) {
    core.application.register({
      id: 'dynamicHome',
      title: 'Dynamic Home',
      appRoute: '/app/dynamic_home',
      async mount(params) {
        const [{ renderApp }, [coreStart, startDeps]] = await Promise.all([
          import('./application'),
          core.getStartServices(),
        ]);
        return renderApp(params, coreStart, startDeps.agentBuilder);
      },
    });
  }

  start(_core: CoreStart): void {}

  stop() {}
}
