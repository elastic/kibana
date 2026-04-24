/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type {
  VisualizationAgentPluginSetup,
  VisualizationAgentPluginStart,
  VisualizationAgentSetupDependencies,
  VisualizationAgentStartDependencies,
} from './types';
import { createVisualizationAttachmentType } from './attachment_types/visualization';
import { visualizationSmlType } from './sml_types/visualization';
import { visualizationCreationSkill } from './skills/visualization_creation_skill';
import { createVisualizationTool } from './tools/create_visualization';

export class VisualizationAgentPlugin
  implements
    Plugin<
      VisualizationAgentPluginSetup,
      VisualizationAgentPluginStart,
      VisualizationAgentSetupDependencies,
      VisualizationAgentStartDependencies
    >
{
  constructor(_initializerContext: PluginInitializerContext) {}

  setup(
    _coreSetup: CoreSetup<VisualizationAgentStartDependencies, VisualizationAgentPluginStart>,
    setupDeps: VisualizationAgentSetupDependencies
  ): VisualizationAgentPluginSetup {
    setupDeps.agentBuilder.tools.register(createVisualizationTool());
    setupDeps.agentBuilder.attachments.registerType(createVisualizationAttachmentType());
    setupDeps.agentBuilder.skills.register(visualizationCreationSkill);
    setupDeps.agentBuilder.sml.registerType(visualizationSmlType);
    return {};
  }

  start(
    _coreStart: CoreStart,
    _startDeps: VisualizationAgentStartDependencies
  ): VisualizationAgentPluginStart {
    return {};
  }

  stop() {}
}
