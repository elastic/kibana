import type { HttpSetup } from '@kbn/core-http-browser';
import type { SmlAutocompleteHttpResponse, SmlSearchConstraints, SmlSearchFilters, SmlSearchHttpResponse } from '@kbn/agent-builder-sml-plugin/public';
/**
 * Browser client for SML.
 *   - `search(...)` → `/internal/agent_builder_sml/sml/_search` (hybrid retrieval)
 *   - `autocomplete(...)` → `/internal/agent_builder_sml/sml/_autocomplete` (@ menu / typeahead)
 */
export declare class SmlService {
    private readonly http;
    constructor({ http }: {
        http: HttpSetup;
    });
    search(params: {
        query: string;
        size: number;
        /** Runtime-imposed per-type id-allowlist constraints. */
        constraints?: SmlSearchConstraints;
        /** Agent-discoverable filters (`types[]`, `tags[]`). */
        filters?: SmlSearchFilters;
    }): Promise<SmlSearchHttpResponse>;
    autocomplete(params: {
        query: string;
        size: number;
        /** Runtime-imposed per-type id-allowlist constraints. */
        constraints?: SmlSearchConstraints;
        /** Caller-supplied type/tag refinements. */
        filters?: SmlSearchFilters;
    }): Promise<SmlAutocompleteHttpResponse>;
}
