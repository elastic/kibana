/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Edge, Node } from '@xyflow/react';
import { MarkerType } from '@xyflow/react';
import type {
  AnalyticsMapEdgeElement,
  AnalyticsMapNodeElement,
  MapElements,
} from '@kbn/ml-data-frame-analytics-utils';

import { JOB_MAP_EDGE_MARKER_SIZE, JOB_MAP_EDGE_STROKE_WIDTH } from './job_map_flow_constants';
import { applyJobMapDagreLayout } from './apply_job_map_dagre_layout';

export const JOB_MAP_FLOW_NODE_TYPE = 'jobMapNode' as const;

export interface JobMapNodeData extends Record<string, unknown> {
  id: string;
  label: string;
  type: string;
  analysisType?: string;
  isRoot?: boolean;
}

function isEdgeElement(el: MapElements): el is AnalyticsMapEdgeElement {
  return 'source' in el.data && 'target' in el.data;
}

export function isNodeElement(el: MapElements): el is AnalyticsMapNodeElement {
  return 'label' in el.data && 'type' in el.data;
}

export function mapElementsToFlowGraph(
  elements: MapElements[],
  edgeColor: string
): {
  nodes: Node<JobMapNodeData>[];
  edges: Edge[];
} {
  const nodeElements = elements.filter(isNodeElement);
  const edgeElements = elements.filter(isEdgeElement);

  const nodes: Node<JobMapNodeData>[] = nodeElements.map(
    ({ data: { id, label, type, analysisType, isRoot } }) => ({
      id,
      type: JOB_MAP_FLOW_NODE_TYPE,
      position: { x: 0, y: 0 },
      // Omit width/height so React Flow uses measured DOM for handle positions. Fixed
      // dimensions here (esp. height) often disagree with wrapped labels and misalign edges.
      selectable: true,
      data: {
        id,
        label,
        type,
        analysisType,
        isRoot,
      },
    })
  );

  const edges: Edge[] = edgeElements.map(({ data: { id, source, target } }) => ({
    id,
    source,
    target,
    type: 'smoothstep',
    style: { stroke: edgeColor, strokeWidth: JOB_MAP_EDGE_STROKE_WIDTH },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: edgeColor,
      width: JOB_MAP_EDGE_MARKER_SIZE,
      height: JOB_MAP_EDGE_MARKER_SIZE,
    },
  }));

  const laidOutNodes = applyJobMapDagreLayout(nodes, edges);

  return { nodes: laidOutNodes, edges };
}
