/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// We don't have types defined for the response objects from our HTTP APIs,
// so defining what we need here.

export interface Rule<T = never> {
  id: string;
  name: string;
  rule_type_id: string;
  schedule: {
    interval: string;
  };
  params: T;
}

export interface RuleTaskState {
  alerts: Array<{
    state: Record<string, never>;
  }>;
}
