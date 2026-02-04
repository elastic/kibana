/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { AttachmentServiceStartContract } from '@kbn/agent-builder-browser';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import { DASHBOARD_ATTACHMENT_TYPE, DashboardAttachmentData } from '@kbn/dashboard-agent-common';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import { DASHBOARD_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import { normalizePanels, buildMarkdownPanel, getMarkdownPanelHeight } from '../utils/panel_utils';

type DashboardAttachment = Attachment<
  typeof DASHBOARD_ATTACHMENT_TYPE,
  { title?: string } & Record<string, unknown>
>;

/**
 * Registers the dashboard attachment UI definition, including the icon and label.
 */
export const registerDashboardAttachmentUiDefinition = ({
  attachments,
  share,
}: {
  attachments: AttachmentServiceStartContract;
  share?: SharePluginStart;
}) => {
  attachments.addAttachmentType<DashboardAttachment>(DASHBOARD_ATTACHMENT_TYPE, {
    getLabel: (attachment) => {
      return (
        attachment.data?.title ||
        i18n.translate('xpack.dashboardAgent.attachments.dashboard.label', {
          defaultMessage: 'New Dashboard',
        })
      );
    },
    getIcon: () => 'productDashboard',
    onClick: async ({ version, attachment }) => {
      console.log('[DASHBOARD_ATTACHMENT] onClick triggered for attachment:', attachment);
      if (!share) return;

      const data = attachment.data as DashboardAttachmentData | undefined;
      if (!data) return;

      const locator = share.url.locators.get(DASHBOARD_APP_LOCATOR);
      if (!locator) return;

      const { panels, markdownContent, title, description, savedObjectId } = data;

      // Build markdown panel if present
      const markdownPanel = markdownContent ? buildMarkdownPanel(markdownContent) : undefined;
      const yOffset = markdownContent ? getMarkdownPanelHeight(markdownContent) : 0;

      const normalizedPanels = normalizePanels(panels, yOffset);

      // Normalize attachment panels to dashboard panel format
      const dashboardPanels = [...(markdownPanel ? [markdownPanel] : []), ...normalizedPanels];

      const locatorParams = {
        dashboardId: savedObjectId,
        panels: dashboardPanels,
        title,
        description,
        viewMode: 'edit' as const,
        time_range: { from: 'now-24h', to: 'now' },
        // Use a unique attachment ID that includes timestamp to force URL change
        // This ensures navigation triggers even when clicking the same attachment multiple times
        dashboardAttachmentId: attachment.id,
        versionId: version?.version,
      };

      // Navigate to dashboard with panel state
      // The dashboard app now watches for location.state changes and will remount
      // when navigating to the same dashboardId with different panel configuration
      await locator.navigate(locatorParams);
    },
  });
};
