/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type {
  WorkflowsExtensionsServerPluginSetup,
  WorkflowsExtensionsServerPluginStart,
} from '@kbn/workflows-extensions/server';
import type { AiIndexProperties } from '../common/http_api/ai_indices';

export interface ContextEnginePluginSetup {
  /** Registers a managed AI index (immutable, owned by the plugin). */
  registerAiIndex: (id: string, properties: AiIndexProperties) => void;
  /** Registers a seeded AI index (user-editable, with sensible defaults). */
  registerSeededAiIndex: (id: string, properties: AiIndexProperties) => void;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ContextEnginePluginStart {}

export interface ContextEngineSetupDependencies {
  features: FeaturesPluginSetup;
  workflowsExtensions?: WorkflowsExtensionsServerPluginSetup;
}

export interface ContextEngineStartDependencies {
  actions: ActionsPluginStart;
  spaces?: SpacesPluginStart;
  workflowsExtensions?: WorkflowsExtensionsServerPluginStart;
}
