/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildSpaceTracesIndexPattern, buildTracesNamespaceFilter } from '@kbn/evals-common';
import { JUDGE_SPAN_NAME_PREFIX } from '../../task_providers/tracing';

export { escapeWildcard } from '@kbn/evals-common';

/**
 * Where the Tracing routes search: the indices the space's traces are written to, narrowed
 * to its namespace because the index pattern also matches namespaces that share its suffix.
 */
export const getSpaceTracesScope = (
  spaceId: string
): { index: string; namespaceFilter: ReturnType<typeof buildTracesNamespaceFilter> } => ({
  index: buildSpaceTracesIndexPattern(spaceId),
  namespaceFilter: buildTracesNamespaceFilter(spaceId),
});

/** Matches non-judge evaluator root spans for exclusion from Tracing queries. */
export const EXCLUDE_NON_JUDGE_EVALUATOR_ROOTS: Record<string, unknown> = {
  bool: {
    filter: [{ exists: { field: 'attributes.evaluator.name' } }],
    must_not: [{ prefix: { name: JUDGE_SPAN_NAME_PREFIX } }],
  },
};
