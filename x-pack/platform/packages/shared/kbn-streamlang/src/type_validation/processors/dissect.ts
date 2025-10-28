/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeState, TypeAssumption } from '../types';
import type { DissectProcessor } from '../../../types/processors';
import { assignType } from '../type_assignment';
import { parseDissectPattern } from '../../../types/utils/dissect_patterns';

/**
 * Handle Dissect processor type assignment.
 * Dissect extracts fields from a source field using a pattern.
 * All dissect fields are strings (keyword normalized to string).
 */
export function handleDissectProcessor(
  processor: DissectProcessor,
  state: TypeState,
  assumptions: TypeAssumption[],
  processorIndex: number,
  isConditional: boolean
): void {
  // Parse the dissect pattern to extract field information
  const fields = parseDissectPattern(processor.pattern);

  // Assign string type for all extracted fields (dissect always produces strings)
  for (const field of fields) {
    assignType(
      field.name,
      'string',
      state,
      assumptions,
      processorIndex,
      isConditional,
      `dissect: extract '${field.name}' as string from '${processor.from}'`,
      processor.customIdentifier
    );
  }
}
