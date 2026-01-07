/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Weak cryptographic hash - MD5 is cryptographically broken
 * CodeQL Rule: js/weak-cryptographic-algorithm
 */
export function vulnerableHash(data: string): string {
  // VIOLATION: Using MD5 which is cryptographically broken
  const crypto = require('crypto');
  // codeql[githubsecuritylab/weak-hashing] test ignore
  return crypto.createHash('md5').update(data).digest('hex');
}

/**
 * Regular Expression Denial of Service (ReDoS)
 * CodeQL Rule: js/regexp-redos
 */
export function vulnerableRegex(userInput: string): boolean {
  // VIOLATION: Catastrophic backtracking regex
  // codeql[js/redos]
  const regex = /(a+)+$/;
  return regex.test(userInput);
}

/**
 * Regular Expression Denial of Service (ReDoS)
 * CodeQL Rule: js/regexp-redos
 */
export function vulnerableRegex2(userInput: string): boolean {
  // VIOLATION: Catastrophic backtracking regex
  // codeql[js/redos] this is a test
  const regex = /(b+)+$/;
  return regex.test(userInput);
}
