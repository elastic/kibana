/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, Plugin, CoreSetup, PluginInitializerContext } from '@kbn/core/public';

import { getCreateIntegrationLazy } from './components/create_integration';
import type {
  AutomaticImportPluginSetup,
  AutomaticImportPluginStart,
  AutomaticImportPluginStartDependencies,
} from './types';

export class AutomaticImportPlugin
  implements Plugin<AutomaticImportPluginSetup, AutomaticImportPluginStart>
{
  constructor(_: PluginInitializerContext) {}

  public setup(core: CoreSetup): AutomaticImportPluginSetup {
    return {};
  }

  public start(
    core: CoreStart,
    dependencies: AutomaticImportPluginStartDependencies
  ): AutomaticImportPluginStart {
    const services = {
      ...core,
      ...dependencies,
    };

    return {
      components: {
        CreateIntegration: getCreateIntegrationLazy(services),
      },
    };
  }

  public stop() {}
}
