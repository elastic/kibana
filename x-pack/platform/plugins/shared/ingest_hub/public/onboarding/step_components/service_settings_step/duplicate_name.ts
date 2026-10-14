/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const DUPLICATE_SUFFIX = '[Duplicate]';

const normalize = (s: string) => s.trim().toLowerCase();

/**
 * Returns the next unique duplicate name for a service, given the set of names
 * already in use. Produces "Foo [Duplicate]", then "Foo [Duplicate 2]",
 * "Foo [Duplicate 3]", etc.
 *
 * Uses the same case-insensitive, trimmed comparison as `isDuplicateNameTaken`
 * so the suggested name always passes modal validation.
 */
export function buildDuplicateName(baseName: string, existingNames: string[]): string {
  const existingSet = new Set(existingNames.map(normalize));

  const first = `${baseName} ${DUPLICATE_SUFFIX}`;
  if (!existingSet.has(normalize(first))) return first;

  let n = 2;
  while (true) {
    const candidate = `${baseName} [Duplicate ${n}]`;
    if (!existingSet.has(normalize(candidate))) return candidate;
    n++;
  }
}

/**
 * Returns true when `name` would collide with any entry in `existingNames`.
 * Used for inline validation in the modal.
 */
export function isDuplicateNameTaken(name: string, existingNames: string[]): boolean {
  return existingNames.some((n) => normalize(n) === normalize(name));
}
