/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GrokPatternNode } from '@kbn/grok-heuristics';
import type { DissectPattern } from '@kbn/dissect-heuristics';

export interface GrokExtractionPayload {
  type: 'grok';
  messages: string[];
}

export interface GrokExtractionResult {
  type: 'grok';
  patternGroups: Array<{
    messages: string[];
    nodes: GrokPatternNode[];
  }>;
}

export interface DissectExtractionPayload {
  type: 'dissect';
  messages: string[];
}

export interface DissectExtractionResult {
  type: 'dissect';
  dissectPattern: DissectPattern;
  largestGroupMessages: string[];
}
