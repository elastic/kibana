/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Service } from '@kbn/cordis';
import type { Context } from '@kbn/cordis';
import { createVisualizationAttachmentType } from './attachment_types';
import { createVisualizationTool } from './tools/create_visualization';
import { visualizationCreationSkill } from './skills/visualization_creation_skill';
import { visualizationSmlType } from './sml_types/visualization';

// Migrated to native Cordis authoring — Stage 5 of the Cordis migration.
export default class AgentBuilderVisualizationsPlugin extends Service {
  static readonly inject = ['agentBuilder.setup', 'agentBuilderSml.setup'];
  static readonly provide = 'agentBuilderVisualizations';

  constructor(ctx: Context) {
    super(ctx, 'agentBuilderVisualizations');
    const setupDeps = {
      agentBuilder: (ctx.get('agentBuilder.setup') as any).contract,
      agentBuilderSml: (ctx.get('agentBuilderSml.setup') as any).contract,
    };
    setupDeps.agentBuilder.attachments.registerType(
          createVisualizationAttachmentType() as Parameters<
            typeof setupDeps.agentBuilder.attachments.registerType
          >[0]
        );
        setupDeps.agentBuilder.tools.register(createVisualizationTool());
        setupDeps.agentBuilder.skills.register(visualizationCreationSkill);
        setupDeps.agentBuilderSml.registerType(visualizationSmlType);
  }
}
