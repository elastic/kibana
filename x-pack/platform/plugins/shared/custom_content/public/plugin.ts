/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type { EmbeddableSetup } from '@kbn/embeddable-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import {
  CUSTOM_CONTENT_EMBEDDABLE_TYPE,
  CUSTOM_CONTENT_ENABLED_FLAG_KEY,
} from '../common/constants';
import { CUSTOM_CONTENT_CONTEXT_ATTACHMENT_TYPE } from '../common/panel_context_attachment';
import { customContentContextAttachmentUiDefinition } from './attachment_types/custom_content_context';
import { setServices } from './services';

interface SetupDeps {
  embeddable: EmbeddableSetup;
}

interface StartDeps {
  data: DataPublicPluginStart;
  agentBuilder?: AgentBuilderPluginStart;
}

export class CustomContentPlugin implements Plugin<void, void, SetupDeps, StartDeps> {
  setup(_core: CoreSetup, { embeddable }: SetupDeps) {
    embeddable.registerEmbeddablePublicDefinition(CUSTOM_CONTENT_EMBEDDABLE_TYPE, async () => {
      const { customContentEmbeddableFactory } = await import('./async_services');
      return customContentEmbeddableFactory;
    });
  }

  start(core: CoreStart, { data, agentBuilder }: StartDeps) {
    // Temporary kill-switch — remove once the feature is approved to ship.
    if (!core.featureFlags.getBooleanValue(CUSTOM_CONTENT_ENABLED_FLAG_KEY, false)) return;
    setServices(core, data.search.search, agentBuilder);

    if (agentBuilder) {
      agentBuilder.attachments.addAttachmentType(
        CUSTOM_CONTENT_CONTEXT_ATTACHMENT_TYPE,
        customContentContextAttachmentUiDefinition
      );
    }
  }
}
