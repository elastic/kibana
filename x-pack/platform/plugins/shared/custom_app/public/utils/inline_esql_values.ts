/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Parser, Walker } from '@elastic/esql';

/** A text as ES|QL writes it: in double quotes, with what would end it, or break a line, escaped. */
const quote = (text: string): string =>
  `"${text
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
    // Any other control character has no place in a value that is looked for.
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, ' ')}"`;

/** What a parameter can be given: what the app holds, and what a dashboard control gives. */
export type InlinedValue = string | number | boolean | ReadonlyArray<string | number>;

const scalar = (value: string | number | boolean): string => {
  if (typeof value === 'string') return quote(value);
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'null';
  return value ? 'true' : 'false';
};

interface Replacement {
  min: number;
  max: number;
  text: string;
  literal: string;
}

/**
 * Writes the values of the app into its ES|QL query as literals, for a place that takes a query and
 * no parameters, such as Discover. Only the parameters the query has, found by the ES|QL parser and
 * not by searching the text, are replaced, so a `?name` in a string or a comment is left alone, and
 * every value is written as a quoted, escaped literal, never as text that could be read as query.
 * A list is written as the values of an `IN (...)`, and as a list of values anywhere else; an empty
 * list is `null`. A parameter with no value, such as the time range, is left as it is. Returns
 * nothing when the query cannot be read, or when what was found does not match the text, since a
 * query is then not safe to change.
 */
export const inlineEsqlValues = (
  query: string,
  values: Readonly<Record<string, InlinedValue>>
): string | undefined => {
  const { root, errors } = Parser.parse(query);
  if (errors.length > 0) return undefined;

  // The parser counts characters, and a string counts 16-bit units, which differ after an emoji.
  const unitOf: number[] = [];
  let units = 0;
  for (const character of query) {
    unitOf.push(units);
    units += character.length;
  }
  unitOf.push(units);

  const replacements: Replacement[] = [];
  Walker.walk(root, {
    visitLiteral: (node, parent) => {
      const { literalType, text, location } = node as unknown as {
        literalType: string;
        text: string;
        location: { min: number; max: number };
      };
      // `?name` is a value; `??name` is a name of a field, which the app does not offer.
      if (literalType !== 'param' || !text.startsWith('?') || text.startsWith('??')) return;
      const key = text.slice(1);
      if (!Object.prototype.hasOwnProperty.call(values, key)) return;

      const value = values[key];
      const container = parent as unknown as
        | { type: string; name?: string; values?: unknown[] }
        | undefined;
      let literal: string;
      if (Array.isArray(value)) {
        const items = value.map(scalar);
        // `IN (?users)` takes the values themselves, and not a list of them in it.
        const isOnlyItemOfList = container?.type === 'list' && container.values?.length === 1;
        literal =
          items.length === 0
            ? 'null'
            : isOnlyItemOfList
            ? items.join(', ')
            : `[${items.join(', ')}]`;
      } else if (
        container?.type === 'command' &&
        container.name === 'limit' &&
        typeof value === 'string' &&
        /^\d+$/.test(value)
      ) {
        // A select gives a text, and a limit is a number.
        literal = value;
      } else {
        literal = scalar(value as string | number | boolean);
      }
      replacements.push({
        min: unitOf[location.min] ?? -1,
        max: (unitOf[location.max + 1] ?? -1) - 1,
        text,
        literal,
      });
    },
  });

  // What the parser says is there must be there, or its positions cannot be trusted.
  const misplaced = replacements.some(({ min, max, text }) => query.slice(min, max + 1) !== text);
  if (misplaced) return undefined;

  const inlined = replacements
    .sort((a, b) => b.min - a.min)
    .reduce(
      (current, { min, max, literal }) => current.slice(0, min) + literal + current.slice(max + 1),
      query
    );

  // What was made must be a query still.
  return Parser.parse(inlined).errors.length > 0 ? undefined : inlined;
};
