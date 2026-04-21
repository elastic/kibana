/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { combineLatest, EMPTY, switchMap } from 'rxjs';
import { i18n } from '@kbn/i18n';
import { ActionButtonType } from '@kbn/agent-builder-browser/attachments';
import type { ChromeStart } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { DASHBOARD_ATTACHMENT_TYPE } from '@kbn/dashboard-agent-common';
import type { DashboardAttachment } from '@kbn/dashboard-agent-common/types';
import { attachmentDataToDashboardState } from '@kbn/dashboard-agent-common';
import type {
  DashboardApi,
  DashboardRendererProps,
  DashboardStart,
} from '@kbn/dashboard-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/public';
import { DashboardCanvasAttachment } from './canvas_integration/dashboard_canvas_attachment';
import { createDashboardAppIntegration$ } from './dashboard_integration/dashboard_app_integration';
import { previewAttachmentInDashboard } from './dashboard_integration/preview_attachment';
import { handleEditInDashboard } from './handle_edit_in_dashboard';

export const registerDashboardAttachmentUiDefinition = ({
  agentBuilder,
  chrome,
  dashboardLocator,
  unifiedSearch,
  data,
  dashboardPlugin,
  canWriteDashboards,
}: {
  agentBuilder: AgentBuilderPluginStart;
  chrome: ChromeStart;
  dashboardLocator?: DashboardRendererProps['locator'];
  unifiedSearch: UnifiedSearchPublicPluginStart;
  data: DataPublicPluginStart;
  dashboardPlugin: DashboardStart;
  canWriteDashboards: boolean;
}): (() => void) => {
  let dashboardApi: DashboardApi | undefined;
  const findDashboardsServicePromise = dashboardPlugin.findDashboardsService();
  const checkSavedDashboardExist = async (dashboardId: string) => {
    const findDashboardsService = await findDashboardsServicePromise;
    const result = await findDashboardsService.findById(dashboardId);
    return result.status === 'success';
  };

  const dashboardAppApiSubscription = combineLatest([
    dashboardPlugin.dashboardAppClientApi$,
    chrome.sidebar.getCurrentAppId$(),
  ])
    .pipe(
      switchMap(([api, appId]) => {
        // maintains a dashboardApi reference for access in getActionButtons
        dashboardApi = api;
        // integrates dashboard app with agent only when both dashboard and chat are active
        const isAgentOpen = appId === 'agentBuilder';
        return api && isAgentOpen
          ? createDashboardAppIntegration$({
              agentBuilder,
              api,
              checkSavedDashboardExist,
            })
          : EMPTY;
      })
    )
    .subscribe();
  agentBuilder.attachments.addAttachmentType<DashboardAttachment>(DASHBOARD_ATTACHMENT_TYPE, {
    getLabel: (attachment) => {
      return (
        attachment.data?.title ||
        i18n.translate('xpack.dashboardAgent.attachments.dashboard.label', {
          defaultMessage: 'New Dashboard',
        })
      );
    },
    getIcon: () => 'productDashboard',
    renderCanvasContent: (props, callbacks) => (
      <DashboardCanvasAttachment
        {...props}
        {...callbacks}
        dashboardLocator={dashboardLocator}
        searchBarComponent={unifiedSearch.ui.SearchBar}
        data={data}
        checkSavedDashboardExist={checkSavedDashboardExist}
        canWriteDashboards={canWriteDashboards}
      />
    ),
    getActionButtons: ({ attachment, openCanvas, isCanvas, isSidebar }) => {
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
            // sidebar in dashboard experience - synchronize dashboard app to attachment
            if (dashboardApi && canWriteDashboards) {
              return previewAttachmentInDashboard({
                attachment,
                dashboardApi,
                checkSavedDashboardExist,
              });
            }
            // sidebar preview - open dashboard in sidebar if possible, otherwise open canvas preview
            if (isSidebar && dashboardLocator && canWriteDashboards) {
              const dashboardState = attachmentDataToDashboardState(attachment.data);
              return handleEditInDashboard({
                locator: dashboardLocator,
                getExistingDashboardId: async () => {
                  if (!attachment.origin) {
                    return undefined;
                  }
                  const exists = await checkSavedDashboardExist(attachment.origin);
                  return exists ? attachment.origin : undefined;
                },
                dashboardLocatorParams: {
                  ...dashboardState,
                  viewMode: 'edit',
                },
              });
            }
            // full screen - open canvas
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
