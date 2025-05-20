/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  PluginStartContract as ActionsPluginStart,
  PluginSetupContract as ActionsPluginSetup,
} from '@kbn/actions-plugin/server';
import type { InferenceServerSetup, InferenceServerStart } from '@kbn/inference-plugin/server';
import type { ToolsServiceSetup, ScopedPublicToolRegistryFactoryFn } from './services/tools';

export interface OnechatSetupDependencies {
  actions: ActionsPluginSetup;
  inference: InferenceServerSetup;
}

export interface OnechatStartDependencies {
  actions: ActionsPluginStart;
  inference: InferenceServerStart;
}

/**
 * Onechat tool service's setup contract
 */
export interface ToolsSetup {
  /**
   * Register a built-in tool to be available in onechat.
   *
   * Refer to {@link ToolRegistration}
   */
  register: ToolsServiceSetup['register'];
}

/**
 * Onechat tool service's start contract
 */
export interface ToolsStart {
  /**
   * Returns a version of the registry scoped to a given request.
   */
  getScopedRegistry: ScopedPublicToolRegistryFactoryFn;
}

/**
 * Setup contract of the onechat plugin.
 */
export interface OnechatPluginSetup {
  tools: ToolsSetup;
}

/**
 * Start contract of the onechat plugin.
 */
export interface OnechatPluginStart {
  tools: ToolsStart;
}
