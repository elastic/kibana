/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  EuiButtonGroup,
  EuiButtonIcon,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { css as cssClass, keyframes } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import {
  Background,
  MiniMap,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Node,
  type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { IngestHubDemoStreamTopology } from '../ingest_hub_demo_stream_topology';
import {
  buildStreamTopologyFlowLayout,
  INGEST_HUB_DEMO_STREAMS_FLOW_MIN_LAYOUT_WIDTH_PX,
} from './ingest_hub_demo_streams_flow_graph_model';
import {
  computeFlowHighlightForHoveredEdge,
  mergeWaypointPolylineForHoveredEdge,
  polylineToSmoothPathD,
} from './ingest_hub_demo_streams_flow_graph_highlight';
import type { FlowCanvasCardSelection } from './ingest_hub_demo_streams_flow_card_selection';
import { IngestHubDemoStreamsFlowCardDetailFlyout } from './ingest_hub_demo_streams_flow_card_detail_flyout';
import { StreamsPipelineWorldContext } from './ingest_hub_demo_streams_flow_pipeline_world_context';
import type { StreamsPipelineWorldContextValue } from './ingest_hub_demo_streams_flow_pipeline_world_context';
import { StreamsPipelineWorldNode } from './ingest_hub_demo_streams_flow_pipeline_world_node';

/** Horizontal inset when fitting stream rows to the pane width. */
const FIT_VIEW_HORIZONTAL_PADDING_RATIO = 0.02;
/** Animated zoom / programmatic fit from toolbar (ms). Initial layout uses 0 to avoid a visible snap. */
const FIT_VIEW_DURATION_MS = 200;

const CONNECTOR_FLOW_CORNER_RADIUS = 18;

const connectorDashFlowKeyframes = keyframes`
  to {
    stroke-dashoffset: -10;
  }
`;

const connectorPathHoveredClassName = cssClass`
  animation: ${connectorDashFlowKeyframes} 0.85s linear infinite;
`;

const nodeTypes: NodeTypes = {
  streamsPipelineWorld: StreamsPipelineWorldNode,
};

export interface IngestHubDemoStreamsFlowPipelineCanvasProps {
  /** Full stream topology rendered as the stream graph (sources → pipeline → routing → destinations). */
  readonly topology: IngestHubDemoStreamTopology;
  readonly buildStreamHref: (streamName: string) => string;
  readonly onStreamNavigate: (streamName: string) => void;
  readonly onToggleFullscreen?: () => void;
  readonly isFullscreen?: boolean;
  /** Opens canvas settings (e.g. customize flyout) — renders the gear control when set. */
  readonly onOpenCanvasSettings?: () => void;
}

export type IngestHubDemoStreamsFlowPipelineCanvasZoomPreset = 50 | 100 | 200;

export interface IngestHubDemoStreamsFlowPipelineCanvasRef {
  zoomIn: () => void;
  zoomOut: () => void;
  zoomToFit: () => void;
  zoomToPreset: (preset: IngestHubDemoStreamsFlowPipelineCanvasZoomPreset) => void;
}

const IngestHubDemoStreamsFlowPipelineCanvasInner = forwardRef<
  IngestHubDemoStreamsFlowPipelineCanvasRef,
  IngestHubDemoStreamsFlowPipelineCanvasProps
>(function IngestHubDemoStreamsFlowPipelineCanvasInner(
  {
    topology,
    buildStreamHref,
    onStreamNavigate,
    onToggleFullscreen,
    isFullscreen = false,
    onOpenCanvasSettings,
  },
  ref
) {
  const { euiTheme } = useEuiTheme();
  const { zoomIn, zoomOut, getViewport, setViewport } = useReactFlow();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hoverClearTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [paneSize, setPaneSize] = useState({ contentWidth: 852, contentHeight: 420 });
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  const [findQuery, setFindQuery] = useState('');
  const [presentation, setPresentation] = useState<'horizontal' | 'vertical'>('horizontal');
  const [findMatchIndex, setFindMatchIndex] = useState(0);
  const [isFilterPanelExpanded, setIsFilterPanelExpanded] = useState(false);
  const [cardSelection, setCardSelection] = useState<FlowCanvasCardSelection | null>(null);
  const cardFlyoutTitleId = useGeneratedHtmlId({ prefix: 'streamsFlowCanvasCardFlyout' });

  const isMacLikePlatform = useMemo(() => {
    if (typeof navigator === 'undefined') {
      return false;
    }
    return /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent);
  }, []);

  const findInPageShortcutLabel = isMacLikePlatform ? '⌘K' : 'Ctrl+K';

  const findSearchTotal = useMemo(() => {
    const q = findQuery.trim().toLowerCase();
    if (!q) {
      return 0;
    }
    const sourceHits = topology.sources.filter(
      (s) => s.title.toLowerCase().includes(q) || s.id.toLowerCase().includes(q)
    ).length;
    const destHits = topology.destinations.filter((d) => d.name.toLowerCase().includes(q)).length;
    const stepHits =
      topology.processingSteps.filter((s) => s.label.toLowerCase().includes(q)).length +
      topology.routingSteps.filter((s) => s.label.toLowerCase().includes(q)).length;
    return sourceHits + destHits + stepHits;
  }, [findQuery, topology]);

  const findCounterText = useMemo(() => {
    if (findSearchTotal < 1) {
      return '0/0';
    }
    return `${Math.min(findMatchIndex, findSearchTotal - 1) + 1}/${findSearchTotal}`;
  }, [findMatchIndex, findSearchTotal]);

  useEffect(() => {
    setFindMatchIndex(0);
  }, [findQuery]);

  const toggleFilterPanel = useCallback(() => {
    setIsFilterPanelExpanded((open) => !open);
  }, []);

  const cancelHoverClear = useCallback(() => {
    if (hoverClearTimerRef.current !== undefined) {
      clearTimeout(hoverClearTimerRef.current);
      hoverClearTimerRef.current = undefined;
    }
  }, []);

  const scheduleHoverClear = useCallback(() => {
    cancelHoverClear();
    hoverClearTimerRef.current = setTimeout(() => {
      setHoveredEdgeId(null);
      hoverClearTimerRef.current = undefined;
    }, 200);
  }, [cancelHoverClear]);

  const onEdgeHitEnter = useCallback(
    (edgeId: string) => {
      cancelHoverClear();
      setHoveredEdgeId(edgeId);
    },
    [cancelHoverClear]
  );

  const clearEdgeHover = useCallback(() => {
    cancelHoverClear();
    setHoveredEdgeId(null);
  }, [cancelHoverClear]);

  const clearHoverOnCardEnter = useCallback(() => {
    clearEdgeHover();
  }, [clearEdgeHover]);

  const onCardSelect = useCallback((selection: FlowCanvasCardSelection) => {
    setCardSelection(selection);
  }, []);

  const closeCardFlyout = useCallback(() => {
    setCardSelection(null);
  }, []);

  useEffect(() => () => cancelHoverClear(), [cancelHoverClear]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) {
      return;
    }
    const measure = () => {
      setPaneSize({
        contentWidth: Math.max(1, Math.floor(el.clientWidth)),
        contentHeight: Math.max(1, Math.floor(el.clientHeight)),
      });
    };
    measure();
    const raf = window.requestAnimationFrame(() => measure());
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    window.addEventListener('resize', measure);
    document.addEventListener('fullscreenchange', measure);
    return () => {
      window.cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('resize', measure);
      document.removeEventListener('fullscreenchange', measure);
    };
  }, []);

  const layoutContentWidth = useMemo(
    () =>
      Math.max(INGEST_HUB_DEMO_STREAMS_FLOW_MIN_LAYOUT_WIDTH_PX, Math.floor(paneSize.contentWidth)),
    [paneSize.contentWidth]
  );

  const flowLayout = useMemo(
    () => buildStreamTopologyFlowLayout(layoutContentWidth, topology),
    [layoutContentWidth, topology]
  );

  /** Scale and position so stream rows span the pane width; vertical overflow is pannable. */
  const fitLayoutToViewportWidth = useCallback(
    (durationMs = 0) => {
      const { layoutWidth, layoutHeight } = flowLayout;
      const { contentWidth, contentHeight } = paneSize;
      if (layoutWidth < 1 || contentWidth < 1) {
        return;
      }

      const horizontalPadding = contentWidth * FIT_VIEW_HORIZONTAL_PADDING_RATIO;
      const availableWidth = contentWidth - horizontalPadding * 2;
      const zoom = availableWidth / layoutWidth;
      const x = horizontalPadding;
      const scaledHeight = layoutHeight * zoom;
      const y = (contentHeight - scaledHeight) / 2;

      setViewport({ x, y, zoom }, durationMs > 0 ? { duration: durationMs } : undefined);
    },
    [flowLayout, paneSize, setViewport]
  );

  const highlight = useMemo(
    () => computeFlowHighlightForHoveredEdge(flowLayout.edges, hoveredEdgeId),
    [flowLayout.edges, hoveredEdgeId]
  );

  const nodeDimmed = useCallback(
    (nodeId: string) => Boolean(highlight && !highlight.nodeIds.has(nodeId)),
    [highlight]
  );

  const mergedTracePolyline = useMemo(
    () => mergeWaypointPolylineForHoveredEdge(flowLayout.edges, hoveredEdgeId),
    [flowLayout.edges, hoveredEdgeId]
  );

  const mergedTracePathD = useMemo(() => {
    if (highlight?.multicastBranch) {
      return null;
    }
    if (!mergedTracePolyline || mergedTracePolyline.length < 2) {
      return null;
    }
    return polylineToSmoothPathD(mergedTracePolyline, CONNECTOR_FLOW_CORNER_RADIUS);
  }, [highlight?.multicastBranch, mergedTracePolyline]);

  const worldContextValue = useMemo((): StreamsPipelineWorldContextValue => {
    return {
      euiTheme,
      flowLayout,
      topology,
      highlight,
      mergedTracePathD,
      buildStreamHref,
      onStreamNavigate,
      onCardSelect,
      onEdgeHitEnter,
      scheduleHoverClear,
      clearHoverOnCardEnter,
      nodeDimmed,
      connectorPathHoveredClassName,
    };
  }, [
    buildStreamHref,
    clearHoverOnCardEnter,
    euiTheme,
    flowLayout,
    highlight,
    mergedTracePathD,
    nodeDimmed,
    onCardSelect,
    onEdgeHitEnter,
    onStreamNavigate,
    scheduleHoverClear,
    topology,
  ]);

  const nodes = useMemo<Node[]>(
    () => [
      {
        id: 'streams-pipeline-world',
        type: 'streamsPipelineWorld',
        position: { x: 0, y: 0 },
        draggable: false,
        selectable: false,
        focusable: false,
        data: {},
        style: {
          width: flowLayout.layoutWidth,
          height: flowLayout.layoutHeight,
        },
      },
    ],
    [flowLayout.layoutHeight, flowLayout.layoutWidth]
  );

  useLayoutEffect(() => {
    fitLayoutToViewportWidth(0);
  }, [fitLayoutToViewportWidth]);

  useImperativeHandle(
    ref,
    () => ({
      zoomIn: () => zoomIn({ duration: FIT_VIEW_DURATION_MS }),
      zoomOut: () => zoomOut({ duration: FIT_VIEW_DURATION_MS }),
      zoomToFit: () => fitLayoutToViewportWidth(FIT_VIEW_DURATION_MS),
      zoomToPreset: (preset) => {
        const targetZoom = preset === 50 ? 0.5 : preset === 100 ? 1 : 2;
        const vp = getViewport();
        setViewport({ ...vp, zoom: targetZoom }, { duration: FIT_VIEW_DURATION_MS });
      },
    }),
    [fitLayoutToViewportWidth, getViewport, setViewport, zoomIn, zoomOut]
  );

  /** Vertical icon stack: plain panel, single border, horizontal dividers between controls. */
  const canvasControlToolbarStackCss = useMemo(
    () => css`
      display: inline-flex;
      flex-direction: column;
      align-items: stretch;
      background-color: ${euiTheme.colors.backgroundBasePlain};
      border-radius: ${euiTheme.border.radius.medium};
      border: ${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBaseSubdued};
      overflow: hidden;
      padding: 0;
    `,
    [euiTheme]
  );

  const canvasControlToolbarRowCss = useMemo(
    () => css`
      display: flex;
      justify-content: center;
      align-items: center;
      margin: 0;
      padding: 0;
      border-block-end: ${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBaseSubdued};

      &:last-child {
        border-block-end: none;
      }

      .euiButtonIcon {
        border-radius: 0;
        inline-size: 32px;
        min-inline-size: 32px;
        block-size: 32px;
        min-block-size: 32px;
        padding-block: 0;
        padding-inline: 0;
      }
    `,
    [euiTheme]
  );

  /** Tighten top-left overlay; clip minimap so mask/viewport never paints past rounded bounds. */
  const reactFlowCanvasChromeCss = useMemo(
    () => cssClass`
      flex: 1;
      min-height: 0;
      width: 100%;
      position: relative;

      .react-flow__panel.top.left {
        margin: 0;
        padding: 0;
      }

      .react-flow__panel.bottom.left {
        overflow: hidden;
        border-radius: ${euiTheme.border.radius.medium};
      }

      .react-flow__minimap,
      .react-flow__minimap-svg {
        display: block;
        overflow: hidden;
        max-width: 100%;
        max-height: 100%;
      }
    `,
    [euiTheme]
  );

  const leftOverlayRowCss = useMemo(
    () => css`
      margin: 0;
      padding: 0;
      align-items: flex-start;
    `,
    []
  );

  const leftOverlayControlsColumnCss = useMemo(
    () => css`
      margin: 0;
      padding: 0;
      gap: 4px;
    `,
    []
  );

  const minimapStyle = useMemo(
    () => ({
      backgroundColor: euiTheme.colors.backgroundBasePlain,
      border: `${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBaseSubdued}`,
      borderRadius: euiTheme.border.radius.medium,
      margin: 8,
      width: 192,
      height: 128,
      overflow: 'hidden',
      boxSizing: 'border-box',
    }),
    [euiTheme]
  );

  const enterFullscreenLabel = i18n.translate('xpack.streams.ingestHubFlowCanvas.enterFullscreen', {
    defaultMessage: 'Enter full screen',
  });
  const exitFullscreenLabel = i18n.translate('xpack.streams.ingestHubFlowCanvas.exitFullscreen', {
    defaultMessage: 'Exit full screen',
  });
  const zoomInLabel = i18n.translate('xpack.streams.ingestHubFlowCanvas.zoomIn', {
    defaultMessage: 'Zoom in',
  });
  const zoomOutLabel = i18n.translate('xpack.streams.ingestHubFlowCanvas.zoomOut', {
    defaultMessage: 'Zoom out',
  });
  const zoomToFitLabel = i18n.translate('xpack.streams.ingestHubFlowCanvas.zoomFit', {
    defaultMessage: 'Fit map to view',
  });
  const showFiltersLabel = i18n.translate('xpack.streams.ingestHubFlowCanvas.showFilters', {
    defaultMessage: 'Show filters',
  });
  const hideFiltersLabel = i18n.translate('xpack.streams.ingestHubFlowCanvas.hideFilters', {
    defaultMessage: 'Hide filters',
  });
  const filtersPanelLabel = i18n.translate('xpack.streams.ingestHubFlowCanvas.filtersPanel', {
    defaultMessage: 'Stream map filters',
  });
  const fullscreenUnavailableLabel = i18n.translate(
    'xpack.streams.ingestHubFlowCanvas.fullscreenUnavailable',
    {
      defaultMessage: 'Fullscreen is not available for this canvas.',
    }
  );
  const canvasSettingsLabel = i18n.translate('xpack.streams.ingestHubFlowCanvas.canvasSettings', {
    defaultMessage: 'Canvas settings',
  });
  const findPrevLabel = i18n.translate('xpack.streams.ingestHubFlowCanvas.findPrevious', {
    defaultMessage: 'Previous match',
  });
  const findNextLabel = i18n.translate('xpack.streams.ingestHubFlowCanvas.findNext', {
    defaultMessage: 'Next match',
  });

  const fullscreenButtonLabel = isFullscreen ? exitFullscreenLabel : enterFullscreenLabel;

  const bumpFindMatch = useCallback(
    (delta: number) => {
      setFindMatchIndex((i) => {
        if (findSearchTotal < 1) {
          return 0;
        }
        return (i + delta + findSearchTotal) % findSearchTotal;
      });
    },
    [findSearchTotal]
  );

  const placeholderOption = useMemo(
    () => ({
      value: '',
      text: i18n.translate('xpack.streams.ingestHubFlowCanvas.filterAny', {
        defaultMessage: 'Any',
      }),
    }),
    []
  );

  return (
    <div
      ref={containerRef}
      className={reactFlowCanvasChromeCss}
      data-test-subj="streamsIngestHubFlowPipelineCanvas"
    >
      <StreamsPipelineWorldContext.Provider value={worldContextValue}>
        <ReactFlow
          style={{ width: '100%', height: '100%' }}
          nodes={nodes}
          edges={[]}
          nodeTypes={nodeTypes}
          minZoom={0.2}
          maxZoom={3}
          proOptions={{ hideAttribution: true }}
          nodesDraggable={false}
          nodesConnectable={false}
          nodesFocusable={false}
          edgesFocusable={false}
          deleteKeyCode={null}
          multiSelectionKeyCode={null}
        >
          <Background gap={24} size={1} color={euiTheme.colors.lightShade} />
          <Panel position="top-left" style={{ margin: 0, padding: 0 }}>
            <EuiFlexGroup
              direction="row"
              gutterSize="none"
              alignItems="flexStart"
              responsive={false}
              css={leftOverlayRowCss}
            >
              <EuiFlexItem grow={false}>
                <EuiFlexGroup
                  direction="column"
                  gutterSize="none"
                  responsive={false}
                  data-test-subj="streamsIngestHubFlowCanvasControls"
                  css={leftOverlayControlsColumnCss}
                >
                  <EuiPanel
                    paddingSize="none"
                    hasBorder={false}
                    hasShadow={false}
                    color="plain"
                    grow={false}
                    css={canvasControlToolbarStackCss}
                  >
                    <EuiFlexGroup
                      direction="column"
                      gutterSize="none"
                      alignItems="stretch"
                      responsive={false}
                    >
                      <EuiFlexItem grow={false} css={canvasControlToolbarRowCss}>
                        <EuiToolTip
                          content={isFilterPanelExpanded ? hideFiltersLabel : showFiltersLabel}
                          position="right"
                        >
                          <EuiButtonIcon
                            display="empty"
                            iconType="controlsHorizontal"
                            size="s"
                            color="text"
                            aria-label={filtersPanelLabel}
                            aria-expanded={isFilterPanelExpanded}
                            onClick={toggleFilterPanel}
                            data-test-subj="streamsIngestHubFlowCanvasFiltersToggle"
                          />
                        </EuiToolTip>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiPanel>
                  <EuiPanel
                    paddingSize="none"
                    hasBorder={false}
                    hasShadow={false}
                    color="plain"
                    grow={false}
                    css={canvasControlToolbarStackCss}
                  >
                    <EuiFlexGroup
                      direction="column"
                      gutterSize="none"
                      alignItems="stretch"
                      responsive={false}
                    >
                      <EuiFlexItem grow={false} css={canvasControlToolbarRowCss}>
                        <EuiButtonIcon
                          display="empty"
                          iconType="plus"
                          size="s"
                          color="text"
                          aria-label={zoomInLabel}
                          onClick={() => zoomIn({ duration: FIT_VIEW_DURATION_MS })}
                          data-test-subj="streamsIngestHubFlowCanvasZoomIn"
                        />
                      </EuiFlexItem>
                      <EuiFlexItem grow={false} css={canvasControlToolbarRowCss}>
                        <EuiButtonIcon
                          display="empty"
                          iconType="minus"
                          size="s"
                          color="text"
                          aria-label={zoomOutLabel}
                          onClick={() => zoomOut({ duration: FIT_VIEW_DURATION_MS })}
                          data-test-subj="streamsIngestHubFlowCanvasZoomOut"
                        />
                      </EuiFlexItem>
                      <EuiFlexItem grow={false} css={canvasControlToolbarRowCss}>
                        <EuiButtonIcon
                          display="empty"
                          iconType="expand"
                          size="s"
                          color="text"
                          aria-label={zoomToFitLabel}
                          onClick={() => {
                            fitLayoutToViewportWidth(FIT_VIEW_DURATION_MS);
                          }}
                          data-test-subj="streamsIngestHubFlowCanvasFitToView"
                        />
                      </EuiFlexItem>
                      <EuiFlexItem grow={false} css={canvasControlToolbarRowCss}>
                        {onToggleFullscreen ? (
                          <EuiButtonIcon
                            display="empty"
                            iconType={isFullscreen ? 'fullScreenExit' : 'fullScreen'}
                            size="s"
                            color="text"
                            aria-label={fullscreenButtonLabel}
                            onClick={onToggleFullscreen}
                            data-test-subj="streamsIngestHubFlowCanvasFullscreen"
                          />
                        ) : (
                          <EuiToolTip
                            content={fullscreenUnavailableLabel}
                            position="right"
                            disableScreenReaderOutput
                          >
                            <EuiButtonIcon
                              display="empty"
                              iconType="fullScreen"
                              size="s"
                              color="text"
                              isDisabled
                              aria-label={fullscreenUnavailableLabel}
                              data-test-subj="streamsIngestHubFlowCanvasFullscreen"
                            />
                          </EuiToolTip>
                        )}
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiPanel>
                  {onOpenCanvasSettings ? (
                    <EuiPanel
                      paddingSize="none"
                      hasBorder={false}
                      hasShadow={false}
                      color="plain"
                      grow={false}
                      css={canvasControlToolbarStackCss}
                    >
                      <EuiFlexGroup
                        direction="column"
                        gutterSize="none"
                        alignItems="stretch"
                        responsive={false}
                      >
                        <EuiFlexItem grow={false} css={canvasControlToolbarRowCss}>
                          <EuiButtonIcon
                            display="empty"
                            iconType="gear"
                            size="s"
                            color="text"
                            aria-label={canvasSettingsLabel}
                            onClick={onOpenCanvasSettings}
                            data-test-subj="streamsIngestHubFlowCanvasSettings"
                          />
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </EuiPanel>
                  ) : null}
                </EuiFlexGroup>
              </EuiFlexItem>
              {isFilterPanelExpanded ? (
                <EuiFlexItem grow={false}>
                  <EuiPanel
                    paddingSize="s"
                    hasBorder
                    color="plain"
                    grow={false}
                    aria-label={filtersPanelLabel}
                    css={css`
                      width: 280px;
                      max-width: 280px;
                    `}
                  >
                    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
                      <EuiFlexItem grow>
                        <EuiFieldSearch
                          compressed
                          value={findQuery}
                          onChange={(e) => setFindQuery(e.target.value)}
                          placeholder={i18n.translate(
                            'xpack.streams.ingestHubFlowCanvas.findPlaceholderWithShortcut',
                            {
                              defaultMessage: 'Find in page ({shortcut})',
                              values: { shortcut: findInPageShortcutLabel },
                            }
                          )}
                          fullWidth
                          isClearable
                          aria-label={i18n.translate(
                            'xpack.streams.ingestHubFlowCanvas.findInPage',
                            {
                              defaultMessage: 'Find in page',
                            }
                          )}
                        />
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiText size="s" color="subdued" css={css({ whiteSpace: 'nowrap' })}>
                          {findCounterText}
                        </EuiText>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiFlexGroup gutterSize="none" responsive={false}>
                          <EuiButtonIcon
                            display="empty"
                            iconType="arrowUp"
                            size="xs"
                            aria-label={findPrevLabel}
                            isDisabled={findSearchTotal < 2}
                            onClick={() => bumpFindMatch(-1)}
                          />
                          <EuiButtonIcon
                            display="empty"
                            iconType="arrowDown"
                            size="xs"
                            aria-label={findNextLabel}
                            isDisabled={findSearchTotal < 2}
                            onClick={() => bumpFindMatch(1)}
                          />
                        </EuiFlexGroup>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                    <EuiSpacer size="s" />
                    <EuiTitle size="xxxs">
                      <span>
                        {i18n.translate('xpack.streams.ingestHubFlowCanvas.filtersSectionTitle', {
                          defaultMessage: 'Filters',
                        })}
                      </span>
                    </EuiTitle>
                    <EuiSpacer size="xs" />
                    <EuiFormRow
                      label={i18n.translate('xpack.streams.ingestHubFlowCanvas.connections', {
                        defaultMessage: 'Connections',
                      })}
                      fullWidth
                    >
                      <EuiSelect compressed options={[placeholderOption]} value="" disabled />
                    </EuiFormRow>
                    <EuiSpacer size="xs" />
                    <EuiFormRow
                      label={i18n.translate('xpack.streams.ingestHubFlowCanvas.alertStatus', {
                        defaultMessage: 'Alert status',
                      })}
                      fullWidth
                    >
                      <EuiSelect compressed options={[placeholderOption]} value="" disabled />
                    </EuiFormRow>
                    <EuiSpacer size="xs" />
                    <EuiFormRow
                      label={i18n.translate('xpack.streams.ingestHubFlowCanvas.sloStatus', {
                        defaultMessage: 'SLO status',
                      })}
                      fullWidth
                    >
                      <EuiSelect compressed options={[placeholderOption]} value="" disabled />
                    </EuiFormRow>
                    <EuiSpacer size="xs" />
                    <EuiFormRow
                      label={i18n.translate('xpack.streams.ingestHubFlowCanvas.anomalySeverity', {
                        defaultMessage: 'Anomaly severity',
                      })}
                      fullWidth
                    >
                      <EuiSelect compressed options={[placeholderOption]} value="" disabled />
                    </EuiFormRow>
                    <EuiSpacer size="s" />
                    <EuiTitle size="xxxs">
                      <span>
                        {i18n.translate(
                          'xpack.streams.ingestHubFlowCanvas.presentationSectionTitle',
                          {
                            defaultMessage: 'Presentation',
                          }
                        )}
                      </span>
                    </EuiTitle>
                    <EuiSpacer size="xs" />
                    <EuiButtonGroup
                      legend={i18n.translate(
                        'xpack.streams.ingestHubFlowCanvas.presentationLegend',
                        {
                          defaultMessage: 'Graph presentation',
                        }
                      )}
                      buttonSize="compressed"
                      isFullWidth
                      options={[
                        {
                          id: 'horizontal',
                          label: i18n.translate(
                            'xpack.streams.ingestHubFlowCanvas.presentationHorizontal',
                            {
                              defaultMessage: 'Horizontal',
                            }
                          ),
                          iconType: 'arrowRight',
                        },
                        {
                          id: 'vertical',
                          label: i18n.translate(
                            'xpack.streams.ingestHubFlowCanvas.presentationVertical',
                            {
                              defaultMessage: 'Vertical',
                            }
                          ),
                          iconType: 'arrowDown',
                        },
                      ]}
                      idSelected={presentation}
                      onChange={(id) => setPresentation(id as 'horizontal' | 'vertical')}
                    />
                  </EuiPanel>
                </EuiFlexItem>
              ) : null}
            </EuiFlexGroup>
          </Panel>
          <MiniMap
            position="bottom-left"
            pannable
            zoomable
            nodeStrokeWidth={2}
            nodeColor={() => euiTheme.colors.primary}
            nodeStrokeColor={() => euiTheme.colors.primary}
            maskColor="rgba(15, 20, 30, 0.12)"
            maskStrokeWidth={0}
            style={minimapStyle}
          />
        </ReactFlow>
        {cardSelection ? (
          <IngestHubDemoStreamsFlowCardDetailFlyout
            selection={cardSelection}
            topology={topology}
            flyoutTitleId={cardFlyoutTitleId}
            onClose={closeCardFlyout}
            onStreamNavigate={onStreamNavigate}
          />
        ) : null}
      </StreamsPipelineWorldContext.Provider>
    </div>
  );
});

export const IngestHubDemoStreamsFlowPipelineCanvas = forwardRef<
  IngestHubDemoStreamsFlowPipelineCanvasRef,
  IngestHubDemoStreamsFlowPipelineCanvasProps
>(function IngestHubDemoStreamsFlowPipelineCanvas(props, ref) {
  return (
    <ReactFlowProvider>
      <IngestHubDemoStreamsFlowPipelineCanvasInner {...props} ref={ref} />
    </ReactFlowProvider>
  );
});
