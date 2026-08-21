/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface ActiveAiIndicesArgs {
  /** AI indices assigned to the agent itself. */
  assigned?: string[];
  /** AI indices contributed by the agent's type, which apply on top of the assigned ones. */
  inherited?: string[];
}

/**
 * Every AI index an agent retrieves from, inherited first. An id in both layers is listed once,
 * since the two are merged into a single deduplicated set at execution time.
 */
export const getActiveAiIndices = ({
  assigned = [],
  inherited = [],
}: ActiveAiIndicesArgs): string[] => {
  const inheritedSet = new Set(inherited);
  return [...inherited, ...assigned.filter((id) => !inheritedSet.has(id))];
};
