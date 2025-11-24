/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PatternExtractionGroundTruth } from './pattern_extraction_datasets';

/**
 * Quality metrics for evaluating pattern extraction beyond simple parse rate.
 * These metrics assess whether the generated pattern extracts meaningful, accurate fields.
 */

export interface PatternQualityMetrics {
  /** Overall parse rate: percentage of logs successfully parsed */
  parseRate: number;
  /** Timestamp extraction accuracy (0-1): Whether timestamps are extracted */
  timestampAccuracy: number;
  /** Log level accuracy (0-1): Percentage of correctly extracted log levels */
  logLevelAccuracy: number;
  /** Field quality score (0-1): How well other fields match expected values */
  fieldQuality: number;
  /** Field count penalty (0-1): Penalty for extracting too many or too few fields */
  fieldCountPenalty: number;
  /** Combined quality score (0-1): Weighted average of all metrics */
  overallQuality: number;
}

export interface ParsedLog {
  /** Whether the log was successfully parsed */
  parsed: boolean;
  /** Extracted fields from the log */
  fields: Record<string, string | number | boolean | null>;
  /** Original log message */
  originalMessage: string;
}

/**
 * Calculate timestamp extraction accuracy by checking if timestamp fields are extracted.
 * Does NOT attempt to parse or validate the timestamp format - just checks presence.
 *
 * Scoring:
 * - 1.0: Timestamp field extracted with non-empty value
 * - 0.0: No timestamp extracted or empty value
 */
export function calculateTimestampAccuracy(
  parsedLogs: ParsedLog[],
  expectedFields: PatternExtractionGroundTruth['expected_fields']
): number {
  if (parsedLogs.length === 0) {
    return 0;
  }

  const timestampFieldName = expectedFields.timestamp?.field_name;
  if (!timestampFieldName) {
    return 1.0; // No timestamp expected, so no penalty
  }

  let extractedCount = 0;

  for (const log of parsedLogs) {
    if (!log.parsed) {
      continue;
    }

    const extractedTimestamp = log.fields[timestampFieldName];

    // Check if timestamp exists and has a non-empty value
    if (extractedTimestamp && String(extractedTimestamp).trim().length > 0) {
      extractedCount++;
    }
  }

  return extractedCount / parsedLogs.length;
}

/**
 * Calculate log level extraction accuracy by comparing extracted log levels
 * with expected values.
 *
 * Scoring:
 * - 1.0: Extracted level matches one of the expected values (case-insensitive)
 * - 0.0: No level extracted or doesn't match expected values
 */
export function calculateLogLevelAccuracy(
  parsedLogs: ParsedLog[],
  expectedFields: PatternExtractionGroundTruth['expected_fields']
): number {
  if (parsedLogs.length === 0 || !expectedFields.log_level) {
    return 0;
  }

  const logLevelFieldName = expectedFields.log_level.field_name;
  const expectedValues = expectedFields.log_level.example_values.map((v) => v.toLowerCase());

  let correctCount = 0;

  for (const log of parsedLogs) {
    if (!log.parsed) {
      continue;
    }

    const extractedLevel = log.fields[logLevelFieldName];

    if (!extractedLevel) {
      continue;
    }

    const extractedLevelStr = String(extractedLevel).toLowerCase();

    // Check if extracted level matches any expected value
    // Also check common variations (e.g., INFO/info, WARN/warning)
    const matches = expectedValues.some((expected) => {
      if (extractedLevelStr === expected) return true;

      // Handle common level variations
      const variations: Record<string, string[]> = {
        info: ['information', 'informational'],
        warn: ['warning', 'wrn'],
        error: ['err', 'fatal', 'critical'],
        debug: ['dbg', 'trace', 'verbose'],
        notice: ['note'],
      };

      for (const [canonical, alts] of Object.entries(variations)) {
        if (expected.includes(canonical)) {
          return alts.some((alt) => extractedLevelStr.includes(alt));
        }
      }

      return false;
    });

    if (matches) {
      correctCount++;
    }
  }

  return correctCount / parsedLogs.length;
}

/**
 * Calculate field quality by comparing extracted fields with expected fields.
 * This measures how well the pattern extracts meaningful field names and values.
 *
 * Scoring considers:
 * - Field name similarity to expected names
 * - Field value types and patterns
 * - Presence of required fields
 * - Absence of junk/noise fields
 */
export function calculateFieldQuality(
  parsedLogs: ParsedLog[],
  expectedFields: PatternExtractionGroundTruth['expected_fields']
): number {
  if (parsedLogs.length === 0) {
    return 0;
  }

  const otherFields = expectedFields.other_fields || [];
  const requiredFields = otherFields.filter((f) => f.required);
  const allExpectedFieldNames = otherFields.map((f) => f.name);

  let totalQuality = 0;

  for (const log of parsedLogs) {
    if (!log.parsed) {
      totalQuality += 0;
      continue;
    }

    let logScore = 0;
    let maxPossibleScore = 0;

    // Score required fields (higher weight)
    for (const requiredField of requiredFields) {
      maxPossibleScore += 2; // Required fields worth 2 points

      if (log.fields[requiredField.name]) {
        const value = log.fields[requiredField.name];

        // Check if value is reasonable (not empty, not just whitespace)
        if (isReasonableFieldValue(value, requiredField)) {
          logScore += 2;
        } else {
          logScore += 0.5; // Partial credit for extracting the field
        }
      }
    }

    // Score optional expected fields (lower weight)
    const optionalFields = otherFields.filter((f) => !f.required);
    for (const optionalField of optionalFields) {
      maxPossibleScore += 1; // Optional fields worth 1 point

      if (log.fields[optionalField.name]) {
        const value = log.fields[optionalField.name];

        if (isReasonableFieldValue(value, optionalField)) {
          logScore += 1;
        } else {
          logScore += 0.3;
        }
      }
    }

    // Check for unexpected/junk fields (penalty)
    const extractedFieldNames = Object.keys(log.fields);
    const junkFields = extractedFieldNames.filter(
      (name) =>
        !allExpectedFieldNames.includes(name) &&
        name !== expectedFields.timestamp?.field_name &&
        name !== expectedFields.log_level?.field_name
    );

    // Small penalty for each junk field
    const junkPenalty = junkFields.length * 0.2;

    // Normalize to 0-1 range
    const normalizedScore =
      maxPossibleScore > 0 ? Math.max(0, (logScore - junkPenalty) / maxPossibleScore) : 0;

    totalQuality += normalizedScore;
  }

  return totalQuality / parsedLogs.length;
}

/**
 * Check if a field value is reasonable (not empty, matches expected type/pattern)
 */
function isReasonableFieldValue(
  value: string | number | boolean | null,
  fieldDef: PatternExtractionGroundTruth['expected_fields']['other_fields'][0]
): boolean {
  if (value === null || value === undefined) {
    return false;
  }

  const valueStr = String(value).trim();

  // Empty or just whitespace
  if (valueStr.length === 0) {
    return false;
  }

  // Very short values are suspicious (except for log levels, booleans)
  if (valueStr.length < 2 && fieldDef.type !== 'boolean') {
    return false;
  }

  // Check type compatibility
  if (fieldDef.type === 'number') {
    return !isNaN(Number(valueStr));
  }

  if (fieldDef.type === 'boolean') {
    return ['true', 'false', '1', '0', 'yes', 'no'].includes(valueStr.toLowerCase());
  }

  // For IP addresses
  if (fieldDef.type === 'ip') {
    // Simple IPv4/IPv6 check
    return /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(valueStr) || /^[0-9a-f:]+$/i.test(valueStr);
  }

  // For other types, just check it's not placeholder-like
  const placeholderPatterns = [
    /^-+$/, // Just dashes
    /^\.+$/, // Just dots
    /^\*+$/, // Just asterisks
    /^_+$/, // Just underscores
    /^null$/i, // Literal "null"
    /^undefined$/i, // Literal "undefined"
    /^n\/?a$/i, // "N/A" or "n/a"
  ];

  return !placeholderPatterns.some((pattern) => pattern.test(valueStr));
}

/**
 * Calculate penalty for extracting too many or too few fields.
 * This helps identify patterns that are too greedy or too conservative.
 *
 * Scoring:
 * - 1.0: Field count within expected range (no penalty)
 * - 0.5-0.9: Field count slightly outside range (small penalty)
 * - 0.0-0.4: Field count far from expected (large penalty)
 */
export function calculateFieldCountPenalty(
  parsedLogs: ParsedLog[],
  patternCharacteristics: PatternExtractionGroundTruth['pattern_characteristics']
): number {
  if (parsedLogs.length === 0 || !patternCharacteristics) {
    return 0;
  }

  const expectedMin = patternCharacteristics.expected_min_fields;
  const expectedMax = patternCharacteristics.expected_max_fields;

  let totalPenalty = 0;

  for (const log of parsedLogs) {
    if (!log.parsed) {
      totalPenalty += 1.0; // Maximum penalty for unparsed logs
      continue;
    }

    const fieldCount = Object.keys(log.fields).length;

    if (fieldCount >= expectedMin && fieldCount <= expectedMax) {
      // Perfect: within range
      totalPenalty += 0;
    } else if (fieldCount < expectedMin) {
      // Too few fields
      const deficit = expectedMin - fieldCount;
      const penaltyFactor = Math.min(deficit / expectedMin, 1.0);
      totalPenalty += penaltyFactor * 0.6; // 60% max penalty for too few
    } else {
      // Too many fields
      const excess = fieldCount - expectedMax;
      const penaltyFactor = Math.min(excess / expectedMax, 1.0);
      totalPenalty += penaltyFactor * 0.4; // 40% max penalty for too many
    }
  }

  // Return inverse penalty as a score (higher is better)
  return 1.0 - totalPenalty / parsedLogs.length;
}

/**
 * Calculate overall pattern quality by combining all metrics with weights.
 *
 * Weights:
 * - Parse rate: 25% (must parse at all)
 * - Timestamp accuracy: 20% (critical for log analysis)
 * - Log level accuracy: 15% (important for filtering)
 * - Field quality: 30% (most important for usefulness)
 * - Field count penalty: 10% (prevents over/under extraction)
 */
export function calculateOverallQuality(
  parsedLogs: ParsedLog[],
  groundTruth: PatternExtractionGroundTruth
): PatternQualityMetrics {
  const parseRate = parsedLogs.filter((log) => log.parsed).length / parsedLogs.length;

  const timestampAccuracy = calculateTimestampAccuracy(parsedLogs, groundTruth.expected_fields);

  const logLevelAccuracy = groundTruth.expected_fields.log_level
    ? calculateLogLevelAccuracy(parsedLogs, groundTruth.expected_fields)
    : 1.0; // If no log level expected, don't penalize

  const fieldQuality = calculateFieldQuality(parsedLogs, groundTruth.expected_fields);

  const fieldCountScore = calculateFieldCountPenalty(
    parsedLogs,
    groundTruth.pattern_characteristics
  );

  // Weighted combination
  const overallQuality =
    parseRate * 0.25 +
    timestampAccuracy * 0.2 +
    logLevelAccuracy * 0.15 +
    fieldQuality * 0.3 +
    fieldCountScore * 0.1;

  return {
    parseRate,
    timestampAccuracy,
    logLevelAccuracy,
    fieldQuality,
    fieldCountPenalty: 1.0 - fieldCountScore, // Invert for intuitive penalty display
    overallQuality,
  };
}

/**
 * Helper function to simulate parsing a log message with a pattern.
 * This is a placeholder - actual parsing would use the heuristic pattern generator.
 */
export function parseLogWithPattern(
  logMessage: string,
  pattern: string,
  patternType: 'grok' | 'dissect'
): ParsedLog {
  // TODO: Integrate with actual @kbn/grok-heuristics and @kbn/dissect-heuristics
  // For now, return a mock parsed result
  return {
    parsed: false,
    fields: {},
    originalMessage: logMessage,
  };
}
