/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RecoveryPolicyType } from '@kbn/alerting-v2-schemas';
import type { QueryPayload } from './get_query_payload';
import type { RuleResponse } from '../rules_client';
import type { AlertEvent } from '../../resources/datastreams/alert_events';
import type { ExecutionContext } from '../execution_context';

export interface RuleExecutorTaskParams {
  ruleId: string;
  spaceId: string;
}

export interface RuleExecutionInput {
  readonly ruleId: string;
  readonly spaceId: string;
  readonly scheduledAt: string;
  readonly executionContext: ExecutionContext;
  readonly executionUuid: string;
}

export interface RulePipelineState {
  readonly input: RuleExecutionInput;
  readonly rule?: RuleResponse;
  readonly queryPayload?: QueryPayload;
  readonly esqlRowBatch?: ReadonlyArray<Record<string, unknown>>;
  readonly alertEventsBatch?: ReadonlyArray<AlertEvent>;
}

export type HaltReason = 'rule_deleted' | 'rule_disabled' | 'state_not_ready';

export interface QuerySearchAnnotation {
  readonly wallTimeMs: number;
  readonly esTookMs?: number;
  readonly rowCount: number;
  readonly batchCount: number;
}

export interface EventsWrittenAnnotation {
  readonly breached?: number;
  readonly recovered?: number;
  readonly no_data?: number;
}

export interface EpisodesTransitionedAnnotation {
  readonly active?: number;
  readonly recovering?: number;
  readonly inactive?: number;
}

export interface RecoveryAnnotation {
  readonly mode: RecoveryPolicyType;
  readonly events_emitted: number;
}

export interface StepAnnotations {
  readonly querySearches?: readonly QuerySearchAnnotation[];
  readonly eventsWritten?: EventsWrittenAnnotation;
  readonly episodesTransitioned?: EpisodesTransitionedAnnotation;
  readonly recovery?: RecoveryAnnotation;
}

export type StepStreamResult =
  | { type: 'continue'; state: RulePipelineState; annotations?: StepAnnotations }
  | { type: 'halt'; reason: HaltReason; state: RulePipelineState };

export type PipelineStateStream = AsyncIterableIterator<StepStreamResult>;

export interface RuleExecutionStep {
  readonly name: string;
  executeStream(input: PipelineStateStream): PipelineStateStream;
}
