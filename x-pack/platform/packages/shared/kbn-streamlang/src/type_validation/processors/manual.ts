/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeState, TypeAssumption } from '../types';
import type { ManualIngestPipelineProcessor } from '../../../types/processors';

/**
 * Handle Manual Ingest Pipeline processor type assignment.
 * This is an escape hatch - we can't analyze the manual processors,
 * so we skip type validation for them.
 */
export function handleManualProcessor(
  processor: ManualIngestPipelineProcessor,
  state: TypeState,
  assumptions: TypeAssumption[],
  processorIndex: number,
  isConditional: boolean
): void {
  // Manual processors are an escape hatch - we can't determine types
  // Skip analysis
}
