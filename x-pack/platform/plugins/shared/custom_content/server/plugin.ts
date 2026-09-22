/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { PluginStart as DataPluginStart } from '@kbn/data-plugin/server';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import { registerGenerateRoute } from './routes/generate_route';
import { createCustomContentContextAttachmentType } from './attachment_types/custom_content_context';
import { createUpdateCustomContentTool } from './tools/update_custom_content_tool';

interface SetupDeps {
  agentBuilder?: AgentBuilderPluginSetup;
}

interface StartDeps {
  inference: InferenceServerStart;
  data: DataPluginStart;
}

export class CustomContentPlugin implements Plugin<void, void, SetupDeps, StartDeps> {
  constructor(private readonly initializerContext: PluginInitializerContext) {}

  setup(core: CoreSetup<StartDeps>, { agentBuilder }: SetupDeps) {
    const router = core.http.createRouter();
    const logger = this.initializerContext.logger.get();
    registerGenerateRoute(router, core.getStartServices, logger);

    if (agentBuilder) {
      agentBuilder.attachments.registerType(
        createCustomContentContextAttachmentType() as Parameters<
          typeof agentBuilder.attachments.registerType
        >[0]
      );
      agentBuilder.tools.register(
        createUpdateCustomContentTool() as Parameters<typeof agentBuilder.tools.register>[0]
      );
    }
  }

  start() {}
}
