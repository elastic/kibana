import type { Logger } from '@kbn/core/server';
import type { ActionsConfigurationUtilities } from '../../actions_config';
import type { OAuthPersonalCredentials } from '../../types';
/**
 * Revokes both the access token and refresh token for a set of stored OAuth credentials
 * via EARS. Throws on failure — callers are responsible for best-effort handling.
 */
export declare const revokeEarsCredentials: ({ provider, credentials, configurationUtilities, logger, }: {
    provider: string;
    credentials: OAuthPersonalCredentials;
    configurationUtilities: ActionsConfigurationUtilities;
    logger: Logger;
}) => Promise<void>;
