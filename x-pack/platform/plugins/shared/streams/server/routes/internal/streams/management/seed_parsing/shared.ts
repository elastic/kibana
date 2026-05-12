/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { FlattenRecord } from '@kbn/streams-schema';
import type { InferenceClient } from '@kbn/inference-common';
import { isInferenceError } from '@kbn/inference-common';
import type { IFieldsMetadataClient } from '@kbn/fields-metadata-plugin/server/services/fields_metadata/types';
import type { GrokProcessor, DissectProcessor } from '@kbn/streamlang';
import type { StreamsClient } from '../../../../../lib/streams/client';
import type { IPatternExtractionService } from '../../../../../lib/pattern_extraction/pattern_extraction_service';

/**
 * Identifier used for the seed parsing processor when it is simulated alone
 * to produce fully-parsed sample documents for the post-parse sub-agent.
 */
export const SYSTEM_PARSING_PRE_SIM_ID = 'system-suggested-parsing-pre-step';

/**
 * Maximum number of sample messages forwarded to the LLM during dissect
 * field review. Bounds review prompt size and cost.
 */
export const MAX_REVIEW_MESSAGES = 10;

/**
 * Number of sample values per dissect field used to anchor the LLM review.
 */
export const NUM_REVIEW_EXAMPLES = 10;

/**
 * Outcome of running a single seed-pattern strategy (grok or dissect) end-to-end:
 * heuristic extraction → LLM field review → simulation against sample documents.
 */
export type SeedParsingCandidate =
  | { type: 'grok'; processor: GrokProcessor; parsedRate: number }
  | { type: 'dissect'; processor: DissectProcessor; parsedRate: number };

export interface CommonSeedParsingArgs {
  messages: string[];
  fieldName: string;
  streamName: string;
  connectorId: string;
  documents: FlattenRecord[];
  patternExtractionService: IPatternExtractionService;
  inferenceClient: InferenceClient;
  scopedClusterClient: IScopedClusterClient;
  streamsClient: StreamsClient;
  fieldsMetadataClient: IFieldsMetadataClient;
  useOtelFieldNames: boolean;
  signal: AbortSignal;
  logger: Logger;
}

export const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export const formatInferenceErrorMeta = (error: unknown): string => {
  if (isInferenceError(error)) {
    const parts: string[] = [];
    if (error.code) parts.push(`code=${error.code}`);
    if (error.meta?.status) parts.push(`status=${error.meta.status}`);
    return parts.length > 0 ? ` ${parts.join(' ')}` : '';
  }
  return '';
};
