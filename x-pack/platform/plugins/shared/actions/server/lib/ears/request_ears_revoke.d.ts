import type { Logger } from '@kbn/core/server';
import type { ActionsConfigurationUtilities } from '../../actions_config';
export interface EarsRevokeTokenRequestParams {
    token: string;
}
/**
 * Revoke a token (access or refresh) via the EARS revoke endpoint.
 *
 * EARS uses a JSON request body with `{ token }` and forwards the request to
 * the provider's own revoke endpoint (e.g. Google's `https://oauth2.googleapis.com/revoke`).
 * This is best-effort: callers should not let a revoke failure block local token deletion.
 */
export declare function requestEarsRevoke(provider: string, logger: Logger, params: EarsRevokeTokenRequestParams, configurationUtilities: ActionsConfigurationUtilities): Promise<void>;
