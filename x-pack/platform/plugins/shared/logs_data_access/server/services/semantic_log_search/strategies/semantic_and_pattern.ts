/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SemanticLogSearchParams,
  SemanticLogSearchResult,
} from '../../../../common/services/semantic_log_search/types';
import type { TargetCapabilities } from '../capabilities';

/**
 * Ladder 1: semantic_text + pattern_text
 *
 * To be implemented. The planned direction is to feed log patterns from
 * Knowledge Indicators in the AI Index rather than querying logs at request
 * time. See git history for the previous implementation.
 */
export async function searchWithSemanticAndPattern(
  _params: SemanticLogSearchParams,
  _capabilities: TargetCapabilities
): Promise<SemanticLogSearchResult> {
  throw new Error('to be implemented');
}
