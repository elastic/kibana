import type { Logger } from '@kbn/core/server';
import type { ActionsConfigurationUtilities } from '../actions_config';
import type { ConnectorTokenClientContract } from '../types';
/**
 * Two valid credential modes for the OAuth2 client_credentials grant:
 *
 *  - `client_secret`: classic clientId + clientSecret in the token request
 *    body. May carry extra `additionalFields` to merge into the body.
 *  - `client_assertion`: a signed JWT assertion authenticates the client
 *    instead of a secret. `buildAdditionalFields` is invoked lazily on cache
 *    miss so we don't pay the crypto cost on cached tokens.
 */
export type GetOAuthClientCredentials = {
    type: 'client_secret';
    config: {
        clientId: string;
        additionalFields?: Record<string, unknown>;
    };
    secrets: {
        clientSecret: string;
    };
} | {
    type: 'client_assertion';
    config: {
        clientId: string;
        buildAdditionalFields: () => Record<string, unknown>;
    };
};
interface GetOAuthClientCredentialsAccessTokenOpts {
    connectorId?: string;
    tokenUrl: string;
    oAuthScope?: string;
    logger: Logger;
    configurationUtilities: ActionsConfigurationUtilities;
    credentials: GetOAuthClientCredentials;
    connectorTokenClient?: ConnectorTokenClientContract;
    tokenEndpointAuthMethod?: 'client_secret_post' | 'client_secret_basic';
}
export declare const getOAuthClientCredentialsAccessToken: ({ connectorId, logger, tokenUrl, oAuthScope, configurationUtilities, credentials, connectorTokenClient, tokenEndpointAuthMethod, }: GetOAuthClientCredentialsAccessTokenOpts) => Promise<string | null>;
export {};
