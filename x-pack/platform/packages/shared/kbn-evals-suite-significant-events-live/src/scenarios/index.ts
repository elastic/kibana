/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { bankOfAnthosReplayDataset } from './bank_of_anthos';
import type { ReplayDataset } from './types';

const REPLAY_DATASETS: ReplayDataset[] = [bankOfAnthosReplayDataset];

/**
 * Datasets with replay scenarios, optionally filtered by the same `SIGEVENTS_DATASET`
 * selector the main significant-events suite uses (comma-separated ids or `all`).
 */
export const getActiveReplayDatasets = (): ReplayDataset[] => {
  const selector = process.env.SIGEVENTS_DATASET?.trim();
  if (!selector || selector === 'all') {
    return REPLAY_DATASETS;
  }
  const requested = new Set(selector.split(',').map((id) => id.trim()));
  return REPLAY_DATASETS.filter((dataset) => requested.has(dataset.id));
};

export type {
  CanonicalRuleQuery,
  ReplayDataset,
  ReplayExpectedEvent,
  ReplayLiveConfig,
  ReplayScenario,
} from './types';
