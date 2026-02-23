/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializer, PluginInitializerContext } from '@kbn/core/public';
import type {
  AgentBuilderPluginSetup,
  AgentBuilderPluginStart,
  AgentBuilderSetupDependencies,
  AgentBuilderStartDependencies,
  ConfigSchema,
} from './types';
import { AgentBuilderPlugin } from './plugin';
import { AGENTBUILDER_FEATURE_ID } from '../common/features';

export type { AgentBuilderPluginSetup, AgentBuilderPluginStart };
export { AGENTBUILDER_FEATURE_ID };
export { PrePromptWorkflowPicker } from './application/components/common/pre_prompt_workflow_picker';
export type { PrePromptWorkflowPickerProps } from './application/components/common/pre_prompt_workflow_picker';
export type { WorkflowOption } from './application/components/common/workflow_combo_box';
export const plugin: PluginInitializer<
  AgentBuilderPluginSetup,
  AgentBuilderPluginStart,
  AgentBuilderSetupDependencies,
  AgentBuilderStartDependencies
> = (pluginInitializerContext: PluginInitializerContext<ConfigSchema>) => {
  return new AgentBuilderPlugin(pluginInitializerContext);
};
