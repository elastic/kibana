/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GrokProcessor } from '../../../../types/processors';
import { conditionToOttl } from '../condition_to_ottl';
import type { Emission } from '../emission';
import { attributePath, ottlStringLiteral, withWhereClause } from './common';

/**
 * Emits one OTTL statement per grok pattern:
 *   `merge_maps(log.attributes,
 *     ExtractGrokPatterns(log.attributes["<from>"], "<pattern>", true[, defs]),
 *     "upsert") where <cond>`
 *
 * Semantics vs. ingest grok:
 * - Ingest grok tries each pattern until one matches, then stops. OTTL
 *   ExtractGrokPatterns takes a single pattern; we emit one statement per
 *   pattern. If an earlier pattern already populated the expected fields, a
 *   later one may overwrite them — this is a lossy area and is flagged in the
 *   transpiler warnings for multi-pattern inputs.
 * - Named captures flow into `log.attributes` directly via `merge_maps`, which
 *   is usable as a top-level OTTL statement (docs: "merge_maps is a special
 *   case of the set function").
 * - `pattern_definitions` are forwarded as the 4th `PatternDefinitions []string`
 *   argument to `ExtractGrokPatterns` using "NAME=regex" format. This delegates
 *   dotSep substitution and @-stripping to go-grok, avoiding invalid Go RE2
 *   named capture groups that would result from inlining (e.g. `(?<@timestamp>)`
 *   or `(?<client.ip>)` are rejected by RE2).
 */

const GROK_REF = /%{([A-Z0-9_]+)/g;
// Matches %{PATTERN:@fieldname} — @ prefix is not a valid Go RE2 capture name and go-grok
// does not sanitize it, so the field will be silently dropped at extraction time.
const AT_FIELD_CAPTURE = /%{[A-Z0-9_]+:@[^}]+}/;

function findCyclicDefinitions(defs: Record<string, string>): string[] {
  const cyclic: string[] = [];
  for (const name of Object.keys(defs)) {
    const visited = new Set<string>();
    const stack = [name];
    outer: while (stack.length) {
      const cur = defs[stack.pop()!];
      if (!cur) continue;
      for (const [, ref] of cur.matchAll(GROK_REF)) {
        if (ref === name) {
          cyclic.push(name);
          break outer;
        }
        if (!visited.has(ref) && defs[ref]) {
          visited.add(ref);
          stack.push(ref);
        }
      }
    }
  }
  return [...new Set(cyclic)];
}

export const convertGrokProcessorToOtel = (
  processor: GrokProcessor
): { emission: Emission; warnings: string[] } => {
  const { from, patterns, pattern_definitions, ignore_missing = false, where } = processor;
  const fromAttr = attributePath(from);

  const whereParts: string[] = [];
  if (where) whereParts.push(conditionToOttl(where));
  if (!ignore_missing) whereParts.push(`${fromAttr} != nil`);
  const whereExpr = whereParts.length ? whereParts.map((p) => `(${p})`).join(' and ') : undefined;

  const warnings: string[] = [];
  if (patterns.length > 1) {
    warnings.push(
      `grok processor on field "${from}" uses ${patterns.length} patterns; OTTL evaluates them sequentially and later matches overwrite earlier ones (ingest grok stops at first match).`
    );
  }
  if (patterns.some((p) => AT_FIELD_CAPTURE.test(p))) {
    warnings.push(
      `grok processor on field "${from}" captures into a field name starting with '@' (e.g. @timestamp). go-grok does not sanitize '@' in capture group names so the field will not be extracted. Use a plain field name instead.`
    );
  }

  let patternDefsArg = '';
  if (pattern_definitions && Object.keys(pattern_definitions).length > 0) {
    const cyclic = findCyclicDefinitions(pattern_definitions);
    if (cyclic.length > 0) {
      warnings.push(
        `grok processor on field "${from}" has cyclic pattern_definitions: ${cyclic.join(', ')}. The collector will fail to parse these patterns at startup.`
      );
    }
    const entries = Object.entries(pattern_definitions)
      .map(([name, regex]) => ottlStringLiteral(`${name}=${regex}`))
      .join(', ');
    patternDefsArg = `, [${entries}]`;
  }

  const statements = patterns.map((pattern) =>
    withWhereClause(
      `merge_maps(log.attributes, ExtractGrokPatterns(${fromAttr}, ${ottlStringLiteral(pattern)}, true${patternDefsArg}), "upsert")`,
      whereExpr
    )
  );

  return {
    emission: { kind: 'transform', statements },
    warnings,
  };
};
