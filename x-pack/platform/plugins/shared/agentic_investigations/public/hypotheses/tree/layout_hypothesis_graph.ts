/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  HypothesisGraph,
  HypothesisGraphNode,
  HypothesisTreeNodeData,
  HypothesisTreeNodeKind,
} from './build_hypothesis_graph';

/** Edge-to-edge vertical gap between every row; it is also the connector budget. */
export const HYPOTHESIS_TREE_ROW_GAP = 56;
/** Edge-to-edge gap between sibling hypothesis cards. */
export const HYPOTHESIS_TREE_SIBLING_GAP = 24;

export const HYPOTHESIS_TREE_NODE_WIDTH: Record<HypothesisTreeNodeKind, number> = {
  trigger: 320,
  hypotheses: 240,
  hypothesis: 280,
  conclusion: 440,
  actions: 360,
};

export const getHypothesisTreeNodeWidth = (data: HypothesisTreeNodeData): number =>
  HYPOTHESIS_TREE_NODE_WIDTH[data.kind];

/** Used until the rendered node has been measured. Hypothesis cards render at exactly this height. */
export const HYPOTHESIS_TREE_ESTIMATED_NODE_HEIGHT: Record<HypothesisTreeNodeKind, number> = {
  trigger: 96,
  hypotheses: 80,
  hypothesis: 220,
  conclusion: 180,
  actions: 200,
};

export interface PositionedHypothesisGraphNode extends HypothesisGraphNode {
  position: { x: number; y: number };
  width: number;
}

const ROW_ORDER: readonly HypothesisTreeNodeKind[] = [
  'trigger',
  'hypotheses',
  'hypothesis',
  'conclusion',
  'actions',
];

/**
 * Lays the tree out in rows on one centred spine: Trigger, Hypotheses chip, the hypothesis row,
 * Conclusion and Actions share the same centre, and the hypothesis row is packed edge-to-edge and
 * centred on it. Each row starts `HYPOTHESIS_TREE_ROW_GAP` below the tallest node of the previous one.
 */
export const layoutHypothesisGraph = (
  { nodes }: HypothesisGraph,
  measuredHeights: Readonly<Record<string, number>> = {}
): PositionedHypothesisGraphNode[] => {
  const getHeight = ({ id, data }: HypothesisGraphNode): number =>
    measuredHeights[id] ?? HYPOTHESIS_TREE_ESTIMATED_NODE_HEIGHT[data.kind];

  const positioned: PositionedHypothesisGraphNode[] = [];
  let rowTop = 0;

  ROW_ORDER.forEach((kind) => {
    const row = nodes.filter(({ data }) => data.kind === kind);
    if (row.length === 0) {
      return;
    }

    const widths = row.map(({ data }) => getHypothesisTreeNodeWidth(data));
    const rowWidth =
      widths.reduce((total, width) => total + width, 0) +
      (row.length - 1) * HYPOTHESIS_TREE_SIBLING_GAP;
    let left = -rowWidth / 2;

    row.forEach((node, index) => {
      positioned.push({ ...node, width: widths[index], position: { x: left, y: rowTop } });
      left += widths[index] + HYPOTHESIS_TREE_SIBLING_GAP;
    });

    rowTop += Math.max(...row.map(getHeight)) + HYPOTHESIS_TREE_ROW_GAP;
  });

  return positioned;
};
