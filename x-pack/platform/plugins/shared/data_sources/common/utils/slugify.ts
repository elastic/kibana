/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Converts a user-provided name into a safe, lowercase identifier suitable for
 * workflow name prefixes, tool ID segments, and MCP namespaces.
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
