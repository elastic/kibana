/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Domain-computed diff summary for a history row (vs the chronologically older version). */
export interface ChangeHistoryListItemChanges {
  count: number;
  /**
   * Opaque summary payload for `renderChangesSummary`.
   * Shape is owned by the consumer; adapters must stay data-only.
   */
  summary?: unknown;
}
