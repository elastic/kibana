/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AGENT_BUILDER_TRACES_INDEX_PREFIX } from '../../common/constants';

const DATA_STREAM_BACKING_PREFIX = '.ds-';

const CONTEXT_ENGINE_USER_INDEX_PREFIX = 'context-engine-';

const CONTEXT_ENGINE_SYSTEM_INDEX_PREFIX = '.contextengine-';

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
  const withoutCluster = trimmed.includes(':') ? trimmed.slice(trimmed.indexOf(':') + 1) : trimmed;
  return withoutCluster.startsWith(DATA_STREAM_BACKING_PREFIX)
    ? withoutCluster.slice(DATA_STREAM_BACKING_PREFIX.length)
    : withoutCluster;
};

const matchesPrefix = (expression: string, prefix: string): boolean => {
  if (expression.startsWith(prefix)) {
    return true;
  }
  const literal = expression.replace(/\*+$/, '');
  return expression.endsWith('*') && literal.length > 0 && prefix.startsWith(literal);
};

/** True when the query read from the feedback loop's own indices. */
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
