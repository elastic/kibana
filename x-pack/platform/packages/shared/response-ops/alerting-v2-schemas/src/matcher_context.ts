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
  description: string;
  values?: string[];
}

export const MATCHER_CONTEXT_FIELDS: MatcherContextFieldDescriptor[] = [
  { path: 'episode_id', type: 'string', description: 'Unique episode identifier' },
  {
    path: 'episode_status',
    type: 'string',
    description: 'Episode status (inactive, pending, active, recovering)',
    values: ['inactive', 'pending', 'active', 'recovering'],
  },
  { path: 'group_hash', type: 'string', description: 'Alert group hash' },
  {
    path: 'last_event_timestamp',
    type: 'string',
    description: 'Timestamp of the last event',
  },
  { path: 'rule.id', type: 'string', description: 'Rule ID' },
  { path: 'rule.name', type: 'string', description: 'Rule name' },
  { path: 'rule.description', type: 'string', description: 'Rule description' },
  { path: 'rule.labels', type: 'string[]', description: 'Rule labels' },
  {
    path: 'rule.enabled',
    type: 'boolean',
    description: 'Whether the rule is enabled',
    values: ['true', 'false'],
  },
  { path: 'rule.createdAt', type: 'string', description: 'Rule creation date' },
  { path: 'rule.updatedAt', type: 'string', description: 'Rule last update date' },
];
