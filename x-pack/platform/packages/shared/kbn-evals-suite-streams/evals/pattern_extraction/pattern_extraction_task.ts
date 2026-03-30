/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/scout';
import { findSSEEventData } from '../shared_helpers';
import type { PatternExtractionEvaluationExample } from './pattern_extraction_datasets';
import {
  calculateOverallQuality,
  type ParsedLog,
  type PatternQualityMetrics,
} from './pattern_extraction_metrics';

export interface PatternProcessor {
  patterns?: string[];
  pattern?: string;
  pattern_definitions?: Record<string, string>;
  append_separator?: string;
}

export interface PatternExtractionResult {
  input: PatternExtractionEvaluationExample['input'];
  output: {
    patternType: 'grok' | 'dissect';
    heuristicPattern: string;
    suggestedProcessor: PatternProcessor | null;
    parsedLogs: ParsedLog[];
    metrics: PatternQualityMetrics;
  };
  expected: PatternExtractionEvaluationExample['output'];
  metadata: PatternExtractionEvaluationExample['metadata'];
}

/**
 * Call the pattern suggestion route and extract the processor config from the
 * typed SSE event (`grok_suggestion` or `dissect_suggestion`).
 */
const suggestPattern = async (
  kbnClient: KbnClient,
  connectorId: string,
  patternType: 'grok' | 'dissect',
  fieldToParse: string,
  messages: string[]
): Promise<PatternProcessor | null> => {
  const response = await kbnClient.request({
    method: 'POST',
    path: `/internal/streams/logs.otel/processing/_suggestions/${patternType}`,
    body: {
      connector_id: connectorId,
      field_name: fieldToParse,
      sample_messages: messages,
    },
  });

  const eventType = `${patternType}_suggestion`;
  const processorKey = patternType === 'grok' ? 'grokProcessor' : 'dissectProcessor';

  const data = findSSEEventData<Record<string, unknown>>(response.data as string, eventType);
  if (!data) return null;

  return (data[processorKey] as PatternProcessor) ?? null;
};

/**
 * Filter simulation output to only the fields that were actually extracted,
 * excluding metadata fields and pass-through values.
 */
const extractFields = (
  value: Record<string, unknown>,
  fieldToParse: string,
  originalMessage: string
): Record<string, string | number> => {
  // Only exclude metadata fields, not fieldToParse.
  // If the pattern extracts a body.text field, it's the extracted message (e.g., GREEDYDATA)
  // which IS a valid extraction result we want to show to the evaluator.
  const excluded = new Set(['stream.name', '@timestamp']);
  const fields: Record<string, string | number> = {};

  for (const [key, val] of Object.entries(value)) {
    if (!excluded.has(key) && (typeof val === 'string' || typeof val === 'number')) {
      // Skip the fieldToParse only if its value equals the original message
      // (meaning it wasn't transformed/extracted, just passed through)
      if (key === fieldToParse && val === originalMessage) {
        continue;
      }
      fields[key] = val;
    }
  }
  return fields;
};

/**
 * Build a processing step from the processor config and simulate it against
 * the sample messages, returning parsed log results.
 */
const simulatePattern = async (
  kbnClient: KbnClient,
  messages: string[],
  fieldToParse: string,
  patternType: 'grok' | 'dissect',
  processor: PatternProcessor | null
): Promise<ParsedLog[]> => {
  const allFailed = () =>
    messages.map((msg) => ({ parsed: false, fields: {}, originalMessage: msg }));

  const hasValidPattern =
    patternType === 'grok' ? (processor?.patterns?.length ?? 0) > 0 : Boolean(processor?.pattern);

  if (!hasValidPattern) {
    return allFailed();
  }

  const step =
    patternType === 'grok'
      ? {
          action: 'grok',
          customIdentifier: 'eval-grok',
          from: fieldToParse,
          patterns: processor!.patterns!,
          pattern_definitions: processor?.pattern_definitions || {},
        }
      : {
          action: 'dissect',
          customIdentifier: 'eval-dissect',
          from: fieldToParse,
          pattern: processor!.pattern!,
          append_separator: processor?.append_separator,
        };

  const documents = messages.map((msg) => ({
    [fieldToParse]: msg,
    'stream.name': 'logs.otel',
    '@timestamp': '2025-01-01',
  }));

  try {
    const response = await kbnClient.request({
      method: 'POST',
      path: `/internal/streams/logs.otel/processing/_simulate`,
      body: { documents, processing: { steps: [step] } },
    });

    const result = response.data as {
      documents: Array<{
        status: 'parsed' | 'partially_parsed' | 'skipped' | 'failed';
        value: Record<string, unknown>;
      }>;
    };

    return result.documents.map((doc, idx) => ({
      parsed: doc.status === 'parsed',
      fields: extractFields(doc.value, fieldToParse, messages[idx]),
      originalMessage: messages[idx],
    }));
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error simulating processing:', error);
    return allFailed();
  }
};

/**
 * End-to-end task: suggest a pattern, simulate it, and calculate quality metrics.
 */
export const runPatternExtraction = async (
  example: PatternExtractionEvaluationExample,
  patternType: 'grok' | 'dissect',
  kbnClient: KbnClient,
  connector: { id: string }
): Promise<PatternExtractionResult> => {
  const { input, output: expected, metadata } = example;
  const { sample_messages: messages, field_to_parse: fieldToParse } = input;

  let processor: PatternProcessor | null = null;

  try {
    processor = await suggestPattern(kbnClient, connector.id, patternType, fieldToParse, messages);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error calling suggestion route:', error);
  }

  const heuristicPattern = processor?.patterns?.[0] || processor?.pattern || '';
  const parsedLogs = await simulatePattern(
    kbnClient,
    messages,
    fieldToParse,
    patternType,
    processor
  );
  const metrics = calculateOverallQuality(parsedLogs, expected);

  return {
    input,
    output: { patternType, heuristicPattern, suggestedProcessor: processor, parsedLogs, metrics },
    expected,
    metadata,
  };
};
