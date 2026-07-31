/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppMountParameters, AppUpdater } from '@kbn/core/public';
import {
  DEFAULT_APP_CATEGORIES,
  type CoreSetup,
  type CoreStart,
  type Plugin,
  type PluginInitializerContext,
} from '@kbn/core/public';
import {
  SIGNIFICANT_EVENTS_APP_ID,
  type SignificantEventsLinkId,
} from '@kbn/deeplinks-observability';
import { i18n } from '@kbn/i18n';
import { dynamic } from '@kbn/shared-ux-utility';
import {
  SIGNIFICANT_EVENTS_TIERED_FEATURE,
  STREAMS_SIGNIFICANT_EVENTS_AVAILABLE_FLAG,
} from '@kbn/significant-events-plugin/common';
import React from 'react';
import ReactDOM from 'react-dom';
import type { Observable } from 'rxjs';
import { combineLatest, distinctUntilChanged, from, map, shareReplay, switchMap } from 'rxjs';
import { SIGNIFICANT_EVENTS_APP_ROUTE } from '../common/constants';
import type { SignificantEventsAppLocator } from '../common/locators';
import { SignificantEventsAppLocatorDefinition } from '../common/locators';
import type { SignificantEventsAppServices } from './services/types';
import type {
  SignificantEventsAppPublicSetup,
  SignificantEventsAppPublicStart,
  SignificantEventsAppSetupDependencies,
  SignificantEventsAppStartDependencies,
} from './types';

const SignificantEventsApplication = dynamic(() =>
  import('./application').then((mod) => ({ default: mod.SignificantEventsApplication }))
);

export const renderApp = ({
  appMountParameters,
  services,
  coreStart,
  pluginsStart,
  isServerless,
}: {
  appMountParameters: AppMountParameters;
  services: SignificantEventsAppServices;
  coreStart: CoreStart;
  pluginsStart: SignificantEventsAppStartDependencies;
  isServerless: boolean;
}) => {
  const { element } = appMountParameters;

  // `element` is core's app wrapper node; make it scrollable for this app.
  // A plain inline style avoids pulling @emotion/css into the page-load bundle.
  const previousOverflow = element.style.overflow;
  element.style.overflow = 'auto';

  ReactDOM.render(
    <SignificantEventsApplication
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
    element.style.overflow = previousOverflow;
  };
};

export class SignificantEventsAppPlugin
  implements
    Plugin<
      SignificantEventsAppPublicSetup,
      SignificantEventsAppPublicStart,
      SignificantEventsAppSetupDependencies,
      SignificantEventsAppStartDependencies
    >
{
  private locator!: SignificantEventsAppLocator;
  // Built in start(); core guarantees every plugin start() runs before any app mount,
  // so the mount callback below can safely read it.
  private availability$!: Observable<boolean>;

  constructor(private readonly context: PluginInitializerContext) {}

  setup(
    coreSetup: CoreSetup<SignificantEventsAppStartDependencies>,
    pluginsSetup: SignificantEventsAppSetupDependencies
  ): SignificantEventsAppPublicSetup {
    const startServicesPromise = coreSetup.getStartServices();

    this.locator = pluginsSetup.share.url.locators.create(
      new SignificantEventsAppLocatorDefinition()
    );

    coreSetup.application.register({
      id: SIGNIFICANT_EVENTS_APP_ID,
      title: i18n.translate('xpack.significantEventsApp.appTitle', {
        defaultMessage: 'Significant Events',
      }),
      euiIconType: 'logoElastic',
      appRoute: SIGNIFICANT_EVENTS_APP_ROUTE,
      category: DEFAULT_APP_CATEGORIES.management,
      visibleIn: [],
      keywords: ['significant events', 'sig events', 'discovery'],
      deepLinks: [
        {
          id: 'knowledge_indicators' satisfies SignificantEventsLinkId,
          title: i18n.translate('xpack.significantEventsApp.kiDeepLinkTitle', {
            defaultMessage: 'Significant Events / KIs',
          }),
          path: '/knowledge_indicators',
          visibleIn: [],
          keywords: [
            'knowledge indicators',
            'ki',
            'kis',
            'significant events',
            'sig events',
            'sig events kis',
          ],
        },
        {
          id: 'events' satisfies SignificantEventsLinkId,
          title: i18n.translate('xpack.significantEventsApp.eventsDeepLinkTitle', {
            defaultMessage: 'Significant Events / Events',
          }),
          path: '/significant_events',
          visibleIn: [],
          keywords: ['events', 'significant events', 'sig events', 'sig events events'],
        },
        {
          id: 'rules' satisfies SignificantEventsLinkId,
          title: i18n.translate('xpack.significantEventsApp.rulesDeepLinkTitle', {
            defaultMessage: 'Significant Events / Rules',
          }),
          path: '/queries',
          visibleIn: [],
          keywords: ['rules', 'queries', 'significant events', 'sig events', 'sig events rules'],
        },
      ],
      updater$: from(startServicesPromise).pipe(
        switchMap(([coreStart, pluginsStart]) =>
          combineLatest([
            pluginsStart.streams.navigationStatus$,
            coreStart.featureFlags.getBooleanValue$(
              STREAMS_SIGNIFICANT_EVENTS_AVAILABLE_FLAG,
              false
            ),
          ]).pipe(
            // Mirrors the server-side gate: the app and its deep links only surface
            // in global search when streams navigation is enabled and the rollout
            // flag is on. The app never appears in the side navigations.
            map(
              ([{ status }, isSignificantEventsAvailable]) =>
                status === 'enabled' && isSignificantEventsAvailable
            ),
            // Every updater emission makes core rebuild the status of all registered
            // apps, so drop the redundant re-emissions of the sources.
            distinctUntilChanged(),
            map(
              (visible): AppUpdater =>
                (app) => ({
                  visibleIn: visible ? ['globalSearch'] : [],
                  deepLinks: (app.deepLinks ?? []).map((link) => ({
                    ...link,
                    visibleIn: visible ? ['globalSearch'] : [],
                  })),
                })
            )
          )
        )
      ),
      mount: async (appMountParameters: AppMountParameters<unknown>) => {
        // Warm the application chunk in parallel with resolving start services.
        void import('./application');
        const [coreStart, pluginsStart] = await coreSetup.getStartServices();

        const services: SignificantEventsAppServices = {
          availability$: this.availability$,
        };

        // Trigger fetch to ensure the time filter has an up-to-date time range when
        // the app mounts, so dynamic time ranges (like "Last 15 minutes") are applied
        // like they would be in Discover or dashboards.
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

  start(
    coreStart: CoreStart,
    pluginsStart: SignificantEventsAppStartDependencies
  ): SignificantEventsAppPublicStart {
    // Created once and multicast (refCount: false keeps the chain alive across
    // subscriber churn): every flag evaluation POSTs to the feature-flags usage
    // counter endpoint, so consumers must share this single subscription chain
    // instead of recreating it.
    this.availability$ = combineLatest([
      coreStart.featureFlags.getBooleanValue$(STREAMS_SIGNIFICANT_EVENTS_AVAILABLE_FLAG, false),
      pluginsStart.licensing.license$,
    ]).pipe(
      map(([flagEnabled, license]) =>
        Boolean(
          flagEnabled &&
            license?.hasAtLeast('enterprise') &&
            coreStart.pricing.isFeatureAvailable(SIGNIFICANT_EVENTS_TIERED_FEATURE.id)
        )
      ),
      distinctUntilChanged(),
      shareReplay(1)
    );

    return {
      availability$: this.availability$,
      fetchAvailability: (signal) =>
        pluginsStart.significant_events.significantEventsRepositoryClient.fetch(
          'GET /internal/significant_events/availability',
          { signal: signal ?? null }
        ),
      locator: this.locator,
    };
  }
}
