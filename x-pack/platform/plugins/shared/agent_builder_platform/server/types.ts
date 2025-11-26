/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { OnechatPluginSetup, OnechatPluginStart } from '@kbn/onechat-plugin/server';

export interface PluginSetupDependencies {
  workflowsManagement?: WorkflowsServerPluginSetup;
  onechat: OnechatPluginSetup;
}

export interface PluginStartDependencies {
  onechat: OnechatPluginStart;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AgentBuilderPlatformPluginSetup {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AgentBuilderPlatformPluginStart {}
