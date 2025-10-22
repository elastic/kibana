/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeState, TypeAssumption } from '../types';
import type { GrokProcessor } from '../../../types/processors';
import { assignType } from '../type_assignment';
import { normalizeToPrimitive } from '../type_utils';
import { parseMultiGrokPatterns } from '../../../types/utils/grok_patterns';

/**
 * Handle Grok processor type assignment.
 * Grok extracts fields from a source field using patterns.
 * Each pattern can specify types (int, long, float, or default keyword).
 */
export function handleGrokProcessor(
  processor: GrokProcessor,
  state: TypeState,
  assumptions: TypeAssumption[],
  processorIndex: number,
  isConditional: boolean
): void {
  // Parse the grok patterns to extract field information
  const parseResult = parseMultiGrokPatterns(processor.patterns);

  // Assign types for all extracted fields
  for (const field of parseResult.allFields) {
    // Normalize ES types to primitive types (keyword -> string, int/long/float -> number)
    const primitiveType = normalizeToPrimitive(field.type);

    assignType(
      field.name,
      primitiveType,
      state,
      assumptions,
      processorIndex,
      isConditional,
      `grok: extract '${field.name}' as ${primitiveType} from '${processor.from}'`,
      processor.customIdentifier
    );
  }
}
