/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const INVALID_NAME_CHARACTERS = /[^a-z0-9-_]+/g;

const sanitize = (bucket: string): string =>
  bucket
    .trim()
    .toLowerCase()
    .replace(INVALID_NAME_CHARACTERS, '-')
    .replace(/^-+|-+$/g, '');

/**
 * Connection name suggestion for a bucket, suffixed when the bucket name is
 * already taken by another data source.
 */
export const deriveDataSourceNameFromBucket = (
  bucket: string,
  existingNames: readonly string[] = []
): string => {
  const base = sanitize(bucket);

  if (!base) {
    return '';
  }

  const taken = new Set(existingNames.map((name) => name.trim().toLowerCase()));
  if (!taken.has(base)) {
    return base;
  }

  let suffix = 2;
  while (taken.has(`${base}-${suffix}`)) {
    suffix++;
  }

  return `${base}-${suffix}`;
};
