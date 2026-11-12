/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface TypeOverride {
  name: string;
  type: string;
  original_type: string;
}

/**
 * Lists the field type changes between two sets of overrides as `from:to` pairs, without field
 * names. Overrides in `ignoredNames` (fields the pipeline no longer produces) aren't changes.
 */
export const describeTypeChanges = (
  before: TypeOverride[],
  after: TypeOverride[],
  ignoredNames: string[] = []
): string[] => {
  const beforeTypes = new Map(before.map(({ name, type }) => [name, type]));
  const afterNames = new Set(after.map(({ name }) => name));
  const ignored = new Set(ignoredNames);

  const changed = after
    .filter(({ name, type }) => beforeTypes.get(name) !== type)
    .map(
      ({ name, type, original_type: originalType }) =>
        `${beforeTypes.get(name) ?? originalType}:${type}`
    );
  const reverted = before
    .filter(({ name }) => !afterNames.has(name) && !ignored.has(name))
    .map(({ type, original_type: originalType }) => `${type}:${originalType}`);
  return [...changed, ...reverted];
};
