/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type {
  AttachmentLifecycleParams,
  AttachmentUIDefinition,
} from '@kbn/agent-builder-browser/attachments';
import { ActionButtonType } from '@kbn/agent-builder-browser/attachments';
import type { DashboardAttachment } from '@kbn/dashboard-agent-common/types';
import type {
  DashboardApi,
  DashboardRendererProps,
  DashboardStart,
} from '@kbn/dashboard-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/public';
import { DashboardCanvasContent } from './dashboard_canvas_content';
import { handlePreviewInDashboard } from './handle_preview_in_dashboard';
import { onAttachmentMount } from './create_attachment_mount_handler';

export const getDashboardAttachmentUiDefinition = ({
  agentBuilder: {
    attachments,
    events: { chat$ },
  },
  dashboardLocator,
  unifiedSearch,
  dashboardPlugin,
  getDashboardApi,
}: {
  agentBuilder: AgentBuilderPluginStart;
  dashboardLocator?: DashboardRendererProps['locator'];
  unifiedSearch: UnifiedSearchPublicPluginStart;
  dashboardPlugin: DashboardStart;
  getDashboardApi: () => DashboardApi | undefined;
}): AttachmentUIDefinition<DashboardAttachment> => {
  const findDashboardsServicePromise = dashboardPlugin.findDashboardsService();
  const checkSavedDashboardExist = async (dashboardId: string) => {
    const findDashboardsService = await findDashboardsServicePromise;
    const result = await findDashboardsService.findById(dashboardId);
    return result.status === 'success';
  };
  return {
    getLabel: (attachment) => {
      return (
        attachment.data?.title ||
        i18n.translate('xpack.dashboardAgent.attachments.dashboard.label', {
          defaultMessage: 'New Dashboard',
        })
      );
    },
    getIcon: () => 'productDashboard',
    onAttachmentMount: (params: AttachmentLifecycleParams<DashboardAttachment>) =>
      onAttachmentMount({ ...params, dashboardPlugin, chat$ }),
    renderCanvasContent: (props, callbacks) => (
      <DashboardCanvasContent
        {...props}
        {...callbacks}
        dashboardLocator={dashboardLocator}
        searchBarComponent={unifiedSearch.ui.SearchBar}
        checkSavedDashboardExist={checkSavedDashboardExist}
      />
    ),
    getActionButtons: ({ attachment, openCanvas, isCanvas, updateOrigin }) => {
      if (isCanvas) {
        return [];
      }
      return [
        {
          label: i18n.translate('xpack.dashboardAgent.attachments.dashboard.previewActionLabel', {
            defaultMessage: 'Preview',
          }),
          icon: 'eye',
          type: ActionButtonType.SECONDARY,
          handler: () => {
            const dashboardApi = getDashboardApi();
            if (!dashboardApi) {
              openCanvas?.();
              return;
            }

            handlePreviewInDashboard({
              attachment,
              dashboardApi,
              checkSavedDashboardExist,
              updateOrigin,
            });
          },
        },
      ];
    },
  };
};
