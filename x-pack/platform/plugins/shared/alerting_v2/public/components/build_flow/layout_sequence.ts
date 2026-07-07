/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dagre, { graphlib } from '@dagrejs/dagre';
import { MarkerType, Position } from '@xyflow/react';
import type { SequenceNodeType } from './sequence_node';
import type { SequenceEdgeType } from './sequence_edge';

const NODE_WIDTH = 220;
const NODE_HEIGHT = 48;
const COL_GAP = NODE_WIDTH + 130;
const ROW_GAP = NODE_HEIGHT + 130;
/** Beyond this many stages, wrap into new rows instead of growing endlessly
 * to the right (a single row gets unreadably cramped past ~4 nodes). */
const MAX_STAGES_PER_ROW = 3;

const buildEdges = (
  stages: Array<{ ruleId: string; ruleName: string }>,
  hopWindows: string[],
  onHopWindowChange: (hopIndex: number, value: string) => void,
  closeAllTick: number
): SequenceEdgeType[] => {
  const edges: SequenceEdgeType[] = [];
  for (let i = 0; i < stages.length - 1; i++) {
    const source = stages[i].ruleId;
    const target = stages[i + 1].ruleId;
    const wrapsToNextRow = Math.floor(i / MAX_STAGES_PER_ROW) !== Math.floor((i + 1) / MAX_STAGES_PER_ROW);
    edges.push({
      id: `${source}->${target}`,
      source,
      target,
      type: 'sequenceHop',
      markerEnd: { type: MarkerType.ArrowClosed },
      data: {
        window: hopWindows[i],
        onChange: (value: string) => onHopWindowChange(i, value),
        isRowWrap: wrapsToNextRow,
        closeAllTick,
      },
    });
  }
  return edges;
};

/**
 * Sequence order is the array order of `stages` (rule IDs), not node
 * position — layout only decides *where things are drawn*. Edges are always
 * consecutive stage[i] -> stage[i+1], each carrying its own independently
 * configurable time window.
 *
 * Up to MAX_STAGES_PER_ROW stages, a single dagre left-to-right row (matches
 * the original design). Beyond that, wrap into additional rows (left-aligned,
 * like text wrapping) rather than growing arbitrarily wide — the row-wrap
 * edges render as an elbow/step path via `SequenceEdge`, everything else
 * stays a flat horizontal connector.
 */
export const layoutSequence = (
  stages: Array<{ ruleId: string; ruleName: string }>,
  hopWindows: string[],
  onRemove: (ruleId: string) => void,
  onHopWindowChange: (hopIndex: number, value: string) => void,
  closeAllTick: number = 0
): { nodes: SequenceNodeType[]; edges: SequenceEdgeType[] } => {
  const edges = buildEdges(stages, hopWindows, onHopWindowChange, closeAllTick);

  if (stages.length <= MAX_STAGES_PER_ROW) {
    const dagreGraph = new graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ rankdir: 'LR', nodesep: 40, ranksep: 130 });
    stages.forEach((stage) => dagreGraph.setNode(stage.ruleId, { width: NODE_WIDTH, height: NODE_HEIGHT }));
    edges.forEach((edge) => dagreGraph.setEdge(edge.source, edge.target));
    dagre.layout(dagreGraph);

    const nodes: SequenceNodeType[] = stages.map((stage, index) => {
      const dagreNode = dagreGraph.node(stage.ruleId);
      return {
        id: stage.ruleId,
        type: 'sequenceStage',
        position: { x: dagreNode.x - NODE_WIDTH / 2, y: dagreNode.y - NODE_HEIGHT / 2 },
        style: { width: NODE_WIDTH, height: NODE_HEIGHT },
        targetPosition: Position.Left,
        sourcePosition: Position.Right,
        data: { ruleId: stage.ruleId, ruleName: stage.ruleName, stageIndex: index, onRemove },
      };
    });
    return { nodes, edges };
  }

  // Wrapped, multi-row, left-aligned layout — no dagre needed, it's a fixed grid.
  const nodes: SequenceNodeType[] = stages.map((stage, index) => {
    const row = Math.floor(index / MAX_STAGES_PER_ROW);
    const col = index % MAX_STAGES_PER_ROW;
    return {
      id: stage.ruleId,
      type: 'sequenceStage',
      position: { x: col * COL_GAP, y: row * ROW_GAP },
      style: { width: NODE_WIDTH, height: NODE_HEIGHT },
      targetPosition: Position.Left,
      sourcePosition: Position.Right,
      data: { ruleId: stage.ruleId, ruleName: stage.ruleName, stageIndex: index, onRemove },
    };
  });

  return { nodes, edges };
};
