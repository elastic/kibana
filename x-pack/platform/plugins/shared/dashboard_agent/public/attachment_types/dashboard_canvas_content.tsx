/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { EuiCallOut, EuiLink, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { ActionButtonType } from '@kbn/agent-builder-browser/attachments';
import type { ActionButton, AttachmentRenderProps } from '@kbn/agent-builder-browser/attachments';
import type {
  DashboardAttachmentData,
  DashboardAttachmentOrigin,
  AttachmentPanel,
} from '@kbn/dashboard-agent-common';
import { isGenericAttachmentPanel, isLensAttachmentPanel } from '@kbn/dashboard-agent-common';
import type { DashboardAttachment } from '@kbn/dashboard-agent-common/types';
import type { DashboardState } from '@kbn/dashboard-plugin/common';
import { DashboardRenderer } from '@kbn/dashboard-plugin/public';
import type {
  DashboardApi,
  DashboardCreationOptions,
  DashboardRendererProps,
} from '@kbn/dashboard-plugin/public';
import type { DashboardPanel } from '@kbn/dashboard-plugin/server';
import { MARKDOWN_EMBEDDABLE_TYPE } from '@kbn/dashboard-markdown/public';
import { i18n } from '@kbn/i18n';
import {
  LensConfigBuilder,
  type LensApiSchemaType,
  type LensAttributes,
} from '@kbn/lens-embeddable-utils/config_builder';
import { isLensLegacyAttributes } from '@kbn/lens-embeddable-utils/config_builder/utils';
import type { LensSerializedAPIConfig } from '@kbn/lens-common-2';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { unifiedSearch } from '../kibana_services';

const DASHBOARD_GRID_COLUMN_COUNT = 48;
const DEFAULT_PANEL_HEIGHT = 9;
const SMALL_PANEL_WIDTH = 12;
const LARGE_PANEL_WIDTH = 24;
const MARKDOWN_PANEL_WIDTH = 48;
const MARKDOWN_MIN_HEIGHT = 6;
const MARKDOWN_MAX_HEIGHT = 9;
const SMALL_CHART_TYPES = new Set(['metric', 'legacy_metric', 'gauge']);

export const PANEL_LAYOUT = {
  defaultPanelHeight: DEFAULT_PANEL_HEIGHT,
  smallPanelWidth: SMALL_PANEL_WIDTH,
  largePanelWidth: LARGE_PANEL_WIDTH,
  markdownPanelWidth: MARKDOWN_PANEL_WIDTH,
  markdownMinHeight: MARKDOWN_MIN_HEIGHT,
  markdownMaxHeight: MARKDOWN_MAX_HEIGHT,
  smallChartTypes: SMALL_CHART_TYPES,
  dashboardGridColumnCount: DASHBOARD_GRID_COLUMN_COUNT,
};

export const getLensPanelWidthFromAttributes = (lensAttributes: LensAttributes): number => {
  const visType = lensAttributes.visualizationType;
  const isSmallChart =
    visType === 'lnsMetric' || visType === 'lnsLegacyMetric' || visType === 'lnsGauge';
  return isSmallChart ? SMALL_PANEL_WIDTH : LARGE_PANEL_WIDTH;
};

export const getPanelWidth = (chartType: string, layout = PANEL_LAYOUT): number => {
  return layout.smallChartTypes.has(chartType) ? layout.smallPanelWidth : layout.largePanelWidth;
};

export const calculateMarkdownPanelHeight = (content: string, layout = PANEL_LAYOUT): number => {
  const lineCount = content.split('\n').length;
  const estimatedHeight = lineCount + 2;
  return Math.max(layout.markdownMinHeight, Math.min(layout.markdownMaxHeight, estimatedHeight));
};

export const buildLensPanelFromApi = (
  config: LensApiSchemaType,
  grid: DashboardPanel['grid'],
  uid?: string
): DashboardPanel => {
  const lensAttributes: LensAttributes = new LensConfigBuilder().fromAPIFormat(config);

  const lensConfig: LensSerializedAPIConfig = {
    title:
      lensAttributes.title ??
      config.title ??
      i18n.translate('xpack.dashboardAgent.attachments.dashboard.generatedPanelTitle', {
        defaultMessage: 'Generated panel',
      }),
    attributes: lensAttributes,
  };

  return {
    type: 'lens',
    grid,
    config: lensConfig,
    uid,
  };
};

export const isLensEmbeddableType = (
  embeddableType: string,
  rawConfig: unknown
): rawConfig is LensAttributes => {
  return embeddableType === LENS_EMBEDDABLE_TYPE && isLensLegacyAttributes(rawConfig);
};

export interface BuildPanelFromRawConfigOptions {
  embeddableType: string;
  rawConfig: Record<string, unknown>;
  title: string | undefined;
  position: { currentX: number; currentY: number };
  layout?: typeof PANEL_LAYOUT;
  uid?: string;
  getLensPanelWidth?: (lensAttributes: LensAttributes) => number;
}

export const buildPanelFromRawConfig = ({
  layout = PANEL_LAYOUT,
  embeddableType,
  rawConfig,
  title,
  position,
  uid,
  getLensPanelWidth,
}: BuildPanelFromRawConfigOptions): DashboardPanel | null => {
  const { currentX, currentY } = position;

  if (isLensEmbeddableType(embeddableType, rawConfig)) {
    const lensAttributes = rawConfig;
    const width = getLensPanelWidth ? getLensPanelWidth(lensAttributes) : layout.largePanelWidth;

    let x = currentX;
    let y = currentY;
    if (x + width > layout.dashboardGridColumnCount) {
      x = 0;
      y += layout.defaultPanelHeight;
    }

    const lensConfig: LensSerializedAPIConfig = {
      title: title ?? lensAttributes.title ?? 'Panel',
      attributes: lensAttributes,
    };

    return {
      type: 'lens',
      grid: { x, y, w: width, h: layout.defaultPanelHeight },
      config: lensConfig,
      uid,
    };
  }

  if (embeddableType === MARKDOWN_EMBEDDABLE_TYPE) {
    const content = (rawConfig as { content?: string }).content ?? '';
    const height = calculateMarkdownPanelHeight(content, layout);
    const width = layout.markdownPanelWidth;

    let x = currentX;
    let y = currentY;
    if (x + width > layout.dashboardGridColumnCount) {
      x = 0;
      y += layout.defaultPanelHeight;
    }

    return {
      type: MARKDOWN_EMBEDDABLE_TYPE,
      grid: { x, y, w: width, h: height },
      config: { content },
      uid,
    };
  }

  const width = layout.largePanelWidth;
  let x = currentX;
  let y = currentY;
  if (x + width > layout.dashboardGridColumnCount) {
    x = 0;
    y += layout.defaultPanelHeight;
  }

  return {
    type: embeddableType,
    grid: { x, y, w: width, h: layout.defaultPanelHeight },
    config: rawConfig,
    uid,
  };
};

export const normalizePanels = (
  panels: AttachmentPanel[],
  yOffset: number = 0,
  layout: typeof PANEL_LAYOUT = PANEL_LAYOUT,
  includePanelIdAsUid: boolean = true,
  getLensPanelWidth: (lensAttributes: LensAttributes) => number = getLensPanelWidthFromAttributes
): DashboardPanel[] => {
  const normalizedLayout = layout ?? PANEL_LAYOUT;
  const panelList = panels ?? [];
  const dashboardPanels: DashboardPanel[] = [];
  let currentX = 0;
  let currentY = yOffset;

  for (const panel of panelList) {
    let dashboardPanel: DashboardPanel | null = null;

    if (isLensAttachmentPanel(panel)) {
      const config = panel.visualization as LensApiSchemaType;
      const width = getPanelWidth(config.type, normalizedLayout);

      if (currentX + width > normalizedLayout.dashboardGridColumnCount) {
        currentX = 0;
        currentY += normalizedLayout.defaultPanelHeight;
      }

      dashboardPanel = buildLensPanelFromApi(
        config,
        {
          x: currentX,
          y: currentY,
          w: width,
          h: normalizedLayout.defaultPanelHeight,
        },
        includePanelIdAsUid ? panel.panelId : undefined
      );
      currentX += width;
    } else if (isGenericAttachmentPanel(panel)) {
      dashboardPanel = buildPanelFromRawConfig({
        embeddableType: panel.type,
        rawConfig: panel.rawConfig,
        title: panel.title,
        position: {
          currentX,
          currentY,
        },
        layout: normalizedLayout,
        uid: includePanelIdAsUid ? panel.panelId : undefined,
        getLensPanelWidth,
      });

      if (dashboardPanel) {
        currentX += dashboardPanel.grid.w;
        if (currentX >= normalizedLayout.dashboardGridColumnCount) {
          currentX = 0;
          currentY += normalizedLayout.defaultPanelHeight;
        }
      }
    }

    if (dashboardPanel) {
      dashboardPanels.push(dashboardPanel);
    }
  }

  return dashboardPanels;
};

export interface DashboardCanvasInitialInput {
  time_range: {
    from: string;
    to: string;
  };
  viewMode: 'view';
  panels: DashboardState['panels'];
  title?: string;
  description?: string;
}

export const createDashboardRendererInitialInput = (
  data: DashboardAttachmentData
): DashboardCanvasInitialInput => ({
  time_range: { from: 'now-24h', to: 'now' },
  viewMode: 'view',
  panels: normalizePanels(data.panels ?? []) as DashboardState['panels'],
  title: data.title,
  description: data.description,
});

export const getDashboardRendererCreationOptions = async ({
  savedObjectId,
  initialDashboardInput,
}: {
  savedObjectId?: string;
  initialDashboardInput: DashboardCanvasInitialInput;
}): Promise<DashboardCreationOptions> => {
  if (savedObjectId) {
    return {
      useUnifiedSearchIntegration: true,
      getInitialInput: () => ({
        viewMode: 'view',
      }),
    };
  }

  return {
    useUnifiedSearchIntegration: true,
    getInitialInput: () => ({
      ...initialDashboardInput,
    }),
  };
};

const getDashboardCanvasContentStyles = ({
  euiTheme,
}: {
  euiTheme: ReturnType<typeof useEuiTheme>['euiTheme'];
}) => ({
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
  renderer: css({
    flex: 1,
    minHeight: 0,
    display: 'flex',
  }),
  searchBar: css({
    flexShrink: 0,
  }),
  callout: css({
    marginTop: euiTheme.size.s,
    marginBottom: euiTheme.size.s,
  }),
});

export const DashboardCanvasContent = ({
  attachment,
  registerActionButtons,
  updateOrigin,
  dashboardLocator,
}: AttachmentRenderProps<DashboardAttachment> & {
  registerActionButtons: (buttons: ActionButton[]) => void;
  updateOrigin: (origin: DashboardAttachmentOrigin) => Promise<unknown>;
  dashboardLocator?: DashboardRendererProps['locator'];
}) => {
  const { euiTheme } = useEuiTheme();
  const data = attachment.data;
  const [dashboardApi, setDashboardApi] = useState<DashboardApi | undefined>();
  const styles = useMemo(() => getDashboardCanvasContentStyles({ euiTheme }), [euiTheme]);
  const linkedSavedObjectId = attachment.origin?.savedObjectId;

  const initialDashboardInput = useMemo(() => createDashboardRendererInitialInput(data), [data]);

  const getCreationOptions = useCallback(
    () =>
      getDashboardRendererCreationOptions({
        savedObjectId: data.savedObjectId,
        initialDashboardInput,
      }),
    [data.savedObjectId, initialDashboardInput]
  );

  useEffect(() => {
    if (!dashboardApi) {
      return;
    }
    const buttons: ActionButton[] = [];
    if (dashboardApi.locator) {
      const { locator } = dashboardApi;
      buttons.push({
        label: i18n.translate('xpack.dashboardAgent.attachments.dashboard.canvasEditActionLabel', {
          defaultMessage: 'Edit',
        }),
        icon: 'pencil',
        type: ActionButtonType.PRIMARY,
        handler: async () => {
          await locator.navigate({
            dashboardId: data.savedObjectId,
            title: initialDashboardInput.title,
            description: initialDashboardInput.description,
            panels: initialDashboardInput.panels,
            time_range: initialDashboardInput.time_range,
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
  }, [
    dashboardApi,
    initialDashboardInput.description,
    initialDashboardInput.panels,
    initialDashboardInput.time_range,
    initialDashboardInput.title,
    registerActionButtons,
    data.savedObjectId,
    linkedSavedObjectId,
    updateOrigin,
  ]);

  const { SearchBar } = unifiedSearch.ui;

  return (
    <div css={styles.root}>
      <div css={styles.searchBar}>
        <SearchBar
          appName="dashboardAgent"
          showQueryInput={false}
          showDatePicker={true}
          showFilterBar={false}
          useDefaultBehaviors={true}
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
      {linkedSavedObjectId && (
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
      )}
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
