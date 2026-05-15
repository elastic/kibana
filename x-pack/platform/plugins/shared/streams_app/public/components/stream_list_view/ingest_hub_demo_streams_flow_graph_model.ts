/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Point in canvas coordinates (same space as node boxes). */
export interface FlowGraphPoint {
  readonly x: number;
  readonly y: number;
}

export type FlowGraphNodeKind = 'source' | 'branch' | 'stream';

export interface FlowGraphNodeDef {
  readonly id: string;
  readonly kind: FlowGraphNodeKind;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export interface FlowGraphEdgeDef {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  /** Polyline waypoints in layout space (2-point straight; 3+ orthogonal with rounded render). */
  readonly polyline: ReadonlyArray<FlowGraphPoint>;
}

export const INGEST_HUB_DEMO_STREAMS_FLOW_LAYOUT_HEIGHT = 400;

/** Fixed width for every flow canvas card (source, mid stream, destinations). */
export const INGEST_HUB_DEMO_STREAMS_FLOW_CARD_WIDTH_PX = 250;

const SOURCE_W = INGEST_HUB_DEMO_STREAMS_FLOW_CARD_WIDTH_PX;
const RIGHT_COL_W = INGEST_HUB_DEMO_STREAMS_FLOW_CARD_WIDTH_PX;
const MID_STREAM_W = INGEST_HUB_DEMO_STREAMS_FLOW_CARD_WIDTH_PX;

const JOIN_W = 40;

const MIN_LAYOUT_WIDTH = SOURCE_W + JOIN_W + MID_STREAM_W + JOIN_W + RIGHT_COL_W;

/** Minimum `contentWidth` passed to `buildIngestHubDemoStreamsFlowLayout` (full graph width at scale 1). */
export const INGEST_HUB_DEMO_STREAMS_FLOW_MIN_LAYOUT_WIDTH_PX = MIN_LAYOUT_WIDTH;

export interface IngestHubDemoStreamsFlowLayout {
  readonly layoutWidth: number;
  readonly layoutHeight: number;
  readonly nodes: readonly FlowGraphNodeDef[];
  readonly edges: readonly FlowGraphEdgeDef[];
}

/** Branch targets end on the right so the spine is continuous across invisible join nodes. */
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
 * Orthogonal path from the invisible fan hub (branch, right edge = bus) down/up then across to a
 * right-column stream. Each leg is unique so dashed connectors are not stacked on shared geometry.
 */
function orthogonalFanHubToStream(
  fanHub: FlowGraphNodeDef,
  dest: FlowGraphNodeDef
): ReadonlyArray<FlowGraphPoint> {
  const hubR = fanHub.x + fanHub.w;
  const hubCy = fanHub.y + fanHub.h / 2;
  const destCy = dest.y + dest.h / 2;
  /** Inline with the bus: straight run (avoids duplicate waypoints + stacked strokes on the hub). */
  if (Math.abs(destCy - hubCy) < 1e-3) {
    return [
      { x: hubR, y: hubCy },
      { x: dest.x, y: destCy },
    ];
  }
  return [
    { x: hubR, y: hubCy },
    { x: hubR, y: destCy },
    { x: dest.x, y: destCy },
  ];
}

/**
 * Builds node positions and edge polylines for a given content width.
 * The spine uses straight segments. The fan uses an invisible `fan_hub` branch so the horizontal
 * bus from `dest_top` is a single edge (no triple-stacked dot strokes); each destination is one
 * orthogonal leg from the hub.
 * `contentWidth` should be the usable width inside the parent’s padding only (e.g. the ingest
 * canvas shell): the source’s left edge is at x = 0 and the right column’s right edge is at
 * layoutWidth. Four equal gaps distribute space between the source, mid stream slot, join slot,
 * and the right-hand destination column.
 */
export function buildIngestHubDemoStreamsFlowLayout(
  contentWidth: number
): IngestHubDemoStreamsFlowLayout {
  const layoutWidth = Math.max(MIN_LAYOUT_WIDTH, Math.floor(contentWidth));
  const layoutHeight = INGEST_HUB_DEMO_STREAMS_FLOW_LAYOUT_HEIGHT;

  const sourceX = 0;
  const rightColX = layoutWidth - RIGHT_COL_W;
  const sourceRight = sourceX + SOURCE_W;
  const fixedBlocks = JOIN_W + MID_STREAM_W + JOIN_W;
  const gapTotal = rightColX - sourceRight - fixedBlocks;
  const gap = Math.max(0, gapTotal / 4);

  /** Horizontal offset of the former join1 slot (keeps card positions / MIN_LAYOUT_WIDTH math stable). */
  const spineSlot1X = sourceRight + gap;
  const destTopX = spineSlot1X + JOIN_W + gap;
  const destTopR = destTopX + MID_STREAM_W;
  /** Right edge of the former join2 slot (hub); keeps fan elbow math unchanged. */
  const join2R = destTopR + JOIN_W;

  const destTopY = 152;
  const destTopH = 96;
  const busY = destTopY + destTopH / 2;

  const fanGap = Math.max(0, rightColX - destTopR);
  const xHub = fanGap === 0 ? join2R : destTopR + fanGap / 2;
  const xElbow = Math.max(join2R, xHub);

  /** Invisible join: right edge at the fan elbow so trunk + legs meet without overlapping paths. */
  const fanHub: FlowGraphNodeDef = {
    id: 'fan_hub',
    kind: 'branch',
    x: xElbow - JOIN_W,
    y: busY - JOIN_W / 2,
    w: JOIN_W,
    h: JOIN_W,
  };

  const nodes: readonly FlowGraphNodeDef[] = [
    { id: 'source', kind: 'source', x: sourceX, y: destTopY, w: SOURCE_W, h: destTopH },
    { id: 'dest_top', kind: 'stream', x: destTopX, y: destTopY, w: MID_STREAM_W, h: destTopH },
    fanHub,
    { id: 'dest_mid', kind: 'stream', x: rightColX, y: 48, w: RIGHT_COL_W, h: 88 },
    { id: 'dest_errors', kind: 'stream', x: rightColX, y: 156, w: RIGHT_COL_W, h: 88 },
    { id: 'dest_s3', kind: 'stream', x: rightColX, y: 264, w: RIGHT_COL_W, h: 88 },
  ] as const;

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  const line = (fromId: string, toId: string): ReadonlyArray<FlowGraphPoint> => {
    const fromN = nodeMap.get(fromId);
    const toN = nodeMap.get(toId);
    if (!fromN || !toN) {
      return [
        { x: 0, y: 0 },
        { x: 0, y: 0 },
      ];
    }
    return straightPolylineBetween(fromN, toN);
  };

  const plSourceDestTop = line('source', 'dest_top');
  const plDestTopFanHub = line('dest_top', 'fan_hub');

  const fanHubNode = nodeMap.get('fan_hub');
  const destMidNode = nodeMap.get('dest_mid');
  const destErrorsNode = nodeMap.get('dest_errors');
  const destS3Node = nodeMap.get('dest_s3');

  const plFanHubDestMid =
    fanHubNode && destMidNode
      ? orthogonalFanHubToStream(fanHubNode, destMidNode)
      : line('fan_hub', 'dest_mid');
  const plFanHubDestErrors =
    fanHubNode && destErrorsNode
      ? orthogonalFanHubToStream(fanHubNode, destErrorsNode)
      : line('fan_hub', 'dest_errors');
  const plFanHubDestS3 =
    fanHubNode && destS3Node
      ? orthogonalFanHubToStream(fanHubNode, destS3Node)
      : line('fan_hub', 'dest_s3');

  const edges: readonly FlowGraphEdgeDef[] = [
    {
      id: 'e_source_dest_top',
      from: 'source',
      to: 'dest_top',
      polyline: plSourceDestTop,
    },
    {
      id: 'e_dest_top_fan_hub',
      from: 'dest_top',
      to: 'fan_hub',
      polyline: plDestTopFanHub,
    },
    {
      id: 'e_fan_hub_dest_mid',
      from: 'fan_hub',
      to: 'dest_mid',
      polyline: plFanHubDestMid,
    },
    {
      id: 'e_fan_hub_dest_errors',
      from: 'fan_hub',
      to: 'dest_errors',
      polyline: plFanHubDestErrors,
    },
    {
      id: 'e_fan_hub_dest_s3',
      from: 'fan_hub',
      to: 'dest_s3',
      polyline: plFanHubDestS3,
    },
  ] as const;

  return { layoutWidth, layoutHeight, nodes, edges };
}
