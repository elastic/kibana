import type { KibanaRequest } from '@kbn/core-http-server';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { SecurityServiceStart } from '@kbn/core-security-server';
interface UserIdAndName {
    id?: string;
    username: string;
}
/**
 * Resolves the current user from the request.
 */
export declare const getUserFromRequest: ({ request, security, esClient, }: {
    request: KibanaRequest;
    security: SecurityServiceStart;
    esClient: ElasticsearchClient;
}) => Promise<UserIdAndName>;
export {};
