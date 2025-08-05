/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { partitionStream } from './workflows/partition_stream';

export { initializeOnboarding } from './workflows/onboarding/initialize_onboarding';
export { describeStream } from './workflows/onboarding/describe_stream';
export { generateParsers } from './workflows/onboarding/generate_parsers';
export { generateProcessors } from './workflows/onboarding/generate_processors';

export { findGrokMatchFailure } from './shared/processing/debug_mismatch/grok/find_grok_match_failure';
export { findDissectMatchFailure } from './shared/processing/debug_mismatch/dissect/find_dissect_match_failure';
export type { PatternMatchFailure } from './shared/processing/debug_mismatch/types';
export { formatMatchFailure } from './shared/processing/debug_mismatch/format_match_failure';

export type {
  ValidateProcessorsCallback,
  ProcessorValidation,
} from './workflows/onboarding/generate_processors/validate_processor_callback';

export type { SampleSet } from './shared/processing/types';

export { extractTemplate } from './shared/processing/templatize';
