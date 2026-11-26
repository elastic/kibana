/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Liquid, TokenKind, type Template } from 'liquidjs';
import { CUSTOM_CONTENT_LIQUID_OPTIONS } from '@kbn/custom-content-common';

const liquid = new Liquid(CUSTOM_CONTENT_LIQUID_OPTIONS);

type Segments = ReadonlyArray<unknown>;

interface Loop {
  variable: string;
  query?: number;
}

interface LoopTag {
  variable: string;
  collection: { kind: TokenKind; input: string; begin: number; end: number };
  templates: Template[];
  elseTemplates?: Template[];
}

interface QueryReference {
  query: number;
  column?: string;
}

const isLoopTag = (template: Template): template is Template & LoopTag =>
  'name' in template.token && (template.token.name === 'for' || template.token.name === 'tablerow');

/** A row is picked by a position, `first`, `last`, or a variable. */
const isRowPick = (segment: unknown): boolean =>
  typeof segment === 'number' || segment === 'first' || segment === 'last' || isVariable(segment);

const isVariable = (segment: unknown): boolean => typeof segment === 'object' && segment !== null;

const isQueryPosition = (segment: unknown): segment is number => Number.isInteger(segment);

const asColumn = (segment: unknown): string | undefined => {
  if (typeof segment === 'number') {
    return String(segment);
  }
  return typeof segment === 'string' && segment !== '' ? segment : undefined;
};

/** The query and column a variable path reads, if it starts from a query, its `max` or one of its rows. */
const readReference = (
  loops: Loop[],
  [root, first, second, third, fourth]: Segments
): QueryReference | undefined => {
  if (root === 'rows') {
    return { query: 0, column: isRowPick(first) ? asColumn(second) : undefined };
  }
  if (root === 'max') {
    return { query: 0, column: asColumn(first) };
  }
  if (root === 'queries') {
    if (!isQueryPosition(first)) {
      return undefined;
    }
    if (second === 'rows') {
      return { query: first, column: isRowPick(third) ? asColumn(fourth) : undefined };
    }
    return { query: first, column: second === 'max' ? asColumn(third) : undefined };
  }
  const loop = [...loops].reverse().find(({ variable }) => variable === root);
  return loop?.query === undefined ? undefined : { query: loop.query, column: asColumn(first) };
};

const readSegments = (expression: string): Segments | undefined => {
  const { variables } = liquid.parseAndAnalyzeSync(`{{ ${expression} }}`);
  return Object.values(variables)[0]?.[0]?.segments;
};

/** The query whose rows a loop goes through: `rows` is the first, `queries[n].rows` the n-th. */
const readLoopQuery = ({
  collection: { kind, input, begin, end },
}: LoopTag): number | undefined => {
  if (kind !== TokenKind.PropertyAccess) {
    return undefined;
  }
  const [root, first, second] = readSegments(input.slice(begin, end)) ?? [];
  if (root === 'rows') {
    return 0;
  }
  return root === 'queries' && isQueryPosition(first) && second === 'rows' ? first : undefined;
};

/** The loops of these templates that are not inside another loop, however deep in other tags. */
const findOutermostLoops = (templates: Template[]): Array<Template & LoopTag> =>
  templates.flatMap((template) => {
    if (isLoopTag(template)) {
      return [template, ...findOutermostLoops(template.elseTemplates ?? [])];
    }
    const children = template.children?.(false, true);
    let step = children?.next();
    while (step && !step.done) {
      step = children?.next();
    }
    return step?.done ? findOutermostLoops(step.value) : [];
  });

/** The columns a template reads from each query it uses, keyed by query position (`rows` and `max` are query 0). */
export const readColumnReferencesByQuery = (template: string): Map<number, string[]> => {
  const byQuery = new Map<number, string[]>();
  const read = (scope: Template[], loops: Loop[]) => {
    for (const usages of Object.values(liquid.analyzeSync(scope).globals)) {
      for (const { segments } of usages) {
        const reference = readReference(loops, segments);
        if (reference) {
          const columns = byQuery.get(reference.query) ?? [];
          if (reference.column && !columns.includes(reference.column)) {
            columns.push(reference.column);
          }
          byQuery.set(reference.query, columns);
        }
      }
    }
    for (const loop of findOutermostLoops(scope)) {
      read(loop.templates, [...loops, { variable: loop.variable, query: readLoopQuery(loop) }]);
    }
  };

  try {
    read(liquid.parse(template), []);
    return byQuery;
  } catch {
    return new Map();
  }
};

/** The columns a template reads from the first query, the one it reads as `rows`. */
export const readColumnReferences = (template: string): string[] =>
  readColumnReferencesByQuery(template).get(0) ?? [];
