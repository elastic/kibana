/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Checks if a stream name matches any of the given glob-style index patterns.
 * Supports `*` (any characters) and `?` (single character) wildcards.
 */
export function streamMatchesIndexPatterns(streamName: string, indexPatterns: string[]): boolean {
  return indexPatterns.some((pattern) => {
    // Convert glob pattern to regex
    // Escape all special regex characters first, then convert glob wildcards
    const regexPattern = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape all regex metacharacters
      .replace(/\*/g, '.*') // Convert * to .*
      .replace(/\?/g, '.'); // Convert ? to .

    const regex = new RegExp(`^${regexPattern}$`, 'i');
    return regex.test(streamName);
  });
}
