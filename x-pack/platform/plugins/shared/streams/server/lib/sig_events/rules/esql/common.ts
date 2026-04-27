/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Kibana alerting hard-limits active alerts to ~10k per connector; 1k keeps
// executor overhead low while covering typical cardinality bursts.
export const MAX_ALERTS_PER_EXECUTION = 1_000;
// Aligned with the default rule evaluation interval (1 min) with a 2x overlap
// to avoid missing events that arrive slightly out of order.
export const MATCH_LOOKBACK_MINUTES = 2;
