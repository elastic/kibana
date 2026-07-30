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
import { registerEntityCentricLabAttachment } from '@kbn/entity-centric-lab-flyout';
import { INSTALLED_INTEGRATIONS, getIntegrationDeepLinkId } from '@kbn/entity-centric-lab-flyout';
import type {
  ConfigSchema,
  StreamsAppPublicSetup,
  StreamsAppPublicStart,
  StreamsAppSetupDependencies,
  StreamsAppStartDependencies,
} from './types';
import type { StreamsAppServices } from './services/types';
import {
  createDiscoverFlyoutStreamFieldByStreamNameLink,
  createDiscoverFlyoutStreamFieldLink,
  createDiscoverFlyoutStreamProcessingLink,
} from './discover_features';
import { StreamsTelemetryService } from './telemetry/service';
import { StreamsAppLocatorDefinition } from '../common/locators';
import { CLOUD_PROVIDERS } from './components/entity_centric_lab/entities/cloud_providers';

const StreamsApplication = dynamic(() =>
  import('./application').then((mod) => ({ default: mod.StreamsApplication }))
);

const toPascalCase = (value: string): string => value.charAt(0).toUpperCase() + value.slice(1);

/**
 * Deep links for the nested Cloud hierarchy, derived from the
 * {@link CLOUD_PROVIDERS} taxonomy so provider/service additions only
 * need a single edit. Produces one link per provider
 * (`entitiesCloudAws` -> `/entities/cloud/aws`) and one per service
 * (`entitiesCloudAwsEc2` -> `/entities/cloud/aws/ec2`). The navigation
 * tree in the Observability plugin references these ids explicitly.
 */
const cloudEntityDeepLinks = CLOUD_PROVIDERS.flatMap((provider) => {
  const providerId = `entitiesCloud${toPascalCase(provider.id)}`;
  return [
    {
      id: providerId,
      title: provider.label,
      path: `/entities/cloud/${provider.id}`,
      visibleIn: [] as [],
    },
    ...provider.services.map((service) => ({
      id: `${providerId}${toPascalCase(service.id)}`,
      title: service.label,
      path: `/entities/cloud/${provider.id}/${service.id}`,
      visibleIn: [] as [],
    })),
  ];
});

/**
 * Super-short-term lab: one deep link per installed integration
 * (`integrationsAwsEc2` -> `/integrations/aws-ec2`), derived from the shared
 * registry. The Observability "Infrastructure" nav references these ids via
 * {@link getIntegrationDeepLinkId} so both sides stay in sync.
 */
const integrationDeepLinks = INSTALLED_INTEGRATIONS.map((integration) => ({
  id: getIntegrationDeepLinkId(integration.id),
  title: integration.name,
  path: `/integrations/${integration.id}`,
  visibleIn: [] as [],
}));

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
  setup(coreSetup: CoreSetup<StreamsAppStartDependencies>): StreamsAppPublicSetup {
    this.telemetry.setup(coreSetup.analytics);
    const startServicesPromise = coreSetup.getStartServices();

    coreSetup.application.register({
      id: 'streams',
      title: i18n.translate('xpack.streams.appTitle', {
        defaultMessage: 'Streams',
      }),
      euiIconType: 'logoElastic',
      appRoute: '/app/streams',
      category: DEFAULT_APP_CATEGORIES.management,
      order: 10000,
      // Entity-centric lab: deep link consumed by the Observability nav tree
      // (gated client-side by the `discover:entityCentricLab` UI setting). The
      // backing route is registered in `routes/config.tsx`.
      deepLinks: [
        {
          id: 'manageEntityTypes',
          title: i18n.translate('xpack.streams.deepLinks.manageEntityTypesTitle', {
            defaultMessage: 'Manage entity types',
          }),
          path: '/manage-entity-types',
          // Hidden from the global side nav / search by default; the
          // Observability solution nav tree explicitly references it when the
          // entity-centric lab is enabled.
          visibleIn: [],
        },
        {
          id: 'significantEvents',
          title: i18n.translate('xpack.streams.deepLinks.significantEventsTitle', {
            defaultMessage: 'Significant events',
          }),
          path: '/significant-events',
          visibleIn: [],
        },
        {
          id: 'entities',
          title: i18n.translate('xpack.streams.deepLinks.entitiesTitle', {
            defaultMessage: 'Entities',
          }),
          path: '/entities',
          visibleIn: [],
        },
        {
          id: 'entitiesAll',
          title: i18n.translate('xpack.streams.deepLinks.entitiesAllTitle', {
            defaultMessage: 'All entities',
          }),
          path: '/entities',
          visibleIn: [],
        },
        {
          id: 'entitiesHosts',
          title: i18n.translate('xpack.streams.deepLinks.entitiesHostsTitle', {
            defaultMessage: 'Hosts',
          }),
          path: '/entities/hosts',
          visibleIn: [],
        },
        {
          id: 'entitiesKubernetes',
          title: i18n.translate('xpack.streams.deepLinks.entitiesKubernetesTitle', {
            defaultMessage: 'Kubernetes',
          }),
          path: '/entities/kubernetes',
          visibleIn: [],
        },
        {
          id: 'entitiesDatabases',
          title: i18n.translate('xpack.streams.deepLinks.entitiesDatabasesTitle', {
            defaultMessage: 'Databases',
          }),
          path: '/entities/databases',
          visibleIn: [],
        },
        {
          id: 'entitiesServices',
          title: i18n.translate('xpack.streams.deepLinks.entitiesServicesTitle', {
            defaultMessage: 'Services',
          }),
          path: '/entities/services',
          visibleIn: [],
        },
        {
          id: 'entitiesCloud',
          title: i18n.translate('xpack.streams.deepLinks.entitiesCloudTitle', {
            defaultMessage: 'Cloud',
          }),
          path: '/entities/cloud',
          visibleIn: [],
        },
        ...cloudEntityDeepLinks,
        {
          id: 'entitiesMiddlewares',
          title: i18n.translate('xpack.streams.deepLinks.entitiesMiddlewaresTitle', {
            defaultMessage: 'Middlewares',
          }),
          path: '/entities/middlewares',
          visibleIn: [],
        },
        {
          id: 'entitiesLlms',
          title: i18n.translate('xpack.streams.deepLinks.entitiesLlmsTitle', {
            defaultMessage: 'LLMs',
          }),
          path: '/entities/llms',
          visibleIn: [],
        },
        {
          // Catch-all bucket for entity types whose `category` field
          // doesn't match any of the canonical labels above —
          // user-typed via the wizard's "+ Create new category" path,
          // or legacy seed values that haven't been migrated.
          id: 'entitiesOther',
          title: i18n.translate('xpack.streams.deepLinks.entitiesOtherTitle', {
            defaultMessage: 'Other',
          }),
          path: '/entities/other',
          visibleIn: [],
        },
        {
          // Super-short-term lab: integrations content hub (starred Overview).
          // Per-integration detail pages are reached via raw hrefs from the
          // nav, so only this landing deep link is registered.
          id: 'integrations',
          title: i18n.translate('xpack.streams.deepLinks.integrationsTitle', {
            defaultMessage: 'Integrations',
          }),
          path: '/integrations',
          visibleIn: [],
        },
        ...integrationDeepLinks,
      ],
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
    // Wire the entity-centric lab context attachment into Agent Builder so
    // the flyout's "Add to chat" pill renders with the entity name and a
    // rich inline snapshot instead of a generic "Text" label. The helper
    // is idempotent, so it's safe to call again if Discover also loads it.
    if (pluginsStart.agentBuilder) {
      registerEntityCentricLabAttachment(pluginsStart.agentBuilder);
    }

    // Super-short-term lab: register the Infrastructure side-panel footer
    // (grouped-favorites toggle + "Manage groups"). Lazy so its UI deps stay
    // out of the boot path; the renderer no-ops for other panels/modes.
    import('./components/entity_centric_lab/integrations/nav_footer').then(
      ({ registerIntegrationsNavFooter }) => {
        registerIntegrationsNavFooter(coreStart);
      }
    );

    const locator = pluginsStart.share.url.locators.create(new StreamsAppLocatorDefinition());
    pluginsStart.streams.navigationStatus$.subscribe((status) => {
      if (status.status !== 'enabled') return;
      pluginsStart.discoverShared.features.registry.register({
        id: 'streams',
        renderFlyoutStreamField: createDiscoverFlyoutStreamFieldLink({
          streamsRepositoryClient: pluginsStart.streams.streamsRepositoryClient,
          locator,
        }),
        renderFlyoutStreamFieldByStreamName: createDiscoverFlyoutStreamFieldByStreamNameLink({
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

    return {};
  }
}
