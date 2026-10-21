/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Binds a Lens treemap sliced by two terms the way Lens's nested terms aggregations read: the top parents by the
// metric, then the top children within each parent. The lowering's single `STATS … BY parent, child | LIMIT n`
// ranks pairs instead, so this queries each level itself.

import type { EsqlResponse, ExecuteEsql } from './esql_response';
import type { ChartNode } from './bind_charts';
import type { PlannedPanel } from './dashboard';

type Json = Record<string, unknown>;

interface TermsColumn {
  operationType?: string;
  sourceField?: string;
  params?: {
    size?: number;
    orderBy?: { type?: string; columnId?: string };
    orderDirection?: string;
    otherBucket?: boolean;
    missingBucket?: boolean;
  };
}

const field = (name: string) => `\`${name.replace(/`/g, '``')}\``;

/** The panel query's source and filters: everything before its first `EVAL` or `STATS`. */
const sourceOf = (esql: string) => esql.split(/\s*\|\s*(?=EVAL\b|STATS\b)/i)[0]!;

/** The metric's aggregation as the lowering wrote it, e.g. `SUM(taxful_total_price)`. */
const aggregationOf = (esql: string, metric: string) =>
  new RegExp(
    `STATS\\s+\`?${metric.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\`?\\s*=\\s*(.+?)\\s+BY\\b`,
    'i'
  ).exec(esql)?.[1];

const rowsOf = ({ columns, values }: EsqlResponse) =>
  values.map((row) => Object.fromEntries(columns.map(({ name }, index) => [name, row[index]])));

export const isNestedTreemap = (lens: Json | undefined) => {
  const visualization =
    ((lens?.state as Json | undefined)?.visualization as Json | undefined) ?? {};
  const layer = ((visualization.layers as Json[] | undefined) ?? [])[0];
  return (
    lens?.visualizationType === 'lnsPie' &&
    visualization.shape === 'treemap' &&
    ((layer?.primaryGroups as unknown[] | undefined)?.length ?? 0) === 2
  );
};

export const bindNestedTreemap = async (
  panel: PlannedPanel,
  title: string,
  executeEsql: ExecuteEsql
): Promise<{ node?: ChartNode; refusals: string[]; colorRank?: string[] }> => {
  const state = panel.lens?.state as Json;
  const layer = ((state.visualization as Json).layers as Json[])[0]!;
  const [parentId, childId] = layer.primaryGroups as [string, string];
  const [metricId] = layer.metrics as [string];
  const layers = (
    (state.datasourceStates as Json).formBased as {
      layers: Record<string, { columns: Record<string, TermsColumn> }>;
    }
  ).layers;
  const columns: Record<string, TermsColumn> = Object.assign(
    {},
    ...Object.values(layers).map(({ columns: c }) => c)
  );
  const [parent, child] = [columns[parentId], columns[childId]];
  const refusals: string[] = [];
  for (const [name, column] of [
    ['parent', parent],
    ['child', child],
  ] as const) {
    const { operationType, sourceField, params = {} } = column ?? {};
    if (operationType !== 'terms' || !sourceField) {
      refusals.push(`${name} level is not terms`);
    } else if (params.otherBucket || params.missingBucket) {
      refusals.push(`${name} level keeps an Other or missing bucket`);
    } else if (
      params.orderBy?.type !== 'column' ||
      params.orderBy.columnId !== metricId ||
      params.orderDirection !== 'desc'
    ) {
      refusals.push(`${name} level is not ordered by the metric, descending`);
    }
  }
  const aggregation = aggregationOf(panel.query.query.esql, metricId);
  if (!aggregation) {
    refusals.push('the metric aggregation is not in the panel query');
  }
  if (refusals.length > 0) {
    return { refusals };
  }

  const source = sourceOf(panel.query.query.esql);
  const parents = rowsOf(
    await executeEsql(
      `${source} | STATS m = ${aggregation} BY p = ${field(
        parent!.sourceField!
      )} | WHERE p IS NOT NULL | SORT m DESC | LIMIT ${parent!.params!.size ?? 5}`
    )
  );
  // Grouping by both splits a multi-valued document into every pair, as a terms aggregation nested in terms does.
  const pairs = rowsOf(
    await executeEsql(
      `${source} | STATS m = ${aggregation} BY p = ${field(parent!.sourceField!)}, c = ${field(
        child!.sourceField!
      )} | WHERE p IS NOT NULL AND c IS NOT NULL | SORT m DESC | LIMIT 10000`
    )
  );
  const items = parents.map(({ p }) => {
    const children = pairs
      .filter((pair) => pair.p === p)
      .slice(0, child!.params!.size ?? 5)
      .map(({ c, m }) => ({
        key: `${String(p)}\u0000${String(c)}`,
        label: String(c),
        value: Math.max(0, Number(m) || 0),
      }));
    return { key: String(p), label: String(p), children };
  });
  const term = (fieldName: string, value: string) => [{ field: fieldName, value }];
  return {
    refusals,
    // Lens colors parents in their terms order, by the metric over the whole parent, not by the children shown.
    colorRank: items.map(({ key }) => key),
    node: {
      type: 'treemap',
      ...(title ? { title } : {}),
      // Lens sizes and orders a parent by the children it shows.
      items: items
        .filter(({ children }) => children.length > 0)
        .sort(
          (a, b) =>
            b.children.reduce((sum, { value }) => sum + value, 0) -
            a.children.reduce((sum, { value }) => sum + value, 0)
        ),
      selection: {
        name: 'dashboard/select',
        context: { panelId: panel.panelId },
        on: {
          path: Object.fromEntries(
            items.flatMap(({ key, children }) => [
              [key, term(parent!.sourceField!, key)],
              // A click resolves to the keys from the root down, so each key carries only its own level's term.
              ...children.map((item) => [item.key, term(child!.sourceField!, item.label)]),
            ])
          ),
        },
      },
    },
  };
};
