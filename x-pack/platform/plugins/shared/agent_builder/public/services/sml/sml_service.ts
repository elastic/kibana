/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core-http-browser';
import type {
  CeAutocompleteHttpResponse,
  CeSearchConstraints,
  CeSearchFilters,
  CeSearchHttpResponse,
} from '@kbn/context-engine-plugin/public';
import { ceAutocompletePath, ceSearchPath } from '@kbn/context-engine-plugin/public';

/**
 * Browser client for SML.
 *   - `search(...)` → `/internal/context_engine/_search` (hybrid retrieval)
 *   - `autocomplete(...)` → `/internal/context_engine/_autocomplete` (@ menu / typeahead)
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
    constraints?: CeSearchConstraints;
    /** Agent-discoverable filters (`types[]`, `tags[]`). */
    filters?: CeSearchFilters;
  }): Promise<CeSearchHttpResponse> {
    return await this.http.post<CeSearchHttpResponse>(ceSearchPath, {
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
    constraints?: CeSearchConstraints;
    /** Caller-supplied type/tag refinements. */
    filters?: CeSearchFilters;
  }): Promise<CeAutocompleteHttpResponse> {
    return await this.http.post<CeAutocompleteHttpResponse>(ceAutocompletePath, {
      body: JSON.stringify({
        query: params.query,
        size: params.size,
        ...(params.constraints ? { constraints: params.constraints } : {}),
        ...(params.filters ? { filters: params.filters } : {}),
      }),
    });
  }
}
