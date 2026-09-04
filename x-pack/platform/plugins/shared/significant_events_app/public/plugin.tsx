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
} from '@kbn/core/public';
import {
  SIGNIFICANT_EVENTS_APP_ID,
  type SignificantEventsLinkId,
} from '@kbn/deeplinks-observability';
import { i18n } from '@kbn/i18n';
import { catchError, from, map, of, switchMap } from 'rxjs';
import { SIGNIFICANT_EVENTS_APP_ROUTE } from '../common/constants';
import { SignificantEventsAppLocatorDefinition } from '../common/locators';
import { FocusedSignificantEventService } from './services/focused_significant_event_service';
import type {
  SignificantEventsAppPublicSetup,
  SignificantEventsAppPublicStart,
  SignificantEventsAppSetupDependencies,
  SignificantEventsAppStartDependencies,
} from './types';
import type { SignificantEventsAppServices } from './services/types';

export class SignificantEventsAppPlugin
  implements
    Plugin<
      SignificantEventsAppPublicSetup,
      SignificantEventsAppPublicStart,
      SignificantEventsAppSetupDependencies,
      SignificantEventsAppStartDependencies
    >
{
  // Built in start(); core guarantees every plugin start() runs before any app mount,
  // so the mount callback below can safely read it.
  private focusedSignificantEventService!: FocusedSignificantEventService;
  private cleanupSignificantEventAttachment?: () => void;
  private stopped = false;

  setup(
    coreSetup: CoreSetup<SignificantEventsAppStartDependencies>,
    pluginsSetup: SignificantEventsAppSetupDependencies
  ): SignificantEventsAppPublicSetup {
    const startServicesPromise = coreSetup.getStartServices();

    pluginsSetup.share.url.locators.create(new SignificantEventsAppLocatorDefinition());

    coreSetup.application.register({
      id: SIGNIFICANT_EVENTS_APP_ID,
      title: i18n.translate('xpack.significantEventsApp.appTitle', {
        defaultMessage: 'Nightshift Management',
      }),
      euiIconType: 'logoObservability',
      appRoute: SIGNIFICANT_EVENTS_APP_ROUTE,
      category: DEFAULT_APP_CATEGORIES.observability,
      visibleIn: [],
      keywords: [
        'nightshift management',
        'nightshift',
        'significant events',
        'sig events',
        'discovery',
      ],
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
        switchMap(([, pluginsStart]) =>
          // The server endpoint is the single source of truth for availability
          // (rollout flag, project type, pricing tier, license, required plugins).
          // Standalone app: surface in global search whenever it reports available.
          // Nightshift and other consumers link here independently of Streams
          // navigation status.
          from(
            pluginsStart.significantEvents.significantEventsRepositoryClient.fetch(
              'GET /internal/significant_events/availability',
              { signal: null }
            )
          ).pipe(
            map(({ available }) => available),
            catchError(() => of(false)),
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
        const [[coreStart, pluginsStart], { renderApp }] = await Promise.all([
          startServicesPromise,
          import('./app_root/render_app'),
        ]);

        const services: SignificantEventsAppServices = {
          focusedSignificantEventService: this.focusedSignificantEventService,
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
        });
      },
    });

    return {};
  }

  start(
    coreStart: CoreStart,
    pluginsStart: SignificantEventsAppStartDependencies
  ): SignificantEventsAppPublicStart {
    this.focusedSignificantEventService = new FocusedSignificantEventService();

    if (pluginsStart.agentBuilder) {
      const { agentBuilder } = pluginsStart;
      const { chrome } = coreStart;
      const { focusedSignificantEventService } = this;
      // Async so attachment UI / significant-events-schema (→ streamlang) stay off page-load.
      void import('./components/significant_event_attachment').then(
        ({ registerSignificantEventAttachment }) => {
          const cleanup = registerSignificantEventAttachment({
            agentBuilder,
            chrome,
            focusedSignificantEventService,
          });
          if (this.stopped) {
            cleanup();
            return;
          }
          this.cleanupSignificantEventAttachment = cleanup;
        }
      );
    }

    return {};
  }

  stop() {
    this.stopped = true;
    this.cleanupSignificantEventAttachment?.();
    this.cleanupSignificantEventAttachment = undefined;
  }
}
