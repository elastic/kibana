/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Liquid } from 'liquidjs';
import { CUSTOM_CONTENT_LIQUID_OPTIONS } from '@kbn/custom-content-common';

const liquid = new Liquid(CUSTOM_CONTENT_LIQUID_OPTIONS);

const ROW_LOOP = /\{%-?\s*for\s+(\w+)\s+in\s+rows\b/g;

const isIndexedRow = (segment: unknown): boolean =>
  typeof segment === 'number' || segment === 'first' || segment === 'last';

/** The column a variable path reads, if its first part is a row: `host` in `r.host.value`. */
const readColumn = (rowVariables: Set<string>, [root, ...path]: unknown[]): unknown => {
  if (root === 'rows') {
    return isIndexedRow(path[0]) ? path[1] : undefined;
  }
  return rowVariables.has(String(root)) ? path[0] : undefined;
};

/**
 * The columns a template reads: the name that follows a row, such as `host` in
 * `row["host"].value`, `r.host.pct`, `max["host"]` or `rows[0]["host"]`. The row is the variable of a
 * `{% for … in rows %}` loop, whatever it is called, so quoting and dot access do not matter, and
 * neither a property of a cell (`value`, `pct`) nor of anything else (`forloop.index`, an `assign`ed
 * cell) is taken for a column. A template that does not parse reads none.
 */
export const readColumnReferences = (template: string): string[] => {
  try {
    const rowVariables = new Set(['max']);
    [...template.matchAll(ROW_LOOP)].forEach(([, name]) => rowVariables.add(name));

    const { variables } = liquid.analyzeSync(liquid.parse(template));
    const columns = Object.values(variables)
      .flatMap((usages) => usages.map(({ segments }) => readColumn(rowVariables, segments)))
      .filter((column): column is string => typeof column === 'string');
    return [...new Set(columns)];
  } catch {
    return [];
  }
};
