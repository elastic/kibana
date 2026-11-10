/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** what the user asked to compare the selected change against */
export type ChangeHistoryCompareMode =
  | { type: 'vs_previous' }
  | { type: 'vs_row'; rowChangeId: string };
