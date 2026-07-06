/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core-http-browser';
import type {
  ContextEngineAutocompleteHttpResponse,
  ContextEngineSearchConstraints,
  ContextEngineSearchFilters,
  ContextEngineSearchHttpResponse,
} from '@kbn/context-engine-plugin/public';
import {
  contextEngineAutocompletePath,
  contextEngineSearchPath,
} from '@kbn/context-engine-plugin/public';

/**
 * Browser client for SML.
 *   - `search(...)` → `/internal/agent_context_layer/sml/_search` (hybrid retrieval)
 *   - `autocomplete(...)` → `/internal/agent_context_layer/sml/_autocomplete` (@ menu / typeahead)
 */
export class SmlService {
  private readonly http: HttpSetup;

  constructor({ http }: { http: HttpSetup }) {
    this.http = http;
  }

  async search(params: {
    query: string;
    size: number;
    /** Runtime-imposed per-type id-allowlist constraints. */
    constraints?: ContextEngineSearchConstraints;
    /** Agent-discoverable filters (`types[]`, `tags[]`). */
    filters?: ContextEngineSearchFilters;
  }): Promise<ContextEngineSearchHttpResponse> {
    return await this.http.post<ContextEngineSearchHttpResponse>(contextEngineSearchPath, {
      body: JSON.stringify({
        query: params.query,
        size: params.size,
        ...(params.constraints ? { constraints: params.constraints } : {}),
        ...(params.filters ? { filters: params.filters } : {}),
      }),
    });
  }

  async autocomplete(params: {
    query: string;
    size: number;
    /** Runtime-imposed per-type id-allowlist constraints. */
    constraints?: ContextEngineSearchConstraints;
    /** Caller-supplied type/tag refinements. */
    filters?: ContextEngineSearchFilters;
  }): Promise<ContextEngineAutocompleteHttpResponse> {
    return await this.http.post<ContextEngineAutocompleteHttpResponse>(
      contextEngineAutocompletePath,
      {
        body: JSON.stringify({
          query: params.query,
          size: params.size,
          ...(params.constraints ? { constraints: params.constraints } : {}),
          ...(params.filters ? { filters: params.filters } : {}),
        }),
      }
    );
  }
}
