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
   * May be a concrete index name, a pattern, or a comma-separated list. Absent when the id
   * could not be resolved; such entries are omitted from the prompt.
   */
  esqlTarget?: string;
  description?: string;
}

export interface ResolvedConfiguration {
  instructions: string;
  /** Context Engine ids (not Elasticsearch index names) of the AI indices this agent may use. */
  aiIndices: string[];
  /** Rendered AI index catalog, in config order. Absent when the AI indices feature is off. */
  aiIndexCatalog?: AiIndexCatalogEntry[];
}
