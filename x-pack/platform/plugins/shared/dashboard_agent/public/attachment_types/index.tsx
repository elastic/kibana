/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { ActionButtonType } from '@kbn/agent-builder-browser/attachments';
import { DASHBOARD_ATTACHMENT_TYPE } from '@kbn/dashboard-agent-common';
import type { DashboardAttachment } from '@kbn/dashboard-agent-common/types';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/public';
import type {
  DashboardApi,
  DashboardRendererProps,
  DashboardStart,
} from '@kbn/dashboard-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import { DashboardCanvasContent } from './dashboard_canvas_content';
import { handlePreviewInDashboard } from './dashboard_app_flow';
import { createDashboardUpdatesManager } from '../dashboard_updates_manager';

export const registerDashboardAttachmentUiDefinition = ({
  dashboardLocator,
  unifiedSearch,
  dashboardPlugin,
  agentBuilder: {
    events: { chat$ },
    attachments,
    addAttachment,
    openChat,
    setChatConfig,
    clearChatConfig,
  },
}: {
  dashboardLocator?: DashboardRendererProps['locator'];
  unifiedSearch: UnifiedSearchPublicPluginStart;
  dashboardPlugin: DashboardStart;
  agentBuilder: AgentBuilderPluginStart;
}) => {
  let dashboardApi: DashboardApi | undefined;

  const updatesManager = createDashboardUpdatesManager({
    chat$,
    addAttachment,
    setChatConfig,
    clearChatConfig,
  });

  const dashboardAppApiSubscription = dashboardPlugin.dashboardAppClientApi$.subscribe((api) => {
    dashboardApi = api;
    updatesManager.setDashboardApi(api);
  });

  const findDashboardsServicePromise = dashboardPlugin.findDashboardsService();
  const checkSavedDashboardExist = async (dashboardId: string) => {
    const findDashboardsService = await findDashboardsServicePromise;
    const result = await findDashboardsService.findById(dashboardId);
    return result.status === 'success';
  };

  const registerAttachmentWithManager = (attachment: DashboardAttachment) => {
    updatesManager.setCurrentAttachmentId(attachment.id);
    updatesManager.setCurrentAttachmentOrigin(attachment.origin);
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
    renderCanvasContent: (props, callbacks) => {
      return (
        <DashboardCanvasContent
          {...props}
          registerActionButtons={callbacks.registerActionButtons}
          updateOrigin={callbacks.updateOrigin}
          closeCanvas={callbacks.closeCanvas}
          openChat={openChat}
          dashboardLocator={dashboardLocator}
          searchBarComponent={unifiedSearch.ui.SearchBar}
          checkSavedDashboardExist={checkSavedDashboardExist}
        />
      );
    },
    getActionButtons: ({ attachment, openCanvas, isCanvas }) => {
      registerAttachmentWithManager(attachment);
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
            if (!dashboardApi) {
              openCanvas?.();
              return;
            }
            handlePreviewInDashboard({
              attachment,
              dashboardApi,
              checkSavedDashboardExist,
            });
          },
        },
      ];
    },
  });

  return () => {
    dashboardAppApiSubscription.unsubscribe();
    updatesManager.stop();
    dashboardApi = undefined;
  };
};
