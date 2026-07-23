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
});

export async function fillTemplate(
  template: string,
  columns: ESQLColumn[],
  rows: unknown[][]
): Promise<string> {
  const maxValues: Record<string, number> = {};
  columns.forEach((col, i) => {
    const nums = rows.map((r) => Number(r[i])).filter((v) => isFinite(v));
    if (nums.length > 0) maxValues[col.name] = nums.reduce((a, b) => (b > a ? b : a), -Infinity);
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
