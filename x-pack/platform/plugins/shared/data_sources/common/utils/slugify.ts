/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Converts a user-provided name into a safe, lowercase identifier suitable for
 * workflow name prefixes, tool ID segments, and MCP namespaces.
 *
 * Applies the minimum transformation required by the strictest downstream
 * constraint (tool IDs: lowercase `[a-z0-9_-]`, segments start/end with `[a-z0-9]`).
 *
 * @throws {Error} When the input contains no alphanumeric characters, resulting in
 *   an empty identifier that would produce malformed IDs downstream. Names with
 *   only underscores or special characters are also rejected because boundary
 *   trimming leaves nothing behind.
 */
export const slugify = (input: string): string => {
  const result = input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_]+/g, '-')
    .replace(/^[-_]+|[-_]+$/g, '');

  if (!result) {
    throw new Error(
      `Unable to generate a valid identifier from "${input}": name must contain at least one alphanumeric character`
    );
  }

  return result;
};
