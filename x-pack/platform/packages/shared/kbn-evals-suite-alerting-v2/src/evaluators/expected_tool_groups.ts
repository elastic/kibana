/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getToolCallSteps, type Evaluator, type TaskOutput } from '@kbn/evals';

const getToolGroupsMeta = (metadata: unknown, key: string): string[][] => {
  const value = (metadata as Record<string, unknown> | null)?.[key];
  if (!Array.isArray(value)) return [];
  return value
    .filter((group): group is unknown[] => Array.isArray(group))
    .map((group) => group.filter((id): id is string => typeof id === 'string'))
    .filter((group) => group.length > 0);
};

/**
 * CODE evaluator for "AND-of-ORs" tool-call expectations.
 *
 * Reads `expectedToolGroups` (a `string[][]`) from the example metadata. The
 * conversation must call **at least one** tool from **every** group:
 * - a single-element group (e.g. `[get_index_mapping]`) is a hard requirement.
 * - a multi-element group (e.g. `[index_explorer, list_indices]`) is satisfied
 *   by any one of its members.
 *
 * Example: `[[get_index_mapping], [index_explorer, list_indices]]` asserts the
 * agent fetched the index mapping AND discovered the index via either explorer
 * or list-indices — i.e. it grounded itself before composing.
 *
 * When unset the example has no group expectation and scores 1 (n/a).
 */
export const createExpectedToolGroupsEvaluator = (): Evaluator => ({
  name: 'ExpectedToolGroups',
  kind: 'CODE',
  evaluate: async ({ output, metadata }) => {
    const expectedToolGroups = getToolGroupsMeta(metadata, 'expectedToolGroups');

    if (expectedToolGroups.length === 0) {
      return {
        score: 1,
        metadata: { reason: 'No tool-group expectation for this example' },
      };
    }

    const usedToolIds = getToolCallSteps(output as TaskOutput)
      .map((toolCall) => toolCall.tool_id)
      .filter((toolId): toolId is string => Boolean(toolId));

    const groups = expectedToolGroups.map((group) => ({
      anyOf: group,
      matched: group.filter((id) => usedToolIds.includes(id)),
    }));
    const unsatisfiedGroups = groups
      .filter((group) => group.matched.length === 0)
      .map((g) => g.anyOf);

    return {
      score: unsatisfiedGroups.length === 0 ? 1 : 0,
      metadata: { expectedToolGroups, groups, unsatisfiedGroups, usedToolIds },
    };
  },
});
