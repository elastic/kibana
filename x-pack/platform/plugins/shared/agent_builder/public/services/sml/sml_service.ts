/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core-http-browser';
import type {
  SmlAutocompleteHttpResponse,
  SmlSearchConstraints,
  SmlSearchFilters,
  SmlSearchHttpResponse,
} from '@kbn/agent-builder-sml-plugin/public';
import { smlAutocompletePath, smlSearchPath } from '@kbn/agent-builder-sml-plugin/public';

/**
 * Browser client for SML.
 *   - `search(...)` → `/internal/agent_builder_sml/sml/_search` (hybrid retrieval)
 *   - `autocomplete(...)` → `/internal/agent_builder_sml/sml/_autocomplete` (@ menu / typeahead)
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
    constraints?: SmlSearchConstraints;
    /** Agent-discoverable filters (`types[]`, `tags[]`). */
    filters?: SmlSearchFilters;
  }): Promise<SmlSearchHttpResponse> {
    return await this.http.post<SmlSearchHttpResponse>(smlSearchPath, {
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
    constraints?: SmlSearchConstraints;
    /** Caller-supplied type/tag refinements. */
    filters?: SmlSearchFilters;
  }): Promise<SmlAutocompleteHttpResponse> {
    return await this.http.post<SmlAutocompleteHttpResponse>(smlAutocompletePath, {
      body: JSON.stringify({
        query: params.query,
        size: params.size,
        ...(params.constraints ? { constraints: params.constraints } : {}),
        ...(params.filters ? { filters: params.filters } : {}),
      }),
    });
  }
}
