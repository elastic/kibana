/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeState, TypeAssumption } from '../types';
import type { DateProcessor } from '../../../types/processors';
import { assignType } from '../type_assignment';

/**
 * Handle Date processor type assignment.
 * Date parses a date field and stores it as a date type.
 * Target field defaults to the source field if not specified.
 */
export function handleDateProcessor(
  processor: DateProcessor,
  state: TypeState,
  assumptions: TypeAssumption[],
  processorIndex: number,
  isConditional: boolean
): void {
  // Target field is either 'to' or defaults to 'from'
  const targetField = processor.to || processor.from;

  assignType(
    targetField,
    'date',
    state,
    assumptions,
    processorIndex,
    isConditional,
    `date: parse '${processor.from}' to '${targetField}' as date`,
    processor.customIdentifier
  );
}
