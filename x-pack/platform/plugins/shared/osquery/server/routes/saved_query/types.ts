/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface SavedQueryResponse {
  saved_object_id: string;
  id: string;
  description: string | undefined;
  query: string;
  interval: number | string;
  timeout?: number;
  snapshot?: boolean;
  removed?: boolean;
  platform?: string;
  ecs_mapping?: Array<{ key: string; value: Record<string, object> }>;
  created_at: string;
  created_by: string | undefined;
  updated_at: string;
  updated_by: string | undefined;
  prebuilt?: boolean;
  version: number | string;
}

export interface CopySavedQueryResponseData {
  saved_object_id: string;
  id: string;
  description: string | undefined;
  query: string;
  interval: number | string;
  timeout?: number;
  snapshot?: boolean;
  removed?: boolean;
  platform?: string;
  ecs_mapping?: Array<{ key: string; value: Record<string, object> }>;
  created_at: string;
  created_by: string | undefined;
  updated_at: string;
  updated_by: string | undefined;
}

export interface UpdateSavedQueryResponse {
  saved_object_id: string;
  id: string;
  description: string | undefined;
  query: string;
  interval: number | string;
  timeout?: number;
  snapshot?: boolean;
  removed?: boolean;
  platform?: string;
  ecs_mapping?: Array<{ key: string; value: object }>;
  created_at: string;
  created_by: string | undefined;
  updated_at: string;
  updated_by: string | undefined;
  prebuilt?: boolean;
  version: string;
}
