/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type { WorkflowsExtensionsPublicPluginSetup } from '@kbn/workflows-extensions/public';
import { registerAgentKnowledgePublicStepDefinitions } from './step_types';

export interface AgentKnowledgePublicSetupDependencies {
  workflowsExtensions: WorkflowsExtensionsPublicPluginSetup;
}

export type AgentKnowledgePublicPluginSetup = Record<string, never>;
export type AgentKnowledgePublicPluginStart = Record<string, never>;

export class AgentKnowledgePublicPlugin
  implements Plugin<AgentKnowledgePublicPluginSetup, AgentKnowledgePublicPluginStart>
{
  setup(
    _core: CoreSetup,
    { workflowsExtensions }: AgentKnowledgePublicSetupDependencies
  ): AgentKnowledgePublicPluginSetup {
    registerAgentKnowledgePublicStepDefinitions(workflowsExtensions);
    return {};
  }

  start(_core: CoreStart): AgentKnowledgePublicPluginStart {
    return {};
  }

  stop() {}
}
