/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConsolePluginStart } from '@kbn/console-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { TriggersAndActionsUIPublicPluginStart } from '@kbn/triggers-actions-ui-plugin/public';
import type { AiIndexHttpItem } from '../common/http_api/ai_indices';
import type { Signal } from '../common/http_api/signals';

/**
 * Context passed to the "Analyze & improve" chat opener: the AI index the user is looking at
 * and the signals in scope. The actual Agent Builder opener is registered by a separate PR
 * (search-team #15593) — this plugin only defines the seam.
 */
export interface AnalyzeAndImproveContext {
  aiIndex: AiIndexHttpItem;
  signals: Signal[];
  /** The tag/group the signals were drawn from, when the action is scoped to one group. */
  tag?: string;
}

/** Opens Agent Builder to analyze the given signals. Registered via {@link ContextEnginePluginStart.registerChatOpener}. */
export type ChatOpener = (context: AnalyzeAndImproveContext) => void;

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ContextEnginePluginSetup {}

export interface ContextEnginePluginStart {
  /**
   * Registers the opener used by the "Analyze & improve" button. Until an opener is registered
   * the button is hidden. Implemented by search-team #15593.
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
