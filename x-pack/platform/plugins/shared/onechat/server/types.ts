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

/* eslint-disable @typescript-eslint/no-empty-interface*/

export interface OnechatSetupDependencies {
  actions: ActionsPluginSetup;
  inference: InferenceServerSetup;
}

export interface OnechatStartDependencies {
  actions: ActionsPluginStart;
  inference: InferenceServerStart;
}

/**
 * Setup contract of the onechat plugin.
 */
export interface OnechatPluginSetup {}

/**
 * Start contract of the onechat plugin.
 */
export interface OnechatPluginStart {}
