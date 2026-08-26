/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * A single AI index entry rendered in the system prompt's AI INDICES catalog.
 */
export interface AiIndexCatalogEntry {
  /** Context Engine id of the AI index. */
  id: string;
  /**
   * The ES|QL `FROM` target (index name, pattern, or comma-separated list). Absent when the id
   * could not be resolved (no resolver, access denied, unknown id): the id is not a query target,
   * so nameless entries are left out of the prompt's "Available to this agent" list.
   */
  name?: string;
  description?: string;
  /** Extra prompt advice for this index, printed after the description. */
  guidance?: string;
}

export interface ResolvedConfiguration {
  instructions: string;
  /**
   * Context Engine ids of the AI indices this agent may use. These are ids, not Elasticsearch
   * index names.
   */
  aiIndices: string[];
  /**
   * Rendered details for each configured AI index, in config order. Built once per run by
   * `resolveAiIndexCatalog`; absent when the AI indices feature is off.
   */
  aiIndexCatalog?: AiIndexCatalogEntry[];
}
