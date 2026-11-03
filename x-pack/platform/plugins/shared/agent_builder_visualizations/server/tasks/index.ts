/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreTasksSetup, TasksPlugin } from '@kbn/core/server';
import type { AgentBuilderVisualizationsSetupDependencies } from '../types';
import { createVisualizationAttachmentType } from '../attachment_types';
import { createVisualizationTool } from '../tools/create_visualization';
import { visualizationCreationSkill } from '../skills/visualization_creation_skill';

interface TasksSetupDeps {
  agentBuilder: AgentBuilderVisualizationsSetupDependencies['agentBuilder'];
}

/**
 * The agent builder side of the visualization agent plugin for a task pod: the attachment type, the
 * tool and the skill. The visualization search-memory type belongs to the agent builder SML plugin,
 * which has no tasks entry, so it is not registered here.
 */
class AgentBuilderVisualizationsTasksPlugin implements TasksPlugin<void, void, TasksSetupDeps> {
  setup(_core: CoreTasksSetup, { agentBuilder }: TasksSetupDeps) {
    agentBuilder.attachments.registerType(
      createVisualizationAttachmentType() as Parameters<
        typeof agentBuilder.attachments.registerType
      >[0]
    );
    agentBuilder.tools.register(createVisualizationTool());
    agentBuilder.skills.register(visualizationCreationSkill);
  }

  start() {}
}

export const plugin = async () => new AgentBuilderVisualizationsTasksPlugin();
