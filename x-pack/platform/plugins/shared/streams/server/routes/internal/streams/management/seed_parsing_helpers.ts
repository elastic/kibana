/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Barrel re-export for the seed-parsing helpers used by both the agent
 * `extract_fields: true` flow and the streams management UI's
 * "Suggest Processing Pipeline" route. Implementations live under
 * ./seed_parsing/ split by strategy:
 *
 * - `./seed_parsing/shared.ts` — constants, the `CommonSeedParsingArgs`
 *   interface, the `SeedParsingCandidate` union, and shared error helpers.
 * - `./seed_parsing/grok.ts` — `processGrokPatterns` (heuristic + LLM
 *   review + simulation for grok seed patterns).
 * - `./seed_parsing/dissect.ts` — `processDissectPattern` (same shape, but
 *   for dissect).
 * - `./seed_parsing/extract_parsed_documents.ts` —
 *   `extractParsedSampleDocuments`, used after a seed pattern is picked
 *   to materialise the post-parse view for the reasoning sub-agent.
 *
 * Existing consumers (`extract_fields_handler.ts`,
 * `dissect_suggestions_handler.ts`, `suggest_processing_pipeline_route.ts`,
 * and the unit-test mock at the same path) all import from this barrel so
 * the file split is invisible to them. New code may import directly from
 * the per-strategy modules.
 */

export {
  MAX_REVIEW_MESSAGES,
  NUM_REVIEW_EXAMPLES,
  SYSTEM_PARSING_PRE_SIM_ID,
  formatInferenceErrorMeta,
  getErrorMessage,
  type CommonSeedParsingArgs,
  type SeedParsingCandidate,
} from './seed_parsing/shared';
export { processGrokPatterns } from './seed_parsing/grok';
export { processDissectPattern } from './seed_parsing/dissect';
export { extractParsedSampleDocuments } from './seed_parsing/extract_parsed_documents';
