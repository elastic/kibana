/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { Logger } from '@kbn/logging';
import { SampleDataIngestPluginStart, SampleDataIngestPluginSetup } from './types';
import { InstallationService } from './services/installation';

export class SampleDataIngestPlugin
  implements Plugin<SampleDataIngestPluginSetup, SampleDataIngestPluginStart>
{
  logger: Logger;

  constructor(context: PluginInitializerContext) {
    this.logger = context.logger.get();
  }
  setup(): SampleDataIngestPluginSetup {
    return {};
  }

  start(coreStart: CoreStart): SampleDataIngestPluginStart {
    const installationService = new InstallationService({ http: coreStart.http });

    return {
      getStatus: () => installationService.getInstallationStatus(),
      install: () => installationService.install(),
    };
  }
}
