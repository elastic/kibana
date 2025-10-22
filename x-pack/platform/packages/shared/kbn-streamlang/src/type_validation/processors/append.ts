/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeState, TypeAssumption } from '../types';
import type { AppendProcessor } from '../../../types/processors';

/**
 * Handle Append processor type assignment.
 * Append adds values to an array field. Arrays "just work" - no explicit type tracking.
 */
export function handleAppendProcessor(
  processor: AppendProcessor,
  state: TypeState,
  assumptions: TypeAssumption[],
  processorIndex: number,
  isConditional: boolean
): void {
  // Arrays "just work" - no type validation needed
  // We could infer element types from the value array if needed, but
  // per the requirements, arrays are assumed to work correctly
}
