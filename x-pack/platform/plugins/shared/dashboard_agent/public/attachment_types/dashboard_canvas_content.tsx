/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import type { ActionButton, AttachmentRenderProps } from '@kbn/agent-builder-browser/attachments';
import type {
  DashboardAttachmentData,
  DashboardAttachmentOrigin,
} from '@kbn/dashboard-agent-common';
import type { DashboardState } from '@kbn/dashboard-plugin/common';
import type {
  DashboardApi,
  DashboardCreationOptions,
  DashboardRendererProps,
} from '@kbn/dashboard-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { UseEuiTheme } from '@elastic/eui';
import { DashboardRenderer } from '@kbn/dashboard-plugin/public';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import type { DashboardAttachment } from '@kbn/dashboard-agent-common/types';
import { normalizeDashboardWidgets } from './panel_grid_layout';
import { useRegisterActionButtons } from './use_register_action_buttons';

export interface DashboardCanvasInitialInput {
  timeRange: {
    from: string;
    to: string;
  };
  viewMode: 'view';
  panels: DashboardState['panels'];
  title?: string;
  description?: string;
}

const DEFAULT_TIME_RANGE = { from: 'now-24h', to: 'now' };

const createDashboardRendererInitialInput = (
  data: DashboardAttachmentData
): DashboardCanvasInitialInput => ({
  timeRange: DEFAULT_TIME_RANGE,
  viewMode: 'view',
  panels: normalizeDashboardWidgets({
    panels: data.panels ?? [],
    sections: data.sections,
  }),
  title: data.title,
  description: data.description,
});

const getDashboardRendererCreationOptions = async ({
  savedObjectId,
  initialDashboardInput,
}: {
  savedObjectId?: string;
  initialDashboardInput: DashboardCanvasInitialInput;
}): Promise<DashboardCreationOptions> => {
  if (savedObjectId) {
    return {
      getInitialInput: () => ({
        viewMode: 'view',
      }),
    };
  }

  return {
    getInitialInput: () => {
      const { timeRange, ...restInitialDashboardInput } = initialDashboardInput;
      return {
        ...restInitialDashboardInput,
        time_range: timeRange,
      };
    },
  };
};

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
  renderer: css({
    flex: 1,
    minHeight: 0,
    display: 'flex',
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
  dashboardLocator,
  searchBarComponent: SearchBar,
  doesSavedDashboardExist,
}: AttachmentRenderProps<DashboardAttachment> & {
  registerActionButtons: (buttons: ActionButton[]) => void;
  updateOrigin: (origin: DashboardAttachmentOrigin) => Promise<unknown>;
  dashboardLocator?: DashboardRendererProps['locator'];
  searchBarComponent: UnifiedSearchPublicPluginStart['ui']['SearchBar'];
  doesSavedDashboardExist: (dashboardId: string) => Promise<boolean>;
}) => {
  const data = attachment.data;
  const [dashboardApi, setDashboardApi] = useState<DashboardApi | undefined>();
  const styles = useMemoCss(dashboardCanvasContentStyles);
  const linkedSavedObjectId = attachment.origin?.savedObjectId;

  // useEffect(
  //   function checkLinkedSavedDashboardExists() {
  //     let canceled = false;

  //     if (!linkedSavedObjectId) {
  //       setLinkedSavedDashboardExists(false);
  //       return;
  //     }

  //     setLinkedSavedDashboardExists(false);
  //     doesSavedDashboardExist(linkedSavedObjectId)
  //       .then((exists) => {
  //         if (!canceled) {
  //           setLinkedSavedDashboardExists(exists);
  //         }
  //       })
  //       .catch(() => {
  //         if (!canceled) {
  //           setLinkedSavedDashboardExists(false);
  //         }
  //       });

  //     return () => {
  //       canceled = true;
  //     };
  //   },
  //   [linkedSavedObjectId, doesSavedDashboardExist]
  // );
  const initialDashboardInput = useMemo(() => createDashboardRendererInitialInput(data), [data]);

  const [timeRange, setTimeRange] = useState<{ from: string; to: string }>(
    initialDashboardInput.timeRange
  );

  const getCreationOptions = useCallback(
    () =>
      getDashboardRendererCreationOptions({
        savedObjectId: data.savedObjectId,
        initialDashboardInput,
      }),
    [data.savedObjectId, initialDashboardInput]
  );

  useRegisterActionButtons({
    dashboardApi,
    registerActionButtons,
    updateOrigin,
    timeRange,
    initialDashboardInput,
    linkedSavedObjectId,
    doesSavedDashboardExist,
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
      {/* TODO: Hide the callout for now until we agree on the design */}
      {/*
      {linkedSavedObjectId && linkedSavedDashboardExists && (
        <EuiCallOut
          css={styles.callout}
          size="s"
          iconType="info"
          announceOnMount={false}
          title={
            <FormattedMessage
              id="xpack.dashboardAgent.attachments.dashboard.savedVersionCalloutDescription"
              defaultMessage="There's a {savedVersion} of this dashboard that may have more up to date content."
              values={{
                savedVersion: (
                  <EuiLink
                    href={dashboardLocator?.getRedirectUrl({ dashboardId: linkedSavedObjectId })}
                    css={{
                      textDecoration: 'underline',
                    }}
                  >
                    {i18n.translate(
                      'xpack.dashboardAgent.attachments.dashboard.savedVersionLinkText',
                      {
                        defaultMessage: 'saved version',
                      }
                    )}
                  </EuiLink>
                ),
              }}
            />
          }
        />
      )} */}
      <div css={styles.renderer}>
        <DashboardRenderer
          getCreationOptions={getCreationOptions}
          showPlainSpinner
          locator={dashboardLocator}
          onApiAvailable={(api) => {
            api.setViewMode('view');
            const initialTimeRange = api.timeRange$.value;
            if (initialTimeRange) {
              api.setTimeRange(initialTimeRange);
            }
            setDashboardApi(api);
          }}
        />
      </div>
    </div>
  );
};
