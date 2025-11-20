/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DissectPattern, DissectProcessorResult } from './types';
import { serializeAST } from './serialize_ast';

/**
 * Generates an Elasticsearch Dissect processor configuration from a Dissect pattern.
 *
 * @param pattern - The DissectPattern object containing AST and field metadata
 * @param sourceField - The source field to apply dissect to (default: 'message')
 * @returns DissectProcessorResult with processor config and metadata
 */
export function getDissectProcessor(
  pattern: DissectPattern,
  sourceField: string = 'message'
): DissectProcessorResult {
  const patternString = serializeAST(pattern.ast);

  return {
    pattern: patternString,
    processor: {
      dissect: {
        field: sourceField,
        pattern: patternString,
        ignore_missing: true,
      },
    },
    metadata: {
      messageCount: pattern.fields[0]?.values.length ?? 0,
      delimiterCount: countDelimiters(patternString),
      fieldCount: pattern.fields.length,
    },
  };
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
