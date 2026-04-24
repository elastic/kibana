/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type {
  VisualizationAgentPluginPublicSetup,
  VisualizationAgentPluginPublicStart,
  VisualizationAgentPluginPublicSetupDependencies,
  VisualizationAgentPluginPublicStartDependencies,
} from './types';
import { createVisualizationAttachmentDefinition } from './visualization_attachment';

export class VisualizationAgentPlugin
  implements
    Plugin<
      VisualizationAgentPluginPublicSetup,
      VisualizationAgentPluginPublicStart,
      VisualizationAgentPluginPublicSetupDependencies,
      VisualizationAgentPluginPublicStartDependencies
    >
{
  constructor(_initContext: PluginInitializerContext) {}

  public setup(
    _core: CoreSetup<
      VisualizationAgentPluginPublicStartDependencies,
      VisualizationAgentPluginPublicStart
    >,
    _plugins: VisualizationAgentPluginPublicSetupDependencies
  ): VisualizationAgentPluginPublicSetup {
    return {};
  }

  public start(
    core: CoreStart,
    plugins: VisualizationAgentPluginPublicStartDependencies
  ): VisualizationAgentPluginPublicStart {
    plugins.agentBuilder.attachments.addAttachmentType(
      'visualization',
      createVisualizationAttachmentDefinition({
        dataViews: plugins.dataViews,
        lens: plugins.lens,
        uiActions: plugins.uiActions,
        canWriteDashboards: core.application.capabilities.dashboard_v2?.showWriteControls === true,
      })
    );

    return {};
  }

  public stop() {}
}
