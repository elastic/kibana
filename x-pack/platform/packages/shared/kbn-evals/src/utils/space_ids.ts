/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The spaces a run assigns its datasets and scores to, set by `--space-ids` and
 * comma-separated. Undefined means the target Kibana's default space.
 */
export const getSpaceIdsFromEnv = (): string[] | undefined => {
  const spaceIds = (process.env.EVAL_SPACE_IDS ?? '')
    .split(',')
    .map((spaceId) => spaceId.trim())
    .filter(Boolean);

  return spaceIds.length > 0 ? spaceIds : undefined;
};
