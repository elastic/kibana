/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlQueryResponse } from '@elastic/elasticsearch/lib/api/types';
import type { QueryPayload } from './get_query_payload';
import type { RuleResponse } from '../rules_client';
import type { AlertEvent } from '../../resources/alert_events';

export interface RuleExecutorTaskParams {
  ruleId: string;
  spaceId: string;
}

export interface RuleExecutionInput {
  readonly ruleId: string;
  readonly spaceId: string;
  readonly scheduledAt: string;
  readonly abortSignal: AbortSignal;
}

export interface RulePipelineState {
  readonly input: RuleExecutionInput;
  readonly rule?: RuleResponse;
  readonly queryPayload?: QueryPayload;
  readonly esqlResponse?: EsqlQueryResponse;
  readonly alertEvents?: AlertEvent[];
}

export type HaltReason = 'rule_deleted' | 'rule_disabled' | 'state_not_ready';

export type RuleStepOutput =
  | { type: 'continue'; data?: Partial<Omit<RulePipelineState, 'input'>> }
  | { type: 'halt'; reason: HaltReason };

export interface RuleExecutionStep {
  readonly name: string;
  execute(state: Readonly<RulePipelineState>): Promise<RuleStepOutput>;
}
