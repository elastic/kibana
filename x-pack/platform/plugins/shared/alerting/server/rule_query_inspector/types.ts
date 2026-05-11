/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';

export interface RuleQueryInspectorResult {
  index: string;
  request: Record<string, unknown>;
  response?: Record<string, unknown>;
  label?: string;
}

export interface RuleQueryInspectorResponse {
  queries: RuleQueryInspectorResult[];
}

export interface RuleQueryInspectorTimeRange {
  gte: string;
  lte: string;
}

export type RuleQueryInspectorHandler = (
  request: KibanaRequest,
  ruleParams: Record<string, unknown>,
  mode: 'build' | 'execute',
  timeRange: RuleQueryInspectorTimeRange | undefined
) => Promise<RuleQueryInspectorResponse>;
