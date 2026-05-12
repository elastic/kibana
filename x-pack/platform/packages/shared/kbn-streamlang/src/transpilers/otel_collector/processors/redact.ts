/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RedactProcessor } from '../../../../types/processors';
import { compileGrokPatternsToRegex } from '../../../../types/utils/grok_to_regex';
import { conditionToOttl } from '../condition_to_ottl';
import type { Emission } from '../emission';
import { attributePath, ottlStringLiteral, withWhereClause } from './common';

const DEFAULT_PREFIX = '<';
const DEFAULT_SUFFIX = '>';

/**
 * Emits one `replace_pattern` statement per compiled Grok pattern.
 *
 * Grok patterns are compiled to RE2-compatible regexes via `compileGrokPatternsToRegex`,
 * the same utility used by the ES|QL transpiler. Each pattern is applied in sequence
 * to the same source field (in-place replacement).
 *
 * `ignore_missing` defaults to `true` for redact (matching ingest pipeline behavior).
 * When explicitly set to `false`, a nil guard is added to match the `!= nil` approximation
 * used by other processors.
 *
 * Note: patterns that cannot be compiled (unknown Grok names with no custom definition)
 * are silently skipped. This matches the ingest pipeline's treatment of unknown patterns.
 */
export const convertRedactProcessorToOtel = (
  processor: RedactProcessor
): { emission: Emission; warnings: string[] } => {
  const {
    from,
    patterns,
    pattern_definitions,
    prefix = DEFAULT_PREFIX,
    suffix = DEFAULT_SUFFIX,
    ignore_missing = true,
    where,
  } = processor;

  const fromAttr = attributePath(from);
  const compiledPatterns = compileGrokPatternsToRegex(patterns, pattern_definitions);

  const warnings: string[] = [];
  if (compiledPatterns.length < patterns.length) {
    const skipped = patterns.length - compiledPatterns.length;
    warnings.push(
      `redact on field "${from}": ${skipped} of ${patterns.length} pattern(s) could not be ` +
        `compiled (unknown Grok name with no custom definition) and will be skipped.`
    );
  }

  const whereParts: string[] = [];
  if (where) whereParts.push(conditionToOttl(where));
  if (ignore_missing === false) whereParts.push(`${fromAttr} != nil`);

  const whereExpr = whereParts.length ? whereParts.map((p) => `(${p})`).join(' and ') : undefined;

  const statements: string[] = compiledPatterns.map(({ regex, semanticName }) => {
    const replacement = `${prefix}${semanticName}${suffix}`;
    return withWhereClause(
      `replace_pattern(${fromAttr}, ${ottlStringLiteral(regex)}, ${ottlStringLiteral(replacement)})`,
      whereExpr
    );
  });

  return { emission: { kind: 'transform', statements }, warnings };
};
