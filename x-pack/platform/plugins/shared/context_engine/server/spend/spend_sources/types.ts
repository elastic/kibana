/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TokenUsage } from '../pricing/price_usage';

/** Token usage attributed to one AI index and one connector over the queried period. */
export interface UsageRecord extends TokenUsage {
  aiIndexId: string;
  /** Unset when the producer did not report which connector it called. */
  connectorId?: string;
}

export interface SpendSourceQuery {
  spaceId: string;
  /** Inclusive. */
  from: Date;
  /** Exclusive. */
  to: Date;
  /** The space's AI indices with the workflow ids of their automations. */
  aiIndices: ReadonlyArray<{ id: string; automationWorkflowIds: readonly string[] }>;
}

/**
 * Reports how many tokens one kind of work spent, per AI index and connector. Sources read
 * the ledger their producer already keeps (workflow executions) rather than a dedicated
 * spend index.
 */
export interface SpendSource {
  id: string;
  getUsage: (query: SpendSourceQuery) => Promise<UsageRecord[]>;
}
