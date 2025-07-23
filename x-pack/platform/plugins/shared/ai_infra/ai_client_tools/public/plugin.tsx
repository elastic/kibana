/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { Logger } from '@kbn/logging';
import type {
  PublicPluginConfig,
  AIClientToolsBasePluginSetup,
  AIClientToolsBasePluginStart,
  PluginSetupDependencies,
  PluginStartDependencies,
} from './types';
import { InstallationService } from './services/installation';

interface AIClientToolsInstallServiceParams {
  inferenceId: string;
}

export class AIClientToolsBasePlugin
  implements
    Plugin<
      AIClientToolsBasePluginSetup,
      AIClientToolsBasePluginStart,
      PluginSetupDependencies,
      PluginStartDependencies
    >
{
  logger: Logger;

  constructor(context: PluginInitializerContext<PublicPluginConfig>) {
    this.logger = context.logger.get();
  }
  setup(
    coreSetup: CoreSetup<PluginStartDependencies, AIClientToolsBasePluginStart>,
    pluginsSetup: PluginSetupDependencies
  ): AIClientToolsBasePluginSetup {
    console.log(`--@@AIClientToolsBasePublicSetup`, pluginsSetup);

    return {};
  }

  start(coreStart: CoreStart, pluginsStart: PluginStartDependencies): AIClientToolsBasePluginStart {
    // @TODO: remove
    console.log(`--@@AIClientToolsBasePublicStart`, pluginsStart);
    const installationService = new InstallationService({ http: coreStart.http });

    return {
      installation: {
        getStatus: (params: AIClientToolsInstallServiceParams) =>
          installationService.getInstallationStatus(params),
        install: (params: AIClientToolsInstallServiceParams) => installationService.install(params),
        uninstall: (params: AIClientToolsInstallServiceParams) =>
          installationService.uninstall(params),
      },
    };
  }
}
