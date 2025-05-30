/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import { aiAssistantAnonymizationRules } from '@kbn/observability-ai-assistant-plugin/common';
import { uiSettings } from '../common/ui_settings';
import { ObservabilityAIAssistantManagementConfig } from './config';

export type ObservabilityPluginSetup = ReturnType<AiAssistantManagementPlugin['setup']>;

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface PluginSetup {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface PluginStart {}

export class AiAssistantManagementPlugin implements Plugin<ObservabilityPluginSetup> {
  private readonly config: ObservabilityAIAssistantManagementConfig;

  constructor(context: PluginInitializerContext<ObservabilityAIAssistantManagementConfig>) {
    this.config = context.config.get<ObservabilityAIAssistantManagementConfig>();
  }

  public setup(core: CoreSetup<PluginStart>, plugins: PluginSetup) {
    // Check if anonymization rules are enabled from our own plugin config
    const enableAnonymizationRules = this.config.enableAnonymizationRules;

    const { [aiAssistantAnonymizationRules]: _, ...restSettings } = uiSettings;
    core.uiSettings.register(enableAnonymizationRules ? uiSettings : restSettings);

    return {};
  }

  public start(core: CoreStart, plugins: PluginStart) {}

  public stop() {}
}
