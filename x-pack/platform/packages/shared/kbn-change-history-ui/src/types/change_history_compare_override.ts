/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Compare the preview selection against the row where "Compare to this version" was invoked. */
export interface ChangeHistoryCompareRowOverride {
  type: 'vs_row';
  rowChangeId: string;
}
