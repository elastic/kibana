/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_APP_CATEGORIES } from '@kbn/core/public';
import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import { i18n } from '@kbn/i18n';
import type { EmbeddableSetup, EmbeddableStart } from '@kbn/embeddable-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { ADD_PANEL_TRIGGER, ON_OPEN_PANEL_MENU } from '@kbn/ui-actions-plugin/common/trigger_ids';
import type { EmbeddableApiContext } from '@kbn/presentation-publishing';
import { CUSTOM_APP_EMBEDDABLE_TYPE } from '@kbn/custom-app-common';
import { CUSTOM_APP_CONTEXT_ATTACHMENT_TYPE } from '../common/app_context_attachment';
import type { CustomAppByReferenceState } from '../server';
import {
  ADD_CUSTOM_APP_ACTION_ID,
  CUSTOM_APP_APPLICATION_ID,
  CUSTOM_APP_SAVED_OBJECT_TYPE,
  OPEN_CUSTOM_APP_ACTION_ID,
  VIEW_CUSTOM_APP_SOURCE_ACTION_ID,
} from '../common/constants';
import { customAppContextAttachmentUiDefinition } from './attachment_types/custom_app_context';
import { setServices } from './services';

interface SetupDeps {
  embeddable: EmbeddableSetup;
}

interface StartDeps {
  data: DataPublicPluginStart;
  dataViews: DataViewsPublicPluginStart;
  embeddable: EmbeddableStart;
  lens: LensPublicStart;
  uiActions: UiActionsStart;
  agentBuilder?: AgentBuilderPluginStart;
  share?: SharePluginStart;
}

export class CustomAppPlugin implements Plugin<void, void, SetupDeps, StartDeps> {
  setup(core: CoreSetup<StartDeps>, { embeddable }: SetupDeps) {
    core.application.register({
      id: CUSTOM_APP_APPLICATION_ID,
      title: i18n.translate('xpack.customApp.application.title', { defaultMessage: 'Custom apps' }),
      euiIconType: 'apps',
      category: DEFAULT_APP_CATEGORIES.kibana,
      order: 9050,
      // In the side navigation, which takes people to the list of apps, and in search.
      visibleIn: ['classicSideNav', 'projectSideNav', 'globalSearch'],
      async mount(params) {
        const [coreStart] = await core.getStartServices();
        const { renderApp } = await import('./application/mount');
        return renderApp(coreStart, params);
      },
    });

    embeddable.registerEmbeddablePublicDefinition(CUSTOM_APP_EMBEDDABLE_TYPE, async () => {
      const { customAppEmbeddableFactory } = await import('./async_services');
      return customAppEmbeddableFactory;
    });

    // Apps saved to the library can be added to a dashboard from its "Add from library" flyout.
    embeddable.registerAddFromLibraryType({
      onAdd: async (container, savedObject) => {
        container.addNewPanel<CustomAppByReferenceState>(
          {
            panelType: CUSTOM_APP_EMBEDDABLE_TYPE,
            serializedState: { ref_id: savedObject.id },
          },
          { displaySuccessMessage: true }
        );
      },
      savedObjectType: CUSTOM_APP_SAVED_OBJECT_TYPE,
      savedObjectName: i18n.translate('xpack.customApp.library.name', {
        defaultMessage: 'Custom app',
      }),
      getIconForSavedObject: () => 'apps',
    });
  }

  start(
    core: CoreStart,
    { data, dataViews, embeddable, lens, uiActions, agentBuilder, share }: StartDeps
  ) {
    setServices(core, data.search.search, embeddable, dataViews, lens, agentBuilder, share);

    uiActions.registerActionAsync<EmbeddableApiContext>(ADD_CUSTOM_APP_ACTION_ID, async () => {
      const { getAddCustomAppAction } = await import('./actions/add_custom_app_action');
      return getAddCustomAppAction();
    });
    uiActions.attachAction(ADD_PANEL_TRIGGER, ADD_CUSTOM_APP_ACTION_ID);

    uiActions.registerActionAsync<EmbeddableApiContext>(
      VIEW_CUSTOM_APP_SOURCE_ACTION_ID,
      async () => {
        const { getViewSourceAction } = await import('./actions/view_source_action');
        return getViewSourceAction();
      }
    );
    uiActions.attachAction(ON_OPEN_PANEL_MENU, VIEW_CUSTOM_APP_SOURCE_ACTION_ID);

    uiActions.registerActionAsync<EmbeddableApiContext>(OPEN_CUSTOM_APP_ACTION_ID, async () => {
      const { getOpenAppAction } = await import('./actions/open_app_action');
      return getOpenAppAction();
    });
    uiActions.attachAction(ON_OPEN_PANEL_MENU, OPEN_CUSTOM_APP_ACTION_ID);

    if (agentBuilder) {
      agentBuilder.attachments.addAttachmentType(
        CUSTOM_APP_CONTEXT_ATTACHMENT_TYPE,
        customAppContextAttachmentUiDefinition
      );
    }
  }
}
