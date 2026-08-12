/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { TriggersAndActionsUIPublicPluginStart } from '@kbn/triggers-actions-ui-plugin/public';
import type { ContextEnginePluginStart } from '@kbn/context-engine-plugin/public';

/* eslint-disable @typescript-eslint/no-empty-interface */

export interface AgentBuilderPlatformPluginSetup {}

export interface AgentBuilderPlatformPluginStart {}

export interface PluginSetupDependencies {}

export interface PluginStartDependencies {
  agentBuilder: AgentBuilderPluginStart;
  share: SharePluginStart;
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
  // Optional: the browser half of the Context Engine ↔ Agent Builder bridge registers a chat opener
  // on the Context Engine start contract (dependency inversion — CE never imports agentBuilder).
  contextEngine?: ContextEnginePluginStart;
}
