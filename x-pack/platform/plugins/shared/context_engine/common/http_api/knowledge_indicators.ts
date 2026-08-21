/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KiTypeCount } from './ai_indices';

export interface KiListItem {
  ki_id: string;
  type: string;
  title: string;
  /** Human-readable source label when stored on the KI document. */
  source_label?: string;
  /** Version label when stored on the KI document (e.g. `1` → `v1`). */
  version?: string;
}

export interface ListKisResponse {
  kis: KiListItem[];
  /** Total matching the current list query (type filter). */
  total: number;
  /** Total KIs in the backing store, ignoring type filters. */
  total_all: number;
  /** Top types by count, ignoring type filters. */
  counts_by_type: KiTypeCount[];
}
