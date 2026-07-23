/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The type of backing store an AI index is attached to. `index` covers a
 * concrete index name or an index pattern (e.g. `foo`, `foo,bar`, `foo*`).
 */
export type AiIndexType = 'data_stream' | 'index';

export interface AiIndexDest {
  type: AiIndexType;
  value: string;
}

export type AiIndexSourceType = 'esql';

export interface AiIndexSource {
  type: AiIndexSourceType;
  value: string;
}

export type AiIndexAutomationType = 'workflow';

export interface AiIndexAutomation {
  type: AiIndexAutomationType;
  value: string;
}

/**
 * Index configuration a consumer may provide when registering an AI index. It is
 * deep-merged into the AI index base template and applied to the dest index as a
 * composable index template, so a consumer can add settings and mappings — including
 * runtime fields — on top of the framework defaults without owning the whole template.
 */
export interface AiIndexIndexConfig {
  settings?: Record<string, unknown>;
  mappings?: {
    dynamic?: boolean | 'strict' | 'runtime';
    properties?: Record<string, unknown>;
    runtime?: Record<string, unknown>;
  };
}

/**
 * Document-level security for an AI index. When provided at registration, an
 * Elasticsearch role carrying this DLS query on the dest index is created/updated, so
 * that consumers reading the ai-index as themselves only see permitted documents. The
 * query may be a mustache template (e.g. referencing `_user.application_privileges`).
 */
export interface AiIndexDls {
  role: string;
  query: string;
}

export interface AiIndexProperties {
  name: string;
  description?: string;
  dest: AiIndexDest;
  automations: AiIndexAutomation[];
  sources: AiIndexSource[];
  /** Optional index config merged into the base template and applied to the dest. */
  index_config?: AiIndexIndexConfig;
  /** Optional DLS applied as an Elasticsearch role scoping reads of the dest. */
  dls?: AiIndexDls;
}

export interface AiIndexHttpItem extends AiIndexProperties {
  id: string;
  managed: boolean;
  date_created: string;
  date_modified: string;
}

export type GetAiIndexResponse = AiIndexHttpItem;

export interface ListAiIndexResponse {
  ai_indices: AiIndexHttpItem[];
}

export interface PutAiIndexResponse {
  status: 'created' | 'updated';
}

export interface DeleteAiIndexResponse {
  acknowledged: boolean;
}
