/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type RuleId = string;

export interface Policy {
  id: string;
  name: string;
  // other policy fields as needed
}

export interface AlertEpisode {
  last_event_timestamp: string;
  last_fire: string | null;
  rule_id: RuleId;
  group_hash: string;
  episode_id: string;
  episode_status: 'inactive' | 'pending' | 'active' | 'recovering';
}
