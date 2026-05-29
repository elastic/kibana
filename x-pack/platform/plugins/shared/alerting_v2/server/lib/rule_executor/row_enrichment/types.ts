/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core/server';
import type { RuleResponse } from '@kbn/alerting-v2-schemas';

import type { ExecutionContext } from '../../execution_context';

/**
 * Context passed to optional row enrichers after ES|QL rows are materialized and
 * before they are converted into `.rule-events` alert events.
 */
export interface RuleExecutionRowEnrichContext {
  readonly rule: RuleResponse;
  readonly spaceId: string;
  readonly rows: ReadonlyArray<Record<string, unknown>>;
  readonly executionContext: ExecutionContext;
  readonly scopedClusterClient: IScopedClusterClient;
}

/**
 * Pluggable enrichment for rule execution rows. Implementations should return a new
 * array with the same length and ordering as `rows` when possible.
 */
export type RuleExecutionRowEnricher = (
  ctx: RuleExecutionRowEnrichContext
) => Promise<ReadonlyArray<Record<string, unknown>>>;
