/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EMPTY, switchMap } from 'rxjs';
import { i18n } from '@kbn/i18n';
import type {
  AttachmentLifecycleParams,
  AttachmentUIDefinition,
  GetActionButtonsParams,
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
import { DashboardCanvasContent } from './canvas_integration/dashboard_canvas_content';
import { createDashboardAppIntegration$ } from './dashboard_integration/dashboard_app_integration';
import { previewAttachmentInDashboard } from './dashboard_integration/preview_attachment';
import { selectDashboardAttachmentForSync } from './dashboard_integration/select_dashboard_attachment_for_sync';

export interface GetDashboardAttachmentUiDefinitionParams {
  agentBuilder: AgentBuilderPluginStart;
  dashboardLocator?: DashboardRendererProps['locator'];
  unifiedSearch: UnifiedSearchPublicPluginStart;
  dashboardPlugin: DashboardStart;
  getDashboardApi: () => DashboardApi | undefined;
}

export const getDashboardAttachmentUiDefinition = async ({
  agentBuilder,
  dashboardLocator,
  unifiedSearch,
  dashboardPlugin,
  getDashboardApi,
}: GetDashboardAttachmentUiDefinitionParams): Promise<
  AttachmentUIDefinition<DashboardAttachment>
> => {
  let nextMountedAttachmentId = 0;
  const mountedDashboardAttachments = new Map<number, () => DashboardAttachment>();

  const findDashboardsServicePromise = dashboardPlugin.findDashboardsService();
  const checkSavedDashboardExist = async (dashboardId: string) => {
    const findDashboardsService = await findDashboardsServicePromise;
    const result = await findDashboardsService.findById(dashboardId);
    return result.status === 'success';
  };
  const getSyncAttachment = (currentSavedObjectId: string | undefined) =>
    selectDashboardAttachmentForSync({
      attachments: Array.from(mountedDashboardAttachments.values(), (getAttachment) =>
        getAttachment()
      ),
      currentSavedObjectId,
    });

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
    onAttachmentMount: (params: AttachmentLifecycleParams<DashboardAttachment>) => {
      const mountedAttachmentId = nextMountedAttachmentId++;
      mountedDashboardAttachments.set(mountedAttachmentId, params.getAttachment);
      const apiSubscription = dashboardPlugin.dashboardAppClientApi$
        .pipe(
          switchMap((api) =>
            api
              ? createDashboardAppIntegration$({
                  ...params,
                  agentBuilder,
                  api,
                  checkSavedDashboardExist,
                  getSyncAttachment,
                })
              : EMPTY
          )
        )
        .subscribe();

      return () => {
        apiSubscription.unsubscribe();
        mountedDashboardAttachments.delete(mountedAttachmentId);
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
    getActionButtons: (params: GetActionButtonsParams<DashboardAttachment>) => {
      const { attachment, openCanvas, isCanvas, updateOrigin } = params;
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
  };
};
