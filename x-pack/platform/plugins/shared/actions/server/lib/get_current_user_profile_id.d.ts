import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
/**
 * Resolves the current user profile UID from the interactive auth context on a real
 * `KibanaRequest` (HTTP routes, route-handler `ActionsClient`, event log providers).
 * `security.userProfiles.getCurrent` requires a session-capable request.
 *
 * Do not use this for the action executor: execution uses a `FakeRequest` without a session,
 * so profile lookup must go through the API-key path (`getCurrentUserProfileIdFromAPIKey` in
 * `plugin.ts`) instead.
 */
export declare function getCurrentUserProfileIdFromRequest(requestWithAuth: KibanaRequest, security: SecurityPluginStart | undefined, logger: Logger): Promise<string | undefined>;
