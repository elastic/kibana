/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleExecutionStatusErrorReasons } from '../types';

interface ReportedError {
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

/**
 * Single reason stored for all errors a rule executor reported in one run. Mirrors
 * getTaskRunError: the run is a configuration failure only when every error is a user
 * error; otherwise the first error that is not a user error decides.
 */
export const reasonForReportedErrors = (
  errors: ReportedError[]
): RuleExecutionStatusErrorReasons => {
  const deciding = errors.find((error) => !error.userError) ?? errors[0];
  return reasonForReportedError(deciding.userError, deciding.reason);
};
