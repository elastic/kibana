/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Suggests an unused name for a copy of a profile or rule. Copies of Elastic-managed ones drop the
 * `_` prefix, which only Elastic-managed names can start with.
 */
export const getCopyName = (name: string, takenNames: readonly string[]): string => {
  const baseName = `${name.replace(/^_+/, '')}-copy`;
  let candidate = baseName;
  for (let suffix = 2; takenNames.includes(candidate); suffix++) {
    candidate = `${baseName}-${suffix}`;
  }
  return candidate;
};
