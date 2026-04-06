/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface MatcherContextRule {
  id: string;
  name: string;
  description: string;
  labels: string[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MatcherContext {
  last_event_timestamp: string;
  group_hash: string;
  episode_id: string;
  episode_status: 'inactive' | 'pending' | 'active' | 'recovering';
  rule: MatcherContextRule;
}

export interface MatcherContextFieldDescriptor {
  path: string;
  type: 'string' | 'boolean' | 'string[]';
}

export const MATCHER_CONTEXT_FIELDS: MatcherContextFieldDescriptor[] = [
  { path: 'episode_id', type: 'string' },
  { path: 'episode_status', type: 'string' },
  { path: 'group_hash', type: 'string' },
  { path: 'last_event_timestamp', type: 'string' },
  { path: 'rule.id', type: 'string' },
  { path: 'rule.name', type: 'string' },
  { path: 'rule.description', type: 'string' },
  { path: 'rule.labels', type: 'string[]' },
  { path: 'rule.enabled', type: 'boolean' },
  { path: 'rule.createdAt', type: 'string' },
  { path: 'rule.updatedAt', type: 'string' },
];
