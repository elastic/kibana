/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CSSProperties } from 'react';
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
import { EuiLink, useEuiTheme } from '@elastic/eui';
import { css, keyframes } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import type { AwsMockStreamRow } from './ingest_hub_demo_streams_model';
import {
  buildIngestHubDemoStreamsFlowLayout,
  INGEST_HUB_DEMO_STREAMS_FLOW_CARD_WIDTH_PX,
  INGEST_HUB_DEMO_STREAMS_FLOW_MIN_LAYOUT_WIDTH_PX,
} from './ingest_hub_demo_streams_flow_graph_model';
import { FLOW_CONNECTOR_DOT_DASH } from './ingest_hub_demo_streams_flow_connector_paths';
import {
  computeFlowHighlightForHoveredEdge,
  mergeWaypointPolylineForHoveredEdge,
  polylineToSmoothPathD,
} from './ingest_hub_demo_streams_flow_graph_highlight';
import { inferFlowCanvasDataProduct } from './ingest_hub_demo_streams_flow_card_badge_row';
import { IngestHubDemoStreamsFlowDestinationCard } from './ingest_hub_demo_streams_flow_destination_card';
import { IngestHubDemoStreamsFlowSourceCard } from './ingest_hub_demo_streams_flow_source_card';
import {
  IngestHubDemoStreamsFlowPipelineCanvasMinimap,
  type FlowPipelineCamera,
} from './ingest_hub_demo_streams_flow_pipeline_canvas_minimap';

const STREAM_NODE_IDS = ['dest_top', 'dest_mid', 'dest_errors', 'dest_s3'] as const;

const LAYOUT_MIN_SCALE = 0.08;
const LAYOUT_MAX_SCALE = 2.5;

/** Ctrl/meta + wheel: exp(-deltaPx × sensitivity). ~0.007 ≈ mid between gentle trackpad and old fixed 1.1× steps. */
const WHEEL_ZOOM_SENSITIVITY = 0.0072;
/** Max |Δy| in “pixel” space per event before exp() (dampens huge mouse-wheel lines). */
const WHEEL_DELTA_Y_PIXEL_CAP = 100;
/** Per-frame lerp toward target (higher ≈ closer to old instant zoom; <1 keeps a little ease). */
const WHEEL_ZOOM_SMOOTHING = 0.68;
/** Stop smoothing when this close to the target zoom. */
const WHEEL_ZOOM_STOP_EPS = 0.0002;

function normalizeWheelDeltaYPixels(e: WheelEvent): number {
  let delta = e.deltaY;
  if (e.deltaMode === WheelEvent.DOM_DELTA_LINE) {
    delta *= 18;
  } else if (e.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
    delta *= 640;
  }
  if (delta === 0) {
    return 0;
  }
  return Math.max(-WHEEL_DELTA_Y_PIXEL_CAP, Math.min(WHEEL_DELTA_Y_PIXEL_CAP, delta));
}

const CONNECTOR_STROKE_WIDTH = 2.25;

/** Dash repeat length for marching-ant animation (`stroke-dashoffset` steps this much). */
const CONNECTOR_DASH_OFFSET_PERIOD = 10;

/** Corner radius for smooth elbows (idle + merged trace — same geometry as hover). */
const CONNECTOR_FLOW_CORNER_RADIUS = 18;

/** Covers stacked round-cap dots where the fan trunk meets the three legs (matches ingest canvas). */
const FAN_HUB_JOINT_MASK_RADIUS = 5.5;

const connectorDashFlowKeyframes = keyframes`
  to {
    stroke-dashoffset: ${-CONNECTOR_DASH_OFFSET_PERIOD};
  }
`;

const connectorPathHoveredClassName = css`
  animation: ${connectorDashFlowKeyframes} 0.85s linear infinite;
`;

const DEFAULT_STREAM_TITLES: Record<(typeof STREAM_NODE_IDS)[number], string> = {
  dest_top: 'metrics-aws.cloudwatch',
  dest_mid: 'metrics-aws.cloudwatch.ec2',
  dest_errors: 'metrics-aws.cloudwatch.ec2.errors',
  dest_s3: 'S3 Bucket',
};

/** Fan legs into the right-hand destination column (hovering one isolates that flow). */
const TERMINAL_DESTINATION_NODE_IDS = new Set(['dest_mid', 'dest_errors', 'dest_s3']);

export interface IngestHubDemoStreamsFlowPipelineCanvasProps {
  readonly visibleRoot: AwsMockStreamRow | undefined;
  readonly visibleLeaves: readonly AwsMockStreamRow[];
  readonly buildStreamHref: (streamName: string) => string;
  readonly onStreamNavigate: (streamName: string) => void;
  readonly onCameraZoomChange?: (zoom: number) => void;
}

export type IngestHubDemoStreamsFlowPipelineCanvasZoomPreset = 50 | 100 | 200;

export interface IngestHubDemoStreamsFlowPipelineCanvasRef {
  zoomIn: () => void;
  zoomOut: () => void;
  zoomToFit: () => void;
  zoomToPreset: (preset: IngestHubDemoStreamsFlowPipelineCanvasZoomPreset) => void;
}

export const IngestHubDemoStreamsFlowPipelineCanvas = forwardRef<
  IngestHubDemoStreamsFlowPipelineCanvasRef,
  IngestHubDemoStreamsFlowPipelineCanvasProps
>(function IngestHubDemoStreamsFlowPipelineCanvas(
  { visibleRoot, visibleLeaves, buildStreamHref, onStreamNavigate, onCameraZoomChange },
  ref
) {
  const { euiTheme } = useEuiTheme();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hoverClearTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [viewport, setViewport] = useState({ contentWidth: 852, contentHeight: 420 });
  const viewportRef = useRef(viewport);
  viewportRef.current = viewport;
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  const [camera, setCamera] = useState<FlowPipelineCamera>({ x: 0, y: 0, zoom: 1 });
  const cameraRef = useRef(camera);
  cameraRef.current = camera;
  const spaceHeldRef = useRef(false);
  const panDragRef = useRef({
    active: false,
    startClientX: 0,
    startClientY: 0,
    startCamX: 0,
    startCamY: 0,
    pointerId: 0,
  });
  const wheelZoomAnchorRef = useRef<{
    sx: number;
    sy: number;
    worldX: number;
    worldY: number;
  } | null>(null);
  const wheelZoomTargetRef = useRef(1);
  const wheelZoomRafRef = useRef<number | null>(null);
  const [pointerInViewport, setPointerInViewport] = useState(false);
  const [spacePressed, setSpacePressed] = useState(false);

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

  useEffect(() => {
    const el = containerRef.current;
    if (!el) {
      return;
    }
    const measure = () => {
      setViewport({
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

  useEffect(() => () => cancelHoverClear(), [cancelHoverClear]);

  const layoutContentWidth = useMemo(
    () => Math.max(INGEST_HUB_DEMO_STREAMS_FLOW_MIN_LAYOUT_WIDTH_PX, viewport.contentWidth),
    [viewport.contentWidth]
  );

  const flowLayout = useMemo(
    () => buildIngestHubDemoStreamsFlowLayout(layoutContentWidth),
    [layoutContentWidth]
  );
  const flowLayoutRef = useRef(flowLayout);
  flowLayoutRef.current = flowLayout;

  const fitCameraToViewport = useCallback(
    (
      layout: { layoutWidth: number; layoutHeight: number },
      vp: { contentWidth: number; contentHeight: number }
    ): FlowPipelineCamera => {
      const lw = layout.layoutWidth;
      const lh = layout.layoutHeight;
      const cw = vp.contentWidth;
      const ch = vp.contentHeight;
      const fit = Math.min(cw / lw, ch / lh) * 0.92;
      const zoom = Math.min(LAYOUT_MAX_SCALE, Math.max(LAYOUT_MIN_SCALE, fit));
      return { x: (cw - lw * zoom) / 2, y: (ch - lh * zoom) / 2, zoom };
    },
    []
  );

  /* eslint-disable react-hooks/exhaustive-deps -- refit when layout/viewport dimensions change; omit flowLayout/viewport object identity */
  useLayoutEffect(() => {
    setCamera(fitCameraToViewport(flowLayout, viewport));
    return () => {
      if (wheelZoomRafRef.current !== null) {
        window.cancelAnimationFrame(wheelZoomRafRef.current);
        wheelZoomRafRef.current = null;
      }
      wheelZoomAnchorRef.current = null;
    };
  }, [
    fitCameraToViewport,
    flowLayout.layoutHeight,
    flowLayout.layoutWidth,
    viewport.contentHeight,
    viewport.contentWidth,
  ]);
  /* eslint-enable react-hooks/exhaustive-deps */

  const applyZoomTowardViewportCenter = useCallback((nextZoom: number) => {
    const vp = viewportRef.current;
    const c = cameraRef.current;
    const cx = vp.contentWidth / 2;
    const cy = vp.contentHeight / 2;
    const worldX = (cx - c.x) / c.zoom;
    const worldY = (cy - c.y) / c.zoom;
    const zoom = Math.min(LAYOUT_MAX_SCALE, Math.max(LAYOUT_MIN_SCALE, nextZoom));
    setCamera({ zoom, x: cx - worldX * zoom, y: cy - worldY * zoom });
  }, []);

  const applyZoomRelative = useCallback(
    (factor: number) => {
      applyZoomTowardViewportCenter(cameraRef.current.zoom * factor);
    },
    [applyZoomTowardViewportCenter]
  );

  const applyZoomToFit = useCallback(() => {
    setCamera(fitCameraToViewport(flowLayoutRef.current, viewportRef.current));
  }, [fitCameraToViewport]);

  useImperativeHandle(
    ref,
    () => ({
      zoomIn: () => applyZoomRelative(1.15),
      zoomOut: () => applyZoomRelative(1 / 1.15),
      zoomToFit: () => applyZoomToFit(),
      zoomToPreset: (preset) => {
        const targetZoom = preset === 50 ? 0.5 : preset === 100 ? 1 : 2;
        applyZoomTowardViewportCenter(targetZoom);
      },
    }),
    [applyZoomRelative, applyZoomToFit, applyZoomTowardViewportCenter]
  );

  useEffect(() => {
    onCameraZoomChange?.(camera.zoom);
  }, [camera.zoom, onCameraZoomChange]);

  const [canvasShortcutsActive, setCanvasShortcutsActive] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) {
      return;
    }
    const onFocusIn = () => {
      setCanvasShortcutsActive(true);
    };
    const onFocusOut = (e: FocusEvent) => {
      if (!el.contains(e.relatedTarget as Node | null)) {
        setCanvasShortcutsActive(false);
      }
    };
    el.addEventListener('focusin', onFocusIn);
    el.addEventListener('focusout', onFocusOut);
    return () => {
      el.removeEventListener('focusin', onFocusIn);
      el.removeEventListener('focusout', onFocusOut);
    };
  }, []);

  useEffect(() => {
    if (!pointerInViewport && !canvasShortcutsActive) {
      return;
    }
    const onKeyDown = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) {
        return;
      }
      const mod = e.metaKey || e.ctrlKey;
      if (mod && (e.key === '=' || e.key === '+' || e.code === 'NumpadAdd')) {
        e.preventDefault();
        applyZoomRelative(1.15);
        return;
      }
      if (mod && (e.key === '-' || e.key === '_' || e.code === 'NumpadSubtract')) {
        e.preventDefault();
        applyZoomRelative(1 / 1.15);
        return;
      }
      if (mod && e.key === '0') {
        e.preventDefault();
        applyZoomTowardViewportCenter(1);
        return;
      }
      if (e.shiftKey && !mod && e.code === 'Digit1') {
        e.preventDefault();
        applyZoomToFit();
      }
    };
    window.addEventListener('keydown', onKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', onKeyDown, { capture: true });
  }, [
    pointerInViewport,
    canvasShortcutsActive,
    applyZoomRelative,
    applyZoomTowardViewportCenter,
    applyZoomToFit,
  ]);

  const viewportShellCss = useMemo(
    () => css`
      flex: 1;
      min-height: 0;
      width: 100%;
      position: relative;
      overflow: hidden;
    `,
    []
  );

  const viewportCenterCss = useMemo(
    () => css`
      position: absolute;
      inset: 0;
      overflow: hidden;
      box-sizing: border-box;
    `,
    []
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) {
      return;
    }
    const runWheelZoomFrame = () => {
      wheelZoomRafRef.current = null;
      const anchor = wheelZoomAnchorRef.current;
      if (!anchor) {
        return;
      }
      const c = cameraRef.current;
      const target = wheelZoomTargetRef.current;
      const nextZ = c.zoom + (target - c.zoom) * WHEEL_ZOOM_SMOOTHING;
      const done = Math.abs(target - nextZ) <= WHEEL_ZOOM_STOP_EPS;
      const z = done ? target : nextZ;
      setCamera({
        zoom: z,
        x: anchor.sx - anchor.worldX * z,
        y: anchor.sy - anchor.worldY * z,
      });
      if (!done) {
        wheelZoomRafRef.current = window.requestAnimationFrame(runWheelZoomFrame);
      }
    };

    const scheduleWheelZoomFrame = () => {
      if (wheelZoomRafRef.current === null) {
        wheelZoomRafRef.current = window.requestAnimationFrame(runWheelZoomFrame);
      }
    };

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const rect = el.getBoundingClientRect();
        const sx = e.clientX - rect.left;
        const sy = e.clientY - rect.top;
        const c = cameraRef.current;
        const worldX = (sx - c.x) / c.zoom;
        const worldY = (sy - c.y) / c.zoom;
        const deltaPx = normalizeWheelDeltaYPixels(e);
        if (deltaPx === 0) {
          return;
        }
        const mult = Math.exp(-deltaPx * WHEEL_ZOOM_SENSITIVITY);
        wheelZoomAnchorRef.current = { sx, sy, worldX, worldY };
        wheelZoomTargetRef.current = Math.min(
          LAYOUT_MAX_SCALE,
          Math.max(LAYOUT_MIN_SCALE, c.zoom * mult)
        );
        scheduleWheelZoomFrame();
        return;
      }
      e.preventDefault();
      const c = cameraRef.current;
      setCamera({ ...c, x: c.x - e.deltaX, y: c.y - e.deltaY });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheel);
      if (wheelZoomRafRef.current !== null) {
        window.cancelAnimationFrame(wheelZoomRafRef.current);
        wheelZoomRafRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || !pointerInViewport) {
        return;
      }
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) {
        return;
      }
      e.preventDefault();
      if (!e.repeat) {
        spaceHeldRef.current = true;
        setSpacePressed(true);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        spaceHeldRef.current = false;
        setSpacePressed(false);
      }
    };
    window.addEventListener('keydown', onKeyDown, { capture: true });
    window.addEventListener('keyup', onKeyUp, { capture: true });
    return () => {
      window.removeEventListener('keydown', onKeyDown, { capture: true });
      window.removeEventListener('keyup', onKeyUp, { capture: true });
    };
  }, [pointerInViewport]);

  const onViewportPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-test-subj="streamsIngestHubFlowPipelineMinimap"]')) {
      return;
    }
    if (e.button !== 0 && e.button !== 1) {
      return;
    }
    if (e.button === 0 && !spaceHeldRef.current) {
      return;
    }
    e.preventDefault();
    panDragRef.current = {
      active: true,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startCamX: cameraRef.current.x,
      startCamY: cameraRef.current.y,
      pointerId: e.pointerId,
    };
    containerRef.current?.setPointerCapture(e.pointerId);
  }, []);

  const onViewportPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!panDragRef.current.active || e.pointerId !== panDragRef.current.pointerId) {
      return;
    }
    const dx = e.clientX - panDragRef.current.startClientX;
    const dy = e.clientY - panDragRef.current.startClientY;
    setCamera({
      ...cameraRef.current,
      x: panDragRef.current.startCamX + dx,
      y: panDragRef.current.startCamY + dy,
    });
  }, []);

  const onViewportPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!panDragRef.current.active || e.pointerId !== panDragRef.current.pointerId) {
      return;
    }
    panDragRef.current.active = false;
    try {
      containerRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  }, []);

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

  const leafByStreamNodeId = useMemo(() => {
    const map = new Map<string, AwsMockStreamRow>();
    STREAM_NODE_IDS.forEach((id, i) => {
      const row = visibleLeaves[i];
      if (row) {
        map.set(id, row);
      }
    });
    return map;
  }, [visibleLeaves]);

  const hoveredEdge = useMemo(
    () => (hoveredEdgeId ? flowLayout.edges.find((e) => e.id === hoveredEdgeId) : undefined),
    [flowLayout.edges, hoveredEdgeId]
  );

  const terminalFanHoverActive = useMemo(
    () => Boolean(highlight && hoveredEdge && TERMINAL_DESTINATION_NODE_IDS.has(hoveredEdge.to)),
    [highlight, hoveredEdge]
  );

  /** Fan elbow (trunk → legs); small mask clears stacked default strokes at the only multi-edge join. */
  const fanHubJointCenter = useMemo(() => {
    const trunk = flowLayout.edges.find((e) => e.id === 'e_dest_top_fan_hub');
    if (!trunk || trunk.polyline.length < 1) {
      return null;
    }
    const p = trunk.polyline[trunk.polyline.length - 1];
    return { x: p.x, y: p.y };
  }, [flowLayout.edges]);

  const sourceTitle = i18n.translate('xpack.streams.ingestHubFlowCanvas.sourceTitle', {
    defaultMessage: 'AWS CloudWatch',
  });
  const sourceMetrics = i18n.translate('xpack.streams.ingestHubFlowCanvas.sourceMetrics', {
    defaultMessage: '11.9k eps · 180ms',
  });

  const canvasAriaLabel = useMemo(
    () =>
      i18n.translate('xpack.streams.ingestHubFlowCanvas.canvasNavAria', {
        defaultMessage:
          'Streams flow canvas. Scroll or swipe to pan. Hold Control or Command and scroll to zoom. Hold Space and drag, or middle-click and drag, to pan.',
      }),
    []
  );

  const onMouseEnterViewport = useCallback(() => {
    setPointerInViewport(true);
  }, []);

  const onMouseLeaveViewport = useCallback(() => {
    setPointerInViewport(false);
    spaceHeldRef.current = false;
    setSpacePressed(false);
    clearEdgeHover();
  }, [clearEdgeHover]);

  return (
    <div className={viewportShellCss}>
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- custom pan/zoom (Sketch-like) */}
      <div
        ref={containerRef}
        role="application"
        tabIndex={0}
        aria-label={canvasAriaLabel}
        onMouseEnter={onMouseEnterViewport}
        onMouseLeave={onMouseLeaveViewport}
        onPointerDown={onViewportPointerDown}
        onPointerMove={onViewportPointerMove}
        onPointerUp={onViewportPointerUp}
        onPointerCancel={onViewportPointerUp}
        data-test-subj="streamsIngestHubFlowPipelineCanvas"
        className={viewportCenterCss}
        style={{
          outline: 'none',
          cursor: spacePressed ? 'grab' : undefined,
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})`,
            transformOrigin: '0 0',
            width: flowLayout.layoutWidth,
            height: flowLayout.layoutHeight,
          }}
        >
          <svg
            width={flowLayout.layoutWidth}
            height={flowLayout.layoutHeight}
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 1,
              pointerEvents: 'none',
            }}
            aria-hidden
          >
            {flowLayout.edges.map((edge) => {
              const inFlow = !highlight || highlight.edgeIds.has(edge.id);
              if (highlight && highlight.edgeIds.has(edge.id) && !highlight.multicastBranch) {
                return null;
              }
              const hideOutsideFlow = Boolean(terminalFanHoverActive && highlight && !inFlow);
              if (hideOutsideFlow) {
                return null;
              }
              const dimOutsideFlow = Boolean(highlight && !inFlow && !terminalFanHoverActive);
              const d = polylineToSmoothPathD(edge.polyline, CONNECTOR_FLOW_CORNER_RADIUS);
              if (!d) {
                return null;
              }
              const opacity = dimOutsideFlow ? 0.42 : 1;
              const multicastActive = Boolean(
                highlight?.multicastBranch && highlight.edgeIds.has(edge.id)
              );
              const stroke = multicastActive
                ? euiTheme.colors.borderStrongPrimary
                : euiTheme.colors.borderInteractiveFormsHoverProminent;
              const dashAnimClass = multicastActive ? connectorPathHoveredClassName : undefined;
              return (
                <path
                  key={`vis-${edge.id}`}
                  d={d}
                  fill="none"
                  stroke={stroke}
                  strokeWidth={CONNECTOR_STROKE_WIDTH}
                  strokeDasharray={FLOW_CONNECTOR_DOT_DASH}
                  strokeDashoffset={0}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="nonScalingStroke"
                  className={dashAnimClass}
                  opacity={opacity}
                  style={{
                    transition: 'stroke 120ms ease, opacity 120ms ease, stroke-width 120ms ease',
                  }}
                />
              );
            })}
            {fanHubJointCenter && !highlight?.multicastBranch ? (
              <circle
                key="fan-hub-joint-mask"
                cx={fanHubJointCenter.x}
                cy={fanHubJointCenter.y}
                r={FAN_HUB_JOINT_MASK_RADIUS}
                fill={euiTheme.colors.backgroundBaseSubdued}
              />
            ) : null}
            {highlight && mergedTracePathD ? (
              <path
                key="vis-merged-flow-trace"
                d={mergedTracePathD}
                fill="none"
                stroke={euiTheme.colors.borderStrongPrimary}
                strokeWidth={CONNECTOR_STROKE_WIDTH}
                strokeDasharray={FLOW_CONNECTOR_DOT_DASH}
                strokeDashoffset={0}
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="nonScalingStroke"
                className={connectorPathHoveredClassName}
              />
            ) : null}
          </svg>

          <svg
            width={flowLayout.layoutWidth}
            height={flowLayout.layoutHeight}
            style={{ position: 'absolute', inset: 0, zIndex: 2 }}
            aria-hidden
          >
            {flowLayout.edges.map((edge) => {
              const inFlow = !highlight || highlight.edgeIds.has(edge.id);
              const hideOutsideFlow = Boolean(terminalFanHoverActive && highlight && !inFlow);
              const dim = Boolean(highlight && !inFlow && !terminalFanHoverActive);
              return (
                <path
                  key={`hit-${edge.id}`}
                  d={polylineToSmoothPathD(edge.polyline, CONNECTOR_FLOW_CORNER_RADIUS)}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={28}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="nonScalingStroke"
                  style={{
                    pointerEvents: hideOutsideFlow ? 'none' : 'stroke',
                    cursor: 'default',
                    opacity: hideOutsideFlow ? 0 : dim ? 0.45 : 1,
                  }}
                  onMouseEnter={() => onEdgeHitEnter(edge.id)}
                  onMouseLeave={scheduleHoverClear}
                />
              );
            })}
          </svg>

          {flowLayout.nodes
            .filter((node) => node.kind !== 'branch')
            .map((node) => {
              const dimmed = nodeDimmed(node.id);
              const style: CSSProperties = {
                position: 'absolute',
                left: node.x,
                top: node.y,
                width: INGEST_HUB_DEMO_STREAMS_FLOW_CARD_WIDTH_PX,
                height: 'max-content',
                zIndex: 7,
                pointerEvents: 'auto',
                boxSizing: 'border-box',
              };

              if (node.kind === 'source') {
                const sourceDataProduct = inferFlowCanvasDataProduct(
                  visibleRoot?.name ?? 'logs-aws.cloudwatch_logs-default'
                );
                return (
                  <div key={node.id} style={style} onMouseEnter={clearHoverOnCardEnter}>
                    <IngestHubDemoStreamsFlowSourceCard
                      title={sourceTitle}
                      metricsLine={sourceMetrics}
                      quality={visibleRoot?.quality}
                      dataProduct={sourceDataProduct}
                      dimmed={dimmed}
                    />
                  </div>
                );
              }

              const streamKey = node.id as (typeof STREAM_NODE_IDS)[number];
              const row = leafByStreamNodeId.get(node.id);
              const defaultTitle = DEFAULT_STREAM_TITLES[streamKey] ?? node.id;
              const titleNode = row ? (
                <EuiLink
                  href={buildStreamHref(row.name)}
                  data-test-subj={`streamsFlowCanvasStreamLink-${row.name}`}
                  onClick={(e: React.MouseEvent) => {
                    e.preventDefault();
                    onStreamNavigate(row.name);
                  }}
                >
                  {row.name}
                </EuiLink>
              ) : (
                <strong>{defaultTitle}</strong>
              );
              const dataProduct = inferFlowCanvasDataProduct(row?.name ?? defaultTitle);
              const metricsLine = row
                ? i18n.translate('xpack.streams.ingestHubFlowCanvas.streamMetricsFromRow', {
                    defaultMessage: '30d · {eps} eps · 180ms',
                    values: { eps: formatCompactEps(row.docCount) },
                  })
                : i18n.translate('xpack.streams.ingestHubFlowCanvas.streamMetricsDemo', {
                    defaultMessage: '30d · 3k eps · 180ms',
                  });
              const quality = row?.quality;

              return (
                <div key={node.id} style={style} onMouseEnter={clearHoverOnCardEnter}>
                  <IngestHubDemoStreamsFlowDestinationCard
                    title={titleNode}
                    titleTooltip={row?.name ?? defaultTitle}
                    metricsLine={metricsLine}
                    quality={streamKey === 'dest_s3' ? undefined : quality}
                    dataProduct={dataProduct}
                    trailingAction={undefined}
                    dimmed={dimmed}
                  />
                </div>
              );
            })}
        </div>
        <IngestHubDemoStreamsFlowPipelineCanvasMinimap
          worldWidth={flowLayout.layoutWidth}
          worldHeight={flowLayout.layoutHeight}
          viewportWidth={viewport.contentWidth}
          viewportHeight={viewport.contentHeight}
          camera={camera}
          onCameraChange={setCamera}
          nodes={flowLayout.nodes}
          edges={flowLayout.edges}
        />
      </div>
    </div>
  );
});

function formatCompactEps(docCount: number): string {
  if (docCount >= 1_000_000) {
    return `${(docCount / 1_000_000).toFixed(1)}M`;
  }
  if (docCount >= 1_000) {
    return `${Math.round(docCount / 1_000)}k`;
  }
  return String(docCount);
}
