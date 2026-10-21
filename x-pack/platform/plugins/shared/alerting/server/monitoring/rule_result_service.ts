/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleExecutionStatusErrorReasons, type PublicLastRunSetters } from '../types';

export interface RuleResultServiceResults {
  errors: LastRunError[];
  warnings: string[];
  outcomeMessage: string;
}

interface LastRunError {
  message: string;
  userError: boolean;
  reason?: RuleExecutionStatusErrorReasons;
}

/** Reason stored for an error a rule executor reports through addLastRunError. */
export const reasonForReportedError = (
  userError: boolean,
  reason?: RuleExecutionStatusErrorReasons
): RuleExecutionStatusErrorReasons =>
  reason ??
  (userError
    ? RuleExecutionStatusErrorReasons.Configuration
    : RuleExecutionStatusErrorReasons.Execute);

export class RuleResultService {
  private errors: LastRunError[] = [];
  private warnings: string[] = [];
  private outcomeMessage = '';

  public getLastRunErrors(): LastRunError[] {
    return this.errors;
  }

  public getLastRunWarnings(): string[] {
    return this.warnings;
  }

  public getLastRunOutcomeMessage(): string {
    return this.outcomeMessage;
  }

  public getLastRunResults(): RuleResultServiceResults {
    return {
      errors: this.errors,
      warnings: this.warnings,
      outcomeMessage: this.outcomeMessage,
    };
  }

  public getLastRunSetters(): PublicLastRunSetters {
    return {
      addLastRunError: this.addLastRunError.bind(this),
      addLastRunWarning: this.addLastRunWarning.bind(this),
      setLastRunOutcomeMessage: this.setLastRunOutcomeMessage.bind(this),
    };
  }

  private addLastRunError(
    message: string,
    userError = false,
    reason?: RuleExecutionStatusErrorReasons
  ) {
    this.errors.push({
      message,
      userError,
      reason: reasonForReportedError(userError, reason),
    });
  }

  private addLastRunWarning(warning: string) {
    this.warnings.push(warning);
  }

  private setLastRunOutcomeMessage(outcomeMessage: string) {
    this.outcomeMessage = outcomeMessage;
  }
}
