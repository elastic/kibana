/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PatternExtractionGroundTruth } from './pattern_extraction_datasets';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Quality metrics for evaluating pattern extraction.
 */
export interface PatternQualityMetrics {
  /** Percentage of logs successfully parsed (0-1) */
  parseRate: number;
  /** Whether timestamp was extracted correctly (0-1) */
  timestampAccuracy: number;
  /** Whether log level was extracted correctly (0-1) */
  logLevelAccuracy: number;
  /** How well fields match expectations (0-1) */
  fieldQuality: number;
  /** Penalty for wrong number of fields (0-1, higher = worse) */
  fieldCountPenalty: number;
  /** Combined quality score (0-1) */
  overallQuality: number;
}

export interface ParsedLog {
  parsed: boolean;
  fields: Record<string, string | number | boolean | null>;
  originalMessage: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** Known log level values for validation (normalized to lowercase) */
const KNOWN_LOG_LEVELS = new Set([
  'trace',
  'debug',
  'info',
  'information',
  'warn',
  'warning',
  'error',
  'err',
  'fatal',
  'critical',
  'notice',
  'emerg',
  'alert',
]);

// =============================================================================
// FIELD NAME UTILITIES
// =============================================================================

/**
 * Normalize a field name for comparison.
 * Removes common prefixes like "attributes." and "custom." and lowercases.
 */
function normalizeFieldName(name: string): string {
  return name
    .replace(/^attributes\./, '')
    .replace(/^custom\./, '')
    .toLowerCase();
}

/**
 * Calculate similarity between two field names using tiered matching.
 *
 * @returns Similarity score:
 *   - 1.0 = exact match
 *   - 0.9 = normalized match (e.g., "attributes.source.ip" == "source.ip")
 *   - 0.7 = base name match (last segment only)
 *   - 0.5 = contains match (one includes the other)
 *   - 0.0 = no match
 */
function fieldNameSimilarity(extracted: string, expected: string): number {
  if (extracted === expected) return 1.0;

  const normalizedExtracted = normalizeFieldName(extracted);
  const normalizedExpected = normalizeFieldName(expected);

  if (normalizedExtracted === normalizedExpected) return 0.9;

  // Base name match (last segment)
  const baseExtracted = normalizedExtracted.split('.').pop() || normalizedExtracted;
  const baseExpected = normalizedExpected.split('.').pop() || normalizedExpected;
  if (baseExtracted === baseExpected) return 0.7;

  // Contains match
  if (normalizedExtracted.includes(baseExpected) || normalizedExpected.includes(baseExtracted)) {
    return 0.5;
  }

  return 0;
}

/**
 * Find the best matching extracted field for an expected field name.
 */
function findBestFieldMatch(
  expectedFieldName: string,
  extractedFieldNames: string[]
): { score: number; matchedField?: string } {
  let bestScore = 0;
  let bestMatch: string | undefined;

  for (const extracted of extractedFieldNames) {
    const score = fieldNameSimilarity(extracted, expectedFieldName);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = extracted;
    }
  }

  return { score: bestScore, matchedField: bestMatch };
}

// =============================================================================
// VALUE VALIDATION UTILITIES
// =============================================================================

/**
 * Validate that a field value matches the expected type.
 */
function validateFieldType(
  value: string | number | boolean | null,
  expectedType: 'keyword' | 'number' | 'ip' | 'text' | 'boolean'
): boolean {
  if (value === null || value === undefined) return false;

  const valueStr = String(value).trim();
  if (valueStr.length === 0) return false;

  switch (expectedType) {
    case 'number':
      return !isNaN(Number(valueStr));
    case 'boolean':
      return ['true', 'false', '1', '0', 'yes', 'no'].includes(valueStr.toLowerCase());
    case 'ip':
      // IPv4, IPv6, or hostname
      return (
        /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(valueStr) ||
        /^[0-9a-f:]+$/i.test(valueStr) ||
        /^[a-z0-9.-]+$/i.test(valueStr)
      );
    case 'keyword':
    case 'text':
      // Just check it's not a placeholder
      return !/^(null|undefined|n\/?a|-+)$/i.test(valueStr);
    default:
      return true;
  }
}

/**
 * Check if a value looks like a valid log level.
 */
function isKnownLogLevel(value: string): boolean {
  return KNOWN_LOG_LEVELS.has(value.toLowerCase().trim());
}

/**
 * Check if a value looks like a timestamp (has numbers and reasonable length).
 */
function looksLikeTimestamp(value: string | number | boolean | null): boolean {
  const valueStr = String(value || '');
  return valueStr.length >= 8 && /\d/.test(valueStr);
}

// =============================================================================
// METRIC CALCULATIONS
// =============================================================================

/**
 * Calculate timestamp extraction accuracy.
 *
 * Scoring (tiered by field name match quality):
 * - 1.0: Exact/normalized field name match with valid timestamp value
 * - 0.8: Similar field name match with valid timestamp value
 * - 0.5: Partial match with valid timestamp value
 * - 0.0: Not extracted or invalid
 */
export function calculateTimestampAccuracy(
  parsedLogs: ParsedLog[],
  expectedFields: PatternExtractionGroundTruth['expected_fields']
): number {
  if (parsedLogs.length === 0) return 0;
  if (!expectedFields.timestamp?.field_name) return 1.0; // No timestamp expected

  const expectedName = expectedFields.timestamp.field_name;
  const parsedCount = parsedLogs.filter((log) => log.parsed).length;
  if (parsedCount === 0) return 0;

  let totalScore = 0;

  for (const log of parsedLogs) {
    if (!log.parsed) continue;

    const extractedNames = Object.keys(log.fields);
    const match = findBestFieldMatch(expectedName, extractedNames);

    if (match.matchedField && looksLikeTimestamp(log.fields[match.matchedField])) {
      // Score based on name match quality
      if (match.score >= 0.9) {
        totalScore += 1.0;
      } else if (match.score >= 0.5) {
        totalScore += 0.8;
      } else if (match.score > 0) {
        totalScore += 0.5;
      }
    }
  }

  return totalScore / parsedCount;
}

/**
 * Calculate log level extraction accuracy.
 *
 * Scoring (tiered by field name match and value validity):
 * - 1.0: Exact field name match with expected value
 * - 0.8: Good field name match with known log level value
 * - 0.5: Partial match with known log level value
 * - 0.0: Not extracted or invalid value
 */
export function calculateLogLevelAccuracy(
  parsedLogs: ParsedLog[],
  expectedFields: PatternExtractionGroundTruth['expected_fields']
): number {
  if (parsedLogs.length === 0) return 0;
  if (!expectedFields.log_level) return 1.0; // No log level expected

  const expectedName = expectedFields.log_level.field_name;
  const expectedValues = new Set(
    expectedFields.log_level.example_values.map((v) => v.toLowerCase())
  );
  const parsedCount = parsedLogs.filter((log) => log.parsed).length;
  if (parsedCount === 0) return 0;

  let totalScore = 0;

  for (const log of parsedLogs) {
    if (!log.parsed) continue;

    const extractedNames = Object.keys(log.fields);
    const match = findBestFieldMatch(expectedName, extractedNames);

    if (match.matchedField) {
      const value = String(log.fields[match.matchedField] || '').trim();
      const normalizedValue = value.toLowerCase();
      const isExpectedValue = expectedValues.has(normalizedValue);
      const isKnownLevel = isKnownLogLevel(value);

      if (isExpectedValue || isKnownLevel) {
        if (match.score >= 0.9 && isExpectedValue) {
          totalScore += 1.0;
        } else if (match.score >= 0.7 && isKnownLevel) {
          totalScore += 0.8;
        } else if (isKnownLevel) {
          totalScore += 0.5;
        }
      }
    }
  }

  return totalScore / parsedCount;
}

/**
 * Calculate field quality score.
 *
 * Evaluates:
 * - Required fields present (2 points each, weighted by match quality)
 * - Optional fields present (1 point each)
 * - Field values match expected types
 * - Penalty for unexpected/junk fields (max 20% reduction)
 */
export function calculateFieldQuality(
  parsedLogs: ParsedLog[],
  expectedFields: PatternExtractionGroundTruth['expected_fields']
): number {
  if (parsedLogs.length === 0) return 0;

  const parsedCount = parsedLogs.filter((log) => log.parsed).length;
  if (parsedCount === 0) return 0;

  const allExpectedFields = expectedFields.other_fields || [];
  const requiredFields = allExpectedFields.filter((f) => f.required);
  const optionalFields = allExpectedFields.filter((f) => !f.required);

  // If no fields defined, just check that some fields were extracted
  if (allExpectedFields.length === 0) {
    let hasFields = 0;
    for (const log of parsedLogs) {
      if (log.parsed && Object.keys(log.fields).length > 0) hasFields++;
    }
    return hasFields / parsedCount;
  }

  let totalScore = 0;

  for (const log of parsedLogs) {
    if (!log.parsed) continue;

    const extractedNames = Object.keys(log.fields);
    const matchedFields = new Set<string>();
    let logScore = 0;
    let maxScore = 0;

    // Score required fields (2 points each)
    for (const field of requiredFields) {
      maxScore += 2;
      const match = findBestFieldMatch(field.name, extractedNames);

      if (match.matchedField && match.score >= 0.5) {
        matchedFields.add(match.matchedField);
        let fieldScore = match.score;

        // Bonus for correct type
        if (validateFieldType(log.fields[match.matchedField], field.type)) {
          fieldScore += 0.5;
        }

        logScore += Math.min(fieldScore * 2, 2);
      }
    }

    // Score optional fields (1 point each)
    for (const field of optionalFields) {
      maxScore += 1;
      const match = findBestFieldMatch(field.name, extractedNames);

      if (match.matchedField && match.score >= 0.5) {
        matchedFields.add(match.matchedField);
        let fieldScore = match.score * 0.5;

        if (validateFieldType(log.fields[match.matchedField], field.type)) {
          fieldScore += 0.25;
        }

        logScore += Math.min(fieldScore * 1.5, 1);
      }
    }

    // Penalty for unexpected fields (exclude timestamp and log level)
    const timestampField = expectedFields.timestamp?.field_name;
    const logLevelField = expectedFields.log_level?.field_name;

    const unexpectedFields = extractedNames.filter((name) => {
      if (matchedFields.has(name)) return false;
      const matchesTimestamp = timestampField && fieldNameSimilarity(name, timestampField) >= 0.5;
      const matchesLogLevel = logLevelField && fieldNameSimilarity(name, logLevelField) >= 0.5;
      return !matchesTimestamp && !matchesLogLevel;
    });

    // Small penalty for each unexpected field (max 20%)
    const junkPenalty = Math.min(unexpectedFields.length * 0.1, 0.2) * maxScore;
    logScore = Math.max(0, logScore - junkPenalty);

    if (maxScore > 0) {
      totalScore += logScore / maxScore;
    }
  }

  return totalScore / parsedCount;
}

/**
 * Calculate field count penalty.
 *
 * Returns a score (0-1) where 1 means field count is in expected range.
 * Graduated penalty:
 * - Too few fields: up to 60% penalty (more severe)
 * - Too many fields: up to 40% penalty (less severe)
 */
export function calculateFieldCountPenalty(
  parsedLogs: ParsedLog[],
  characteristics?: PatternExtractionGroundTruth['pattern_characteristics']
): number {
  if (parsedLogs.length === 0) return 0;
  if (!characteristics) return 1.0;

  const { expected_min_fields: minFields, expected_max_fields: maxFields } = characteristics;
  const parsedCount = parsedLogs.filter((log) => log.parsed).length;
  if (parsedCount === 0) return 0;

  let totalScore = 0;

  for (const log of parsedLogs) {
    if (!log.parsed) continue;

    const count = Object.keys(log.fields).length;

    if (count >= minFields && count <= maxFields) {
      totalScore += 1.0;
    } else if (count < minFields) {
      const deficit = minFields - count;
      const penaltyRatio = Math.min(deficit / minFields, 1.0);
      totalScore += 1.0 - penaltyRatio * 0.6;
    } else {
      const excess = count - maxFields;
      const penaltyRatio = Math.min(excess / maxFields, 1.0);
      totalScore += 1.0 - penaltyRatio * 0.4;
    }
  }

  return totalScore / parsedCount;
}

// =============================================================================
// OVERALL QUALITY CALCULATION
// =============================================================================

/**
 * Calculate overall pattern quality by combining all metrics.
 *
 * Weights:
 * - Parse rate: 25% (fundamental - must parse)
 * - Timestamp: 25% (critical for log analysis)
 * - Log level: 15% (important for filtering)
 * - Field quality: 25% (extraction usefulness)
 * - Field count: 10% (prevents over/under extraction)
 */
export function calculateOverallQuality(
  parsedLogs: ParsedLog[],
  groundTruth: PatternExtractionGroundTruth
): PatternQualityMetrics {
  if (parsedLogs.length === 0) {
    return {
      parseRate: 0,
      timestampAccuracy: 0,
      logLevelAccuracy: 0,
      fieldQuality: 0,
      fieldCountPenalty: 1,
      overallQuality: 0,
    };
  }

  const parseRate = parsedLogs.filter((log) => log.parsed).length / parsedLogs.length;
  const timestampAccuracy = calculateTimestampAccuracy(parsedLogs, groundTruth.expected_fields);
  const logLevelAccuracy = calculateLogLevelAccuracy(parsedLogs, groundTruth.expected_fields);
  const fieldQuality = calculateFieldQuality(parsedLogs, groundTruth.expected_fields);
  const fieldCountScore = calculateFieldCountPenalty(
    parsedLogs,
    groundTruth.pattern_characteristics
  );

  const overallQuality =
    parseRate * 0.25 +
    timestampAccuracy * 0.25 +
    logLevelAccuracy * 0.15 +
    fieldQuality * 0.25 +
    fieldCountScore * 0.1;

  return {
    parseRate,
    timestampAccuracy,
    logLevelAccuracy,
    fieldQuality,
    fieldCountPenalty: 1.0 - fieldCountScore,
    overallQuality,
  };
}
