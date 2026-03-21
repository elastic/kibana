import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { SecurityServiceStart } from '@kbn/core-security-server';
import type { UserIdAndName } from '@kbn/agent-builder-common';
/**
 * Resolves the current user from a request.
 *
 * For real HTTP requests, `security.authc.getCurrentUser` returns the authenticated user
 * (including profile_uid and username).
 *
 * For fake requests (e.g. from Task Manager using an API key), `getCurrentUser` returns null.
 * In that case, we fall back to the ES `_security/_authenticate` API, which works with API keys
 * and returns the username of the API key owner.
 */
export declare const getUserFromRequest: ({ request, security, esClient, }: {
    request: KibanaRequest;
    security: SecurityServiceStart;
    esClient: ElasticsearchClient;
}) => Promise<UserIdAndName>;
/**
 * Returns `true` only for users with wildcard Elasticsearch privileges (for example `superuser`).
 *
 * We intentionally check an application privilege name that is not registered by Kibana
 * (`agent_builder:admin`). Because this privilege is unregistered, normal roles fail this check,
 * while wildcard roles (for example application/cluster `*`/`all`) pass.
 *
 * This is used as an internal admin check, independent of feature/sub-feature grants.
 */
export declare const isAdminFromRequest: ({ esClient, }: {
    esClient: ElasticsearchClient;
}) => Promise<boolean>;
export declare const getAgentApiAccessFromRequest: ({ esClient, space, }: {
    esClient: ElasticsearchClient;
    space: string;
}) => Promise<{
    canReadAgents: boolean;
    canManageAgents: boolean;
}>;
