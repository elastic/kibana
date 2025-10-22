/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeState, TypeAssumption } from '../types';
import type { StreamlangProcessorDefinition } from '../../../types/processors';
import { handleSetProcessor } from './set';
import { handleRenameProcessor } from './rename';
import { handleGrokProcessor } from './grok';
import { handleDissectProcessor } from './dissect';
import { handleDateProcessor } from './date';
import { handleAppendProcessor } from './append';
import { handleManualProcessor } from './manual';

export * from './set';
export * from './rename';
export * from './grok';
export * from './dissect';
export * from './date';
export * from './append';
export * from './manual';

/**
 * Process a single processor and update type state.
 */
export function processProcessor(
  processor: StreamlangProcessorDefinition,
  state: TypeState,
  assumptions: TypeAssumption[],
  processorIndex: number,
  isConditional: boolean
): void {
  switch (processor.action) {
    case 'set':
      handleSetProcessor(processor, state, assumptions, processorIndex, isConditional);
      break;
    case 'rename':
      handleRenameProcessor(processor, state, assumptions, processorIndex, isConditional);
      break;
    case 'grok':
      handleGrokProcessor(processor, state, assumptions, processorIndex, isConditional);
      break;
    case 'dissect':
      handleDissectProcessor(processor, state, assumptions, processorIndex, isConditional);
      break;
    case 'date':
      handleDateProcessor(processor, state, assumptions, processorIndex, isConditional);
      break;
    case 'append':
      handleAppendProcessor(processor, state, assumptions, processorIndex, isConditional);
      break;
    case 'manual_ingest_pipeline':
      handleManualProcessor(processor, state, assumptions, processorIndex, isConditional);
      break;
    default:
      // Exhaustive check
      const _exhaustive: never = processor;
      throw new Error(`Unknown processor type: ${(_exhaustive as any).action}`);
  }
}
