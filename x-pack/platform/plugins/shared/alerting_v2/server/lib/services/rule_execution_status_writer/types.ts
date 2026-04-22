/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceIdentifier } from 'inversify';

export type RuleExecutionOutcome = 'success' | 'failure';

export interface WriteExecutionStatusParams {
  readonly ruleId: string;
  readonly outcome: RuleExecutionOutcome;
  readonly timestamp: string;
  readonly durationMs: number;
  readonly message: string | null;
  readonly errorMessage?: string | null;
}

export interface RuleExecutionStatusWriterContract {
  writeExecutionStatus(params: WriteExecutionStatusParams): Promise<void>;
}

export const RuleExecutionStatusWriterToken = Symbol.for(
  'alerting_v2.RuleExecutionStatusWriter'
) as ServiceIdentifier<RuleExecutionStatusWriterContract>;
