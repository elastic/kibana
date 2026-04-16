/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type {
  ExtractedMemoryCandidate,
  ExtractionResult,
  ExtractionInput,
  MemoryExtractorDeps,
} from './memory_extractor';
export { MemoryExtractor, buildExtractionInputFromRound } from './memory_extractor';

export type { DedupCheckResult, DedupDisposition, DedupCheckerDeps } from './dedup_checker';
export {
  DedupChecker,
  NEAR_DUPLICATE_THRESHOLD,
  RELATED_THRESHOLD,
} from './dedup_checker';

export type {
  CandidatePipelineContext,
  CandidatePipelineDeps,
  PipelineRunResult,
} from './candidate_pipeline';
export { CandidatePipeline } from './candidate_pipeline';
