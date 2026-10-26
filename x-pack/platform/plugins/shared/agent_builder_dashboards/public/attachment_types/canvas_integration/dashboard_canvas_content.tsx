/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { css } from '@emotion/react';
import type { ActionButton, AttachmentRenderProps } from '@kbn/agent-builder-browser/attachments';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DashboardState } from '@kbn/as-code-dashboard-schema';
import type { DashboardLocatorParams } from '@kbn/dashboard-plugin/common';
import type {
  DashboardApi,
  DashboardCreationOptions,
  DashboardRendererProps,
} from '@kbn/dashboard-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { UseEuiTheme } from '@elastic/eui';
import { DashboardRenderer } from '@kbn/dashboard-plugin/public';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import type { DashboardAttachment } from '@kbn/agent-builder-dashboards-common/types';
import type { CanvasDashboardRegistry } from '../canvas_dashboard_registry';
import type { SavedObjectStatus } from './use_register_canvas_action_buttons';
import { useDashboardPreviewUnifiedSearch } from './use_dashboard_preview_unified_search';
import { useRegisterCanvasActionButtons } from './use_register_canvas_action_buttons';

const dashboardCanvasContentStyles = {
  actions: ({ euiTheme }: UseEuiTheme) =>
    css({
      padding: euiTheme.size.m,
    }),
  renderer: ({ euiTheme }: UseEuiTheme) =>
    css({
      flex: 1,
      minHeight: 0,
      display: 'flex',
      '& .dashboardViewport': {
        minHeight: 0,
      },
      '.controlGroup': {
        flexGrow: `0 !important` as unknown as number,
        padding: `${euiTheme.size.s} !important`,
        borderBottom: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
      },
    }),
  searchBar: ({ euiTheme }: UseEuiTheme) =>
    css({
      flexShrink: 0,
      padding: `0 ${euiTheme.size.s}`,
    }),
};

export const DashboardCanvasContent = ({
  attachment,
  isSidebar,
  dashboardState,
  registerActionButtons,
  updateOrigin,
  closeCanvas,
  openSidebarConversation,
  dashboardLocator,
  searchBarComponent: SearchBar,
  data,
  checkSavedDashboardExist,
  canWriteDashboards,
  registerCanvasDashboard,
}: AttachmentRenderProps<DashboardAttachment> & {
  dashboardState: DashboardState;
  registerActionButtons: (buttons: ActionButton[]) => void;
  updateOrigin: (origin: string) => Promise<unknown>;
  closeCanvas: () => void;
  dashboardLocator?: DashboardRendererProps['locator'];
  openSidebarConversation?: () => void;
  searchBarComponent: UnifiedSearchPublicPluginStart['ui']['SearchBar'];
  data: DataPublicPluginStart;
  checkSavedDashboardExist: (dashboardId: string) => Promise<boolean>;
  canWriteDashboards: boolean;
  registerCanvasDashboard: CanvasDashboardRegistry['register'];
}) => {
  const [dashboardApi, setDashboardApi] = useState<DashboardApi | undefined>();
  const styles = useMemoCss(dashboardCanvasContentStyles);
  const [savedObjectStatus, setSavedObjectStatus] = useState<SavedObjectStatus>({
    status: 'idle',
  });

  useEffect(
    function checkSavedObjectExists() {
      if (!attachment.origin) {
        setSavedObjectStatus({ status: 'resolved', exists: false });
        return;
      }

      let canceled = false;
      setSavedObjectStatus({ status: 'loading' });

      checkSavedDashboardExist(attachment.origin)
        .then((exists) => {
          if (!canceled) {
            setSavedObjectStatus({ status: 'resolved', exists });
          }
        })
        .catch(() => {
          if (!canceled) {
            setSavedObjectStatus({ status: 'resolved', exists: false });
          }
        });

      return () => {
        canceled = true;
      };
    },
    [attachment.origin, checkSavedDashboardExist]
  );

  useEffect(
    function registerForPanelActions() {
      return dashboardApi
        ? registerCanvasDashboard(dashboardApi, {
            attachmentId: attachment.id,
            closeCanvas: isSidebar ? closeCanvas : undefined,
          })
        : undefined;
    },
    [dashboardApi, attachment.id, isSidebar, closeCanvas, registerCanvasDashboard]
  );

  const { filters, query, searchBarProps, timeRange } = useDashboardPreviewUnifiedSearch({
    dashboardApi,
    dashboardState,
    data,
  });

  const getCreationOptions = useCallback(
    () =>
      Promise.resolve<DashboardCreationOptions>({
        getInitialInput: () => ({ ...dashboardState, viewMode: 'view' as const }),
        changedBy: ['agent'],
      }),
    [dashboardState]
  );

  const dashboardLocatorParams = useMemo<DashboardLocatorParams>(
    () => ({
      ...dashboardState,
      filters,
      query,
      time_range: timeRange,
    }),
    [dashboardState, filters, query, timeRange]
  );
  const getExistingDashboardId = useCallback(
    () =>
      savedObjectStatus.status === 'resolved' && savedObjectStatus.exists
        ? attachment.origin
        : undefined,
    [attachment.origin, savedObjectStatus]
  );

  useRegisterCanvasActionButtons({
    dashboardApi,
    registerActionButtons,
    updateOrigin,
    openSidebarConversation,
    canWriteDashboards,
    dashboardLocatorParams,
    getExistingDashboardId,
    closeCanvas,
  });

  return (
    <>
      <div css={styles.searchBar}>
        <SearchBar {...searchBarProps} />
      </div>
      <div css={styles.renderer}>
        {savedObjectStatus.status !== 'resolved' ? null : (
          <DashboardRenderer
            getCreationOptions={getCreationOptions}
            panelFlyoutType="overlay"
            showPlainSpinner
            locator={dashboardLocator}
            savedObjectId={getExistingDashboardId()}
            onApiAvailable={(api) => {
              api.setViewMode('view');
              setDashboardApi(api);
            }}
          />
        )}
      </div>
    </>
  );
};
