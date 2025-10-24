/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function validateNoPathTraversal(path: string): void {
  // Check for null bytes which can be used to trick path validation
  if (path.includes('\0') || path.includes('%00')) {
    throw new Error('Null bytes not allowed in paths');
  }

  // Detect URL encoding tricks like %2e%2e%2f = ../
  if (/%2e|%2f/i.test(path)) {
    throw new Error('URL encoded path sequences not allowed');
  }

  // Check for suspicious path traversal patterns even before normalization
  if (/\.{2,}[/\\]/.test(path) || path.includes('..')) {
    throw new Error(`Path traversal detected: ${path}`);
  }
}
