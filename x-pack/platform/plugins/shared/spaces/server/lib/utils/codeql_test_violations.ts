/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Command Injection vulnerability - user input used in shell command
 * CodeQL Rule: js/command-injection
 */
export function vulnerableCommandExecution(userInput: string): void {
  // VIOLATION: User input directly used in shell command
  const command = `ls -la ${userInput}`;
  // codeql[js/command-injection]
  // eslint-disable-next-line no-eval
  eval(`require('child_process').exec('${command}')`);
}

/**
 * XSS vulnerability - user input directly inserted into HTML
 * CodeQL Rule: js/xss
 */
export function vulnerableHtmlRender(userInput: string): string {
  // VIOLATION: User input directly inserted without sanitization
  // codeql[js/xss]
  return `<div>${userInput}</div>`;
}

/**
 * Path Traversal vulnerability - user input used in file path
 * CodeQL Rule: js/path-injection
 */
export function vulnerableFileRead(userInput: string): string {
  // VIOLATION: User input used directly in file path
  const fs = require('fs');
  // codeql[js/path-injection]
  return fs.readFileSync(`/etc/${userInput}`, 'utf8');
}

/**
 * Weak cryptographic hash - MD5 is cryptographically broken
 * CodeQL Rule: js/weak-cryptographic-algorithm
 */
export function vulnerableHash(data: string): string {
  // VIOLATION: Using MD5 which is cryptographically broken
  const crypto = require('crypto');
  // codeql[js/weak-cryptographic-algorithm]
  return crypto.createHash('md5').update(data).digest('hex');
}

/**
 * Insecure random number generation
 * CodeQL Rule: js/insecure-randomness
 */
export function vulnerableRandomToken(): string {
  // VIOLATION: Math.random() is not cryptographically secure
  // codeql[js/insecure-randomness]
  return Math.random().toString(36).substring(7);
}

/**
 * Unsafe deserialization - deserializing untrusted data
 * CodeQL Rule: js/unsafe-deserialization
 */
export function vulnerableDeserialize(data: string): any {
  // VIOLATION: eval() can execute arbitrary code
  // codeql[js/unsafe-deserialization]
  // eslint-disable-next-line no-eval
  return eval(`(${data})`);
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
 * Alert suppression - suppressing security warnings
 * CodeQL Rule: js/alert-suppression
 */
export function suppressSecurityWarning() {
  // VIOLATION: Suppressing security-related console warnings
  // codeql[js/alert-suppression]
  // eslint-disable-next-line no-console
  console.warn = () => {};
  // eslint-disable-next-line no-console
  console.error = () => {};
}

/**
 * Incomplete URL substring sanitization
 * CodeQL Rule: js/incomplete-url-substring-sanitization
 */
export function vulnerableUrlCheck(url: string): boolean {
  // VIOLATION: Incomplete URL validation
  // codeql[js/incomplete-url-substring-sanitization]
  return url.indexOf('javascript:') === -1;
}
