/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLColumn } from '@kbn/es-types';

/**
 * Loaded on demand so liquidjs ships in its own chunk instead of being embedded in every
 * chunk that renders custom content — a static import lands it in the shared `vendors`
 * chunk once three chunks use it, which is far wider than this feature.
 */
const getEngine = async () => {
  const { Liquid } = await import('liquidjs');
  return new Liquid({
    strictFilters: false,
    strictVariables: false,
    dynamicPartials: false,
    relativeReference: false,
    outputEscape: 'escape',
    renderLimit: 1_000,
    memoryLimit: 100_000_000,
    parseLimit: 1_000_000,
  });
};

function isFiniteNumber(value: unknown): value is number {
  return Number.isFinite(value);
}

export interface TemplateDataset {
  columns: ESQLColumn[];
  rows: unknown[][];
}

interface TemplateCell {
  value: unknown;
  pct?: number;
}

const buildTemplateDataset = ({ columns, rows }: TemplateDataset) => {
  const maxValues: Record<string, number> = {};
  columns.forEach((col, i) => {
    let max = -Infinity;
    for (const row of rows) {
      const value = row[i];
      if (isFiniteNumber(value)) {
        max = Math.max(max, value);
      }
    }
    if (isFiniteNumber(max)) {
      maxValues[col.name] = max;
    }
  });

  const rowObjects = rows.map((row) => {
    const obj: Record<string, TemplateCell> = {};
    columns.forEach((col, i) => {
      const value = row[i];
      const max = maxValues[col.name];
      const pct =
        max === undefined
          ? undefined
          : max !== 0 && isFiniteNumber(value)
          ? Math.min(100, Math.max(0, Math.round((value / max) * 100)))
          : 0;
      obj[col.name] = { value, pct };
    });
    return obj;
  });

  return { rows: rowObjects, max: maxValues };
};

/**
 * Renders a template against one result set per query. `queries[n]` holds the n-th query's `rows`
 * and `max`, while the top-level `rows` and `max` stay the first query's, so a single-query
 * template renders exactly as before.
 */
export async function fillTemplateDatasets(
  template: string,
  datasets: TemplateDataset[]
): Promise<string> {
  const queries = datasets.map(buildTemplateDataset);
  const [first = { rows: [], max: {} }] = queries;

  // Sync is ~1.4x faster for identical output: the async path awaits at every AST node, which only
  // pays off with async filters or file-backed includes, and there are none. Registering either
  // means going back to `parseAndRender` — a sync render does not reject on an async filter, it
  // prints `[object Promise]` into the panel.
  const liquid = await getEngine();
  return liquid.parseAndRenderSync(template.trim(), {
    rows: first.rows,
    max: first.max,
    queries,
  });
}

export const fillTemplate = (
  template: string,
  columns: ESQLColumn[],
  rows: unknown[][]
): Promise<string> => fillTemplateDatasets(template, [{ columns, rows }]);
