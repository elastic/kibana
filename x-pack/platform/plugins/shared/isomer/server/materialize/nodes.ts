/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The Isomer node types materialization produces and consumes. Every other module imports them
 * from here, so this file is the only one that names the charts pack's types.
 */

import type { PrimitiveNode } from '@kbn/isomer';
import type { LinkNode, MarkdownNode } from '@kbn/isomer-components';

/** Where a materialized node came from, so a host can materialize it again. Never rendered. */
export interface MaterializedNodeSource {
  kind: 'kibana-panel';
  kibanaVersion: string;
  /** The saved object type whose materializer produced the node. */
  adapter: string;
  adapterVersion: number;
  savedObjectId?: string;
  panelId?: string;
  timeRange?: { from: string; to: string };
  capturedAt: string;
}

/** Something a materializer or the pipeline dropped, approximated or pre-rendered. */
export interface MaterializeLoss {
  path: string;
  kind: 'dropped' | 'approximated' | 'prerendered';
  note: string;
}

/** A placeholder for anything that can't be materialized. It renders on every surface. */
export interface UnsupportedNode extends PrimitiveNode {
  type: 'unsupported';
  title?: string;
  reason: string;
  link?: { href: string; label: string };
}

/** A chart or layout node from the charts pack, with the provenance and losses its core carries. */
export interface MaterializedChartNode extends PrimitiveNode {
  /** Each primitive's own fields, which the charts pack's schemas define. */
  [field: string]: unknown;
  title?: string;
  source?: MaterializedNodeSource;
  losses?: MaterializeLoss[];
}

/** Components pack nodes that panels whose config is their content map onto. */
export type MaterializedComponentNode = MarkdownNode | LinkNode;

/** What `materialize` returns: always a node that renders. */
export type MaterializedNode = MaterializedChartNode | MaterializedComponentNode | UnsupportedNode;

/** A cell value in a chart node's `data.rows`. `null` is not `0`. */
export type ChartCell = number | string | boolean | null | ChartCell[];

/** A gesture on a chart node, referring to rows and columns of the node's own `data`. */
export type ChartEvent = { node: string } & (
  | {
      kind: 'select';
      target: 'datum' | 'series' | 'category' | 'legend' | 'cell' | 'tile';
      rows: number[];
      columns: string[];
      negate?: boolean;
    }
  | { kind: 'brush'; column: string; range: [number, number] }
) & {
    description: string;
    values: Record<string, ChartCell>;
  };

export const UNSUPPORTED_NODE_TYPE = 'unsupported';

export const isUnsupportedNode = (node: PrimitiveNode): node is UnsupportedNode =>
  node.type === UNSUPPORTED_NODE_TYPE;

const COMPONENT_NODE_TYPES: ReadonlySet<string> = new Set<MaterializedComponentNode['type']>([
  'markdown',
  'link',
]);

/** Whether `node` is a charts pack node, which carries provenance and losses. */
export const isChartNode = (node: MaterializedNode): node is MaterializedChartNode =>
  !isUnsupportedNode(node) && !COMPONENT_NODE_TYPES.has(node.type);
