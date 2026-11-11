/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getIndexPatternFromESQLQuery } from '@kbn/esql-utils';

/** Strip the quoting ES|QL allows around source names (`"metrics-*:metrics-*"`). */
const normalizeSource = (source: string): string => source.trim().replace(/^["'`]+|["'`]+$/g, '');

const parseSources = (value: string): string[] =>
  value.split(',').map(normalizeSource).filter(Boolean);

/**
 * Check that a generated query only reads from the index the caller grounded it against.
 *
 * Neither guardrail in the generation loop catches a hallucinated source: the ES|QL
 * validator deliberately skips its unknown-source check for any name containing a
 * wildcard, and Elasticsearch answers a wildcard matching no index with an empty result
 * rather than an error. A query against an invented `something*` pattern therefore passes
 * validation and execution unnoticed, and the visualization renders empty.
 *
 * Returns a message to feed back to the model when the query reads from a source outside
 * `target`, or undefined when it is properly grounded.
 */
export const validateQueryTarget = ({
  query,
  target,
}: {
  query: string;
  target: string;
}): string | undefined => {
  const expected = parseSources(target);
  const actual = parseSources(getIndexPatternFromESQLQuery(query));

  // Nothing to compare: a sourceless query (`ROW`, `SHOW`) or one the parser could not
  // extract sources from. Left to the regular validation step.
  if (expected.length === 0 || actual.length === 0) {
    return undefined;
  }

  const expectedSources = new Set(expected);
  const unexpected = actual.filter((source) => !expectedSources.has(source));

  if (unexpected.length === 0) {
    return undefined;
  }

  return `The query reads from ${unexpected
    .map((source) => `"${source}"`)
    .join(
      ', '
    )}, which is not the requested index. The source command must read from exactly "${target}" — use that name verbatim, including any wildcards and any "cluster:" remote prefix. Narrow the results with a WHERE clause instead of changing the source.`;
};
