/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionResultsSummaryProps } from './types';
import { UnifiedActionResultsSummary } from './unified_action_results_summary';

export type { ActionResultsSummaryProps };

// Alias kept for the historical import path; uiActions is a required plugin.
export const ActionResultsSummary = UnifiedActionResultsSummary;
