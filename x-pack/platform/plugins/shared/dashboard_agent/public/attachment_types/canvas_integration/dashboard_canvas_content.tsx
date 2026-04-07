/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { css } from '@emotion/react';
import type { ActionButton, AttachmentRenderProps } from '@kbn/agent-builder-browser/attachments';
import type { DashboardApi, DashboardRendererProps } from '@kbn/dashboard-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { UseEuiTheme } from '@elastic/eui';
import { DashboardRenderer } from '@kbn/dashboard-plugin/public';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import type { DashboardAttachment } from '@kbn/dashboard-agent-common/types';
import { DEFAULT_TIME_RANGE, attachmentDataToDashboardState } from '@kbn/dashboard-agent-common';
import type { SavedObjectStatus } from './use_register_canvas_action_buttons';
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
  isSidebar,
  attachment,
  registerActionButtons,
  updateOrigin,
  closeCanvas,
  openSidebarConversation,
  dashboardLocator,
  searchBarComponent: SearchBar,
  checkSavedDashboardExist,
}: AttachmentRenderProps<DashboardAttachment> & {
  registerActionButtons: (buttons: ActionButton[]) => void;
  updateOrigin: (origin: string) => Promise<unknown>;
  closeCanvas: () => void;
  dashboardLocator?: DashboardRendererProps['locator'];
  openSidebarConversation?: () => void;
  searchBarComponent: UnifiedSearchPublicPluginStart['ui']['SearchBar'];
  checkSavedDashboardExist: (dashboardId: string) => Promise<boolean>;
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

  const [timeRange, setTimeRange] = useState<{ from: string; to: string }>(
    dashboardState.time_range ?? DEFAULT_TIME_RANGE
  );

  const getCreationOptions = useCallback(
    () =>
      Promise.resolve({
        getInitialInput: () => ({ ...dashboardState, viewMode: 'view' as const }),
      }),
    [dashboardState]
  );

  useRegisterCanvasActionButtons({
    dashboardApi,
    registerActionButtons,
    updateOrigin,
    closeCanvas,
    openSidebarConversation,
    timeRange,
    dashboardState,
    attachmentOrigin,
    savedObjectStatus,
    isSidebar,
  });

  return (
    <div css={styles.root}>
      <div css={styles.searchBar}>
        <SearchBar
          appName="dashboardAgent"
          isAutoRefreshDisabled={true}
          showQueryInput={false}
          showDatePicker={true}
          showFilterBar={false}
          showQueryMenu={false}
          query={undefined}
          displayStyle="inPage"
          disableQueryLanguageSwitcher
          isDisabled={!dashboardApi}
          dateRangeFrom={timeRange.from}
          dateRangeTo={timeRange.to}
          onQuerySubmit={({ dateRange }) => {
            setTimeRange(dateRange);
            dashboardApi?.setTimeRange(dateRange);
          }}
          onRefresh={() => {
            dashboardApi?.forceRefresh();
          }}
          data-test-subj="dashboardCanvasSearchBar"
        />
      </div>
      <div css={styles.renderer}>
        {savedObjectStatus.status !== 'resolved' ? null : (
          <DashboardRenderer
            getCreationOptions={getCreationOptions}
            showPlainSpinner
            locator={dashboardLocator}
            savedObjectId={
              savedObjectStatus.status === 'resolved' && savedObjectStatus.exists
                ? attachmentOrigin
                : undefined
            }
            onApiAvailable={(api) => {
              api.setViewMode('view');
              const initialTimeRange = api.timeRange$.value;
              if (initialTimeRange) {
                api.setTimeRange(initialTimeRange);
              }
              setDashboardApi(api);
            }}
          />
        )}
      </div>
    </div>
  );
};
