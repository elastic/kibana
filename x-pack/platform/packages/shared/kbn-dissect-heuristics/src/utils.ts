/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Calculate the median of an array of numbers
 */
export function median(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }

  return sorted[mid];
}

/**
 * Calculate the variance of an array of numbers
 */
export function variance(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const squaredDiffs = values.map((val) => Math.pow(val - mean, 2));
  return squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
}

/**
 * Escape special characters for Dissect pattern
 * In Dissect, only %{} and %{{}} have special meaning
 */
export function escapeForDissect(str: string): string {
  // Dissect doesn't require escaping like regex does
  // It uses literal string matching, so we return as-is
  return str;
}

/**
 * Determine if a string is likely a delimiter vs. data
 * Delimiters typically:
 * - Contain NO alphanumeric characters (except whitespace)
 * - Are short (1-10 chars)
 * - Consist of punctuation, symbols, or whitespace
 */
export function isLikelyDelimiter(str: string): boolean {
  if (str.length === 0 || str.length > 10) {
    return false;
  }

  // Pure whitespace is a delimiter
  if (/^\s+$/.test(str)) {
    return true;
  }

  // Single period or colon are likely IP/time separators, not delimiters
  if (str === '.' || str === ':') {
    return false;
  }

  // CRITICAL: Delimiters should NEVER contain alphanumeric characters
  // This prevents single characters like 'a', '1', 'e' from being treated as delimiters
  const hasAlphanumeric = /[a-zA-Z0-9]/.test(str);
  if (hasAlphanumeric) {
    return false;
  }

  return true;
}

/**
 * Check if a string looks like an IPv4 address
 */
export function looksLikeIPv4(str: string): boolean {
  return /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(str);
}

/**
 * Check if a string looks like an IPv6 address
 */
export function looksLikeIPv6(str: string): boolean {
  return /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/.test(str);
}

/**
 * Check if a message contains IP addresses
 */
export function containsIPAddress(message: string): boolean {
  // Check for IPv4 pattern
  if (/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/.test(message)) {
    return true;
  }
  // Check for IPv6 pattern (simplified)
  if (/\b([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}\b/.test(message)) {
    return true;
  }
  return false;
}

/**
 * Extract all possible substrings of a given string within a length range
 */
export function extractSubstrings(
  str: string,
  minLength: number = 1,
  maxLength: number = 10
): string[] {
  const substrings = new Set<string>();

  for (let i = 0; i < str.length; i++) {
    for (let len = minLength; len <= Math.min(maxLength, str.length - i); len++) {
      substrings.add(str.substring(i, i + len));
    }
  }

  return Array.from(substrings);
}

/**
 * Find the position of a substring in a string
 * Returns -1 if not found
 */
export function findPosition(str: string, substring: string): number {
  return str.indexOf(substring);
}

/**
 * Calculate consistency score for delimiter positions
 * Lower variance = higher score
 */
export function calculatePositionScore(positions: number[]): number {
  if (positions.length === 0 || positions.some((p) => p === -1)) {
    return 0;
  }

  const posVariance = variance(positions);

  // Perfect consistency (variance = 0) should score highest
  if (posVariance === 0) {
    return 1.0;
  }

  // Score decreases as variance increases
  // Using exponential decay: score = e^(-variance/threshold)
  const threshold = 10; // Adjust based on typical log line lengths
  return Math.exp(-posVariance / threshold);
}

/**
 * Count occurrences of a substring in an array of strings
 */
export function countOccurrences(messages: string[], substring: string): number {
  return messages.filter((msg) => msg.includes(substring)).length;
}

/**
 * Get unique values from an array
 */
export function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

/**
 * Check if all values in an array are the same
 */
export function allSame<T>(arr: T[]): boolean {
  if (arr.length === 0) {
    return true;
  }
  return arr.every((val) => val === arr[0]);
}

/**
 * Trim leading and trailing whitespace from each string
 */
export function trimAll(strings: string[]): string[] {
  return strings.map((s) => s.trim());
}

/**
 * Detect trailing whitespace lengths in strings
 */
export function getTrailingWhitespaceLengths(values: string[]): number[] {
  return values.map((v) => {
    const match = v.match(/\s+$/);
    return match ? match[0].length : 0;
  });
}

/**
 * Detect leading whitespace lengths in strings
 */
export function getLeadingWhitespaceLengths(values: string[]): number[] {
  return values.map((v) => {
    const match = v.match(/^\s+/);
    return match ? match[0].length : 0;
  });
}
