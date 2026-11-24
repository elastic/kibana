/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Liquid } from 'liquidjs';
import { CUSTOM_CONTENT_LIQUID_OPTIONS } from '@kbn/custom-content-common';

const liquid = new Liquid(CUSTOM_CONTENT_LIQUID_OPTIONS);

type Segment = string | number;

const TAG = /\{%-?([\s\S]*?)-?%\}|\{\{-?([\s\S]*?)-?\}\}/g;
const LOOP_HEADER = /^\s*(for|tablerow)\s+(\w+)\s+in\s+([\s\S]+)$/;
const LOOP_END = /^\s*end(for|tablerow)\s*$/;
const COLLECTION = /^(?:rows|queries\s*\[\s*(\d+)\s*\]\s*\.\s*rows)\b/;
const CHAIN = /(?<![\w.])([A-Za-z_]\w*)((?:\s*\.\s*\w+|\s*\[\s*(?:"[^"]*"|'[^']*'|\d+)\s*\])*)/g;
const SEGMENT = /\.\s*(\w+)|\[\s*(?:"([^"]*)"|'([^']*)'|(\d+))\s*\]/g;

const isIndexedRow = (segment: Segment | undefined): boolean =>
  typeof segment === 'number' || segment === 'first' || segment === 'last';

const readSegments = (path: string): Segment[] =>
  [...path.matchAll(SEGMENT)].map(([, dotted, double, single, index]) =>
    index !== undefined ? Number(index) : dotted ?? double ?? single
  );

interface QueryReference {
  query: number;
  column?: string;
}

/** The query and column a variable path reads, if its first part is a query or one of its rows. */
const readReference = (
  loops: Array<{ variable: string; query?: number }>,
  root: string,
  [first, second, third, fourth]: Segment[]
): QueryReference | undefined => {
  if (root === 'rows') {
    return {
      query: 0,
      column: isIndexedRow(first) ? String(second ?? '') || undefined : undefined,
    };
  }
  if (root === 'max') {
    return { query: 0, column: first === undefined ? undefined : String(first) };
  }
  if (root === 'queries') {
    if (typeof first !== 'number') {
      return undefined;
    }
    if (second === 'rows') {
      return {
        query: first,
        column: isIndexedRow(third) ? String(fourth ?? '') || undefined : undefined,
      };
    }
    return {
      query: first,
      column: second === 'max' && third !== undefined ? String(third) : undefined,
    };
  }
  const loop = [...loops].reverse().find(({ variable }) => variable === root);
  return loop?.query === undefined
    ? undefined
    : { query: loop.query, column: first === undefined ? undefined : String(first) };
};

/**
 * The columns a template reads from each query it uses, keyed by the position of the query: `rows`
 * and `max` are the first query, `queries[n]` the others. A column is the name that follows a
 * row, such as `host` in `row["host"].value`, `r.host.pct`, `max["host"]`, `rows[0]["host"]` or
 * `queries[1].rows[0].host`. The row is the variable of a `{% for … in rows %}` or
 * `{% for … in queries[n].rows %}` loop, whatever it is called, and it belongs to the query that
 * loop iterates, also when another loop reuses the name for another query. Quoting and dot access
 * do not matter, and neither a property of a cell (`value`, `pct`) nor of anything else
 * (`forloop.index`, an `assign`ed cell) is taken for a column. A query the template only counts
 * (`queries[2].rows.size`) is a key with no columns. A template that does not parse reads none.
 */
export const readColumnReferencesByQuery = (template: string): Map<number, string[]> => {
  const byQuery = new Map<number, string[]>();
  try {
    liquid.parse(template);
  } catch {
    return byQuery;
  }

  const loops: Array<{ variable: string; query?: number }> = [];
  const note = ({ query, column }: QueryReference) => {
    const columns = byQuery.get(query) ?? [];
    if (column && !columns.includes(column)) {
      columns.push(column);
    }
    byQuery.set(query, columns);
  };

  for (const [, tag, output] of template.matchAll(TAG)) {
    const loop = tag === undefined ? null : LOOP_HEADER.exec(tag);
    if (loop) {
      const [, , variable, collection] = loop;
      const matched = COLLECTION.exec(collection.trim());
      const query = matched ? Number(matched[1] ?? 0) : undefined;
      loops.push({ variable, query });
      if (query !== undefined) {
        note({ query });
      }
      continue;
    }
    if (tag !== undefined && LOOP_END.test(tag)) {
      loops.pop();
      continue;
    }
    for (const [, root, path] of (tag ?? output ?? '').matchAll(CHAIN)) {
      const reference = readReference(loops, root, readSegments(path));
      if (reference) {
        note(reference);
      }
    }
  }
  return byQuery;
};

/** The columns a template reads from the first query, the one it reads as `rows`. */
export const readColumnReferences = (template: string): string[] =>
  readColumnReferencesByQuery(template).get(0) ?? [];
