import type { KibanaRequest, ElasticsearchServiceStart } from '@kbn/core/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { FieldValue } from '@elastic/elasticsearch/lib/api/types';
import type { ConsumptionResponse, ConsumptionSortField } from '../../../common/http_api/consumption';
/**
 * Shape of the validated consumption request body.
 * Used internally to cast and read the request payload.
 */
export interface ConsumptionRequestPayload {
    size: number;
    sort_field: ConsumptionSortField;
    sort_order: 'asc' | 'desc';
    search_after?: FieldValue[];
    search?: string;
    usernames?: string[];
    has_warnings?: boolean;
}
/**
 * Scoped client pre-bound to a specific request.
 * Reads params/body from the captured request so callers
 * don't need to pass anything.
 */
export interface ConsumptionClient {
    getConsumption(): Promise<ConsumptionResponse>;
}
/**
 * Started consumption service that can create request-scoped clients.
 */
export interface ConsumptionServiceStart {
    getScopedClient(options: {
        request: KibanaRequest;
    }): ConsumptionClient;
}
/**
 * Lifecycle service following the same setup/start pattern as
 * PluginsService and other agent_builder services. Created at setup
 * time, receives elasticsearch + spaces at start time.
 */
export interface ConsumptionService {
    setup(): void;
    start(deps: ConsumptionServiceStartDeps): ConsumptionServiceStart;
}
export interface ConsumptionServiceStartDeps {
    elasticsearch: ElasticsearchServiceStart;
    spaces?: SpacesPluginStart;
}
export declare const createConsumptionService: () => ConsumptionService;
