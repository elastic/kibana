/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppMountParameters, AppUpdater } from '@kbn/core/public';
import {
  APP_WRAPPER_CLASS,
  DEFAULT_APP_CATEGORIES,
  type CoreSetup,
  type CoreStart,
  type Plugin,
  type PluginInitializerContext,
} from '@kbn/core/public';
import type { Logger } from '@kbn/logging';
import { DataStreamsStatsService } from '@kbn/dataset-quality-plugin/public';
import { dynamic } from '@kbn/shared-ux-utility';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { from, map, switchMap } from 'rxjs';
import { css } from '@emotion/css';
import ReactDOM from 'react-dom';
import type {
  ConfigSchema,
  StreamsAppPublicSetup,
  StreamsAppPublicStart,
  StreamsAppSetupDependencies,
  StreamsAppStartDependencies,
} from './types';
import type { StreamsAppServices } from './services/types';
import {
  createDiscoverFlyoutStreamFieldLink,
  createDiscoverFlyoutStreamProcessingLink,
} from './discover_features';
import { StreamsTelemetryService } from './telemetry/service';
import { StreamsAppLocator, StreamsAppLocatorDefinition } from '../common/locators';
import {
  ADD_STREAM_METRICS_PANEL_ACTION_ID,
  OPEN_STREAM_ACTION_ID,
  STREAM_METRICS_EMBEDDABLE_ID,
} from '../common/embeddable';

const StreamsApplication = dynamic(() =>
  import('./application').then((mod) => ({ default: mod.StreamsApplication }))
);

export const renderApp = ({
  appMountParameters,
  services,
  coreStart,
  pluginsStart,
  isServerless,
}: {
  appMountParameters: AppMountParameters;
  services: StreamsAppServices;
  coreStart: CoreStart;
  pluginsStart: StreamsAppStartDependencies;
  isServerless: boolean;
}) => {
  const { element } = appMountParameters;

  const appWrapperClassName = css`
    overflow: auto;
  `;
  const appWrapperElement = document.getElementsByClassName(APP_WRAPPER_CLASS)[1];
  appWrapperElement.classList.add(appWrapperClassName);

  ReactDOM.render(
    <StreamsApplication
      coreStart={coreStart}
      pluginsStart={pluginsStart}
      services={services}
      isServerless={isServerless}
      appMountParameters={appMountParameters}
    />,
    element
  );
  return () => {
    ReactDOM.unmountComponentAtNode(element);
    appWrapperElement.classList.remove(APP_WRAPPER_CLASS);
  };
};

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

  private readonly version: string;

  constructor(private readonly context: PluginInitializerContext<ConfigSchema>) {
    this.logger = context.logger.get();
    this.version = context.env.packageInfo.version;
  }
  setup(
    coreSetup: CoreSetup<StreamsAppStartDependencies>,
    { embeddable }: StreamsAppSetupDependencies
  ): StreamsAppPublicSetup {
    this.telemetry.setup(coreSetup.analytics);
    const startServicesPromise = coreSetup.getStartServices();

    // Register the stream metrics embeddable factory
    embeddable.registerReactEmbeddableFactory(STREAM_METRICS_EMBEDDABLE_ID, async () => {
      const { getStreamMetricsEmbeddableFactory } = await import('./embeddable');
      const [coreStart, pluginsStart] = await startServicesPromise;
      return getStreamMetricsEmbeddableFactory({ coreStart, pluginsStart });
    });

    coreSetup.application.register({
      id: 'streams',
      title: i18n.translate('xpack.streams.appTitle', {
        defaultMessage: 'Streams',
      }),
      euiIconType: 'logoElastic',
      appRoute: '/app/streams',
      category: DEFAULT_APP_CATEGORIES.management,
      order: 10000,
      updater$: from(startServicesPromise).pipe(
        switchMap(([_, pluginsStart]) =>
          pluginsStart.streams.navigationStatus$.pipe(
            map(({ status }): AppUpdater => {
              return (app) => {
                if (status !== 'enabled') {
                  return {
                    visibleIn: [],
                  };
                }

                return {
                  visibleIn: ['sideNav', 'globalSearch'],
                };
              };
            })
          )
        )
      ),
      mount: async (appMountParameters: AppMountParameters<unknown>) => {
        // Load application bundle and Get start services
        const [coreStart, pluginsStart] = await coreSetup.getStartServices();

        const services: StreamsAppServices = {
          dataStreamsClient: new DataStreamsStatsService()
            .start({ http: coreStart.http })
            .getClient(),
          telemetryClient: this.telemetry.getClient(),
          version: this.version,
        };

        // Trigger fetch to ensure the time filter has an up-to-date time range when the app mounts.
        // This is done to ensure that dynamic time ranges (like "Last 15 minutes") are applied like they
        // would be in discover or dashboards.
        pluginsStart.data.query.timefilter.timefilter.triggerFetch();

        return renderApp({
          appMountParameters,
          services,
          coreStart,
          pluginsStart,
          isServerless: this.context.env.packageInfo.buildFlavor === 'serverless',
        });
      },
    });

    return {};
  }

  start(coreStart: CoreStart, pluginsStart: StreamsAppStartDependencies): StreamsAppPublicStart {
    const locator = pluginsStart.share.url.locators.create(new StreamsAppLocatorDefinition());
    pluginsStart.streams.navigationStatus$.subscribe((status) => {
      if (status.status !== 'enabled') return;
      pluginsStart.discoverShared.features.registry.register({
        id: 'streams',
        renderFlyoutStreamField: createDiscoverFlyoutStreamFieldLink({
          streamsRepositoryClient: pluginsStart.streams.streamsRepositoryClient,
          locator,
        }),
        renderFlyoutStreamProcessingLink: createDiscoverFlyoutStreamProcessingLink({
          fieldFormats: pluginsStart.fieldFormats,
          streamsRepositoryClient: pluginsStart.streams.streamsRepositoryClient,
          locator,
        }),
      });
    });

    // Register the ADD_PANEL_TRIGGER action for adding stream metrics panels to dashboards
    this.registerAddPanelAction(coreStart, pluginsStart);

    // Register the CONTEXT_MENU_TRIGGER action for opening streams from embedded panels
    this.registerOpenStreamAction(coreStart, pluginsStart, locator);

    return {};
  }

  private registerAddPanelAction(
    coreStart: CoreStart,
    pluginsStart: StreamsAppStartDependencies
  ): void {
    const { uiActions } = pluginsStart;
    // Dynamic import from ui-actions-plugin to avoid static dependency on ADD_PANEL_TRIGGER
    import('@kbn/ui-actions-plugin/common/trigger_ids').then(({ ADD_PANEL_TRIGGER }) => {
      uiActions.addTriggerActionAsync(
        ADD_PANEL_TRIGGER,
        ADD_STREAM_METRICS_PANEL_ACTION_ID,
        async () => {
          const { createAddStreamMetricsPanelAction } = await import('./actions');
          return createAddStreamMetricsPanelAction(coreStart, pluginsStart);
        }
      );
    });
  }

  private registerOpenStreamAction(
    coreStart: CoreStart,
    pluginsStart: StreamsAppStartDependencies,
    locator: StreamsAppLocator
  ): void {
    const { uiActions } = pluginsStart;
    // Dynamic import from ui-actions-plugin to avoid static dependency on CONTEXT_MENU_TRIGGER
    import('@kbn/ui-actions-plugin/common/trigger_ids').then(({ CONTEXT_MENU_TRIGGER }) => {
      uiActions.addTriggerActionAsync(CONTEXT_MENU_TRIGGER, OPEN_STREAM_ACTION_ID, async () => {
        const { createOpenStreamAction } = await import('./actions');
        return createOpenStreamAction(coreStart, locator);
      });
    });
  }
}
