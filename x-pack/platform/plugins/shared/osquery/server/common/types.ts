/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface IQueryPayload {
  name: string;
  id: string;
}

export type SOShard = Array<{ key: string; value: number }>;

export interface PackSavedObject {
  saved_object_id: string;
  name: string;
  description: string | undefined;
  queries: Array<{
    id: string;
    name: string;
    query: string;
    interval: number;
    timeout?: number;
    snapshot?: boolean;
    removed?: boolean;
    ecs_mapping?: Record<string, unknown>;
  }>;
  version?: number;
  enabled: boolean | undefined;
  created_at: string;
  created_by: string | undefined;
  updated_at: string;
  updated_by: string | undefined;
  policy_ids?: string[];
  read_only?: boolean;
  shards: SOShard;
  references: Array<{ name: string; type: string; id: string }>;
}

export interface SavedQuerySavedObject {
  id: string;
  description: string | undefined;
  query: string;
  interval: number | string;
  timeout?: number;
  snapshot?: boolean;
  removed?: boolean;
  platform: string;
  ecs_mapping?: Array<{ key: string; value: Record<string, object> }>;
  created_at: string;
  created_by: string | undefined;
  updated_at: string;
  updated_by: string | undefined;
  prebuilt?: boolean;
  version: number;
}

export interface HTTPError extends Error {
  statusCode: number;
}
