/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import type { DashboardState } from '@kbn/as-code-dashboard-schema';
import {
  DASHBOARD_ATTACHMENT_TYPE,
  dashboardStateToAttachmentData,
} from '@kbn/agent-builder-dashboards-common';
import {
  ADD_PANELS_TO_CHAT_ACTION_ID,
  type AddPanelsToChatActionContext,
} from '@kbn/dashboard-plugin/public';
import type { UiActionsActionDefinition as ActionDefinition } from '@kbn/ui-actions-plugin/public';

export interface AddPanelsToChatActionDeps {
  openChat: AgentBuilderPluginStart['openChat'];
  getAgentBuilderAccess: AgentBuilderPluginStart['getAgentBuilderAccess'];
}

type DashboardWidget = DashboardState['panels'][number];

/**
 * Keeps only the selected panels. Selected panels inside sections are lifted to the top level so
 * the attachment contains exactly what the user selected, without the surrounding sections.
 */
const getSelectedPanels = (widgets: DashboardWidget[], panelIds: Set<string>): DashboardWidget[] =>
  widgets.flatMap((widget) => {
    if ('panels' in widget) {
      return widget.panels.filter((panel) => panel.id && panelIds.has(panel.id));
    }
    return widget.id && panelIds.has(widget.id) ? [widget] : [];
  });

export const createAddPanelsToChatAction = ({
  openChat,
  getAgentBuilderAccess,
}: AddPanelsToChatActionDeps): ActionDefinition<AddPanelsToChatActionContext> => ({
  id: ADD_PANELS_TO_CHAT_ACTION_ID,
  type: ADD_PANELS_TO_CHAT_ACTION_ID,
  order: 0,
  getDisplayName: () =>
    i18n.translate('xpack.agentBuilderDashboards.addPanelsToChat.displayName', {
      defaultMessage: 'Add to chat',
    }),
  getIconType: () => 'addToChat',
  isCompatible: async ({ panelIds }) =>
    panelIds.length > 0 && (await getAgentBuilderAccess()).hasRequiredLicense,
  execute: async ({ dashboardApi, panelIds }) => {
    const { attributes } = dashboardApi.getSerializedState();
    const panels = getSelectedPanels(attributes.panels ?? [], new Set(panelIds));
    if (panels.length === 0) return;

    // No `origin`: this is a subset of the dashboard, so it must not be treated as (or saved
    // back over) the dashboard saved object.
    openChat({
      sessionTag: 'dashboard',
      attachments: [
        {
          type: DASHBOARD_ATTACHMENT_TYPE,
          description: i18n.translate(
            'xpack.agentBuilderDashboards.addPanelsToChat.attachmentDescription',
            {
              defaultMessage:
                '{count, plural, one {# panel} other {# panels}} from dashboard "{title}"',
              values: { count: panels.length, title: attributes.title },
            }
          ),
          data: dashboardStateToAttachmentData({ ...attributes, panels }),
        },
      ],
    });
  },
});
