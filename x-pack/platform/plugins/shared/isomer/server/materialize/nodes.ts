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

import type {
  Cell,
  GridNode,
  Loss,
  MetricNode,
  PrimitiveNode,
  Provenance,
  UnsupportedNode,
  XyChartNode,
} from '@kbn/isomer';
import type { LinkNode, MarkdownNode } from '@kbn/isomer-components';

export type { UnsupportedNode };

/** Where a materialized node came from, so a host can materialize it again. Never rendered. */
export type MaterializedNodeSource = Provenance;

/** Something a materializer or the pipeline dropped, approximated or pre-rendered. */
export type MaterializeLoss = Loss;

/** A chart node from the charts pack, with the provenance and losses its core carries. */
export type MaterializedChartNode = MetricNode | XyChartNode;

/** A layout node from the charts pack, which places other nodes. */
export type MaterializedLayoutNode = GridNode;

/** Components pack nodes that panels whose config is their content map onto. */
export type MaterializedComponentNode = MarkdownNode | LinkNode;

/** What `materialize` returns: always a node that renders. */
export type MaterializedNode =
  | MaterializedChartNode
  | MaterializedLayoutNode
  | MaterializedComponentNode
  | UnsupportedNode;

/** A cell value in a chart node's `data.rows`. `null` is not `0`. */
export type ChartCell = Cell;

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

const chartNodeTypes: ReadonlySet<string> = new Set<MaterializedChartNode['type']>([
  'metric',
  'xyChart',
]);

/** Whether `node` is a chart node, which carries provenance and losses. */
export const isChartNode = (node: PrimitiveNode): node is MaterializedChartNode =>
  chartNodeTypes.has(node.type);
