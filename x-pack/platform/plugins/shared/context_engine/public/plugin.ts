/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AppStatus,
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
import { CONTEXT_ENGINE_ENABLED_SETTING_ID } from '@kbn/management-settings-ids';
import { combineLatest, from, map, switchMap } from 'rxjs';
import {
  CONTEXT_ENGINE_APP_ID,
  CONTEXT_ENGINE_APP_PATH,
  CONTEXT_ENGINE_ENABLED_FLAG,
} from '../common/features';
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
  constructor(_context: PluginInitializerContext) {}

  setup(core: CoreSetup<ContextEngineStartDependencies>): ContextEnginePluginSetup {
    const startServices = core.getStartServices();

    core.application.register({
      id: CONTEXT_ENGINE_APP_ID,
      appRoute: CONTEXT_ENGINE_APP_PATH,
      category: DEFAULT_APP_CATEGORIES.enterpriseSearch,
      title: APP_TITLE,
      euiIconType: 'logoElasticsearch',
      visibleIn: [...VISIBLE_LOCATIONS],
      // Inaccessible by default: the app and its routes are gated until both the
      // feature flag and the advanced setting are on. While inaccessible, core also
      // removes it from every navigation surface.
      status: AppStatus.inaccessible,
      keywords: ['context', 'ai index', 'context engine'],
      updater$: from(startServices).pipe(
        switchMap(([coreStart]) =>
          combineLatest([
            coreStart.featureFlags.getBooleanValue$(CONTEXT_ENGINE_ENABLED_FLAG, false),
            coreStart.uiSettings.get$<boolean>(CONTEXT_ENGINE_ENABLED_SETTING_ID, false),
          ]).pipe(
            map(
              ([flagEnabled, settingEnabled]): AppUpdater =>
                () => ({
                  status:
                    flagEnabled && settingEnabled ? AppStatus.accessible : AppStatus.inaccessible,
                })
            )
          )
        )
      ),
      defaultPath: '/',
      async mount(params: AppMountParameters) {
        const { mountApp } = await import('./application');
        const [coreStart, pluginsStart] = await core.getStartServices();
        coreStart.chrome.docTitle.change(APP_TITLE);
        return mountApp({
          core: coreStart,
          plugins: pluginsStart,
          element: params.element,
          history: params.history,
        });
      },
    });

    return {};
  }

  start(_core: CoreStart): ContextEnginePluginStart {
    return {};
  }

  stop() {}
}
