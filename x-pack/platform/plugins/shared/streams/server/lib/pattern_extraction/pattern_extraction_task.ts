/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { groupMessagesByPattern, extractGrokPatternDangerouslySlow } from '@kbn/grok-heuristics';
import { extractDissectPattern } from '@kbn/dissect-heuristics';
import type {
  GrokExtractionPayload,
  GrokExtractionResult,
  DissectExtractionPayload,
  DissectExtractionResult,
} from './types';

const MAX_SAMPLE_MESSAGES = 10;

export function executeTask(payload: GrokExtractionPayload): GrokExtractionResult;
export function executeTask(payload: DissectExtractionPayload): DissectExtractionResult;
export function executeTask(
  payload: GrokExtractionPayload | DissectExtractionPayload
): GrokExtractionResult | DissectExtractionResult;
export function executeTask(
  payload: GrokExtractionPayload | DissectExtractionPayload
): GrokExtractionResult | DissectExtractionResult {
  switch (payload.type) {
    case 'grok': {
      const groups = groupMessagesByPattern(payload.messages);
      return {
        type: 'grok',
        patternGroups: groups.map((group) => ({
          // Slice messages for LLM review; extraction uses all messages for better heuristics
          messages: group.messages.slice(0, MAX_SAMPLE_MESSAGES),
          nodes: extractGrokPatternDangerouslySlow(group.messages),
        })),
      };
    }
    case 'dissect': {
      const groups = groupMessagesByPattern(payload.messages);
      if (groups.length === 0) {
        return {
          type: 'dissect',
          dissectPattern: { ast: { nodes: [] }, fields: [] },
          largestGroupMessages: [],
        };
      }
      const largestGroup = groups[0];
      return {
        type: 'dissect',
        dissectPattern: extractDissectPattern(largestGroup.messages),
        largestGroupMessages: largestGroup.messages,
      };
    }
  }
}

// eslint-disable-next-line import/no-default-export
export default executeTask;
