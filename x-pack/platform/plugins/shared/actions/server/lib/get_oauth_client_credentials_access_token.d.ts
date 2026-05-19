import type { Logger } from '@kbn/core/server';
import type { ActionsConfigurationUtilities } from '../actions_config';
import type { ConnectorTokenClientContract } from '../types';
export interface GetOAuthClientCredentialsConfig {
    clientId: string;
    additionalFields?: Record<string, unknown>;
}
export interface GetOAuthClientCredentialsSecrets {
    clientSecret: string;
}
interface GetOAuthClientCredentialsAccessTokenOpts {
    connectorId?: string;
    tokenUrl: string;
    oAuthScope?: string;
    logger: Logger;
    configurationUtilities: ActionsConfigurationUtilities;
    credentials: {
        config: GetOAuthClientCredentialsConfig;
        secrets: GetOAuthClientCredentialsSecrets;
    };
    connectorTokenClient?: ConnectorTokenClientContract;
    tokenEndpointAuthMethod?: 'client_secret_post' | 'client_secret_basic';
}
export declare const getOAuthClientCredentialsAccessToken: ({ connectorId, logger, tokenUrl, oAuthScope, configurationUtilities, credentials, connectorTokenClient, tokenEndpointAuthMethod, }: GetOAuthClientCredentialsAccessTokenOpts) => Promise<string | null>;
export {};
