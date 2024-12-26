/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Rule } from '../types';
import { RuleRunMetrics } from './rule_run_metrics_store';

export type RuleInfo = Pick<Rule, 'name' | 'alertTypeId' | 'id'> & { spaceId: string };

export interface LogSearchMetricsOpts {
  esSearchDuration: number;
  totalSearchDuration: number;
}

export type SearchMetrics = Pick<
  RuleRunMetrics,
  'numSearches' | 'totalSearchDurationMs' | 'esSearchDurationMs'
>;
