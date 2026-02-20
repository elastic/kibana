/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useEffect, useState, useRef } from 'react';
import type { Observable } from 'rxjs';
import {
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import deepEqual from 'fast-deep-equal';
import { i18n } from '@kbn/i18n';
import type { DashboardState } from '@kbn/dashboard-plugin/common';
import { DashboardRenderer } from '@kbn/dashboard-plugin/public';
import type { ChatEvent } from '@kbn/agent-builder-common';
import { type DashboardAttachmentData } from '@kbn/dashboard-agent-common';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import { MARKDOWN_EMBEDDABLE_TYPE } from '@kbn/dashboard-markdown/public';
import {
  type AttachmentPanel,
  isLensAttachmentPanel,
  isGenericAttachmentPanel,
} from '@kbn/dashboard-agent-common';
import type { DashboardPanel } from '@kbn/dashboard-plugin/server';
import {
  LensConfigBuilder,
  type LensApiSchemaType,
  type LensAttributes,
} from '@kbn/lens-embeddable-utils/config_builder';
import type { LensSerializedAPIConfig } from '@kbn/lens-common-2';
import {
  DEFAULT_PANEL_HEIGHT,
  SMALL_PANEL_WIDTH,
  LARGE_PANEL_WIDTH,
  MARKDOWN_PANEL_WIDTH,
  MARKDOWN_MIN_HEIGHT,
  MARKDOWN_MAX_HEIGHT,
  SMALL_CHART_TYPES,
} from './panel_constants';

import type { DashboardAttachmentStore } from '../services/attachment_store';
import { DashboardFlyoutFooter, type DashboardFlyoutInitialInput } from './dashboard_flyout_footer';

const arePanelsEqual = (
  a: DashboardAttachmentData['panels'],
  b: DashboardAttachmentData['panels']
): boolean => {
  return deepEqual(a, b);
};

const DASHBOARD_GRID_COLUMN_COUNT = 48;

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

export const buildMarkdownPanel = (content: string, layout = PANEL_LAYOUT): DashboardPanel => ({
  type: MARKDOWN_EMBEDDABLE_TYPE,
  config: { content },
  grid: {
    x: 0,
    y: 0,
    w: layout.markdownPanelWidth,
    h: calculateMarkdownPanelHeight(content, layout),
  },
});

export const buildLensPanelFromApi = (
  config: LensApiSchemaType,
  grid: DashboardPanel['grid'],
  uid?: string
): DashboardPanel => {
  const lensAttributes: LensAttributes = new LensConfigBuilder().fromAPIFormat(config);

  const lensConfig: LensSerializedAPIConfig = {
    title: lensAttributes.title ?? config.title ?? 'Generated panel',
    attributes: lensAttributes,
  };

  return {
    type: 'lens',
    grid,
    config: lensConfig,
    uid,
  };
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

  if (embeddableType === 'lens') {
    // For Lens panels, rawConfig is LensAttributes
    const lensAttributes = rawConfig as LensAttributes;
    const w = getLensPanelWidth ? getLensPanelWidth(lensAttributes) : layout.largePanelWidth;

    let x = currentX;
    let y = currentY;
    if (x + w > layout.dashboardGridColumnCount) {
      x = 0;
      y += layout.defaultPanelHeight;
    }

    const lensConfig: LensSerializedAPIConfig = {
      title: title ?? lensAttributes.title ?? 'Panel',
      attributes: lensAttributes,
    };

    return {
      type: 'lens',
      grid: { x, y, w, h: layout.defaultPanelHeight },
      config: lensConfig,
      uid,
    };
  }

  if (embeddableType === MARKDOWN_EMBEDDABLE_TYPE) {
    const content = (rawConfig as { content?: string }).content ?? '';
    const h = calculateMarkdownPanelHeight(content, layout);
    const w = layout.markdownPanelWidth;

    let x = currentX;
    let y = currentY;
    if (x + w > layout.dashboardGridColumnCount) {
      x = 0;
      y += layout.defaultPanelHeight;
    }

    return {
      type: MARKDOWN_EMBEDDABLE_TYPE,
      grid: { x, y, w, h },
      config: { content },
      uid,
    };
  }

  // For other embeddable types, try to build a generic panel
  // This is a fallback that may not work for all panel types
  const w = layout.largePanelWidth;
  let x = currentX;
  let y = currentY;
  if (x + w > layout.dashboardGridColumnCount) {
    x = 0;
    y += layout.defaultPanelHeight;
  }

  return {
    type: embeddableType,
    grid: { x, y, w, h: layout.defaultPanelHeight },
    config: rawConfig,
    uid,
  };
};

export interface NormalizePanelsOptions {
  panels: AttachmentPanel[] | undefined;
  yOffset?: number;
  layout?: typeof PANEL_LAYOUT;
  includePanelIdAsUid?: boolean;
  getLensPanelWidth?: (lensAttributes: LensAttributes) => number;
}

export function normalizePanels(
  panels: AttachmentPanel[],
  yOffset: number = 0,
  layout: typeof PANEL_LAYOUT = PANEL_LAYOUT,
  includePanelIdAsUid: boolean = true,
  getLensPanelWidth: (lensAttributes: LensAttributes) => number = getLensPanelWidthFromAttributes
): DashboardPanel[] {
  const normalizedLayout = layout ?? PANEL_LAYOUT;
  const panelList = panels ?? [];
  const dashboardPanels: DashboardPanel[] = [];
  let currentX = 0;
  let currentY = yOffset;

  for (const panel of panelList) {
    let dashboardPanel: DashboardPanel | null = null;

    if (isLensAttachmentPanel(panel)) {
      const config = panel.visualization as LensApiSchemaType;
      const w = getPanelWidth(config.type, normalizedLayout);

      if (currentX + w > normalizedLayout.dashboardGridColumnCount) {
        currentX = 0;
        currentY += normalizedLayout.defaultPanelHeight;
      }

      dashboardPanel = buildLensPanelFromApi(
        config,
        {
          x: currentX,
          y: currentY,
          w,
          h: normalizedLayout.defaultPanelHeight,
        },
        includePanelIdAsUid ? panel.panelId : undefined
      );
      currentX += w;
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
}

const getDashboardFlyoutStyles = (euiTheme: ReturnType<typeof useEuiTheme>['euiTheme']) => ({
  header: css({
    paddingInline: euiTheme.size.m,
    paddingBlock: euiTheme.size.m,
  }),
  body: css({
    '& .euiFlyoutBody__overflowContent': {
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
    },
  }),
  dashboardContainer: (unconfirmedPanelStyles: Record<string, Record<string, string>>) =>
    css({
      flex: 1,
      minHeight: 400,
      height: '100%',
      '& .embPanel__hoverActions': {
        display: 'none !important',
      },
      ...unconfirmedPanelStyles,
    }),
});

export interface DashboardFlyoutProps {
  initialData: DashboardAttachmentData;
  attachmentId: string;
  attachmentStore: DashboardAttachmentStore;
  chat$: Observable<ChatEvent>;
  onClose: () => void;
  share?: SharePluginStart;
}

export const DashboardFlyout: React.FC<DashboardFlyoutProps> = ({
  initialData,
  attachmentId,
  attachmentStore,
  chat$,
  onClose,
  share,
}) => {
  const { euiTheme } = useEuiTheme();
  const styles = getDashboardFlyoutStyles(euiTheme);

  const [data, setData] = useState<DashboardAttachmentData>(initialData);
  const [version, setVersion] = useState(0);
  const { panels, title, description, savedObjectId } = data;

  // Track current panels to detect changes from attachment store
  const currentPanelsRef = useRef(initialData.panels);

  // Track confirmed panel IDs (panels that exist in the attachment)
  const [confirmedPanelIds, setConfirmedPanelIds] = useState<Set<string>>(
    () => new Set(initialData.panels.map((p) => p.panelId))
  );

  // Track the last created panel ID for highlighting and scrolling
  const [lastCreatedPanelId, setLastCreatedPanelId] = useState<string | null>(null);
  const dashboardContainerRef = useRef<HTMLDivElement>(null);

  // Generate CSS for unconfirmed panels (panels in current data but not in attachment)
  // The last created panel gets a highlight effect, others get reduced opacity
  const unconfirmedPanelStyles = useMemo(() => {
    const unconfirmedIds = panels
      .filter((p) => !confirmedPanelIds.has(p.panelId))
      .map((p) => p.panelId);

    return unconfirmedIds.reduce<Record<string, Record<string, string>>>((panelStyles, id) => {
      const isLastCreated = id === lastCreatedPanelId;
      const panelSelector = `.dshDashboardGrid__item[id="panel-${id}"]`;
      panelStyles[panelSelector] = isLastCreated
        ? {
            outline: `${euiTheme.border.width.thick} solid ${euiTheme.colors.vis.euiColorVis0}`,
            transition: 'outline 0.3s ease-in-out',
            opacity: '0.5',
          }
        : {
            outline: `${euiTheme.border.width.thick} solid transparent`,
            transition: 'outline 0.3s ease-in-out',
            opacity: '0.5',
          };
      return panelStyles;
    }, {});
  }, [panels, confirmedPanelIds, lastCreatedPanelId, euiTheme]);

  // Scroll to the last created panel when it appears and auto-clear highlight after 3 seconds
  useEffect(() => {
    if (!lastCreatedPanelId || !dashboardContainerRef.current) {
      return;
    }

    // Wait for the dashboard to render the new panel, then scroll
    const scrollTimeoutId = setTimeout(() => {
      const selector = `.dshDashboardGrid__item[id="panel-${lastCreatedPanelId}"]`;
      const panelElement = dashboardContainerRef.current?.querySelector(selector);
      if (panelElement) {
        panelElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);

    // Auto-clear the highlight after 3 seconds
    const clearHighlightTimeoutId = setTimeout(() => {
      setLastCreatedPanelId(null);
    }, 3000);

    return () => {
      clearTimeout(scrollTimeoutId);
      clearTimeout(clearHighlightTimeoutId);
    };
  }, [lastCreatedPanelId, version]);

  // Subscribe to attachment store for state updates
  useEffect(() => {
    const subscription = attachmentStore.state$.subscribe((state) => {
      if (state?.attachmentId === attachmentId && state.data) {
        // Only update confirmed panel IDs when we receive a confirmed attachment update
        if (state.isConfirmed) {
          setConfirmedPanelIds(new Set(state.data.panels.map((p) => p.panelId)));
          // Clear highlight when panels are confirmed
          setLastCreatedPanelId(null);
        }

        const panelsChanged = !arePanelsEqual(currentPanelsRef.current, state.data.panels);

        // Find newly added panels (panels in new state but not in current)
        const currentIds = new Set(currentPanelsRef.current.map((p) => p.panelId));
        const newPanels = state.data.panels.filter((p) => !currentIds.has(p.panelId));

        if (panelsChanged) {
          currentPanelsRef.current = state.data.panels;
        }

        setData(state.data);

        // Remount dashboard when panel composition changes.
        if (panelsChanged) {
          // If there are new panels, highlight the last one added
          if (newPanels.length > 0) {
            const lastNewPanel = newPanels[newPanels.length - 1];
            setLastCreatedPanelId(lastNewPanel.panelId);
          }
          setVersion((v) => v + 1);
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [attachmentStore, attachmentId]);

  const initialDashboardInput = useMemo<DashboardFlyoutInitialInput>(
    () => ({
      timeRange: { from: 'now-24h', to: 'now' },
      viewMode: 'view' as const,
      panels: normalizePanels(panels ?? []) as DashboardState['panels'],
      title,
      description,
    }),
    [panels, title, description]
  );

  const getCreationOptions = useCallback(async () => {
    // If we have a savedObjectId, load from saved dashboard and just set viewMode
    // Otherwise, use by-value panels from the attachment data
    if (savedObjectId) {
      return {
        getInitialInput: () => ({
          viewMode: 'view' as const,
        }),
      };
    }

    return {
      getInitialInput: () => ({
        ...initialDashboardInput,
      }),
    };
  }, [savedObjectId, initialDashboardInput]);

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup
          alignItems="center"
          justifyContent="spaceBetween"
          responsive={false}
          css={styles.header}
        >
          <EuiFlexItem grow={false}>
            <EuiTitle size="m">
              <h2 id="dashboardFlyoutTitle">
                {title ||
                  i18n.translate('xpack.dashboardAgent.flyout.defaultTitle', {
                    defaultMessage: 'Dashboard Preview',
                  })}
              </h2>
            </EuiTitle>
            {description && (
              <EuiText size="s" color="subdued">
                {description}
              </EuiText>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>

      <EuiFlyoutBody css={styles.body}>
        <div ref={dashboardContainerRef} css={styles.dashboardContainer(unconfirmedPanelStyles)}>
          <DashboardRenderer
            key={version}
            getCreationOptions={getCreationOptions}
            showPlainSpinner
            savedObjectId={savedObjectId}
            onApiAvailable={(api) => {
              // Force view mode since DashboardRenderer defaults to edit when no savedObjectId
              api.setViewMode('view');
            }}
          />
        </div>
      </EuiFlyoutBody>

      <DashboardFlyoutFooter
        onClose={onClose}
        share={share}
        savedObjectId={savedObjectId}
        initialDashboardInput={initialDashboardInput}
      />
    </>
  );
};
