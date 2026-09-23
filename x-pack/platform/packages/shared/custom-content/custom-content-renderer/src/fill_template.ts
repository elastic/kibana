/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Liquid } from 'liquidjs';
import type { ESQLColumn } from '@kbn/es-types';

const liquid = new Liquid({
  strictFilters: false,
  strictVariables: false,
  dynamicPartials: false,
  relativeReference: false,
  outputEscape: 'escape',
  renderLimit: 1_000,
  memoryLimit: 100_000_000,
  parseLimit: 1_000_000,
});

function isFiniteNumber(value: unknown): value is number {
  return Number.isFinite(value);
}

export async function fillTemplate(
  template: string,
  columns: ESQLColumn[],
  rows: unknown[][]
): Promise<string> {
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
    const obj: Record<string, { value: unknown; pct?: number }> = {};
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

  // Sync is ~1.4x faster for identical output: the async path awaits at every AST node, which only
  // pays off with async filters or file-backed includes, and there are none. Registering either
  // means going back to `parseAndRender` — a sync render does not reject on an async filter, it
  // prints `[object Promise]` into the panel.
  return liquid.parseAndRenderSync(template.trim(), { rows: rowObjects, max: maxValues });
}
