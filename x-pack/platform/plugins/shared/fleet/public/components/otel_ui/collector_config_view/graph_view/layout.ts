/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Dagre from '@dagrejs/dagre';
import { Position, type Node, type Edge } from '@xyflow/react';

import {
  NODE_WIDTH,
  NODE_HEIGHT,
  RANK_SEPARATION,
  NODE_SEPARATION,
  GRAPH_MARGIN,
  GROUP_PADDING,
} from './constants';

interface LayoutOptions {
  rankdir?: 'TB' | 'LR';
  ranksep?: number;
  nodesep?: number;
  marginx?: number;
  marginy?: number;
  nodeWidth?: number;
  nodeHeight?: number;
}

const DEFAULT_LAYOUT_OPTIONS: Required<LayoutOptions> = {
  rankdir: 'LR',
  ranksep: RANK_SEPARATION,
  nodesep: NODE_SEPARATION,
  marginx: GRAPH_MARGIN,
  marginy: GRAPH_MARGIN,
  nodeWidth: NODE_WIDTH,
  nodeHeight: NODE_HEIGHT,
};

const handlePositionsForRankdir = (rankdir: 'TB' | 'LR') =>
  rankdir === 'TB'
    ? { sourcePosition: Position.Bottom, targetPosition: Position.Top }
    : { sourcePosition: Position.Right, targetPosition: Position.Left };

export const applyDagreLayout = <T extends Node>(
  nodes: T[],
  edges: Edge[],
  options: LayoutOptions = {}
): T[] => {
  if (nodes.length === 0) {
    return nodes;
  }

  const hasGroups = nodes.some((n) => n.type === 'pipelineGroup');
  if (hasGroups) {
    return applyCompoundLayout(nodes, edges, options);
  }

  const opts = { ...DEFAULT_LAYOUT_OPTIONS, ...options };

  const g = new Dagre.graphlib.Graph({ directed: true, compound: false })
    .setGraph({
      rankdir: opts.rankdir,
      ranksep: opts.ranksep,
      nodesep: opts.nodesep,
      marginx: opts.marginx,
      marginy: opts.marginy,
    })
    .setDefaultEdgeLabel(() => ({}));

  nodes.forEach((node) => {
    g.setNode(node.id, { width: opts.nodeWidth, height: opts.nodeHeight });
  });

  edges.forEach((edge) => {
    if (g.hasNode(edge.source) && g.hasNode(edge.target)) {
      g.setEdge(edge.source, edge.target);
    }
  });

  Dagre.layout(g);

  const handles = handlePositionsForRankdir(opts.rankdir);
  return nodes.map((node) => {
    const dagreNode = g.node(node.id);
    if (!dagreNode) {
      return { ...node, ...handles };
    }
    return {
      ...node,
      ...handles,
      position: {
        x: Math.round(dagreNode.x - opts.nodeWidth / 2),
        y: Math.round(dagreNode.y - opts.nodeHeight / 2),
      },
    };
  });
};

const applyCompoundLayout = <T extends Node>(
  nodes: T[],
  edges: Edge[],
  options: LayoutOptions = {}
): T[] => {
  const opts = { ...DEFAULT_LAYOUT_OPTIONS, ...options };

  const groupNodes = nodes.filter((n) => n.type === 'pipelineGroup');
  const childNodes = nodes.filter((n) => n.type !== 'pipelineGroup');

  const childrenByGroup = new Map<string, T[]>();
  for (const child of childNodes) {
    if (child.parentId) {
      const list = childrenByGroup.get(child.parentId) ?? [];
      list.push(child);
      childrenByGroup.set(child.parentId, list);
    }
  }

  const groupSizes = new Map<string, { width: number; height: number }>();
  const childPositions = new Map<string, { x: number; y: number }>();

  for (const group of groupNodes) {
    const children = childrenByGroup.get(group.id) ?? [];
    if (children.length === 0) {
      groupSizes.set(group.id, { width: opts.nodeWidth, height: opts.nodeHeight });
      continue;
    }

    const innerEdges = edges.filter(
      (e) => children.some((c) => c.id === e.source) && children.some((c) => c.id === e.target)
    );

    const innerG = new Dagre.graphlib.Graph({ directed: true, compound: false })
      .setGraph({
        rankdir: opts.rankdir,
        ranksep: opts.ranksep,
        nodesep: opts.nodesep,
        marginx: 0,
        marginy: 0,
      })
      .setDefaultEdgeLabel(() => ({}));

    children.forEach((child) => {
      innerG.setNode(child.id, { width: opts.nodeWidth, height: opts.nodeHeight });
    });

    innerEdges.forEach((edge) => {
      if (innerG.hasNode(edge.source) && innerG.hasNode(edge.target)) {
        innerG.setEdge(edge.source, edge.target);
      }
    });

    Dagre.layout(innerG);

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    children.forEach((child) => {
      const pos = innerG.node(child.id);
      if (pos) {
        const left = pos.x - opts.nodeWidth / 2;
        const top = pos.y - opts.nodeHeight / 2;
        minX = Math.min(minX, left);
        minY = Math.min(minY, top);
        maxX = Math.max(maxX, left + opts.nodeWidth);
        maxY = Math.max(maxY, top + opts.nodeHeight);
      }
    });

    children.forEach((child) => {
      const pos = innerG.node(child.id);
      if (pos) {
        childPositions.set(child.id, {
          x: Math.round(pos.x - opts.nodeWidth / 2 - minX + GROUP_PADDING),
          y: Math.round(pos.y - opts.nodeHeight / 2 - minY + GROUP_PADDING),
        });
      }
    });

    groupSizes.set(group.id, {
      width: Math.round(maxX - minX + GROUP_PADDING * 2),
      height: Math.round(maxY - minY + GROUP_PADDING * 2),
    });
  }

  const outerG = new Dagre.graphlib.Graph({ directed: true, compound: false })
    .setGraph({
      rankdir: 'TB',
      ranksep: opts.ranksep,
      nodesep: opts.nodesep,
      marginx: opts.marginx,
      marginy: opts.marginy,
    })
    .setDefaultEdgeLabel(() => ({}));

  groupNodes.forEach((group) => {
    const size = groupSizes.get(group.id) ?? { width: opts.nodeWidth, height: opts.nodeHeight };
    outerG.setNode(group.id, { width: size.width, height: size.height });
  });

  const crossGroupEdges = edges.filter((e) => {
    const sourceParent = childNodes.find((n) => n.id === e.source)?.parentId;
    const targetParent = childNodes.find((n) => n.id === e.target)?.parentId;
    return sourceParent && targetParent && sourceParent !== targetParent;
  });

  for (const edge of crossGroupEdges) {
    const sourceParent = childNodes.find((n) => n.id === edge.source)?.parentId;
    const targetParent = childNodes.find((n) => n.id === edge.target)?.parentId;
    if (
      sourceParent &&
      targetParent &&
      outerG.hasNode(sourceParent) &&
      outerG.hasNode(targetParent)
    ) {
      outerG.setEdge(sourceParent, targetParent);
    }
  }

  Dagre.layout(outerG);

  const handles = handlePositionsForRankdir(opts.rankdir);
  return nodes.map((node) => {
    if (node.type === 'pipelineGroup') {
      const dagreNode = outerG.node(node.id);
      const size = groupSizes.get(node.id) ?? { width: opts.nodeWidth, height: opts.nodeHeight };
      const position = dagreNode
        ? {
            x: Math.round(dagreNode.x - size.width / 2),
            y: Math.round(dagreNode.y - size.height / 2),
          }
        : { x: 0, y: 0 };
      return {
        ...node,
        position,
        style: { width: size.width, height: size.height },
      };
    }

    const pos = childPositions.get(node.id);
    if (pos) {
      return { ...node, ...handles, position: pos };
    }
    return { ...node, ...handles };
  });
};
