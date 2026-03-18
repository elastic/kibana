/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Subscription } from 'rxjs';
import { pairwise, startWith } from 'rxjs';
import { i18n } from '@kbn/i18n';
import { ActionButtonType } from '@kbn/agent-builder-browser/attachments';
import type { AttachmentLifecycleParams } from '@kbn/agent-builder-browser/attachments';
import { DASHBOARD_ATTACHMENT_TYPE } from '@kbn/dashboard-agent-common';
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

export const registerDashboardAttachmentUiDefinition = ({
  agentBuilder: { attachments, updateAttachmentOrigin },
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
    onAttachmentMount: ({
      attachment,
      conversationId,
    }: AttachmentLifecycleParams<DashboardAttachment>) => {
      let savedObjectIdSubscription: Subscription | undefined;
      // The per-attachment subscription in onAttachmentMount needs to react to API availability changes to manage the savedObjectId$ subscription lifecycle
      const apiSubscription = dashboardPlugin.dashboardAppClientApi$.subscribe((api) => {
        savedObjectIdSubscription?.unsubscribe();
        savedObjectIdSubscription = undefined;

        if (!api) return;

        savedObjectIdSubscription = api.savedObjectId$
          .pipe(startWith<string | undefined>(attachment.origin), pairwise())
          .subscribe(([previousId, currentId]) => {
            // Only update origin if:
            // 1. The attachment has no origin (unsaved), OR
            // 2. The previous savedObjectId matches the attachment origin (we're on the same dashboard)
            // This prevents linking to unrelated dashboards when navigating
            const shouldUpdateOrigin = !attachment.origin || previousId === attachment.origin;

            if (currentId && currentId !== attachment.origin && shouldUpdateOrigin) {
              updateAttachmentOrigin(conversationId, attachment.id, currentId);
            }
          });
      });

      return () => {
        apiSubscription.unsubscribe();
        savedObjectIdSubscription?.unsubscribe();
      };
    },
    renderCanvasContent: (props, callbacks) => (
      <DashboardCanvasContent
        {...props}
        {...callbacks}
        dashboardLocator={dashboardLocator}
        searchBarComponent={unifiedSearch.ui.SearchBar}
        checkSavedDashboardExist={checkSavedDashboardExist}
      />
    ),
    getActionButtons: ({ attachment, openCanvas, isCanvas }) => {
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
    dashboardApi = undefined;
  };
};
