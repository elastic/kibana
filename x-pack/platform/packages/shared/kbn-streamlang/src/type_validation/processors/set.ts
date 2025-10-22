/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeState, TypeAssumption } from '../types';
import type { SetProcessor } from '../../../types/processors';
import { assignType, getOrCreateFieldType } from '../type_assignment';
import { inferTypeFromValue } from '../type_utils';

/**
 * Handle Set processor type assignment.
 * Set can either copy from another field or set a value.
 */
export function handleSetProcessor(
  processor: SetProcessor,
  state: TypeState,
  assumptions: TypeAssumption[],
  processorIndex: number,
  isConditional: boolean
): void {
  if (processor.copy_from) {
    // Copying from another field
    const sourceType = getOrCreateFieldType(processor.copy_from, state);
    assignType(
      processor.to,
      sourceType,
      state,
      assumptions,
      processorIndex,
      isConditional,
      `set: copy from '${processor.copy_from}' to '${processor.to}'`
    );
  } else if (processor.value !== undefined) {
    // Setting a literal value - infer type from the value
    const valueType = inferTypeFromValue(processor.value);
    assignType(
      processor.to,
      valueType,
      state,
      assumptions,
      processorIndex,
      isConditional,
      `set: assign ${valueType} value to '${processor.to}'`
    );
  }
}
