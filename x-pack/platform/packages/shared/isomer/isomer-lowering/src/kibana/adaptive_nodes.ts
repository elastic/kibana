/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface DashboardGridItem {
  x: number;
  y: number;
  w: number;
  h: number;
  node: BodyNode;
}

export interface DashboardGridNode {
  type: 'dashboardGrid';
  mode?: 'auto' | 'grid' | 'flow';
  columns?: number;
  rowHeight?: number;
  items: DashboardGridItem[];
}

/** Any other node the converter emits: a placeholder, callout, or text node. */
export interface LeafNode {
  type: string;
  [field: string]: unknown;
}

export type BodyNode = DashboardGridNode | LeafNode;

/** The planned composition, before binding replaces its placeholders. */
export interface ViewSpec {
  type: 'view';
  title?: string;
  subtitle?: string;
  body: BodyNode[];
  meta?: Record<string, unknown>;
}

export const isDashboardGrid = (node: BodyNode | undefined): node is DashboardGridNode =>
  node?.type === 'dashboardGrid';
