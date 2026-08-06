/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
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
import { from, map, switchMap } from 'rxjs';
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
  private agentBuilderPromise: Promise<AgentBuilderPluginStart | undefined> | undefined;

  constructor(_context: PluginInitializerContext) {}

  setup(
    core: CoreSetup<ContextEngineStartDependencies, ContextEnginePluginStart>
  ): ContextEnginePluginSetup {
    this.setupAgentBuilderStart(core);

    const agentBuilderPromise = this.agentBuilderPromise;
    const startServices = core.getStartServices();

    core.application.register({
      id: CONTEXT_ENGINE_APP_ID,
      appRoute: CONTEXT_ENGINE_APP_PATH,
      category: DEFAULT_APP_CATEGORIES.enterpriseSearch,
      title: APP_TITLE,
      euiIconType: 'logoElasticsearch',
      visibleIn: [...VISIBLE_LOCATIONS],
      // Inaccessible by default: the app and its routes are gated until the advanced
      // setting is on. While inaccessible, core also removes it from every navigation
      // surface.
      status: AppStatus.inaccessible,
      keywords: ['context', 'ai index', 'context engine'],
      updater$: from(startServices).pipe(
        switchMap(([coreStart]) =>
          coreStart.uiSettings.get$<boolean>(CONTEXT_ENGINE_ENABLED_SETTING_ID, false).pipe(
            map(
              (settingEnabled): AppUpdater =>
                () => ({
                  status: settingEnabled ? AppStatus.accessible : AppStatus.inaccessible,
                })
            )
          )
        )
      ),
      defaultPath: '/',
      async mount(params: AppMountParameters) {
        const { mountApp } = await import('./application');
        const [coreStart, pluginsStart] = await core.getStartServices();
        const agentBuilder = await agentBuilderPromise;
        coreStart.chrome.docTitle.change(APP_TITLE);
        return mountApp({
          core: coreStart,
          plugins: pluginsStart,
          additionalServices: { agentBuilder },
          element: params.element,
          history: params.history,
        });
      },
    });

    return {};
  }

  private setupAgentBuilderStart(
    core: CoreSetup<ContextEngineStartDependencies, ContextEnginePluginStart>
  ): void {
    try {
      this.agentBuilderPromise = core.plugins
        .onStart<{ agentBuilder: AgentBuilderPluginStart }>('agentBuilder')
        .then(({ agentBuilder }) => (agentBuilder.found ? agentBuilder.contract : undefined))
        .catch(() => undefined);
    } catch {
      this.agentBuilderPromise = Promise.resolve(undefined);
    }
  }

  start(_core: CoreStart): ContextEnginePluginStart {
    return {};
  }

  stop() {}
}
