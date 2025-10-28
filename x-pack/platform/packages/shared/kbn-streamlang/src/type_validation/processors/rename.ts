/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeState, TypeAssumption } from '../types';
import type { RenameProcessor } from '../../../types/processors';
import { assignType, getOrCreateFieldType } from '../type_assignment';

/**
 * Handle Rename processor type assignment.
 * Rename moves a field from one name to another, preserving the type.
 */
export function handleRenameProcessor(
  processor: RenameProcessor,
  state: TypeState,
  assumptions: TypeAssumption[],
  processorIndex: number,
  isConditional: boolean
): void {
  // Get the type of the source field
  const sourceType = getOrCreateFieldType(processor.from, state);

  // Assign the same type to the target field
  assignType(
    processor.to,
    sourceType,
    state,
    assumptions,
    processorIndex,
    isConditional,
    `rename: move '${processor.from}' to '${processor.to}'`,
    processor.customIdentifier
  );

  // Note: We don't remove the source field from state because it might still be referenced
  // The actual Elasticsearch processor will remove it, but for type validation we keep both
}
