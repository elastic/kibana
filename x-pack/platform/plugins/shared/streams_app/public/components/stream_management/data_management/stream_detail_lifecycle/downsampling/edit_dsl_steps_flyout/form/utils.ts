/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { formatMillisecondsInUnit, parseInterval, toMilliseconds } from '../../shared';

/**
 * Extract the index from an ArrayItem path like `_meta.downsampleSteps[3]`.
 * Returns -1 if not a recognized step path.
 */
export const getStepIndexFromArrayItemPath = (path: string): number => {
  const match = /^_meta\.downsampleSteps\[(\d+)\]$/.exec(path);
  return match ? Number(match[1]) : -1;
};
