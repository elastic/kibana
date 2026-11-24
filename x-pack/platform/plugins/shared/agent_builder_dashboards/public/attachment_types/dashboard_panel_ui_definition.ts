/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import {
  DASHBOARD_PANEL_ATTACHMENT_TYPE,
  type DashboardPanelAttachment,
} from '@kbn/agent-builder-dashboards-common';

/**
 * Panel pointers render only as a pill; edits show through the dashboard attachment. "Add to chat"
 * labels every pointer, so the fallback only covers a pointer without one.
 */
export const registerDashboardPanelAttachmentUiDefinition = (
  agentBuilder: AgentBuilderPluginStart
): void => {
  agentBuilder.attachments.addAttachmentType<DashboardPanelAttachment>(
    DASHBOARD_PANEL_ATTACHMENT_TYPE,
    {
      getLabel: ({ data }) =>
        data?.label ||
        i18n.translate('xpack.agentBuilderDashboards.attachments.dashboardPanel.label', {
          defaultMessage: 'Dashboard panel',
        }),
      getIcon: () => 'visualizeApp',
    }
  );
};
