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
const COLLECTION =
  /^(?:rows|queries\s*\[\s*(\d+)\s*\]\s*(?:\.\s*rows|\[\s*(["'])rows\2\s*\]))(?!\w)/;
const CHAIN =
  /(?<!\w|(?<!\.)\.)([A-Za-z_]\w*)((?:\s*\.\s*\w+|\s*\[\s*(?:"[^"]*"|'[^']*'|\d+|[A-Za-z_][\w.]*)\s*\])*)/g;
const SEGMENT = /\.\s*(\w+)|\[\s*(?:"([^"]*)"|'([^']*)'|(\d+)|([A-Za-z_][\w.]*))\s*\]/g;
const BLOCKS_WITHOUT_READS = /\{%-?\s*(comment|raw)\s*-?%\}[\s\S]*?\{%-?\s*end\1\s*-?%\}/g;
const STRING_LITERAL = /(\[\s*(["'])(?:(?!\2).)*\2)|(["'])(?:(?!\3).)*\3/g;
const INLINE_COMMENT = /^\s*#/;

const isIndexedRow = (segment: Segment | undefined): boolean =>
  typeof segment === 'number' || segment === 'first' || segment === 'last';

const readSegments = (path: string): Segment[] =>
  [...path.matchAll(SEGMENT)].map(([, dotted, double, single, index, variable]) => {
    if (variable !== undefined) {
      return Number.NaN;
    }
    return index !== undefined ? Number(index) : dotted ?? double ?? single;
  });

interface QueryReference {
  query: number;
  column?: string;
}

const readColumn = (isRow: boolean, name: Segment | undefined): string | undefined =>
  isRow && typeof name === 'string' && name !== '' ? name : undefined;

/** The query and column a variable path reads, if its first part is a query or one of its rows. */
const readReference = (
  loops: Array<{ variable: string; query?: number }>,
  root: string,
  [first, second, third, fourth]: Segment[]
): QueryReference | undefined => {
  if (root === 'rows') {
    return { query: 0, column: readColumn(isIndexedRow(first), second) };
  }
  if (root === 'max') {
    return { query: 0, column: readColumn(true, first) };
  }
  if (root === 'queries') {
    if (typeof first !== 'number' || !Number.isInteger(first)) {
      return undefined;
    }
    if (second === 'rows') {
      return { query: first, column: readColumn(isIndexedRow(third), fourth) };
    }
    return { query: first, column: readColumn(second === 'max', third) };
  }
  const loop = [...loops].reverse().find(({ variable }) => variable === root);
  return loop?.query === undefined
    ? undefined
    : { query: loop.query, column: readColumn(true, first) };
};

/** The columns a template reads from each query it uses, keyed by query position (`rows` and `max` are query 0). */
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
  const noteChains = (body: string) => {
    for (const [, root, path] of body
      .replace(STRING_LITERAL, (_, bracketKey) => bracketKey ?? '')
      .matchAll(CHAIN)) {
      const reference = readReference(loops, root, readSegments(path));
      if (reference) {
        note(reference);
      }
    }
  };

  for (const [, tag, output] of template.replace(BLOCKS_WITHOUT_READS, '').matchAll(TAG)) {
    if (tag !== undefined && INLINE_COMMENT.test(tag)) {
      continue;
    }
    const loop = tag === undefined ? null : LOOP_HEADER.exec(tag);
    if (loop) {
      const [, , variable, collection] = loop;
      noteChains(collection);
      const matched = COLLECTION.exec(collection.trim());
      loops.push({ variable, query: matched ? Number(matched[1] ?? 0) : undefined });
      continue;
    }
    if (tag !== undefined && LOOP_END.test(tag)) {
      loops.pop();
      continue;
    }
    noteChains(tag ?? output ?? '');
  }
  return byQuery;
};

/** The columns a template reads from the first query, the one it reads as `rows`. */
export const readColumnReferences = (template: string): string[] =>
  readColumnReferencesByQuery(template).get(0) ?? [];
