import type { HttpSetup } from '@kbn/core-http-browser';
import type { SmlSearchFilters, SmlSearchHttpResponse } from '@kbn/agent-context-layer-plugin/public';
/** Browser client for SML search (`/internal/agent_context_layer/sml/_search`). */
export declare class SmlService {
    private readonly http;
    constructor({ http }: {
        http: HttpSetup;
    });
    search(params: {
        query: string;
        size: number;
        skipContent?: boolean;
        filters?: SmlSearchFilters;
    }): Promise<SmlSearchHttpResponse>;
}
