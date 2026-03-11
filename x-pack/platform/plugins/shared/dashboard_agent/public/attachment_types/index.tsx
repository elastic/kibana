/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type { AttachmentServiceStartContract } from '@kbn/agent-builder-browser';
import { ActionButtonType } from '@kbn/agent-builder-browser/attachments';
import { DASHBOARD_ATTACHMENT_TYPE } from '@kbn/dashboard-agent-common';
import type { DashboardAttachment } from '@kbn/dashboard-agent-common/types';
import type { DashboardState } from '@kbn/dashboard-plugin/common';
import { getConnectedDashboardApi } from '@kbn/dashboard-plugin/public';
import type { DashboardRendererProps } from '@kbn/dashboard-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import { DashboardCanvasContent } from './dashboard_canvas_content';
import { normalizeDashboardWidgets } from './panel_grid_layout';

const DEFAULT_TIME_RANGE = { from: 'now-24h', to: 'now' };

const getStateOverridesFromAttachment = (
  attachment: DashboardAttachment
): Pick<DashboardState, 'title' | 'description' | 'panels' | 'time_range'> => {
  const { title, description, panels = [], sections = [] } = attachment.data;

  return {
    title: title ?? '',
    description: description ?? '',
    panels: normalizeDashboardWidgets({
      panels,
      sections,
    }),
    time_range: DEFAULT_TIME_RANGE,
  };
};

export const registerDashboardAttachmentUiDefinition = ({
  attachments,
  dashboardLocator,
  unifiedSearch,
  doesSavedDashboardExist,
}: {
  attachments: AttachmentServiceStartContract;
  dashboardLocator?: DashboardRendererProps['locator'];
  unifiedSearch: UnifiedSearchPublicPluginStart;
  doesSavedDashboardExist: (dashboardId: string) => Promise<boolean>;
}): (() => void) => {
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
    renderCanvasContent: (props, callbacks) => (
      <DashboardCanvasContent
        {...props}
        registerActionButtons={callbacks.registerActionButtons}
        updateOrigin={callbacks.updateOrigin}
        dashboardLocator={dashboardLocator}
        searchBarComponent={unifiedSearch.ui.SearchBar}
        doesSavedDashboardExist={doesSavedDashboardExist}
      />
    ),
    renderInlineContent: () => {
      return <div>Dashboard</div>;
    },
    getActionButtons: ({ attachment, openCanvas }) => {
      if (!openCanvas) {
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
            const isOnDashboardPage = window.location.pathname.includes('/app/dashboards');
            if (!isOnDashboardPage) {
              openCanvas();
              return;
            }

            const dashboardApi = getConnectedDashboardApi();
            if (!dashboardApi) {
              openCanvas();
              return;
            }

            const currentState = dashboardApi.getSerializedState().attributes;
            dashboardApi.setViewMode('edit');
            dashboardApi.reinitialize({
              ...currentState,
              ...getStateOverridesFromAttachment(attachment),
            });
          },
        },
      ];
    },
  });

  return () => {};
};
