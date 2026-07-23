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
} from '@kbn/agent-builder-sml-plugin/public';
import { smlAutocompletePath } from '@kbn/agent-builder-sml-plugin/public';

/**
 * Browser client for SML.
 *   - `autocomplete(...)` → `/internal/agent_builder_sml/sml/_autocomplete` (@ menu / typeahead)
 *
 * Content retrieval no longer lives here — agents retrieve KIs via DLS-scoped ES|QL
 * against the "Elastic" ai-index, so the browser `search()` client and its `_search`
 * route were removed.
 */
export class SmlService {
  private readonly http: HttpSetup;

  constructor({ http }: { http: HttpSetup }) {
    this.http = http;
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
