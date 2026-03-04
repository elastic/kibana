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
 * Only applies the minimum transformation required by the strictest downstream
 * constraint (tool IDs: lowercase `[a-z0-9_-]`, segments start/end with `[a-z0-9]`).
 * Underscores are intentionally preserved to stay faithful to user input.
 */
export const slugify = (input: string): string => {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_]+/g, '-')
    .replace(/^[-_]+|[-_]+$/g, '');
};
