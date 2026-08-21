/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const getClonedDatasetName = (
  name: string,
  existingNames: readonly string[]
): string => {
  const existing = new Set(existingNames.map((existingName) => existingName.trim().toLowerCase()));
  const base = `${name.trim()}-copy`;

  if (!existing.has(base.toLowerCase())) {
    return base;
  }

  let suffix = 2;
  let nextName = `${base}-${suffix}`;

  while (existing.has(nextName.toLowerCase())) {
    suffix += 1;
    nextName = `${base}-${suffix}`;
  }

  return nextName;
};
