/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type {
  AgentBuilderWorkflowsPluginSetup,
  AgentBuilderWorkflowsPluginStart,
  PluginSetupDependencies,
  PluginStartDependencies,
} from './types';

export class AgentBuilderWorkflowsPlugin
  implements
    Plugin<
      AgentBuilderWorkflowsPluginSetup,
      AgentBuilderWorkflowsPluginStart,
      PluginSetupDependencies,
      PluginStartDependencies
    >
{
  setup(
    coreSetup: CoreSetup<PluginStartDependencies, AgentBuilderWorkflowsPluginStart>,
    setupDeps: PluginSetupDependencies
  ): AgentBuilderWorkflowsPluginSetup {
    void (async () => {
      const [[coreStart, depsStart], { registerWorkflowAttachmentRenderers }] = await Promise.all([
        coreSetup.getStartServices(),
        import('./attachment_types'),
      ]);
      const [telemetry, queryClient] = await Promise.all([
        depsStart.workflowsManagement.getTelemetry(),
        depsStart.workflowsManagement.getQueryClient(),
      ]);
      registerWorkflowAttachmentRenderers(depsStart.agentBuilder.attachments, {
        core: coreStart,
        telemetry,
        queryClient,
      });
    })();

    return {};
  }

  start(
    coreStart: CoreStart,
    startDeps: PluginStartDependencies
  ): AgentBuilderWorkflowsPluginStart {
    return {};
  }

  stop() {}
}
