/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AGENT_BUILDER_TRACES_INDEX_PREFIX } from '../../common/constants';

const DATA_STREAM_BACKING_PREFIX = '.ds-';

/** Namespace shared by every Context Engine user index (`context-engine-signals-<space>` today). */
const CONTEXT_ENGINE_USER_INDEX_PREFIX = 'context-engine-';

/** Namespace shared by every Context Engine system index (`.contextengine-ai-indices` today). */
const CONTEXT_ENGINE_SYSTEM_INDEX_PREFIX = '.contextengine-';

/**
 * Index prefixes that make up the feedback loop's own observability surface: the
 * signals it produces, the traces it reads to produce them, and the AI index
 * registry itself. Matching on the namespace prefixes rather than on individual
 * index names means stores added later are covered without touching this list.
 */
const SELF_REFERENTIAL_PREFIXES = [
  CONTEXT_ENGINE_USER_INDEX_PREFIX,
  CONTEXT_ENGINE_SYSTEM_INDEX_PREFIX,
  AGENT_BUILDER_TRACES_INDEX_PREFIX,
];

const normalize = (expression: string): string => {
  const trimmed = expression
    .trim()
    .toLowerCase()
    .replace(/^["'`]+|["'`]+$/g, '');
  // A cluster-qualified expression (`remote:index`) still names the same index.
  const withoutCluster = trimmed.includes(':') ? trimmed.slice(trimmed.indexOf(':') + 1) : trimmed;
  return withoutCluster.startsWith(DATA_STREAM_BACKING_PREFIX)
    ? withoutCluster.slice(DATA_STREAM_BACKING_PREFIX.length)
    : withoutCluster;
};

const matchesPrefix = (expression: string, prefix: string): boolean => {
  if (expression.startsWith(prefix)) {
    return true;
  }
  // A wildcard broader than the prefix still resolves to these indices —
  // `context-engine-*` covers both signals and improvements. Compare the literal
  // part of the pattern against the prefix. A bare `*` has no literal part and is
  // deliberately not treated as self-referential: it reads everything, so it is a
  // genuine coverage signal rather than the loop observing itself.
  const literal = expression.replace(/\*+$/, '');
  return expression.endsWith('*') && literal.length > 0 && prefix.startsWith(literal);
};

/**
 * True when the query read from the feedback loop's own indices. Matches if *any*
 * expression in a multi-index target qualifies: a query that joins signals with
 * user data is still the loop observing itself.
 */
export const isSelfReferentialTarget = (targetIndex: string | undefined): boolean => {
  if (!targetIndex) {
    return false;
  }
  return targetIndex
    .split(',')
    .map(normalize)
    .some((expression) =>
      SELF_REFERENTIAL_PREFIXES.some((prefix) => matchesPrefix(expression, prefix))
    );
};
