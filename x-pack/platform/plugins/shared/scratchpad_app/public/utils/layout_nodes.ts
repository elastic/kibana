/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScratchpadNode } from '../hooks/use_scratchpad_state';
import type { Edge } from '@xyflow/react';

const NODE_WIDTH = 250;
const NODE_HEIGHT = 150;
const HORIZONTAL_SPACING = 350;
const VERTICAL_SPACING = 200;

/**
 * Simple hierarchical layout algorithm
 * Arranges nodes in levels based on their connections
 */
export function layoutNodes(nodes: ScratchpadNode[], edges: Edge[]): ScratchpadNode[] {
  if (nodes.length === 0) {
    return nodes;
  }

  // Build adjacency lists
  const incomingEdges = new Map<string, string[]>();
  const outgoingEdges = new Map<string, string[]>();

  edges.forEach((edge) => {
    if (!incomingEdges.has(edge.target)) {
      incomingEdges.set(edge.target, []);
    }
    incomingEdges.get(edge.target)!.push(edge.source);

    if (!outgoingEdges.has(edge.source)) {
      outgoingEdges.set(edge.source, []);
    }
    outgoingEdges.get(edge.source)!.push(edge.target);
  });

  // Find root nodes (nodes with no incoming edges)
  const rootNodes = nodes.filter((node) => !incomingEdges.has(node.id));

  // If no root nodes, use all nodes as roots
  const startNodes = rootNodes.length > 0 ? rootNodes : nodes;

  // Assign levels using BFS
  const levels = new Map<string, number>();
  const visited = new Set<string>();
  const queue: Array<{ id: string; level: number }> = [];

  startNodes.forEach((node) => {
    queue.push({ id: node.id, level: 0 });
    levels.set(node.id, 0);
    visited.add(node.id);
  });

  while (queue.length > 0) {
    const { id, level } = queue.shift()!;
    const children = outgoingEdges.get(id) || [];

    children.forEach((childId) => {
      if (!visited.has(childId)) {
        visited.add(childId);
        levels.set(childId, level + 1);
        queue.push({ id: childId, level: level + 1 });
      }
    });
  }

  // Assign levels to unvisited nodes (disconnected components)
  nodes.forEach((node) => {
    if (!visited.has(node.id)) {
      levels.set(node.id, 0);
    }
  });

  // Group nodes by level
  const nodesByLevel = new Map<number, ScratchpadNode[]>();
  nodes.forEach((node) => {
    const level = levels.get(node.id) || 0;
    if (!nodesByLevel.has(level)) {
      nodesByLevel.set(level, []);
    }
    nodesByLevel.get(level)!.push(node);
  });

  // Calculate positions
  const maxLevel = Math.max(...Array.from(nodesByLevel.keys()));
  const startX = 250;
  const startY = 250;

  return nodes.map((node) => {
    const level = levels.get(node.id) || 0;
    const nodesInLevel = nodesByLevel.get(level) || [];
    const indexInLevel = nodesInLevel.findIndex((n) => n.id === node.id);

    const x = startX;
    const y = startY + level * VERTICAL_SPACING;

    // Center nodes horizontally within their level
    const levelWidth = nodesInLevel.length * HORIZONTAL_SPACING;
    const offsetX = (indexInLevel - (nodesInLevel.length - 1) / 2) * HORIZONTAL_SPACING;

    return {
      ...node,
      position: {
        x: x + offsetX,
        y,
      },
    };
  });
}

