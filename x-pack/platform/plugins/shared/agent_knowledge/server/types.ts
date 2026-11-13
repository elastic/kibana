/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { SecurityPluginStart } from '@kbn/security-plugin-types-server';
import type { ContextEnginePluginSetup } from '@kbn/context-engine-plugin/server';
import type {
  WorkflowsExtensionsServerPluginSetup,
  WorkflowsExtensionsServerPluginStart,
} from '@kbn/workflows-extensions/server';
import type { AgentKnowledgeProduct, WikiTypePack } from '@kbn/agent-knowledge-common';
import type { WikiService } from './services/wiki_service';
import type { TypePackRegistry } from './services/type_pack_registry';

export interface AgentKnowledgeSetupDependencies {
  features: FeaturesPluginSetup;
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup;
  contextEngine?: ContextEnginePluginSetup;
}

export interface AgentKnowledgeStartDependencies {
  security?: SecurityPluginStart;
  spaces?: SpacesPluginStart;
  workflowsExtensions: WorkflowsExtensionsServerPluginStart;
}

export interface AgentKnowledgePluginSetup {
  /** Registers a product's wiki entity types, sections, and buckets. */
  registerTypePack: (pack: WikiTypePack) => void;
  /**
   * Binds a Context Engine AI index registry id to a previously registered type pack so
   * recall/record validate entity types for that index.
   */
  bindWikiAiIndex: (aiIndexId: string, product: AgentKnowledgeProduct) => void;
}

export interface AgentKnowledgePluginStart {
  getWikiService: () => WikiService;
  getTypePackRegistry: () => TypePackRegistry;
}
