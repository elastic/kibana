/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExecutionError } from '../types';

export function createExecutionError(
  message: string,
  ruleId: string,
  ruleName?: string
): ExecutionError {
  return {
    error: {
      message,
      rule: {
        id: ruleId,
        name: ruleName,
      },
    },
  };
}
