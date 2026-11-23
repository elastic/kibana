/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  RuleExecutionStatusErrorReasons,
  RuleExecutionStatusWarningReasons,
} from '@kbn/alerting-types';

type RuleLastRunWarning = RuleExecutionStatusErrorReasons | RuleExecutionStatusWarningReasons;

const errorReasons = new Set<string>(Object.values(RuleExecutionStatusErrorReasons));
const warningReasons = new Set<string>(Object.values(RuleExecutionStatusWarningReasons));

/**
 * Maps a stored execution error reason to a known value. The saved object stores reasons as
 * plain strings, so a reason written by a newer Kibana is reported as `unknown` here.
 */
export const normalizeExecutionStatusErrorReason = (
  reason: string
): RuleExecutionStatusErrorReasons =>
  errorReasons.has(reason)
    ? (reason as RuleExecutionStatusErrorReasons)
    : RuleExecutionStatusErrorReasons.Unknown;

/**
 * Maps a stored last run warning to a known error or warning reason. A value written by a
 * newer Kibana is reported as `unknown`; `null` is kept as is.
 */
export const normalizeLastRunWarning = (warning: string | null): RuleLastRunWarning | null => {
  if (warning === null) {
    return null;
  }
  return errorReasons.has(warning) || warningReasons.has(warning)
    ? (warning as RuleLastRunWarning)
    : RuleExecutionStatusErrorReasons.Unknown;
};
