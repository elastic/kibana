/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Plugin } from '@kbn/core/server';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { EmbeddableSetup } from '@kbn/embeddable-plugin/server';
import { CUSTOM_APP_EMBEDDABLE_TYPE } from '@kbn/custom-app-common';
import { createCustomAppContextAttachmentType } from './attachment_types/custom_app_context';
import { customAppEmbeddableSchema } from './embeddable/schemas';
import { customAppCreationSkill } from './skills/custom_app_creation_skill';
import { createCreateCustomAppTool } from './tools/create_custom_app_tool';
import { createUpdateCustomAppTool } from './tools/update_custom_app_tool';

interface SetupDeps {
  embeddable: EmbeddableSetup;
  agentBuilder?: AgentBuilderPluginSetup;
}

export class CustomAppPlugin implements Plugin<void, void, SetupDeps> {
  setup(_core: CoreSetup, { embeddable, agentBuilder }: SetupDeps) {
    embeddable.registerEmbeddableServerDefinition(CUSTOM_APP_EMBEDDABLE_TYPE, {
      title: 'Custom app',
      getSchema: () => customAppEmbeddableSchema,
    });

    if (agentBuilder) {
      // The casts are the same ones custom_content needs: the registry's types are wider than
      // the definitions' own.
      agentBuilder.attachments.registerType(
        createCustomAppContextAttachmentType() as Parameters<
          typeof agentBuilder.attachments.registerType
        >[0]
      );
      agentBuilder.tools.register(
        createUpdateCustomAppTool() as Parameters<typeof agentBuilder.tools.register>[0]
      );
      agentBuilder.tools.register(
        createCreateCustomAppTool() as Parameters<typeof agentBuilder.tools.register>[0]
      );
      agentBuilder.skills.register(customAppCreationSkill);
    }
  }

  start() {}
}
