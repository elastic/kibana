/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChangeHistoryCompareMode } from '../telemetry/types';

/** Callbacks for preview consumers to report diff UI interactions (telemetry owned by the package). */
export interface ChangeHistoryDiffTelemetry {
  compareMode: ChangeHistoryCompareMode;
  setCompareMode: (mode: ChangeHistoryCompareMode) => void;
  /**
   * Preview consumer invokes this when a non-empty diff is shown (domain decides when —
   * e.g. baseline snapshot content differs from target). Implementation is package-owned:
   * builds and dedupes the `change_history_diff_viewed` EBT payload on each call.
   */
  reportDiffViewed: () => void;
  /** Consumer supplies a domain-specific navigation source id (e.g. diff hunk controls). */
  reportDiffChangeNavigated: (navigationSource: string) => void;
}
