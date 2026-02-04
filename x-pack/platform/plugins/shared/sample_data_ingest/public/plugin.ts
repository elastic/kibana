/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { Logger } from '@kbn/logging';
import type { SampleDataSet } from '@kbn/home-sample-data-types';
import type { SampleDataIngestPluginStart, SampleDataIngestPluginSetup } from './types';
import { InstallationService } from './services/installation';
import { createSampleDataSet } from './services/sample_data_set';
import { isSampleIndex } from './services/utils';
import { MINIMUM_LICENSE_TYPE } from '../common';

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

    /**
     * Returns the Elasticsearch documentation sample data set in the standard SampleDataSet format.
     * Returns null if the status cannot be fetched (e.g., plugin not available).
     */
    // TODO: @wildemat - This will be updated to use proper polling once the home plugin is updated to use
    //   a custom callback for install, uninstall and status. As of now, this usage would create a new sample
    //   data set every time the sample data set is requested.
    const getSampleDataSet = async (): Promise<SampleDataSet | null> => {
      try {
        const statusResponse = await installationService.getInstallationStatus();
        return createSampleDataSet(statusResponse, coreStart.http);
      } catch {
        return null;
      }
    };

    return {
      getStatus: () => installationService.getInstallationStatus(),
      install: () => installationService.install(),
      getSampleDataSet,
      isSampleIndex,
      minimumLicenseType: MINIMUM_LICENSE_TYPE,
    };
  }
}
