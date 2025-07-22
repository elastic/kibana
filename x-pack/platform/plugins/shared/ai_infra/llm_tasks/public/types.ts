/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OnechatPluginSetup } from '@kbn/onechat-plugin/public';
/* eslint-disable @typescript-eslint/no-empty-interface*/

export interface PublicPluginConfig {}

export interface PluginSetupDependencies {
  onechat: OnechatPluginSetup;
}

export interface PluginStartDependencies {}

export interface LlmTasksPluginSetup {}

export interface LlmTasksPluginStart {}
