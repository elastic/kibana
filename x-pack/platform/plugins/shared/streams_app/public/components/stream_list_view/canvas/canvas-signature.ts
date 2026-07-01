/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Structural fingerprint used to derive the toolbar's "dirty" (has-changes) flag.

import type { Edge, Node } from '@xyflow/react';
import { initialEdges, initialNodes } from './seed-graph';

/**
 * A structural fingerprint of the canvas: which nodes exist (id + type) and how
 * they are wired (edge id + endpoints). Used to detect when the user has made a
 * meaningful change (added/removed/connected nodes) versus transient churn like
 * selection, hover, or node measurement. Intentionally ignores positions and
 * node data so neither moving nor selecting a node flips the "dirty" flag.
 */
export function canvasSignature(nodes: Node[], edges: Edge[]): string {
  const nodePart = nodes
    .map((node) => `${node.id}:${node.type ?? ''}`)
    .sort()
    .join('|');
  const edgePart = edges
    .map(
      (edge) =>
        `${edge.id}:${edge.source}>${edge.target}:${edge.sourceHandle ?? ''}>${
          edge.targetHandle ?? ''
        }`
    )
    .sort()
    .join('|');
  return `${nodePart}#${edgePart}`;
}

export const INITIAL_CANVAS_SIGNATURE = canvasSignature(initialNodes, initialEdges);
