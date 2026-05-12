/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { JsonExtractProcessor } from '../../../../types/processors';
import { conditionToOttl } from '../condition_to_ottl';
import type { Emission } from '../emission';
import { attributePath, ottlStringLiteral, withWhereClause } from './common';

const TEMP_ATTR = '__sl_p';

const TYPE_CONVERTER: Partial<Record<string, string>> = {
  integer: 'Int',
  long: 'Int',
  double: 'Double',
  boolean: 'Bool',
  // keyword → no conversion (leave as ParseJSON output type, usually string)
};

/**
 * Convert a JSONPath-like selector to a chain of OTTL bracket access expressions.
 *
 * Supported forms:
 *   user_id         → ["user_id"]
 *   user.name       → ["user"]["name"]
 *   items[0]        → ["items"][0]
 *   items[0].name   → ["items"][0]["name"]
 *   $.user.name     → ["user"]["name"]
 *
 * Dot-notation maps to nested object access. Array indices use numeric OTTL syntax.
 */
const selectorToOttlAccess = (selector: string): string => {
  let s = selector.replace(/^\$\.?/, '');
  let result = '';

  while (s.length > 0) {
    const indexMatch = s.match(/^\[(\d+)\]/);
    if (indexMatch) {
      result += `[${indexMatch[1]}]`;
      s = s.slice(indexMatch[0].length);
      if (s.startsWith('.')) s = s.slice(1);
      continue;
    }

    const keyMatch = s.match(/^([^.[\]]+)/);
    if (keyMatch) {
      result += `[${ottlStringLiteral(keyMatch[1])}]`;
      s = s.slice(keyMatch[1].length);
      if (s.startsWith('.')) s = s.slice(1);
      continue;
    }

    break;
  }

  return result;
};

/**
 * Emits OTTL statements for `json_extract`:
 *
 * 1. `set(__sl_p, ParseJSON(field))` — parse the JSON string into a pmap attribute
 * 2. For each extraction: `set(target, [Converter?](__sl_p[selector]))` — pull out fields
 * 3. `delete_key(log.attributes, "__sl_p")` — clean up the intermediate attribute
 *
 * JSON numbers are always `doubleValue` after `ParseJSON`. If a field is declared
 * `type: integer`, it is wrapped in `Int()` which truncates to int64. No data
 * type information is embedded in the JSON itself, so the cast is on a best-effort
 * basis.
 *
 * `ignore_missing: false` (default): a `field != nil` guard prevents ParseJSON
 * from running on a missing field. Note that extractions from a parsed nil key will
 * still silently produce nil — OTTL has no "error on nil" primitive.
 *
 * Selector semantics: dot-notation maps to nested pmap access. Array indexing via
 * `[n]` is supported. JSONPath `$.` prefix is stripped. Complex JSONPath expressions
 * (filter predicates, recursive descent) are not supported.
 */
export const convertJsonExtractProcessorToOtel = (
  processor: JsonExtractProcessor
): { emission: Emission; warnings: string[] } => {
  const { field, extractions, ignore_missing = false, where } = processor;
  const fromAttr = attributePath(field);
  const tempAttr = attributePath(TEMP_ATTR);

  const whereParts: string[] = [];
  if (where) whereParts.push(conditionToOttl(where));
  if (!ignore_missing) whereParts.push(`${fromAttr} != nil`);
  const whereExpr = whereParts.length ? whereParts.map((p) => `(${p})`).join(' and ') : undefined;

  const tempPresentGuard = `(${tempAttr} != nil)`;

  const statements: string[] = [
    withWhereClause(`set(${tempAttr}, ParseJSON(${fromAttr}))`, whereExpr),
  ];

  for (const { selector, target_field, type } of extractions) {
    const targetAttr = attributePath(target_field);
    const access = selectorToOttlAccess(selector);
    const source = `${tempAttr}${access}`;
    const converter = type ? TYPE_CONVERTER[type] : undefined;
    const valueExpr = converter ? `${converter}(${source})` : source;
    statements.push(`set(${targetAttr}, ${valueExpr}) where ${tempPresentGuard}`);
  }

  statements.push(
    `delete_key(log.attributes, ${ottlStringLiteral(TEMP_ATTR)}) where ${tempPresentGuard}`
  );

  return { emission: { kind: 'transform', statements }, warnings: [] };
};
