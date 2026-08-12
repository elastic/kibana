/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import type { ConsolePluginStart } from '@kbn/console-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { TriggersAndActionsUIPublicPluginStart } from '@kbn/triggers-actions-ui-plugin/public';
import type { AiIndexHttpItem } from '../common/http_api/ai_indices';
import type { ContextEngineSearchNavigationAdapter } from './search_navigation_adapter';

/**
 * Context passed to the "Analyze & improve" chat opener: the AI index the user is looking at and,
 * optionally, the tag/group they are scoped to. The opener fetches the signals server-side; the
 * materialized signals are intentionally NOT passed so the opener always works from the
 * authoritative, complete set.
 */
export interface AnalyzeAndImproveContext {
  aiIndex: AiIndexHttpItem;
  /** The tag/group the action is scoped to, when drilled into a single group. */
  tag?: string;
}

/** Opens Agent Builder to analyze the given signals. Registered via {@link ContextEnginePluginStart.registerChatOpener}. */
export type ChatOpener = (context: AnalyzeAndImproveContext) => void;

export type { ContextEngineSearchNavigationAdapter } from './search_navigation_adapter';

export interface ContextEnginePluginSetup {
  registerSearchNavigationAdapter: (adapter: ContextEngineSearchNavigationAdapter) => void;
}

export interface ContextEnginePluginStart {
  /**
   * Registers the opener used by the "Analyze & improve" button. Until an opener is registered
   * the button is hidden.
   */
  registerChatOpener: (opener: ChatOpener) => void;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ContextEngineSetupDependencies {}

export interface ContextEngineStartDependencies {
  data: DataPublicPluginStart;
  share: SharePluginStart;
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
  console?: ConsolePluginStart;
  spaces?: SpacesPluginStart;
}

export interface ContextEngineServicesContextDeps {
  history: AppMountParameters['history'];
  searchNavigation?: ContextEngineSearchNavigationAdapter;
}

export type ContextEngineAppServices = CoreStart & ContextEngineServicesContextDeps;
