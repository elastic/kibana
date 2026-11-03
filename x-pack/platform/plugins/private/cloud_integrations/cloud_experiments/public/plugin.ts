/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { duration } from 'moment';
import type { Logger } from '@kbn/logging';
import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { CloudSetup } from '@kbn/cloud-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { initializeMetadata, MetadataService } from '../common/metadata_service';
import { createKibanaOfrepProvider } from './kibana_ofrep_provider';

interface CloudExperimentsPluginSetupDeps {
  cloud: CloudSetup;
}

interface CloudExperimentsPluginStartDeps {
  dataViews: DataViewsPublicPluginStart;
}

/**
 * Browser-side implementation of the Cloud Experiments plugin.
 * Flag evaluation goes through Kibana. LaunchDarkly stays on the server.
 */
export class CloudExperimentsPlugin
  implements Plugin<void, void, CloudExperimentsPluginSetupDeps, CloudExperimentsPluginStartDeps>
{
  private readonly logger: Logger;
  private readonly metadataService: MetadataService;

  /** Constructor of the plugin **/
  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
    const config = initializerContext.config.get<{
      metadata_refresh_interval: string;
    }>();

    this.metadataService = new MetadataService(
      { metadata_refresh_interval: duration(config.metadata_refresh_interval) },
      this.logger.get('metadata')
    );
  }

  /**
   * Sets up the feature-flag provider when the plugin is enabled.
   * @param core {@link CoreSetup}
   * @param deps {@link CloudExperimentsPluginSetupDeps}
   */
  public setup(core: CoreSetup, deps: CloudExperimentsPluginSetupDeps) {
    initializeMetadata({
      metadataService: this.metadataService,
      initializerContext: this.initializerContext,
      cloud: deps.cloud,
      featureFlags: core.featureFlags,
      logger: this.logger,
    });

    core.featureFlags.setProvider(
      createKibanaOfrepProvider({
        basePath: core.http.basePath,
        kibanaVersion: this.initializerContext.env.packageInfo.version,
        initialFlags: core.featureFlags.getInitialFeatureFlags(),
        logger: this.logger,
      })
    );
  }

  /**
   * Sets the metadata service update hooks
   * @param core {@link CoreStart}
   * @param deps {@link CloudExperimentsPluginStartDeps}
   */
  public start(core: CoreStart, { dataViews }: CloudExperimentsPluginStartDeps) {
    this.metadataService.start({
      hasDataFetcher: async () => ({ has_data: await dataViews.hasData.hasDataView() }),
    });
  }

  /**
   * Cleans up and flush the sending queues.
   */
  public stop() {
    this.metadataService.stop();
  }
}
