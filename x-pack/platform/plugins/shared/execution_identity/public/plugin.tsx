/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type { ManagementSetup } from '@kbn/management-plugin/public';
import { PLUGIN_ID, PLUGIN_NAME } from '../common/types';

interface SetupDeps {
  management: ManagementSetup;
}

export type ExecutionIdentityPublicPluginSetup = Record<string, never>;
export type ExecutionIdentityPublicPluginStart = Record<string, never>;

export class ExecutionIdentityPublicPlugin
  implements
    Plugin<ExecutionIdentityPublicPluginSetup, ExecutionIdentityPublicPluginStart, SetupDeps>
{
  public setup(core: CoreSetup, plugins: SetupDeps): ExecutionIdentityPublicPluginSetup {
    plugins.management.sections.section.security.registerApp({
      id: PLUGIN_ID,
      title: PLUGIN_NAME,
      order: 99,
      mount: async (params) => {
        const [coreStart] = await core.getStartServices();
        const { renderApp } = await import('./application');
        return renderApp(coreStart, params);
      },
    });

    return {};
  }

  public start(core: CoreStart): ExecutionIdentityPublicPluginStart {
    return {};
  }

  public stop() {}
}
