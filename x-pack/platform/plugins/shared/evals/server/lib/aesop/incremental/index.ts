/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * AESOP Incremental Exploration Module
 *
 * Enables daily incremental updates instead of full re-scans by:
 * - Persisting exploration state between runs
 * - Detecting changes (new/modified/removed indices)
 * - Tracking new documents since last exploration
 *
 * This reduces exploration time from hours to minutes for daily updates.
 */

export { ExplorationStateService, initializeExplorationStateIndex } from './exploration_state';
export type { ExplorationState, StateHistoryConfig } from './exploration_state';

export { ChangeDetector, summarizeChanges } from './detect_changes';
export type { ChangeDetectionResult, ChangeDetectionConfig } from './detect_changes';
