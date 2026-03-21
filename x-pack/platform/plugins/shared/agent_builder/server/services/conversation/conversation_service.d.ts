import type { KibanaRequest, Logger, SecurityServiceStart, ElasticsearchServiceStart } from '@kbn/core/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { ConversationClient } from './client';
export interface ConversationService {
    getScopedClient(options: {
        request: KibanaRequest;
    }): Promise<ConversationClient>;
}
interface ConversationServiceDeps {
    logger: Logger;
    security: SecurityServiceStart;
    elasticsearch: ElasticsearchServiceStart;
    spaces?: SpacesPluginStart;
}
export declare class ConversationServiceImpl implements ConversationService {
    private readonly logger;
    private readonly security;
    private readonly elasticsearch;
    private readonly spaces?;
    constructor({ logger, security, elasticsearch, spaces }: ConversationServiceDeps);
    getScopedClient({ request }: {
        request: KibanaRequest;
    }): Promise<ConversationClient>;
}
export {};
