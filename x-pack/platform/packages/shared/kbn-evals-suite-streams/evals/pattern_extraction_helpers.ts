/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Helper utilities for pattern extraction evaluation.
 *
 * This module provides utility functions for:
 * - Field name normalization and comparison
 * - Timestamp format detection and validation
 * - Log level normalization
 * - Pattern validation and quality checks
 */

/**
 * Common timestamp formats found in logs.
 * Used for detecting and validating timestamp fields.
 */
export const TIMESTAMP_FORMATS = {
  ISO8601: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?$/,
  RFC3339: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?$/,
  APACHE_COMMON: /^\d{2}\/[A-Za-z]{3}\/\d{4}:\d{2}:\d{2}:\d{2}\s[+-]\d{4}$/,
  UNIX_TIMESTAMP: /^\d{10}(?:\.\d+)?$/,
  UNIX_TIMESTAMP_MS: /^\d{13}$/,
  SYSLOG: /^[A-Za-z]{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2}$/,
  NGINX: /^\d{2}\/[A-Za-z]{3}\/\d{4}:\d{2}:\d{2}:\d{2}\s[+-]\d{4}$/,
  DATE_TIME: /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}(?:\.\d+)?$/,
  TIME_ONLY: /^\d{2}:\d{2}:\d{2}(?:\.\d+)?$/,
} as const;

/**
 * Common log level values and their normalized equivalents.
 */
export const LOG_LEVELS: Record<string, readonly string[]> = {
  TRACE: ['TRACE', 'FINEST', 'ALL'],
  DEBUG: ['DEBUG', 'FINE', 'FINER'],
  INFO: ['INFO', 'INFORMATION', 'INFORMATIONAL'],
  WARN: ['WARN', 'WARNING'],
  ERROR: ['ERROR', 'ERR', 'SEVERE'],
  FATAL: ['FATAL', 'CRITICAL', 'EMERGENCY', 'EMERG', 'ALERT'],
} as const;

/**
 * Normalize a field name by removing common prefixes/suffixes and converting to lowercase.
 * This helps with field comparison when names differ slightly.
 *
 * Examples:
 * - "log.level" -> "level"
 * - "severity_text" -> "severity"
 * - "timestamp_field" -> "timestamp"
 */
export function normalizeFieldName(fieldName: string): string {
  let normalized = fieldName.toLowerCase().trim();

  // Remove common prefixes
  const prefixes = ['log.', 'event.', 'attributes.', 'message.', 'msg.'];
  for (const prefix of prefixes) {
    if (normalized.startsWith(prefix)) {
      normalized = normalized.slice(prefix.length);
    }
  }

  // Remove common suffixes
  const suffixes = ['_field', '_value', '_text', '_str', '_string'];
  for (const suffix of suffixes) {
    if (normalized.endsWith(suffix)) {
      normalized = normalized.slice(0, -suffix.length);
    }
  }

  // Normalize common variations
  const replacements: Record<string, string> = {
    lvl: 'level',
    sev: 'severity',
    severity: 'level',
    ts: 'timestamp',
    time: 'timestamp',
    datetime: 'timestamp',
    date: 'timestamp',
    msg: 'message',
  };

  if (replacements[normalized]) {
    normalized = replacements[normalized];
  }

  return normalized;
}

/**
 * Normalize a log level value to standard level names.
 * Returns the normalized level or null if not recognized.
 */
export function normalizeLogLevel(value: string): string | null {
  const upperValue = value.toUpperCase().trim();

  for (const [standardLevel, variations] of Object.entries(LOG_LEVELS)) {
    if (variations.includes(upperValue)) {
      return standardLevel;
    }
  }

  // Check for numeric log levels (0=TRACE, 1=DEBUG, 2=INFO, 3=WARN, 4=ERROR, 5=FATAL)
  const numericLevel = parseInt(value, 10);
  if (!isNaN(numericLevel)) {
    if (numericLevel === 0) return 'TRACE';
    if (numericLevel === 1) return 'DEBUG';
    if (numericLevel === 2) return 'INFO';
    if (numericLevel === 3) return 'WARN';
    if (numericLevel === 4) return 'ERROR';
    if (numericLevel >= 5) return 'FATAL';
  }

  return null;
}

/**
 * Detect the timestamp format of a given value.
 * Returns the format name or null if not recognized as a timestamp.
 */
export function detectTimestampFormat(value: string): string | null {
  const trimmed = value.trim();

  for (const [formatName, pattern] of Object.entries(TIMESTAMP_FORMATS)) {
    if (pattern.test(trimmed)) {
      return formatName;
    }
  }

  // Try parsing as a date to catch other formats
  const parsed = Date.parse(trimmed);
  if (!isNaN(parsed)) {
    return 'OTHER_VALID';
  }

  return null;
}

/**
 * Compare two field names for similarity, accounting for common variations.
 * Returns a similarity score between 0 and 1.
 *
 * @param expected - The expected field name
 * @param actual - The actual field name
 * @returns Similarity score (0 = completely different, 1 = identical after normalization)
 */
export function compareFieldNames(expected: string, actual: string): number {
  // Exact match
  if (expected === actual) {
    return 1.0;
  }

  // Normalized match
  const normalizedExpected = normalizeFieldName(expected);
  const normalizedActual = normalizeFieldName(actual);

  if (normalizedExpected === normalizedActual) {
    return 0.9;
  }

  // Partial match (one contains the other)
  if (
    normalizedExpected.includes(normalizedActual) ||
    normalizedActual.includes(normalizedExpected)
  ) {
    return 0.7;
  }

  // Check for common substring
  const commonLength = longestCommonSubstring(normalizedExpected, normalizedActual);
  const maxLength = Math.max(normalizedExpected.length, normalizedActual.length);

  if (commonLength > 0) {
    return 0.5 * (commonLength / maxLength);
  }

  return 0.0;
}

/**
 * Find the longest common substring between two strings.
 */
function longestCommonSubstring(str1: string, str2: string): number {
  if (str1.length === 0 || str2.length === 0) {
    return 0;
  }

  const matrix: number[][] = Array(str1.length + 1)
    .fill(null)
    .map(() => Array(str2.length + 1).fill(0));

  let maxLength = 0;

  for (let i = 1; i <= str1.length; i++) {
    for (let j = 1; j <= str2.length; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1] + 1;
        maxLength = Math.max(maxLength, matrix[i][j]);
      }
    }
  }

  return maxLength;
}

/**
 * Validate that a timestamp field value is in a reasonable format.
 */
export function isValidTimestamp(value: string): boolean {
  if (!value || typeof value !== 'string') {
    return false;
  }

  const format = detectTimestampFormat(value);
  return format !== null;
}

/**
 * Validate that a log level value is recognized.
 */
export function isValidLogLevel(value: string): boolean {
  if (!value || typeof value !== 'string') {
    return false;
  }

  const normalized = normalizeLogLevel(value);
  return normalized !== null;
}

/**
 * Extract field names from a Grok pattern.
 * Returns an array of field names found in the pattern.
 *
 * Example:
 * "%{TIMESTAMP_ISO8601:timestamp} %{LOGLEVEL:level} %{GREEDYDATA:message}"
 * -> ["timestamp", "level", "message"]
 */
export function extractGrokFieldNames(pattern: string): string[] {
  const fieldNames: string[] = [];
  const regex = /%\{[^:]+:([^}]+)\}/g;
  let match;

  while ((match = regex.exec(pattern)) !== null) {
    fieldNames.push(match[1]);
  }

  return fieldNames;
}

/**
 * Extract field names from a Dissect pattern.
 * Returns an array of field names found in the pattern.
 *
 * Example:
 * "%{timestamp} %{level} %{message}"
 * -> ["timestamp", "level", "message"]
 */
export function extractDissectFieldNames(pattern: string): string[] {
  const fieldNames: string[] = [];
  const regex = /%\{([^}]+)\}/g;
  let match;

  while ((match = regex.exec(pattern)) !== null) {
    // Remove modifiers like -> and ->& from field names
    const fieldName = match[1].split('->')[0].trim();
    fieldNames.push(fieldName);
  }

  return fieldNames;
}

/**
 * Calculate the similarity between two sets of field names.
 * Returns a score between 0 and 1 based on how well the sets match.
 */
export function calculateFieldSetSimilarity(
  expectedFields: string[],
  actualFields: string[]
): number {
  if (expectedFields.length === 0 && actualFields.length === 0) {
    return 1.0;
  }

  if (expectedFields.length === 0 || actualFields.length === 0) {
    return 0.0;
  }

  let totalScore = 0;
  const matched = new Set<string>();

  // For each expected field, find the best match in actual fields
  for (const expectedField of expectedFields) {
    let bestScore = 0;
    let bestMatch = '';

    for (const actualField of actualFields) {
      if (matched.has(actualField)) {
        continue; // Already matched to another expected field
      }

      const score = compareFieldNames(expectedField, actualField);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = actualField;
      }
    }

    totalScore += bestScore;
    if (bestMatch) {
      matched.add(bestMatch);
    }
  }

  // Penalty for unmatched actual fields (over-extraction)
  const unmatchedActualCount = actualFields.length - matched.size;
  const penalty = unmatchedActualCount * 0.1;

  const averageScore = totalScore / expectedFields.length;
  return Math.max(0, averageScore - penalty);
}

/**
 * Validate a generated pattern for basic correctness.
 * Returns an object with validation results.
 */
export interface PatternValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  fieldCount: number;
  fieldNames: string[];
}

export function validateGrokPattern(pattern: string): PatternValidationResult {
  const result: PatternValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    fieldCount: 0,
    fieldNames: [],
  };

  if (!pattern || pattern.trim().length === 0) {
    result.isValid = false;
    result.errors.push('Pattern is empty');
    return result;
  }

  // Check for balanced braces
  const openBraces = (pattern.match(/%\{/g) || []).length;
  const closeBraces = (pattern.match(/\}/g) || []).length;

  if (openBraces !== closeBraces) {
    result.isValid = false;
    result.errors.push(`Unbalanced braces: ${openBraces} opening, ${closeBraces} closing`);
  }

  // Extract field names
  result.fieldNames = extractGrokFieldNames(pattern);
  result.fieldCount = result.fieldNames.length;

  if (result.fieldCount === 0) {
    result.warnings.push('No fields defined in pattern');
  }

  // Check for duplicate field names
  const uniqueFields = new Set(result.fieldNames);
  if (uniqueFields.size < result.fieldNames.length) {
    result.warnings.push('Duplicate field names detected');
  }

  return result;
}

export function validateDissectPattern(pattern: string): PatternValidationResult {
  const result: PatternValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    fieldCount: 0,
    fieldNames: [],
  };

  if (!pattern || pattern.trim().length === 0) {
    result.isValid = false;
    result.errors.push('Pattern is empty');
    return result;
  }

  // Check for balanced braces
  const openBraces = (pattern.match(/%\{/g) || []).length;
  const closeBraces = (pattern.match(/\}/g) || []).length;

  if (openBraces !== closeBraces) {
    result.isValid = false;
    result.errors.push(`Unbalanced braces: ${openBraces} opening, ${closeBraces} closing`);
  }

  // Extract field names
  result.fieldNames = extractDissectFieldNames(pattern);
  result.fieldCount = result.fieldNames.length;

  if (result.fieldCount === 0) {
    result.warnings.push('No fields defined in pattern');
  }

  // Check for duplicate field names
  const uniqueFields = new Set(result.fieldNames);
  if (uniqueFields.size < result.fieldNames.length) {
    result.warnings.push('Duplicate field names detected');
  }

  return result;
}
