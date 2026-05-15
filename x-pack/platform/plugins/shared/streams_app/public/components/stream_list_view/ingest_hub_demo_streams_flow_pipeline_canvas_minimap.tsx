/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CSSProperties, Dispatch, SetStateAction } from 'react';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type {
  FlowGraphEdgeDef,
  FlowGraphNodeDef,
  FlowGraphPoint,
} from './ingest_hub_demo_streams_flow_graph_model';

const MINIMAP_MAX_WIDTH_PX = 168;
const MINIMAP_PADDING_PX = 10;

export interface FlowPipelineCamera {
  readonly x: number;
  readonly y: number;
  readonly zoom: number;
}

function polylineToMinimapD(
  polyline: ReadonlyArray<FlowGraphPoint>,
  worldWidth: number,
  worldHeight: number,
  minimapWidth: number,
  minimapHeight: number
): string {
  if (polyline.length < 2) {
    return '';
  }
  const parts: string[] = [];
  polyline.forEach((p, i) => {
    const mx = (p.x / worldWidth) * minimapWidth;
    const my = (p.y / worldHeight) * minimapHeight;
    parts.push(i === 0 ? `M ${mx} ${my}` : `L ${mx} ${my}`);
  });
  return parts.join(' ');
}

export interface IngestHubDemoStreamsFlowPipelineCanvasMinimapProps {
  readonly worldWidth: number;
  readonly worldHeight: number;
  readonly viewportWidth: number;
  readonly viewportHeight: number;
  readonly camera: FlowPipelineCamera;
  readonly onCameraChange: Dispatch<SetStateAction<FlowPipelineCamera>>;
  readonly nodes: readonly FlowGraphNodeDef[];
  readonly edges: readonly FlowGraphEdgeDef[];
}

/**
 * Sketch-style canvas minimap (see Sketch docs: overview + viewport, click to jump).
 * Placed bottom-left on the flow pipeline canvas.
 */
export function IngestHubDemoStreamsFlowPipelineCanvasMinimap({
  worldWidth,
  worldHeight,
  viewportWidth,
  viewportHeight,
  camera,
  onCameraChange,
  nodes,
  edges,
}: IngestHubDemoStreamsFlowPipelineCanvasMinimapProps) {
  const { euiTheme } = useEuiTheme();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [draggingViewport, setDraggingViewport] = useState(false);
  const dragRef = useRef({
    startClientX: 0,
    startClientY: 0,
    startCamX: 0,
    startCamY: 0,
    startZoom: 1,
  });

  const aspect = worldHeight / worldWidth;
  const minimapWidth = Math.min(MINIMAP_MAX_WIDTH_PX, Math.max(80, viewportWidth * 0.22));
  const minimapHeight = Math.max(48, minimapWidth * aspect);

  const shellCss = useMemo(
    () => css`
      position: absolute;
      left: ${MINIMAP_PADDING_PX}px;
      bottom: ${MINIMAP_PADDING_PX}px;
      z-index: 30;
      border-radius: ${euiTheme.border.radius.medium};
      border: ${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBasePlain};
      background: ${euiTheme.colors.emptyShade};
      box-shadow: ${euiTheme.shadows.m};
      overflow: hidden;
      user-select: none;
    `,
    [euiTheme]
  );

  const zoom = camera.zoom > 1e-6 ? camera.zoom : 1;
  const viewWorldLeft = -camera.x / zoom;
  const viewWorldTop = -camera.y / zoom;
  const viewWorldW = viewportWidth / zoom;
  const viewWorldH = viewportHeight / zoom;

  const vx = (viewWorldLeft / worldWidth) * minimapWidth;
  const vy = (viewWorldTop / worldHeight) * minimapHeight;
  const vw = (viewWorldW / worldWidth) * minimapWidth;
  const vh = (viewWorldH / worldHeight) * minimapHeight;

  const minimapLabel = useMemo(
    () =>
      i18n.translate('xpack.streams.ingestHubFlowCanvas.minimapAria', {
        defaultMessage: 'Canvas minimap — click to jump, drag highlighted area to pan',
      }),
    []
  );

  const jumpToClient = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current;
      if (!svg) {
        return;
      }
      const rect = svg.getBoundingClientRect();
      const nx = (clientX - rect.left) / rect.width;
      const ny = (clientY - rect.top) / rect.height;
      const wx = nx * worldWidth;
      const wy = ny * worldHeight;
      onCameraChange((c) => ({
        ...c,
        x: viewportWidth / 2 - wx * c.zoom,
        y: viewportHeight / 2 - wy * c.zoom,
      }));
    },
    [onCameraChange, viewportHeight, viewportWidth, worldHeight, worldWidth]
  );

  const onSvgClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (draggingViewport) {
        return;
      }
      jumpToClient(e.clientX, e.clientY);
    },
    [draggingViewport, jumpToClient]
  );

  const onViewportPointerDown = useCallback(
    (e: React.PointerEvent<SVGRectElement>) => {
      e.stopPropagation();
      e.preventDefault();
      dragRef.current = {
        startClientX: e.clientX,
        startClientY: e.clientY,
        startCamX: camera.x,
        startCamY: camera.y,
        startZoom: camera.zoom,
      };
      setDraggingViewport(true);
      (e.target as SVGRectElement).setPointerCapture(e.pointerId);
    },
    [camera.x, camera.y, camera.zoom]
  );

  const onViewportPointerMove = useCallback(
    (e: React.PointerEvent<SVGRectElement>) => {
      if (!draggingViewport) {
        return;
      }
      const svg = svgRef.current;
      const rect = svg?.getBoundingClientRect();
      const rw = rect?.width ?? minimapWidth;
      const rh = rect?.height ?? minimapHeight;
      const dx = e.clientX - dragRef.current.startClientX;
      const dy = e.clientY - dragRef.current.startClientY;
      const z = dragRef.current.startZoom;
      onCameraChange({
        x: dragRef.current.startCamX - (dx / rw) * worldWidth * z,
        y: dragRef.current.startCamY - (dy / rh) * worldHeight * z,
        zoom: z,
      });
    },
    [draggingViewport, minimapHeight, minimapWidth, onCameraChange, worldHeight, worldWidth]
  );

  const onViewportPointerUp = useCallback((e: React.PointerEvent<SVGRectElement>) => {
    setDraggingViewport(false);
    try {
      (e.target as SVGRectElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  }, []);

  const shellStyle: CSSProperties = {
    width: minimapWidth,
    height: minimapHeight,
  };

  const edgeStroke = euiTheme.colors.textSubdued;
  const nodeFill = euiTheme.colors.textParagraph;
  const nodeStroke = euiTheme.colors.borderBasePlain;

  return (
    <div
      css={shellCss}
      style={shellStyle}
      data-test-subj="streamsIngestHubFlowPipelineMinimap"
      aria-label={minimapLabel}
      role="img"
    >
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={`0 0 ${minimapWidth} ${minimapHeight}`}
        onClick={onSvgClick}
        style={{ display: 'block', cursor: draggingViewport ? 'grabbing' : 'default' }}
      >
        <rect
          x={0}
          y={0}
          width={minimapWidth}
          height={minimapHeight}
          fill={euiTheme.colors.backgroundBaseSubdued}
        />
        <g aria-hidden="true" pointerEvents="none">
          {edges.map((edge) => {
            const d = polylineToMinimapD(
              edge.polyline,
              worldWidth,
              worldHeight,
              minimapWidth,
              minimapHeight
            );
            if (!d) {
              return null;
            }
            return (
              <path
                key={`mm-edge-${edge.id}`}
                d={d}
                fill="none"
                stroke={edgeStroke}
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.95}
              />
            );
          })}
          {nodes.map((node) => {
            const mx = (node.x / worldWidth) * minimapWidth;
            const my = (node.y / worldHeight) * minimapHeight;
            const mw = Math.max(2, (node.w / worldWidth) * minimapWidth);
            const mh = Math.max(2, (node.h / worldHeight) * minimapHeight);
            return (
              <rect
                key={`mm-node-${node.id}`}
                x={mx}
                y={my}
                width={mw}
                height={mh}
                rx={node.kind === 'branch' ? 1 : 2}
                fill={nodeFill}
                fillOpacity={node.kind === 'branch' ? 0.12 : 0.42}
                stroke={nodeStroke}
                strokeWidth={0.75}
              />
            );
          })}
        </g>
        <rect
          x={vx}
          y={vy}
          width={Math.max(4, vw)}
          height={Math.max(4, vh)}
          fill={euiTheme.colors.backgroundFilledText}
          fillOpacity={0.22}
          stroke={euiTheme.colors.borderStrongPrimary}
          strokeWidth={2}
          rx={2}
          style={{ cursor: 'grab', touchAction: 'none' }}
          onPointerDown={onViewportPointerDown}
          onPointerMove={onViewportPointerMove}
          onPointerUp={onViewportPointerUp}
          onPointerCancel={onViewportPointerUp}
        />
      </svg>
    </div>
  );
}
