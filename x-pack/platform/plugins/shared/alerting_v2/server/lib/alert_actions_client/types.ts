/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AlertEpisodeStatus,
  AlertEventSeverity,
  AlertEventStatus,
} from '../../resources/datastreams/alert_events';

/**
 * The shape every alert-event ES|QL loader in this client produces and every
 * handler reads. It mirrors the `KEEP …` projection used by the bulk- and
 * single-event queries (see `context_loaders/`) — keep it stable so the two
 * shapes can't drift apart and so handler code can rely on these fields
 * without re-checking which loader produced the row.
 */
export interface AlertEventRecord {
  '@timestamp': string;
  group_hash: string;
  episode_id: string;
  rule_id: string;
  space_id: string;
  rule_version?: number;
  data_json: Record<string, unknown>;
  severity?: AlertEventSeverity | null;
  episode_status?: AlertEpisodeStatus | null;
  status?: AlertEventStatus;
  episode_status_count?: number | null;
}
