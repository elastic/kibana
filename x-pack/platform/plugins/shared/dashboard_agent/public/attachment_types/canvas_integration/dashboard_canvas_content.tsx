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
import type { DashboardLocatorParams } from '@kbn/dashboard-plugin/common';
import type { DashboardApi, DashboardRendererProps } from '@kbn/dashboard-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { UseEuiTheme } from '@elastic/eui';
import { DashboardRenderer } from '@kbn/dashboard-plugin/public';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import type { DashboardAttachment } from '@kbn/dashboard-agent-common/types';
import { attachmentDataToDashboardState } from '@kbn/dashboard-agent-common';
import type { SavedObjectStatus } from './use_register_canvas_action_buttons';
import { useDashboardPreviewUnifiedSearch } from './use_dashboard_preview_unified_search';
import { useRegisterCanvasActionButtons } from './use_register_canvas_action_buttons';

const dashboardCanvasContentStyles = {
  root: css({
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minHeight: 400,
    '& .dashboardViewport': {
      minHeight: 0,
    },
    '& .embPanel__hoverActions': {
      display: 'none !important',
    },
  }),
  actions: ({ euiTheme }: UseEuiTheme) =>
    css({
      padding: euiTheme.size.m,
    }),
  renderer: ({ euiTheme }: UseEuiTheme) =>
    css({
      flex: 1,
      minHeight: 0,
      display: 'flex',
      '.controlGroup': {
        padding: `${euiTheme.size.s} !important`,
        borderBottom: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
      },
    }),
  searchBar: ({ euiTheme }: UseEuiTheme) =>
    css({
      flexShrink: 0,
      padding: `0 ${euiTheme.size.s}`,
    }),
  callout: ({ euiTheme }: UseEuiTheme) =>
    css({
      marginTop: euiTheme.size.s,
      marginBottom: euiTheme.size.s,
    }),
};

export const DashboardCanvasContent = ({
  attachment,
  registerActionButtons,
  updateOrigin,
  closeCanvas,
  openSidebarConversation,
  dashboardLocator,
  searchBarComponent: SearchBar,
  filterManager,
  checkSavedDashboardExist,
  canWriteDashboards,
}: AttachmentRenderProps<DashboardAttachment> & {
  registerActionButtons: (buttons: ActionButton[]) => void;
  updateOrigin: (origin: string) => Promise<unknown>;
  closeCanvas: () => void;
  dashboardLocator?: DashboardRendererProps['locator'];
  openSidebarConversation?: () => void;
  searchBarComponent: UnifiedSearchPublicPluginStart['ui']['SearchBar'];
  filterManager: DataPublicPluginStart['query']['filterManager'];
  checkSavedDashboardExist: (dashboardId: string) => Promise<boolean>;
  canWriteDashboards: boolean;
}) => {
  const [dashboardApi, setDashboardApi] = useState<DashboardApi | undefined>();
  const styles = useMemoCss(dashboardCanvasContentStyles);
  const attachmentOrigin = attachment.origin;
  const [savedObjectStatus, setSavedObjectStatus] = useState<SavedObjectStatus>({
    status: 'idle',
  });

  useEffect(
    function checkSavedObjectExists() {
      if (!attachmentOrigin) {
        setSavedObjectStatus({ status: 'resolved', exists: false });
        return;
      }

      let canceled = false;
      setSavedObjectStatus({ status: 'loading' });

      checkSavedDashboardExist(attachmentOrigin)
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
    [attachmentOrigin, checkSavedDashboardExist]
  );

  const dashboardState = useMemo(
    () => attachmentDataToDashboardState(attachment.data),
    [attachment.data]
  );
  const { filters, query, searchBarProps, timeRange } = useDashboardPreviewUnifiedSearch({
    dashboardApi,
    dashboardState,
    filterManager,
  });

  const getCreationOptions = useCallback(
    () =>
      Promise.resolve({
        getInitialInput: () => ({ ...dashboardState, viewMode: 'view' as const }),
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
        ? attachmentOrigin
        : undefined,
    [attachmentOrigin, savedObjectStatus]
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
    <div css={styles.root}>
      <div css={styles.searchBar}>
        <SearchBar {...searchBarProps} />
      </div>
      <div css={styles.renderer}>
        {savedObjectStatus.status !== 'resolved' ? null : (
          <DashboardRenderer
            getCreationOptions={getCreationOptions}
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
    </div>
  );
};
