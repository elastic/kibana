/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UnifiedResultsTable } from './unified_results_table';
import type { ResultsTableComponentProps } from './results_table_shared';

export type { ResultsTableComponentProps };

// Alias kept for the historical import path; uiActions/unifiedSearch are required plugins.
export const ResultsTable = UnifiedResultsTable;
