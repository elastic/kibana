/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Plugin } from '@kbn/core/server';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { EmbeddableSetup } from '@kbn/embeddable-plugin/server';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import { CUSTOM_APP_EMBEDDABLE_TYPE } from '@kbn/custom-app-common';
import { createCustomAppContextAttachmentType } from './attachment_types/custom_app_context';
import { customAppFeature } from './feature';
import { registerSavedAppRoutes } from './routes/register_routes';
import { customAppSavedObjectType } from './saved_objects';
import { customAppEmbeddableSchema } from './embeddable/schemas';
import { getTransforms } from './embeddable/transforms/get_transforms';
import { customAppCreationSkill } from './skills/custom_app_creation_skill';
import { createCreateCustomAppTool } from './tools/create_custom_app_tool';
import { createUpdateCustomAppTool } from './tools/update_custom_app_tool';

interface SetupDeps {
  embeddable: EmbeddableSetup;
  features: FeaturesPluginSetup;
  agentBuilder?: AgentBuilderPluginSetup;
}

export class CustomAppPlugin implements Plugin<void, void, SetupDeps> {
  setup(core: CoreSetup, { embeddable, features, agentBuilder }: SetupDeps) {
    // Registered unconditionally: the saved objects check can only vouch for what it can see.
    core.savedObjects.registerType(customAppSavedObjectType);
    features.registerKibanaFeature(customAppFeature);
    registerSavedAppRoutes(core.http.createRouter());

    embeddable.registerEmbeddableServerDefinition(CUSTOM_APP_EMBEDDABLE_TYPE, {
      title: 'Custom app',
      getSchema: () => customAppEmbeddableSchema,
      getTransforms,
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
