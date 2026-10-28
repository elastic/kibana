/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Liquid } from 'liquidjs';

const liquid = new Liquid();

/**
 * The columns a template reads: the name that follows a row, such as `host` in
 * `row["host"].value`, `r.host.pct` or `max["host"]`. It is read from the template's own variable
 * paths, so quoting, dot access and the name of the loop variable do not matter, and a property of
 * a cell (`value`, `pct`) is never taken for a column. A template that does not parse reads none.
 */
export const readColumnReferences = (template: string): string[] => {
  try {
    const { variables } = liquid.analyzeSync(liquid.parse(template));
    const names = Object.values(variables).flatMap((usages) =>
      usages.flatMap(({ segments: [root, ...path] }) => {
        // `rows` holds the rows, so only an indexed row, `rows[0]["host"]`, reads a column.
        const [column] =
          root === 'rows' ? path.slice(typeof path[0] === 'number' ? 1 : path.length) : path;
        return typeof column === 'string' ? [column] : [];
      })
    );
    return [...new Set(names)];
  } catch {
    return [];
  }
};
