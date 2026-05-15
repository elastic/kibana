/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FlowGraphEdgeDef } from './ingest_hub_demo_streams_flow_graph_model';
import type { AwsMockStreamRow } from './ingest_hub_demo_streams_model';

/**
 * Round dot stroke: `0` dash length + `stroke-linecap="round"` draws a circle ~stroke wide; gap is
 * center-to-center spacing (layout px). Avoid `1 N` patterns — they stretch into dashes on corners.
 * The ingest hub pipeline canvas uses butt caps + a proportional dash instead (see
 * `ingest_hub_demo_streams_flow_pipeline_canvas.tsx`) so shared junctions do not stack round-cap
 * bulges.
 */
export const FLOW_CONNECTOR_DOT_DASH = '0 10';

/**
 * Returns degraded/poor when the edge terminates on a stream card that uses that quality.
 * `dest_s3` is treated as neutral (matches destination card quality handling).
 */
export function getEdgeDestinationQualitySeverity(
  edge: FlowGraphEdgeDef,
  leafByStreamNodeId: ReadonlyMap<string, AwsMockStreamRow>
): 'degraded' | 'poor' | null {
  if (edge.to === 'dest_s3') {
    return null;
  }
  const row = leafByStreamNodeId.get(edge.to);
  if (!row) {
    return null;
  }
  if (row.quality === 'poor') {
    return 'poor';
  }
  if (row.quality === 'degraded') {
    return 'degraded';
  }
  return null;
}
