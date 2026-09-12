/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALL_SPACES_ID } from '@kbn/evals-common';

/**
 * Reads the comma-separated spaces a run assigns its datasets and scores to.
 * Undefined means the target Kibana's default space.
 *
 * The first space listed is the one the run works in, so it decides the ids the
 * datasets take.
 *
 * Called both where `--space-ids` is read, so a typo fails before the stack
 * boots, and where the run picks the value back up.
 */
export const parseSpaceIds = (value: string | undefined): string[] | undefined => {
  const spaceIds = (value ?? '')
    .split(',')
    .map((spaceId) => spaceId.trim())
    .filter(Boolean);

  // Evaluations data is assigned to named spaces, so a run that asked for `*`
  // would evaluate everything and then fail to record any of it.
  if (spaceIds.includes(ALL_SPACES_ID)) {
    throw new Error(
      `--space-ids does not accept "${ALL_SPACES_ID}": name each space the run writes to.`
    );
  }

  return spaceIds.length > 0 ? spaceIds : undefined;
};

/** The spaces the run was started with, as {@link parseSpaceIds} read them. */
export const getSpaceIdsFromEnv = (): string[] | undefined =>
  parseSpaceIds(process.env.EVAL_SPACE_IDS);
