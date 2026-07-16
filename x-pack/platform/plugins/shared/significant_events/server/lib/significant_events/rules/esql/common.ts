/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RULE_LOOKBACK_OVERLAP_RATIO } from '../schedule';

// Kibana alerting hard-limits active alerts to ~10k per connector; 1k keeps
// executor overhead low while covering typical cardinality bursts.
export const MAX_ALERTS_PER_EXECUTION = 1_000;
// Request one extra row so the executor can detect and log truncation, then
// slice back to MAX_ALERTS_PER_EXECUTION before indexing alerts.
export const MAX_ALERTS_ESQL_QUERY_LIMIT = MAX_ALERTS_PER_EXECUTION + 1;
// Upper bound on accumulated dedup IDs to prevent unbounded state growth.
// A doc spans at most ceil(lookback / interval) windows, +1 for scheduling
// jitter / TM backpressure. The lookback is 2x the interval for every cadence,
// so this remains 1000 * 3. Even if an evicted ID reappears,
// alertWithPersistence uses a deterministic _id so ES rejects the duplicate.
export const MAX_DEDUP_IDS = MAX_ALERTS_PER_EXECUTION * (RULE_LOOKBACK_OVERLAP_RATIO + 1);
