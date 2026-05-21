/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IngestHubDemoStreamTopology } from '../ingest_hub_demo_stream_topology';
import {
  INGEST_HUB_DEMO_STREAMS_FLOW_CARD_WIDTH_PX,
  INGEST_HUB_DEMO_STREAMS_FLOW_ROW_CARD_HEIGHT_PX,
} from './ingest_hub_demo_streams_flow_card_layout';

export {
  INGEST_HUB_DEMO_STREAMS_FLOW_CARD_WIDTH_PX,
  INGEST_HUB_DEMO_STREAMS_FLOW_ROW_CARD_HEIGHT_PX,
} from './ingest_hub_demo_streams_flow_card_layout';
export { INGEST_HUB_DEMO_STREAMS_FLOW_CARD_HEIGHT_PX } from './ingest_hub_demo_streams_flow_card_layout';
export { INGEST_HUB_DEMO_STREAMS_FLOW_CARD_INSET_PX } from './ingest_hub_demo_streams_flow_card_layout';

/** Point in canvas coordinates (same space as node boxes). */
export interface FlowGraphPoint {
  readonly x: number;
  readonly y: number;
}

export type FlowGraphNodeKind = 'source' | 'processing' | 'routing' | 'branch' | 'stream';

export interface FlowGraphNodeDef {
  readonly id: string;
  readonly kind: FlowGraphNodeKind;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  /** Index of the per-source stream flow this node belongs to. */
  readonly flowIndex: number;
}

export interface FlowGraphEdgeDef {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly polyline: ReadonlyArray<FlowGraphPoint>;
}

export const INGEST_HUB_DEMO_STREAMS_FLOW_LAYOUT_HEIGHT = 400;
/** @deprecated Use {@link INGEST_HUB_DEMO_STREAMS_FLOW_CARD_WIDTH_PX}. */
export const INGEST_HUB_DEMO_STREAMS_FLOW_STEP_CARD_WIDTH_PX =
  INGEST_HUB_DEMO_STREAMS_FLOW_CARD_WIDTH_PX;
/** @deprecated Use {@link INGEST_HUB_DEMO_STREAMS_FLOW_ROW_CARD_HEIGHT_PX}. */
export const INGEST_HUB_DEMO_STREAMS_FLOW_STEP_CARD_HEIGHT_PX =
  INGEST_HUB_DEMO_STREAMS_FLOW_ROW_CARD_HEIGHT_PX;
/** Minimum vertical space between adjacent stream flows on the canvas. */
export const INGEST_HUB_DEMO_STREAMS_FLOW_ROW_GAP_PX = 56;
export const INGEST_HUB_DEMO_STREAMS_FLOW_COLUMN_GAP_PX = 40;

const CARD_W = INGEST_HUB_DEMO_STREAMS_FLOW_CARD_WIDTH_PX;
const ROW_H = INGEST_HUB_DEMO_STREAMS_FLOW_ROW_CARD_HEIGHT_PX;
const ROW_GAP = INGEST_HUB_DEMO_STREAMS_FLOW_ROW_GAP_PX;
const COL_GAP = INGEST_HUB_DEMO_STREAMS_FLOW_COLUMN_GAP_PX;

/** Six equal-width cards per row (source + 3 pipeline + routing + destination) with minimum gaps. */
export const INGEST_HUB_DEMO_STREAMS_FLOW_MIN_LAYOUT_WIDTH_PX = CARD_W * 6 + COL_GAP * 5;

export interface IngestHubDemoStreamsFlowLayout {
  readonly layoutWidth: number;
  readonly layoutHeight: number;
  readonly nodes: readonly FlowGraphNodeDef[];
  readonly edges: readonly FlowGraphEdgeDef[];
  readonly flowCount: number;
}

export function getTopologySourceNodeId(flowIndex: number): string {
  return `source_${flowIndex}`;
}

export function getTopologyDestNodeId(flowIndex: number): string {
  return `dest_${flowIndex}`;
}

export function getTopologyProcessingNodeId(flowIndex: number, stepId: string): string {
  return `processing_${flowIndex}_${stepId}`;
}

export function getTopologyRoutingNodeId(flowIndex: number): string {
  return `routing_${flowIndex}`;
}

export function parseTopologyFlowNodeIndex(nodeId: string): number | null {
  const match = nodeId.match(/^(?:source|dest|processing|routing)_(\d+)/);
  if (!match) {
    return null;
  }
  return Number.parseInt(match[1], 10);
}

function straightPolylineBetween(
  from: FlowGraphNodeDef,
  to: FlowGraphNodeDef
): ReadonlyArray<FlowGraphPoint> {
  const x1 = from.x + from.w;
  const y1 = from.y + from.h / 2;
  const toCy = to.y + to.h / 2;
  if (to.kind === 'branch') {
    return [
      { x: x1, y: y1 },
      { x: to.x + to.w, y: toCy },
    ];
  }
  return [
    { x: x1, y: y1 },
    { x: to.x, y: toCy },
  ];
}

/**
 * One horizontal stream flow per source: source → pipeline steps → routing → destination.
 * Together these flows form the stream graph on the canvas.
 */
/** Column x positions for one stream flow row; gaps grow so the row spans `layoutWidth`. */
function buildFlowRowColumnPositions(
  layoutWidth: number,
  processingStepCount: number
): {
  readonly sourceX: number;
  readonly processingXs: readonly number[];
  readonly routingX: number;
  readonly destX: number;
} {
  const columnWidths = [
    CARD_W,
    ...Array.from({ length: processingStepCount }, () => CARD_W),
    CARD_W,
    CARD_W,
  ];
  const gapCount = columnWidths.length - 1;
  const fixedWidth = columnWidths.reduce((sum, width) => sum + width, 0);
  const gapWidth = Math.max(COL_GAP, (layoutWidth - fixedWidth) / gapCount);

  let cursorX = 0;
  const columnXs: number[] = [];
  for (let columnIndex = 0; columnIndex < columnWidths.length; columnIndex += 1) {
    columnXs.push(cursorX);
    cursorX += columnWidths[columnIndex] + (columnIndex < gapCount ? gapWidth : 0);
  }

  return {
    sourceX: columnXs[0],
    processingXs: columnXs.slice(1, 1 + processingStepCount),
    routingX: columnXs[1 + processingStepCount],
    destX: columnXs[columnXs.length - 1],
  };
}

export function buildStreamTopologyFlowLayout(
  contentWidth: number,
  topology: IngestHubDemoStreamTopology
): IngestHubDemoStreamsFlowLayout {
  const layoutWidth = Math.max(
    INGEST_HUB_DEMO_STREAMS_FLOW_MIN_LAYOUT_WIDTH_PX,
    Math.floor(contentWidth)
  );
  const flowCount = Math.min(topology.sources.length, topology.destinations.length);

  const rowsBlockHeight = flowCount * ROW_H + (flowCount - 1) * ROW_GAP;
  const layoutHeight = Math.max(INGEST_HUB_DEMO_STREAMS_FLOW_LAYOUT_HEIGHT, rowsBlockHeight + 48);

  const { sourceX, processingXs, routingX, destX } = buildFlowRowColumnPositions(
    layoutWidth,
    topology.processingSteps.length
  );

  const rowStartY = Math.max(24, (layoutHeight - rowsBlockHeight) / 2);

  const nodes: FlowGraphNodeDef[] = [];
  const edges: FlowGraphEdgeDef[] = [];

  for (let flowIndex = 0; flowIndex < flowCount; flowIndex += 1) {
    const source = topology.sources[flowIndex];
    const destination =
      topology.destinations.find((dest) => dest.id === source.id) ??
      topology.destinations[flowIndex];
    const rowY = rowStartY + flowIndex * (ROW_H + ROW_GAP);

    const sourceId = getTopologySourceNodeId(flowIndex);
    const destId = getTopologyDestNodeId(flowIndex);
    const routingId = getTopologyRoutingNodeId(flowIndex);

    nodes.push({
      id: sourceId,
      kind: 'source',
      x: sourceX,
      y: rowY,
      w: CARD_W,
      h: ROW_H,
      flowIndex,
    });

    const processingIds: string[] = [];
    topology.processingSteps.forEach((step, stepIndex) => {
      const id = getTopologyProcessingNodeId(flowIndex, step.id);
      processingIds.push(id);
      nodes.push({
        id,
        kind: 'processing',
        x: processingXs[stepIndex] ?? routingX,
        y: rowY,
        w: CARD_W,
        h: ROW_H,
        flowIndex,
      });
    });

    nodes.push({
      id: routingId,
      kind: 'routing',
      x: routingX,
      y: rowY,
      w: CARD_W,
      h: ROW_H,
      flowIndex,
    });

    nodes.push({
      id: destId,
      kind: 'stream',
      x: destX,
      y: rowY,
      w: CARD_W,
      h: ROW_H,
      flowIndex,
    });

    const chain = [sourceId, ...processingIds, routingId, destId];
    for (let chainIndex = 0; chainIndex < chain.length - 1; chainIndex += 1) {
      const fromId = chain[chainIndex];
      const toId = chain[chainIndex + 1];
      const fromN = nodes.find((n) => n.id === fromId);
      const toN = nodes.find((n) => n.id === toId);
      if (!fromN || !toN) {
        continue;
      }
      edges.push({
        id: `e_${fromId}_${toId}`,
        from: fromId,
        to: toId,
        polyline: straightPolylineBetween(fromN, toN),
      });
    }
  }

  return { layoutWidth, layoutHeight, nodes, edges, flowCount };
}
