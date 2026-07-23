/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Liquid } from 'liquidjs';

export interface TemplateColumn {
  name: string;
  type: string;
}

const partialsDisabled = () => {
  throw new Error('partials are disabled');
};

const liquid = new Liquid({
  strictFilters: false,
  strictVariables: false,
  dynamicPartials: false,
  relativeReference: false,
  outputEscape: 'escape',
  fs: {
    readFileSync: partialsDisabled,
    readFile: async () => partialsDisabled(),
    existsSync: () => false,
    exists: async () => false,
    resolve: partialsDisabled,
  },
});

export async function fillTemplate(
  template: string,
  columns: TemplateColumn[],
  rows: unknown[][]
): Promise<string> {
  const maxValues: Record<string, number> = {};
  columns.forEach((col, i) => {
    let max = -Infinity;
    let hasFinite = false;
    for (const r of rows) {
      if (r[i] === null) continue;
      const n = Number(r[i]);
      if (isFinite(n)) {
        if (n > max) max = n;
        hasFinite = true;
      }
    }
    if (hasFinite) maxValues[col.name] = max;
  });

  const rowObjects = rows.map((row) => {
    const obj: Record<string, { value: unknown; pct?: number }> = {};
    columns.forEach((col, i) => {
      const max = maxValues[col.name];
      let pct: number | undefined;
      if (max !== undefined) {
        const num = Number(row[i]);
        pct =
          max === 0
            ? 0
            : isFinite(num)
            ? Math.min(100, Math.max(0, Math.round((num / max) * 100)))
            : 0;
      }
      obj[col.name] = { value: row[i], pct };
    });
    return obj;
  });

  return liquid.parseAndRender(template.trim(), { rows: rowObjects, max: maxValues });
}
