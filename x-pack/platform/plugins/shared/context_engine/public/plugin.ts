/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DEFAULT_APP_CATEGORIES,
  type AppDeepLinkLocations,
  type AppMountParameters,
  type AppUpdater,
  type CoreSetup,
  type CoreStart,
  type Plugin,
  type PluginInitializerContext,
} from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/management-settings-ids';
import { BehaviorSubject, distinctUntilChanged, type Subscription } from 'rxjs';
import { CONTEXT_ENGINE_APP_ID, CONTEXT_ENGINE_APP_PATH } from '../common/features';
import type {
  ContextEnginePluginSetup,
  ContextEnginePluginStart,
  ContextEngineSetupDependencies,
  ContextEngineStartDependencies,
} from './types';

const APP_TITLE = i18n.translate('xpack.contextEngine.app.title', {
  defaultMessage: 'Context',
});

const VISIBLE_LOCATIONS: readonly AppDeepLinkLocations[] = [
  'classicSideNav',
  'projectSideNav',
  'globalSearch',
];

export class ContextEnginePlugin
  implements
    Plugin<
      ContextEnginePluginSetup,
      ContextEnginePluginStart,
      ContextEngineSetupDependencies,
      ContextEngineStartDependencies
    >
{
  private readonly appUpdater$ = new BehaviorSubject<AppUpdater>(() => ({}));
  private experimentalSubscription?: Subscription;

  constructor(_context: PluginInitializerContext) {}

  setup(core: CoreSetup<ContextEngineStartDependencies>): ContextEnginePluginSetup {
    core.application.register({
      id: CONTEXT_ENGINE_APP_ID,
      appRoute: CONTEXT_ENGINE_APP_PATH,
      category: DEFAULT_APP_CATEGORIES.enterpriseSearch,
      title: APP_TITLE,
      euiIconType: 'logoElasticsearch',
      // Hidden by default; visibility is toggled at runtime by the experimental flag.
      visibleIn: [],
      keywords: ['context', 'ai index', 'context engine'],
      updater$: this.appUpdater$,
      defaultPath: '/',
      async mount(params: AppMountParameters) {
        const { mountApp } = await import('./application');
        const [coreStart] = await core.getStartServices();
        coreStart.chrome.docTitle.change(APP_TITLE);
        return mountApp({ core: coreStart, element: params.element, history: params.history });
      },
    });

    return {};
  }

  start(core: CoreStart): ContextEnginePluginStart {
    this.experimentalSubscription = core.uiSettings
      .get$<boolean>(AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID, false)
      .pipe(distinctUntilChanged())
      .subscribe((experimentalFeaturesEnabled) => {
        this.appUpdater$.next(() => ({
          visibleIn: experimentalFeaturesEnabled ? [...VISIBLE_LOCATIONS] : [],
        }));
      });

    return {};
  }

  stop() {
    this.experimentalSubscription?.unsubscribe();
  }
}
