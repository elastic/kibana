/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DissectPattern, DissectProcessorResult } from './types';

/**
 * Generates an Elasticsearch Dissect processor configuration from a Dissect pattern.
 *
 * @param pattern - The DissectPattern object containing pattern and field metadata
 * @param sourceField - The source field to apply dissect to (default: 'message')
 * @returns DissectProcessorResult with processor config and metadata
 */
export function getDissectProcessor(
  pattern: DissectPattern,
  sourceField: string = 'message'
): DissectProcessorResult {
  // Calculate confidence based on pattern complexity and field coverage
  const confidence = calculateConfidence(pattern);

  return {
    pattern: pattern.pattern,
    processor: {
      dissect: {
        field: sourceField,
        pattern: pattern.pattern,
        ignore_missing: true,
      },
    },
    metadata: {
      messageCount: pattern.fields[0]?.values.length ?? 0,
      delimiterCount: countDelimiters(pattern.pattern),
      fieldCount: pattern.fields.length,
      confidence,
    },
  };
}

/**
 * Calculates confidence score for the pattern (0-1)
 *
 * Factors considered:
 * - Number of fields extracted (more is better, up to a point)
 * - Number of delimiters (indicates structure)
 * - Field value variance (variety is good)
 * - Presence of modifiers (indicates sophistication)
 */
function calculateConfidence(pattern: DissectPattern): number {
  if (pattern.fields.length === 0) {
    return 0;
  }

  // Very low confidence for single field (no parsing happened)
  if (pattern.pattern === '%{message}') {
    return 0.1;
  }

  let score = 0;

  // Factor 1: Number of fields (weight: 40%)
  // More fields = better structure detection, but diminishing returns
  const fieldScore = Math.min(pattern.fields.length / 8, 1.0);
  score += fieldScore * 0.4;

  // Factor 2: Delimiter count (weight: 30%)
  const delimiterCount = countDelimiters(pattern.pattern);
  const delimiterScore = Math.min(delimiterCount / 6, 1.0);
  score += delimiterScore * 0.3;

  // Factor 3: Field value variance (weight: 20%)
  // Fields with varying values indicate actual data extraction
  const varianceScore = calculateFieldVariance(pattern.fields);
  score += varianceScore * 0.2;

  // Factor 4: Modifier usage (weight: 10%)
  // Presence of modifiers shows sophisticated pattern matching
  const modifierScore = calculateModifierScore(pattern.fields);
  score += modifierScore * 0.1;

  return Math.min(score, 1.0);
}

/**
 * Calculate field variance score (0-1)
 * Higher score when fields have more unique values
 */
function calculateFieldVariance(fields: DissectPattern['fields']): number {
  if (fields.length === 0) {
    return 0;
  }

  const varianceScores = fields.map((field) => {
    const uniqueValues = new Set(field.values);
    return uniqueValues.size / field.values.length;
  });

  const avgVariance = varianceScores.reduce((sum, s) => sum + s, 0) / varianceScores.length;
  return avgVariance;
}

/**
 * Calculate modifier usage score (0-1)
 * Higher score when more sophisticated modifiers are used
 */
function calculateModifierScore(fields: DissectPattern['fields']): number {
  if (fields.length === 0) {
    return 0;
  }

  const fieldsWithModifiers = fields.filter((field) => {
    const mods = field.modifiers;
    return mods && (mods.rightPadding || mods.skip);
  });

  return fieldsWithModifiers.length / fields.length;
}

/**
 * Counts the number of delimiter sequences in a pattern
 */
function countDelimiters(pattern: string): number {
  // Count non-%{} sequences
  const withoutFields = pattern.replace(/%\{[^}]+\}/g, '');
  // Count meaningful delimiter sequences (more than just whitespace)
  return withoutFields.split(/\s+/).filter((s) => s.length > 0).length;
}
