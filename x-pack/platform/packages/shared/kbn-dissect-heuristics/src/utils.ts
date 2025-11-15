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
 * Score delimiter quality for single-message processing
 * Higher scores indicate better structural delimiters
 *
 * Priority order:
 * 1. Multi-character delimiters with mixed punctuation (e.g., ": ", "][")
 * 2. Multi-character whitespace-based (e.g., "  ")
 * 3. Single structural characters (e.g., "[", "(", "|")
 * 4. Single space (lowest priority, causes fragmentation)
 */
export function scoreDelimiterQuality(delimiter: string): number {
  // Multi-character delimiters are preferred
  if (delimiter.length > 1) {
    // Mixed punctuation + whitespace (e.g., ": ", "] ", ")[") = highest quality
    if (/[^\s]/.test(delimiter) && /\s/.test(delimiter)) {
      return 100;
    }
    // Multi-character non-whitespace (e.g., "::" , "--", "][")
    if (!/\s/.test(delimiter)) {
      return 80;
    }
    // Multi-space or tab
    if (/^\s{2,}$/.test(delimiter)) {
      return 60;
    }
    // Other multi-char
    return 50;
  }

  // Single character delimiters
  // Structural characters that often denote boundaries
  if (/[\[\](){}|]/.test(delimiter)) {
    return 40;
  }

  // Other single punctuation
  if (/[^\s]/.test(delimiter)) {
    return 30;
  }

  // Single space - lowest priority (causes over-fragmentation)
  if (delimiter === ' ') {
    return 10;
  }

  return 0;
}

/**
 * Find the common character-by-character prefix across multiple messages
 */
export function findCommonPrefix(messages: string[]): {
  prefix: string;
  hasStructure: boolean;
  prefixLength: number;
} {
  if (messages.length === 0) {
    return { prefix: '', hasStructure: false, prefixLength: 0 };
  }

  if (messages.length === 1) {
    return { prefix: messages[0], hasStructure: true, prefixLength: messages[0].length };
  }

  const firstMsg = messages[0];
  let prefixLength = 0;

  // Find common character prefix
  for (let i = 0; i < firstMsg.length; i++) {
    if (messages.every((msg) => msg[i] === firstMsg[i])) {
      prefixLength++;
    } else {
      break;
    }
  }

  const prefix = firstMsg.substring(0, prefixLength);

  // Check if prefix has structural delimiters (not just alphanumeric)
  // Look for at least 2 delimiter-like characters (spaces, punctuation)
  const delimiterCount = (prefix.match(/[^a-zA-Z0-9]/g) || []).length;
  const hasStructure = delimiterCount >= 2;

  return { prefix, hasStructure, prefixLength };
}

/**
 * Find common structured prefix by detecting repeated token patterns
 * even when the actual token values vary.
 * Returns the length of the structured prefix in characters.
 */
export function findStructuredPrefixLength(messages: string[]): number {
  if (messages.length < 2) {
    return 0;
  }

  // Tokenize each message by splitting on whitespace and punctuation
  // but keep track of delimiter positions
  const tokenizedMessages = messages.map((msg) => {
    const tokens: Array<{ value: string; endPos: number; isDelimiter: boolean }> = [];
    let currentToken = '';
    let currentPos = 0;

    for (let i = 0; i < msg.length; i++) {
      const char = msg[i];
      const isDelimiter = /[\s\-\/\[\]():,.]/.test(char);

      if (isDelimiter) {
        if (currentToken.length > 0) {
          tokens.push({ value: currentToken, endPos: currentPos, isDelimiter: false });
          currentToken = '';
        }
        tokens.push({ value: char, endPos: i + 1, isDelimiter: true });
        currentPos = i + 1;
      } else {
        currentToken += char;
        currentPos = i + 1;
      }
    }

    if (currentToken.length > 0) {
      tokens.push({ value: currentToken, endPos: currentPos, isDelimiter: false });
    }

    return tokens;
  });

  // Find how many token positions have matching delimiters
  const minTokenCount = Math.min(...tokenizedMessages.map((t) => t.length));
  let lastCommonDelimiterPos = 0;

  for (let tokenIdx = 0; tokenIdx < minTokenCount; tokenIdx++) {
    const firstToken = tokenizedMessages[0][tokenIdx];

    // Check if all messages have matching delimiter at this position
    const allMatch = tokenizedMessages.every(
      (tokens) =>
        tokens[tokenIdx].isDelimiter === firstToken.isDelimiter &&
        (firstToken.isDelimiter ? tokens[tokenIdx].value === firstToken.value : true)
    );

    if (!allMatch) {
      break;
    }

    // If this token is a delimiter, record its end position
    if (firstToken.isDelimiter) {
      lastCommonDelimiterPos = firstToken.endPos;
    }
  }

  // Return position after the last common delimiter
  // This ensures we include full structured fields up to (but not including) varying values
  return lastCommonDelimiterPos;
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
 *
 * This is lenient about small positional differences that occur naturally
 * when alphanumeric fields have varying lengths (e.g., "INFO" vs "ERROR").
 *
 * For example, if positions are [10, 10, 11], this indicates the delimiter
 * appears at nearly the same position, with only a 1-character variance.
 * This is normal and expected when fields like log levels have different
 * lengths (INFO=4 chars, ERROR=5 chars).
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

  // Use exponential decay with a lenient threshold
  // This provides significant leniency for natural variance in field lengths
  // (PIDs, process names, log levels, etc.) while still penalizing excessive
  // positional inconsistency
  //
  // threshold=25 means:
  //   - variance=5 → score≈0.82
  //   - variance=10 → score≈0.67
  //   - variance=15 → score≈0.55
  //   - variance=20 → score≈0.45
  //   - variance=25 → score≈0.37
  const threshold = 25;
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
