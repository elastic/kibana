/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import { LoggerServiceToken, type LoggerServiceContract } from '../logger_service/logger_service';
import type { RulesSavedObjectServiceContract } from '../rules_saved_object_service/rules_saved_object_service';
import { RulesSavedObjectServiceInternalToken } from '../rules_saved_object_service/tokens';
import type { RuleExecutionStatusWriterContract, WriteExecutionStatusParams } from './types';

/**
 * Persists the outcome of the latest rule execution onto the rule SO.
 *
 * The SO field is what powers server-side sort/filter + the "Last response"
 * column on the rules list per issue #256552.
 *
 * Errors from the partial update are swallowed and logged — a failure to
 * persist the summary must never fail an otherwise successful rule run.
 */
@injectable()
export class RuleExecutionStatusWriter implements RuleExecutionStatusWriterContract {
  constructor(
    @inject(RulesSavedObjectServiceInternalToken)
    private readonly rulesSavedObjectService: RulesSavedObjectServiceContract,
    @inject(LoggerServiceToken) private readonly logger: LoggerServiceContract
  ) {}

  public async writeExecutionStatus({
    ruleId,
    outcome,
    timestamp,
    durationMs,
    message,
    errorMessage,
  }: WriteExecutionStatusParams): Promise<void> {
    try {
      await this.rulesSavedObjectService.partialUpdateLastExecution({
        id: ruleId,
        patch: {
          outcome,
          timestamp,
          duration_ms: durationMs,
          message: message ?? null,
          error_message: errorMessage ?? null,
        },
      });
    } catch (error) {
      this.logger.error({
        error: error instanceof Error ? error : new Error(String(error)),
        code: 'RULE_EXECUTION_STATUS_WRITE_ERROR',
        type: 'RuleExecutionStatusWriterError',
      });
    }
  }
}
