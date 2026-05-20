import type { Logger } from '@kbn/core/server';
import type { AuthMode } from '@kbn/connector-specs';
import type { ActionsConfigurationUtilities } from '../../actions_config';
import type { ConnectorTokenClientContract } from '../../types';
interface GetEarsAccessTokenOpts {
    connectorId: string;
    logger: Logger;
    configurationUtilities: ActionsConfigurationUtilities;
    provider: string;
    connectorTokenClient: ConnectorTokenClientContract;
    authMode?: AuthMode;
    profileUid?: string;
    /**
     * When true, skip the expiration check and force a token refresh.
     * Use this when you've received a 401 and know the token is invalid
     * even if it hasn't "expired" according to the stored timestamp.
     */
    forceRefresh?: boolean;
}
/**
 * Get an access token for EARS OAuth flow from storage.
 * Automatically refreshes expired tokens using the EARS refresh endpoint.
 *
 * Unlike the standard OAuth authorization code flow, EARS does not require
 * clientId/clientSecret — the refresh endpoint is derived from tokenUrl
 * by replacing `/token` with `/refresh`, and the body is JSON `{ refresh_token }`.
 */
export declare const getEarsAccessToken: ({ connectorId, logger, configurationUtilities, provider, connectorTokenClient, authMode, profileUid, forceRefresh, }: GetEarsAccessTokenOpts) => Promise<string | null>;
export {};
