/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Escapes special characters in a string for use in KQL filter queries.
 *
 * Characters like `"`, `*`, `\` can cause query errors or unexpected behaviour
 * when interpolated into a `filter` string. This helper backslash-escapes them.
 */
export const escapeFilterValue = (value: string): string => value.replace(/[\\"*]/g, '\\$&');

/**
 * Generates a unique copy name by appending `_copy` or `_copy_{n}` to the base name.
 *
 * Algorithm:
 * 1. Try `{baseName}_copy`
 * 2. If taken, find all existing `{baseName}_copy*` names
 * 3. Extract numeric suffixes and use max + 1
 */
export const generateCopyName = (baseName: string, existingNames: string[]): string => {
  const candidateName = `${baseName}_copy`;

  if (!existingNames.includes(candidateName)) {
    return candidateName;
  }

  const copyPrefix = `${baseName}_copy_`;

  // Extract numeric suffixes from all `{baseName}_copy_{n}` matches
  const suffixes = existingNames
    .filter((name) => name.startsWith(copyPrefix))
    .map((name) => {
      const suffix = name.slice(copyPrefix.length);

      return Number(suffix);
    })
    .filter((num) => !isNaN(num) && num > 0);

  // `_copy` itself counts as suffix 1
  const maxSuffix = suffixes.length > 0 ? Math.max(1, ...suffixes) : 1;

  return `${baseName}_copy_${maxSuffix + 1}`;
};
