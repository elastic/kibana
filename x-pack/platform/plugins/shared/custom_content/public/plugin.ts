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
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { ADD_PANEL_TRIGGER } from '@kbn/ui-actions-plugin/common/trigger_ids';
import type { EmbeddableApiContext } from '@kbn/presentation-publishing';
import { CUSTOM_CONTENT_EMBEDDABLE_TYPE } from '@kbn/custom-content-common';
import { CUSTOM_CONTENT_CONTEXT_ATTACHMENT_TYPE } from '../common/panel_context_attachment';
import { customContentContextAttachmentUiDefinition } from './attachment_types/custom_content_context';
import { setServices } from './services';
import { ADD_CUSTOM_CONTENT_ACTION_ID } from '../common/constants';
import { setAnalyticsSetup } from './telemetry/analytics_setup';

interface SetupDeps {
  embeddable: EmbeddableSetup;
}

interface StartDeps {
  data: DataPublicPluginStart;
  uiActions: UiActionsStart;
  agentBuilder?: AgentBuilderPluginStart;
}

export class CustomContentPlugin implements Plugin<void, void, SetupDeps, StartDeps> {
  setup(core: CoreSetup, { embeddable }: SetupDeps) {
    setAnalyticsSetup(core.analytics);
    embeddable.registerEmbeddablePublicDefinition(CUSTOM_CONTENT_EMBEDDABLE_TYPE, async () => {
      const { customContentEmbeddableFactory } = await import('./async_services');
      return customContentEmbeddableFactory;
    });
  }

  start(core: CoreStart, { data, uiActions, agentBuilder }: StartDeps) {
    setServices(core, data.search.search, data.dataViews, agentBuilder);

    uiActions.registerActionAsync<EmbeddableApiContext>(ADD_CUSTOM_CONTENT_ACTION_ID, async () => {
      const { getAddCustomContentAction } = await import('./actions/add_custom_content_action');
      return getAddCustomContentAction();
    });
    uiActions.attachAction(ADD_PANEL_TRIGGER, ADD_CUSTOM_CONTENT_ACTION_ID);

    if (agentBuilder) {
      agentBuilder.attachments.addAttachmentType(
        CUSTOM_CONTENT_CONTEXT_ATTACHMENT_TYPE,
        customContentContextAttachmentUiDefinition
      );
    }
  }
}
