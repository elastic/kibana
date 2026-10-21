/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Dimension } from './dashboard';

const UNIT_MS: Record<string, number> = {
  ms: 1,
  millisecond: 1,
  milliseconds: 1,
  s: 1_000,
  second: 1_000,
  seconds: 1_000,
  m: 60_000,
  minute: 60_000,
  minutes: 60_000,
  h: 3_600_000,
  hour: 3_600_000,
  hours: 3_600_000,
  d: 86_400_000,
  day: 86_400_000,
  days: 86_400_000,
  w: 604_800_000,
  week: 604_800_000,
  weeks: 604_800_000,
};

/** Splits on `separator` outside quotes, backticks, and parentheses. */
export const splitTopLevel = (text: string, separator: string): string[] => {
  const parts: string[] = [];
  let depth = 0;
  let quote: string | undefined;
  let start = 0;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]!;
    if (quote) {
      if (char === '\\' && quote === '"') {
        index += 1;
      } else if (char === quote) {
        quote = undefined;
      }
    } else if (char === '"' || char === '`') {
      quote = char;
    } else if (char === '(') {
      depth += 1;
    } else if (char === ')') {
      depth -= 1;
    } else if (depth === 0 && text.startsWith(separator, index)) {
      parts.push(text.slice(start, index));
      start = index + separator.length;
    }
  }
  parts.push(text.slice(start));
  return parts.map((part) => part.trim()).filter((part) => part.length > 0);
};

const IDENTIFIER = /^(?:`(?:[^`]|``)+`|[A-Za-z_@][\w.@]*)$/;

/** An identifier without backtick quoting, or `undefined` for an expression. */
const identifier = (text: string): string | undefined => {
  const trimmed = text.trim();
  if (!IDENTIFIER.test(trimmed)) {
    return undefined;
  }
  return trimmed.startsWith('`') ? trimmed.slice(1, -1).replace(/``/g, '`') : trimmed;
};

/** `name = expression`, or a bare expression named after itself. */
const assignment = (text: string): { name: string; expression: string } | undefined => {
  const parts = splitTopLevel(text, '=');
  if (parts.length === 2) {
    const name = identifier(parts[0]!);
    return name === undefined ? undefined : { name, expression: parts[1]! };
  }
  const name = identifier(text);
  return name === undefined ? undefined : { name, expression: text };
};

/**
 * The smallest of 1, 5, 10, 50, … at or above `span / buckets`: the width ES|QL's four-argument numeric
 * `BUCKET` picked in every probe against ES 9.6. Bindings check it against the keys ES returns.
 */
export const numericBucketWidth = (
  buckets: number,
  from: number,
  to: number
): number | undefined => {
  const raw = (to - from) / buckets;
  if (!Number.isFinite(raw) || raw <= 0) {
    return undefined;
  }
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  return [1, 5, 10].map((step) => step * magnitude).find((width) => width >= raw - 1e-9);
};

/** What `BUCKET(field, …)` means for selection, or `undefined` when its width can't be known. */
const bucketDimension = (
  args: string[],
  source: (name: string) => string | undefined
): Dimension | undefined => {
  const field = source(args[0] ?? '');
  if (!field) {
    return undefined;
  }
  if (args.length === 2) {
    const span = /^(\d+)\s*([a-z]+)$/i.exec(args[1]!);
    if (span) {
      const unit = UNIT_MS[span[2]!.toLowerCase()];
      return unit === undefined
        ? undefined
        : { kind: 'date_histogram', field, intervalMs: Number(span[1]) * unit };
    }
    const width = Number(args[1]);
    return Number.isFinite(width) && width > 0 ? { kind: 'histogram', field, width } : undefined;
  }
  if (args.length === 4) {
    const [buckets, from, to] = args.slice(1).map(Number);
    const width = numericBucketWidth(buckets!, from!, to!);
    return width === undefined ? undefined : { kind: 'histogram', field, width, derived: true };
  }
  return undefined;
};

/**
 * Maps each column an ES|QL query outputs back to the source field and bucketing it came from, by following
 * `EVAL` aliases, `STATS … BY` groupings, and `RENAME`. Computed columns map to nothing, so they stay unselectable.
 */
export const dimensionsFromEsql = (esql: string): Record<string, Dimension> => {
  /** Column → what it is: a source field, a grouping dimension, or computed. */
  let columns = new Map<string, { field: string } | { dimension: Dimension } | 'computed'>();
  const source = (expression: string): string | undefined => {
    const name = identifier(expression);
    if (name === undefined) {
      return undefined;
    }
    const known = columns.get(name);
    if (known === undefined) {
      return name;
    }
    return known !== 'computed' && 'field' in known ? known.field : undefined;
  };

  for (const command of splitTopLevel(esql, '|')) {
    const [, keyword = '', rest = ''] = /^(\w+)\s*([\s\S]*)$/.exec(command) ?? [];
    switch (keyword.toUpperCase()) {
      case 'FROM':
        columns = new Map();
        break;
      case 'EVAL':
        for (const part of splitTopLevel(rest, ',')) {
          const parsed = assignment(part);
          if (!parsed) {
            continue;
          }
          const field = source(parsed.expression);
          columns.set(parsed.name, field ? { field } : 'computed');
        }
        break;
      case 'STATS': {
        const [aggregates = '', groupings = ''] =
          splitTopLevel(rest, ' BY ').length > 1
            ? splitTopLevel(rest, ' BY ')
            : splitTopLevel(rest, ' by ');
        const next = new Map<string, { field: string } | { dimension: Dimension } | 'computed'>();
        for (const part of splitTopLevel(aggregates, ',')) {
          const parsed = assignment(part);
          next.set(parsed?.name ?? part, 'computed');
        }
        for (const part of splitTopLevel(groupings, ',')) {
          const parsed = assignment(part);
          if (!parsed) {
            continue;
          }
          const bucket = /^BUCKET\s*\(([\s\S]*)\)$/i.exec(parsed.expression.trim());
          if (bucket) {
            const dimension = bucketDimension(splitTopLevel(bucket[1]!, ','), source);
            next.set(parsed.name, dimension ? { dimension } : 'computed');
            continue;
          }
          const field = source(parsed.expression);
          next.set(parsed.name, field ? { dimension: { kind: 'terms', field } } : 'computed');
        }
        columns = next;
        break;
      }
      case 'INLINESTATS':
        for (const part of splitTopLevel(rest.split(/\s+BY\s+/i)[0] ?? '', ',')) {
          const parsed = assignment(part);
          if (parsed) {
            columns.set(parsed.name, 'computed');
          }
        }
        break;
      case 'RENAME':
        for (const part of splitTopLevel(rest, ',')) {
          const [from, to] = part.split(/\s+AS\s+/i).map((name) => identifier(name));
          if (from && to) {
            const known = columns.get(from) ?? { field: from };
            columns.delete(from);
            columns.set(to, known);
          }
        }
        break;
      case 'DROP':
        for (const part of splitTopLevel(rest, ',')) {
          const name = identifier(part);
          if (name) {
            columns.delete(name);
          }
        }
        break;
      default:
        break;
    }
  }
  return Object.fromEntries(
    [...columns].flatMap(([name, value]) =>
      value !== 'computed' && 'dimension' in value ? [[name, value.dimension]] : []
    )
  );
};
