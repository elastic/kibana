/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup } from '@kbn/core/server';
import type {
  ErrorReason,
  SearchPhase,
  UnavailableReason,
} from '../../../common/services/semantic_log_search/constants';

export const SEARCH_COMPLETED_EVENT = 'logs_data_access_semantic_search_completed';
const ERROR_TYPES = [
  'parsing_exception',
  'verification_exception',
  'security_exception',
  'circuit_breaking_exception',
  'es_rejected_execution_exception',
  'resource_not_found_exception',
  'index_not_found_exception',
  'model_deployment_timeout_exception',
  'timeout_exception',
  'TimeoutError',
  'ResponseError',
  'TypeError',
  'Error',
] as const;
type TelemetryErrorType = (typeof ERROR_TYPES)[number] | 'other';

/** Bounds error classifiers that can otherwise contain arbitrary Error names or Elasticsearch strings. */
export const classifyTelemetryError = (type: string): TelemetryErrorType =>
  ERROR_TYPES.find((allowed) => allowed === type) ?? 'other';
export type SearchOutcome =
  | 'success'
  | 'empty'
  | 'unavailable'
  | 'rejected'
  | 'cancelled'
  | 'failed';

export interface SearchCompletedEvent {
  outcome: SearchOutcome;
  duration_ms: number;
  caller: 'inference' | 'other';
  reason?: ErrorReason | UnavailableReason;
  error_type?: TelemetryErrorType;
  failure_phase?: SearchPhase | 'validation' | 'unknown';
  pattern_count?: number;
  sampled?: boolean;
  candidate_count?: number;
  selected_candidate_count?: number;
  candidates_capped?: boolean;
  categorize_row_limit_reached?: boolean;
}

/** Registers content-free completion telemetry for every service attempt. */
export const registerSemanticSearchEvent = (analytics: AnalyticsServiceSetup): void => {
  analytics.registerEventType<SearchCompletedEvent>({
    eventType: SEARCH_COMPLETED_EVENT,
    schema: {
      outcome: {
        type: 'keyword',
        _meta: {
          description:
            'Service outcome, including empty, unavailable, rejected, cancelled and failed attempts.',
        },
      },
      duration_ms: {
        type: 'float',
        _meta: {
          description: 'Service duration in milliseconds, measured with a monotonic clock.',
        },
      },
      caller: {
        type: 'keyword',
        _meta: {
          description:
            'Whether the service ran in an inference context; does not identify the caller.',
        },
      },
      reason: {
        type: 'keyword',
        _meta: { description: 'Bounded service failure or unavailability reason.', optional: true },
      },
      error_type: {
        type: 'keyword',
        _meta: {
          description: 'Allowlisted error classifier or other; never a raw Error name or message.',
          optional: true,
        },
      },
      failure_phase: {
        type: 'keyword',
        _meta: { description: 'Phase at which the service could not complete.', optional: true },
      },
      pattern_count: {
        type: 'integer',
        _meta: { description: 'Number of returned patterns on success.', optional: true },
      },
      sampled: {
        type: 'boolean',
        _meta: {
          description: 'Whether any executed categorization pass used sampling.',
          optional: true,
        },
      },
      candidate_count: {
        type: 'integer',
        _meta: { description: 'Collected candidates before rerank selection.', optional: true },
      },
      selected_candidate_count: {
        type: 'integer',
        _meta: { description: 'Candidates selected for reranking.', optional: true },
      },
      candidates_capped: {
        type: 'boolean',
        _meta: {
          description: 'Whether the rerank candidate limit removed candidates.',
          optional: true,
        },
      },
      categorize_row_limit_reached: {
        type: 'boolean',
        _meta: {
          description:
            'Whether any completed categorization pass reached its row limit; indicates possible truncation, not proven truncation.',
          optional: true,
        },
      },
    },
  });
};
