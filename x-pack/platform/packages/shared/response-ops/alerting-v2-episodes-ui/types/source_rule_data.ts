/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Minimal rule data returned by `EpisodeDataSource.resolveRules`. */
export interface SourceRuleData {
  id: string;
  metadata?: {
    name?: string;
    tags?: string[];
  };
  enabled?: boolean;
  schedule?: { interval?: string };
  rule_type_id?: string;
  params?: Record<string, unknown>;
  created_by?: string | null;
  updated_by?: string | null;
  created_at?: string;
  updated_at?: string;
}
