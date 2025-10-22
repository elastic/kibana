/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConvertProcessor } from '../../../types/processors';
import type { ConvertType } from '../../../types/formats/convert_types';
import type { PrimitiveType, TypeState, TypeAssumption } from '../types';
import { assignType, getOrCreateFieldType } from '../type_assignment';

/**
 * Map ConvertType to our PrimitiveType
 */
function convertTypeToPrimitive(convertType: ConvertType): PrimitiveType {
  switch (convertType) {
    case 'integer':
    case 'long':
    case 'double':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'string':
      return 'string';
    default:
      // TypeScript should ensure this never happens
      throw new Error(`Unknown convert type: ${convertType}`);
  }
}

/**
 * Handle the convert processor - converts a field to a different type
 *
 * The convert processor takes a source field and converts it to a target type.
 * If 'to' is specified, it creates a new field. Otherwise, it transforms the source field.
 *
 * Type validation behavior:
 * - Source field type is irrelevant (could be any type)
 * - Target field gets the converted type based on the 'type' parameter
 * - If 'to' is not specified, 'from' field type changes to the converted type
 */
export function handleConvertProcessor(
  processor: ConvertProcessor,
  state: TypeState,
  assumptions: TypeAssumption[],
  processorIndex: number,
  isConditional: boolean
): void {
  const { from, to, type: convertType } = processor;
  const targetField = to ?? from;
  const targetType = convertTypeToPrimitive(convertType);

  // Ensure source field exists (even if we don't care about its type for conversion)
  getOrCreateFieldType(from, state);

  // Assign the converted type to the target field
  assignType(
    targetField,
    targetType,
    state,
    assumptions,
    processorIndex,
    isConditional,
    `convert: '${from}' to type '${convertType}'${to ? ` as '${to}'` : ''}`,
    processor.customIdentifier
  );
}
