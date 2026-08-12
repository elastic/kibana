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
import { from, map, switchMap } from 'rxjs';
import { CONTEXT_ENGINE_APP_ID, CONTEXT_ENGINE_APP_PATH } from '../common/features';
import { AI_INDEX_ATTACHMENT_TYPE } from '../common/agent_builder/constants';
import type {
  AnalyzeAndImproveContext,
  AnalyzeChatOptions,
  ChatOpener,
  ContextEnginePluginSetup,
  ContextEnginePluginStart,
  ContextEngineSetupDependencies,
  ContextEngineStartDependencies,
} from './types';

/**
 * Builds the Agent Builder `openChat` options for an "Analyze & improve" hand-off: the AI index's
 * configured feedback agent, a fresh per-index conversation, and the index attached by value.
 */
const buildAnalyzeChat = ({ aiIndex }: AnalyzeAndImproveContext): AnalyzeChatOptions => ({
  agentId: aiIndex.feedback_agent_id,
  newConversation: true,
  // Per-index session so each AI index's analysis is its own conversation instead of colliding on
  // Agent Builder's shared 'default' session for the agent (which would bleed one index's context
  // into another's). `context.tag` is reserved for future group-scoped analysis and unused here.
  sessionTag: `context-engine-feedback:${aiIndex.id}`,
  attachments: [
    {
      id: `${AI_INDEX_ATTACHMENT_TYPE}.${aiIndex.id}`,
      type: AI_INDEX_ATTACHMENT_TYPE,
      data: aiIndex,
    },
  ],
});

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
  /**
   * The registered "Analyze & improve" chat opener, or `undefined` until one is registered. A
   * getter over this field is threaded into the app so the button reacts to an opener registered
   * after mount, rather than a value snapshotted once at mount time.
   */
  private chatOpener?: ChatOpener;

  constructor(_context: PluginInitializerContext) {}

  setup(core: CoreSetup<ContextEngineStartDependencies>): ContextEnginePluginSetup {
    const startServices = core.getStartServices();
    // Captured in a closure so `mount` (where `this` is the app config) can read the opener
    // registered on `start`.
    const getChatOpener = () => this.chatOpener;

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
        coreStart.chrome.docTitle.change(APP_TITLE);
        return mountApp({
          core: coreStart,
          plugins: pluginsStart,
          element: params.element,
          history: params.history,
          getChatOpener,
        });
      },
    });

    return {};
  }

  start(_core: CoreStart): ContextEnginePluginStart {
    return {
      registerChatOpener: (opener: ChatOpener) => {
        this.chatOpener = opener;
      },
      buildAnalyzeChat,
    };
  }

  stop() {}
}
