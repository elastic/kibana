/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleExecutionStatusErrorReasons } from '../types';

/** Reason stored for an error a rule executor reports through addLastRunError. */
export const reasonForReportedError = (
  userError: boolean,
  reason?: RuleExecutionStatusErrorReasons
): RuleExecutionStatusErrorReasons =>
  reason ??
  (userError
    ? RuleExecutionStatusErrorReasons.Configuration
    : RuleExecutionStatusErrorReasons.Execute);
