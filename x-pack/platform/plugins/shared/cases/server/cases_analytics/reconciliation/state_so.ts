/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsType } from '@kbn/core/server';
import { CASES_ANALYTICS_STATE_SO_TYPE } from '../../../common/constants';

/**
 * State document shape — single doc per cluster, holds the reconciliation watermark.
 * Stored as `cases-analytics-state:cases-analytics-state` (type === id).
 */
export interface CasesAnalyticsStateAttributes {
  /**
   * Last successful reconciliation completion time (ISO). Used as the lower bound
   * on the next run's SO scan.
   */
  last_run_at: string | null;
  /**
   * Counters for operator visibility. Optional; absence means "not yet computed."
   */
  last_run_stats?: {
    cases_indexed: number;
    activity_indexed: number;
    lifecycle_indexed: number;
    duration_ms: number;
  };
}

export const casesAnalyticsStateSavedObjectType: SavedObjectsType<CasesAnalyticsStateAttributes> = {
  name: CASES_ANALYTICS_STATE_SO_TYPE,
  hidden: true,
  hiddenFromHttpApis: true,
  // Single global state doc — agnostic to space, no need for namespacing.
  namespaceType: 'agnostic',
  mappings: {
    dynamic: false,
    properties: {
      last_run_at: { type: 'date' },
      // last_run_stats kept dynamic:false because we never query on these — they
      // exist only for operators reading the doc directly.
    },
  },
  management: {
    importableAndExportable: false,
  },
};
