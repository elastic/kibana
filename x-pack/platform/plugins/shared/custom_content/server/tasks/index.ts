/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreTasksSetup, TasksPlugin } from '@kbn/core/server';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import { createCustomContentContextAttachmentType } from '../attachment_types/custom_content_context';
import { createUpdateCustomContentTool } from '../tools/update_custom_content_tool';

interface TasksSetupDeps {
  agentBuilder: AgentBuilderPluginSetup;
}

/** The agent builder side of Custom content for a task pod: the attachment type and the tool. */
class CustomContentTasksPlugin implements TasksPlugin<void, void, TasksSetupDeps> {
  setup(_core: CoreTasksSetup, { agentBuilder }: TasksSetupDeps) {
    agentBuilder.attachments.registerType(
      createCustomContentContextAttachmentType() as Parameters<
        typeof agentBuilder.attachments.registerType
      >[0]
    );
    agentBuilder.tools.register(
      createUpdateCustomContentTool() as Parameters<typeof agentBuilder.tools.register>[0]
    );
  }

  start() {}
}

export const plugin = async () => new CustomContentTasksPlugin();
