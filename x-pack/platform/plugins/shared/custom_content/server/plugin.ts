/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Plugin } from '@kbn/core/server';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { EmbeddableSetup } from '@kbn/embeddable-plugin/server';
import { CUSTOM_CONTENT_EMBEDDABLE_TYPE } from '@kbn/custom-content-common';
import { registerEmbeddableDoc } from '@kbn/custom-app-registry';
import { CUSTOM_CONTENT_EMBEDDABLE_DOC } from './capabilities/custom_content/embeddable_doc';
import { createCustomContentContextAttachmentType } from './attachment_types/custom_content_context';
import { createUpdateCustomContentTool } from './tools/update_custom_content_tool';
import { customContentEmbeddableSchema } from './embeddable/schemas';
import { registerCustomContentResolver } from './capabilities/custom_content/register_custom_content_resolver';

interface SetupDeps {
  embeddable: EmbeddableSetup;
  agentBuilder?: AgentBuilderPluginSetup;
}

export class CustomContentPlugin implements Plugin<void, void, SetupDeps> {
  setup(_core: CoreSetup, { embeddable, agentBuilder }: SetupDeps) {
    registerCustomContentResolver();
    registerEmbeddableDoc(CUSTOM_CONTENT_EMBEDDABLE_TYPE, CUSTOM_CONTENT_EMBEDDABLE_DOC);

    embeddable.registerEmbeddableServerDefinition(CUSTOM_CONTENT_EMBEDDABLE_TYPE, {
      title: 'Custom panel',
      getSchema: () => customContentEmbeddableSchema,
    });

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
