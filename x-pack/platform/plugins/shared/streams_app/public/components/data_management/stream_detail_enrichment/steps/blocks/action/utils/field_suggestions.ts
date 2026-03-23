/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FlattenRecord } from '@kbn/streams-schema';
import type { DetectedField } from '../../../../state_management/simulation_state_machine/types';
import { getAllFieldsInOrder } from '../../../../state_management/simulation_state_machine';

export interface FieldSuggestion {
  name: string;
}

/**
 * Create field suggestions from simulation records and detected fields
 * Uses the centralized field ordering logic from simulation state machine
 */
export function createFieldSuggestions(
  previewRecords?: FlattenRecord[],
  detectedFields?: DetectedField[]
): FieldSuggestion[] {
  const orderedFields = getAllFieldsInOrder(previewRecords, detectedFields);
  return orderedFields.map((fieldName) => ({ name: fieldName, icon: true }));
}
