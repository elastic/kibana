/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ADD_PANEL_VISUALIZATION_GROUP } from '@kbn/embeddable-plugin/public';
import {
  apiIsPresentationContainer,
  type EmbeddableApiContext,
} from '@kbn/presentation-publishing';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import type { ActionDefinition } from '@kbn/ui-actions-plugin/public/actions';
import {
  ADD_AI_INSIGHTS_ACTION_ID,
  AI_INSIGHTS_EMBEDDABLE_TYPE,
  AI_INSIGHTS_GENERATION_MODE,
  AI_INSIGHTS_HEIGHT_MODE,
  AI_INSIGHTS_REFRESH_MODE,
} from '../../common/ai_insights/constants';

export const getAddAiInsightsAction = (): ActionDefinition<EmbeddableApiContext> => ({
  id: ADD_AI_INSIGHTS_ACTION_ID,
  grouping: [ADD_PANEL_VISUALIZATION_GROUP],
  order: -5,
  getIconType: () => 'sparkles',
  isCompatible: async ({ embeddable }) => apiIsPresentationContainer(embeddable),
  execute: async ({ embeddable }) => {
    if (!apiIsPresentationContainer(embeddable)) {
      throw new IncompatibleActionError();
    }

    await embeddable.addNewPanel(
      {
        panelType: AI_INSIGHTS_EMBEDDABLE_TYPE,
        serializedState: {
          connector_id: '',
          generation_mode: AI_INSIGHTS_GENERATION_MODE.on_demand,
          refresh_mode: AI_INSIGHTS_REFRESH_MODE.manual,
          height_mode: AI_INSIGHTS_HEIGHT_MODE.auto,
          title: i18n.translate('xpack.agentBuilderDashboards.aiInsights.defaultTitle', {
            defaultMessage: 'AI Insights',
          }),
          // Content renders its own header; hide dashboard chrome title, keep panel border.
          hide_title: true,
          hide_border: false,
        },
      },
      { displaySuccessMessage: true }
    );
  },
  getDisplayName: () =>
    i18n.translate('xpack.agentBuilderDashboards.aiInsights.addPanel.displayName', {
      defaultMessage: 'AI insights',
    }),
});
