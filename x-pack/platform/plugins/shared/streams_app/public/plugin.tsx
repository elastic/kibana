/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { Logger } from '@kbn/logging';
import { DataStreamsStatsService } from '@kbn/dataset-quality-plugin/public';
import { dynamic } from '@kbn/shared-ux-utility';
import React from 'react';
import type {
  ConfigSchema,
  StreamsAppPublicSetup,
  StreamsAppPublicStart,
  StreamsAppSetupDependencies,
  StreamsAppStartDependencies,
  StreamsApplicationProps,
} from './types';
import { StreamsAppServices } from './services/types';
import { createDiscoverStreamsLink } from './discover_streams_link';
import { StreamsAppLocatorDefinition } from './app_locator';
import { StreamsTelemetryService } from './telemetry/service';

const StreamsApplication = dynamic(() =>
  import('./application').then((mod) => ({ default: mod.StreamsApplication }))
);

export class StreamsAppPlugin
  implements
    Plugin<
      StreamsAppPublicSetup,
      StreamsAppPublicStart,
      StreamsAppSetupDependencies,
      StreamsAppStartDependencies
    >
{
  logger: Logger;
  telemetry: StreamsTelemetryService = new StreamsTelemetryService();

  constructor(private readonly context: PluginInitializerContext<ConfigSchema>) {
    this.logger = context.logger.get();
  }
  setup(coreSetup: CoreSetup): StreamsAppPublicSetup {
    this.telemetry.setup(coreSetup.analytics);
    return {};
  }

  start(coreStart: CoreStart, pluginsStart: StreamsAppStartDependencies): StreamsAppPublicStart {
    const locator = new StreamsAppLocatorDefinition();
    pluginsStart.share.url.locators.create(locator);
    pluginsStart.streams.status$.subscribe((status) => {
      if (status.status !== 'enabled') return;
      pluginsStart.discoverShared.features.registry.register({
        id: 'streams',
        renderStreamsField: createDiscoverStreamsLink({
          streamsRepositoryClient: pluginsStart.streams.streamsRepositoryClient,
          locator: pluginsStart.share.url.locators.get(locator.id)!,
          coreApplication: coreStart.application,
        }),
      });
    });
    return {
      createStreamsApplicationComponent: () => {
        return ({ appMountParameters, PageTemplate }: StreamsApplicationProps) => {
          const services: StreamsAppServices = {
            dataStreamsClient: new DataStreamsStatsService()
              .start({ http: coreStart.http })
              .getClient(),
            PageTemplate,
            telemetryClient: this.telemetry.getClient(),
          };

          // Trigger fetch to ensure the time filter has an up-to-date time range when the app mounts.
          // This is done to ensure that dynamic time ranges (like "Last 15 minutes") are applied like they
          // would be in discover or dashboards.
          pluginsStart.data.query.timefilter.timefilter.triggerFetch();

          return (
            <StreamsApplication
              coreStart={coreStart}
              pluginsStart={pluginsStart}
              services={services}
              appMountParameters={appMountParameters}
              isServerless={this.context.env.packageInfo.buildFlavor === 'serverless'}
            />
          );
        };
      },
    };
  }
}
