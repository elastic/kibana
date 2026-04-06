/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type { AttachmentLifecycleParams } from '@kbn/agent-builder-browser/attachments';
import { ActionButtonType } from '@kbn/agent-builder-browser/attachments';
import { DASHBOARD_ATTACHMENT_TYPE } from '@kbn/dashboard-agent-common';
import type { DashboardAttachment } from '@kbn/dashboard-agent-common/types';
import type {
  DashboardApi,
  DashboardRendererProps,
  DashboardStart,
} from '@kbn/dashboard-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/public';
import { DashboardCanvasContent } from './canvas_integration/dashboard_canvas_content';
import { previewAttachmentInDashboard } from './dashboard_integration/preview_attachment_in_dashboard';
import { onAttachmentMount } from './on_attachment_mount';

export const registerDashboardAttachmentUiDefinition = ({
  agentBuilder: {
    attachments,
    addAttachment,
    events: { chat$ },
  },
  dashboardLocator,
  unifiedSearch,
  dashboardPlugin,
}: {
  agentBuilder: AgentBuilderPluginStart;
  dashboardLocator?: DashboardRendererProps['locator'];
  unifiedSearch: UnifiedSearchPublicPluginStart;
  dashboardPlugin: DashboardStart;
}): (() => void) => {
  let dashboardApi: DashboardApi | undefined;
  // maintains a dashboardApi reference for access in getActionButtons
  const dashboardAppApiSubscription = dashboardPlugin.dashboardAppClientApi$.subscribe((api) => {
    dashboardApi = api;
  });

  const findDashboardsServicePromise = dashboardPlugin.findDashboardsService();
  const checkSavedDashboardExist = async (dashboardId: string) => {
    const findDashboardsService = await findDashboardsServicePromise;
    const result = await findDashboardsService.findById(dashboardId);
    return result.status === 'success';
  };
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
    onAttachmentMount: (params: AttachmentLifecycleParams<DashboardAttachment>) =>
      onAttachmentMount({ ...params, dashboardPlugin, chat$, addAttachment }),
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
            if (dashboardApi) {
              return previewAttachmentInDashboard({
                attachment,
                dashboardApi,
                checkSavedDashboardExist,
                updateOrigin,
              });
            }

            openCanvas?.();
          },
        },
      ];
    },
  });

  return () => {
    dashboardAppApiSubscription.unsubscribe();
    dashboardApi = undefined;
  };
};
