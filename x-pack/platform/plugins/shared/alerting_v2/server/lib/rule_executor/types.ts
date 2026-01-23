/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLSearchResponse } from '@kbn/es-types';
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

export interface AlertDocument {
  readonly id: string;
  readonly doc: Record<string, unknown>;
}

export interface RulePipelineState {
  readonly input: RuleExecutionInput;
  readonly rule?: RuleResponse;
  readonly queryPayload?: QueryPayload;
  readonly esqlResponse?: ESQLSearchResponse;
  readonly alertEvents?: Array<{ id: string; doc: AlertEvent }>;
}

export type HaltReason = 'rule_deleted' | 'rule_disabled';

export type RuleStepOutput =
  | { type: 'continue'; data?: Partial<Omit<RulePipelineState, 'input'>> }
  | { type: 'halt'; reason: HaltReason };

export const continueWith = <T extends Partial<Omit<RulePipelineState, 'input'>>>(
  data: T
): RuleStepOutput => ({
  type: 'continue',
  data,
});

export const continueExecution = (): RuleStepOutput => ({ type: 'continue' });

export const halt = (reason: HaltReason): RuleStepOutput => ({
  type: 'halt',
  reason,
});

export interface RuleExecutionStep {
  readonly name: string;
  execute(state: Readonly<RulePipelineState>): Promise<RuleStepOutput>;
}
