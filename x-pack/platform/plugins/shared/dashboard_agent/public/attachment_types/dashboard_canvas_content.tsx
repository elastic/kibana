/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import { ActionButtonType } from '@kbn/agent-builder-browser/attachments';
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
import { i18n } from '@kbn/i18n';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { UseEuiTheme } from '@elastic/eui';
import { DashboardRenderer } from '@kbn/dashboard-plugin/public';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import type { DashboardAttachment } from '@kbn/dashboard-agent-common/types';
import { normalizePanels } from './panel_grid_layout';

interface DashboardCanvasInitialInput {
  timeRange: {
    from: string;
    to: string;
  };
  viewMode: 'view';
  panels: DashboardState['panels'];
  title?: string;
  description?: string;
}

const createDashboardRendererInitialInput = (
  data: DashboardAttachmentData
): DashboardCanvasInitialInput => ({
  timeRange: { from: 'now-24h', to: 'now' },
  viewMode: 'view',
  panels: normalizePanels(data.panels ?? []) as DashboardState['panels'],
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
  searchBar: ({ euiTheme }: UseEuiTheme) => css({
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

  const getCreationOptions = useCallback(
    () =>
      getDashboardRendererCreationOptions({
        savedObjectId: data.savedObjectId,
        initialDashboardInput,
      }),
    [data.savedObjectId, initialDashboardInput]
  );

  useEffect(
    function registerActionButtonsEffect() {
      if (!dashboardApi) {
        return;
      }
      const buttons: ActionButton[] = [];
      if (dashboardApi.locator) {
        const { locator } = dashboardApi;
        buttons.push({
          label: i18n.translate(
            'xpack.dashboardAgent.attachments.dashboard.canvasEditActionLabel',
            {
              defaultMessage: 'Edit',
            }
          ),
          icon: 'pencil',
          type: ActionButtonType.PRIMARY,
          handler: async () => {
            await locator.navigate({
              dashboardId: data.savedObjectId,
              title: initialDashboardInput.title,
              description: initialDashboardInput.description,
              panels: initialDashboardInput.panels,
              time_range: initialDashboardInput.timeRange,
              viewMode: 'edit',
            });
          },
        });
      }

      buttons.push({
        label: i18n.translate('xpack.dashboardAgent.attachments.dashboard.canvasSaveActionLabel', {
          defaultMessage: 'Save',
        }),
        icon: 'save',
        type: ActionButtonType.SECONDARY,
        handler: async () => {
          const result = await dashboardApi.runInteractiveSave();
          const nextSavedObjectId = result?.id ?? dashboardApi.savedObjectId$.value;

          if (nextSavedObjectId && nextSavedObjectId !== linkedSavedObjectId) {
            await updateOrigin({ savedObjectId: nextSavedObjectId });
          }
        },
      });

      registerActionButtons(buttons);
    },
    [
      dashboardApi,
      initialDashboardInput.description,
      initialDashboardInput.panels,
      initialDashboardInput.timeRange,
      initialDashboardInput.title,
      registerActionButtons,
      data.savedObjectId,
      linkedSavedObjectId,
      updateOrigin,
    ]
  );

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
          onQuerySubmit={({ dateRange }) => {
            dashboardApi?.setTimeRange({ from: dateRange.from, to: dateRange.to });
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
