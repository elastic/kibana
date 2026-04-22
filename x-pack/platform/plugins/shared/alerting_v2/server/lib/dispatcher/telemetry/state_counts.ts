/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DispatcherPipelineState } from '../types';
import type { DispatcherStageCounts } from './types';

/**
 * Project the pipeline state into a stable, non-partial count snapshot.
 * Always returns every key so downstream consumers (APM labels, structured
 * logs, ES|QL) can aggregate without null-handling.
 */
export function computeStateCounts(state: DispatcherPipelineState): DispatcherStageCounts {
  return {
    episodes: state.episodes?.length ?? 0,
    suppressions: state.suppressions?.length ?? 0,
    dispatchable: state.dispatchable?.length ?? 0,
    suppressed: state.suppressed?.length ?? 0,
    rules: state.rules?.size ?? 0,
    policies: state.policies?.size ?? 0,
    matched: state.matched?.length ?? 0,
    groups: state.groups?.length ?? 0,
    dispatch: state.dispatch?.length ?? 0,
    throttled: state.throttled?.length ?? 0,
  };
}

/**
 * Rename count keys to the `count_*` convention used for APM span labels.
 * Kept separate from `computeStateCounts` because the log-facing and
 * APM-facing shapes are allowed to drift independently.
 */
export function toSpanLabels(counts: DispatcherStageCounts): Record<string, number> {
  return Object.fromEntries(
    Object.entries(counts).map(([key, value]) => [`count_${key}`, value as number])
  );
}
