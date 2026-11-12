/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with, at
 * your election, the Elastic License 2.0, the GNU Affero General Public License
 * v3.0 only, or the Server Side Public License v 1".
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { EvaluatorDefinition } from '../types';
import { collectRoundText } from '../round_text';

// Capture every index pattern referenced in the round output. We look for:
//   - Bare references like `logs-*`, `.alerts-security.alerts-default`
//   - ES|QL `FROM <pattern>, <pattern>` clauses
const FROM_CLAUSE_PATTERN = /\bFROM\s+([\w.*,\s-]+?)(?:\s+\||\s*$|\s*\n)/gi;
const INLINE_INDEX_PATTERN =
  /(?:^|[\s`'"(\[])((?:\.?[a-z][\w.-]*(?:-[\w.*-]+)?)(?:\*|-\*)?)(?=[\s`'")\].,;]|$)/gim;

// Common words / keywords / schema terms that match the index regex but are
// obviously not index patterns. Keeping this list short — the real filter is
// "does ES know about it".
const NON_INDEX_KEYWORDS = new Set([
  'from',
  'where',
  'stats',
  'eval',
  'sort',
  'limit',
  'keep',
  'drop',
  'rename',
  'grok',
  'dissect',
  'enrich',
  'row',
  'show',
  'meta',
  'mv_expand',
  'by',
  'and',
  'or',
  'not',
  'null',
  'true',
  'false',
  'asc',
  'desc',
]);

const looksLikeIndexPattern = (candidate: string): boolean => {
  const lower = candidate.toLowerCase();
  if (NON_INDEX_KEYWORDS.has(lower)) return false;
  // Must contain a `-`, `*`, `.`, or the characteristic Kibana `.alerts`/`.ds`
  // prefix; a bare identifier like "foo" is almost always not an index.
  if (!/[-.*]/.test(candidate)) return false;
  // Version strings like "8.11.0" — skip.
  if (/^\d[\d.]*$/.test(candidate)) return false;
  return true;
};

const extractIndexPatterns = (content: string): string[] => {
  const found = new Set<string>();

  FROM_CLAUSE_PATTERN.lastIndex = 0;
  let m = FROM_CLAUSE_PATTERN.exec(content);
  while (m) {
    for (const piece of m[1].split(',')) {
      const trimmed = piece.trim();
      if (trimmed && looksLikeIndexPattern(trimmed)) {
        found.add(trimmed);
      }
    }
    m = FROM_CLAUSE_PATTERN.exec(content);
  }

  INLINE_INDEX_PATTERN.lastIndex = 0;
  m = INLINE_INDEX_PATTERN.exec(content);
  while (m) {
    const candidate = m[1].trim();
    if (looksLikeIndexPattern(candidate)) {
      found.add(candidate);
    }
    m = INLINE_INDEX_PATTERN.exec(content);
  }

  return Array.from(found);
};

interface ResolveResult {
  pattern: string;
  resolved: boolean;
  reason?: string;
}

/**
 * Uses `indices.resolveIndex` to ask ES whether a pattern maps to any
 * concrete index, alias, or data stream. We treat "empty resolution" as a
 * soft failure — the output references a pattern that the current cluster
 * can't satisfy.
 */
const resolvePattern = async (
  esClient: ElasticsearchClient,
  pattern: string
): Promise<ResolveResult> => {
  try {
    const res = (await (
      esClient as unknown as {
        indices: {
          resolveIndex: (p: {
            name: string;
            expand_wildcards?: string;
          }) => Promise<{ indices?: unknown[]; aliases?: unknown[]; data_streams?: unknown[] }>;
        };
      }
    ).indices.resolveIndex({
      name: pattern,
      expand_wildcards: 'open,hidden',
    })) as { indices?: unknown[]; aliases?: unknown[]; data_streams?: unknown[] };

    const total =
      (res.indices?.length ?? 0) + (res.aliases?.length ?? 0) + (res.data_streams?.length ?? 0);

    return total > 0
      ? { pattern, resolved: true }
      : { pattern, resolved: false, reason: 'Pattern matches zero indices/aliases/data streams' };
  } catch (err) {
    // `404 index_not_found_exception` is the expected "doesn't exist" signal
    // from resolveIndex. Anything else is a transport/auth failure — surface
    // it as an unresolved with the reason.
    const body = (err as { meta?: { body?: { error?: { type?: string; reason?: string } } } }).meta
      ?.body?.error;
    const reason = body?.reason ?? (err as Error).message ?? String(err);
    return { pattern, resolved: false, reason };
  }
};

export const indexResolvesEvaluator: EvaluatorDefinition = {
  name: 'skill-index-resolves',
  version: '1.0.0',
  kind: 'code',
  origin: 'built_in',
  direction: 'maximize',
  description:
    'Verifies every index/data-stream pattern referenced in the round output resolves on the active cluster.',
  async evaluate({ round, trace }) {
    const content = collectRoundText(round);
    const patterns = extractIndexPatterns(content);

    if (patterns.length === 0) {
      return {
        scores: [
          {
            name: 'skill-index-resolves',
            score: 1.0,
            label: 'pass',
            explanation: 'No index patterns to resolve',
          },
        ],
      };
    }

    const results = await Promise.all(patterns.map((p) => resolvePattern(trace.esClient, p)));
    const unresolved = results.filter((r) => !r.resolved);
    const score = (results.length - unresolved.length) / results.length;

    if (unresolved.length === 0) {
      return {
        scores: [
          {
            name: 'skill-index-resolves',
            score: 1.0,
            label: 'pass',
            explanation: `All ${results.length} referenced index pattern${
              results.length === 1 ? '' : 's'
            } resolved`,
            metadata: { patternCount: results.length },
          },
        ],
      };
    }

    const summary = unresolved
      .slice(0, 5)
      .map((f) => `"${f.pattern}"`)
      .join(', ');

    return {
      scores: [
        {
          name: 'skill-index-resolves',
          // Soft-fail threshold: if ≥70% resolved we warn; otherwise fail. This
          // avoids hard-failing when the output references one optional dataset.
          score,
          label: score >= 0.7 ? 'warn' : 'fail',
          explanation: `${unresolved.length}/${results.length} index pattern${
            unresolved.length === 1 ? ' does' : 's do'
          } not resolve on this cluster: ${summary}`,
          metadata: {
            patternCount: results.length,
            unresolvedCount: unresolved.length,
            unresolved,
          },
        },
      ],
    };
  },
};
