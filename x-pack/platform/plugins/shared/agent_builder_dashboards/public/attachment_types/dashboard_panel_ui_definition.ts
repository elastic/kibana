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

const CUSTOM_CONTENT_PANEL_TYPE = 'custom_content';

const getFallbackLabel = (panelType: string | undefined): string =>
  panelType === CUSTOM_CONTENT_PANEL_TYPE
    ? i18n.translate('xpack.agentBuilderDashboards.attachments.dashboardPanel.customPanelLabel', {
        defaultMessage: 'Custom panel',
      })
    : i18n.translate('xpack.agentBuilderDashboards.attachments.dashboardPanel.label', {
        defaultMessage: 'Dashboard panel',
      });

/**
 * Registers the pill-only UI for dashboard panel pointers. The pointer never renders inline or
 * in the canvas: the refined panel is shown through the dashboard attachment instead.
 */
export const registerDashboardPanelAttachmentUiDefinition = (
  agentBuilder: AgentBuilderPluginStart
): void => {
  agentBuilder.attachments.addAttachmentType<DashboardPanelAttachment>(
    DASHBOARD_PANEL_ATTACHMENT_TYPE,
    {
      getLabel: ({ data }) => data?.label || getFallbackLabel(data?.panel_type),
      getIcon: () => 'visualizeApp',
    }
  );
};
