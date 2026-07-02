import type { Logger } from '@kbn/core/server';
import type { ActionsConfigurationUtilities } from '../actions_config';
import type { ConnectorTokenClientContract } from '../types';
export interface GetOAuthJwtConfig {
    clientId: string;
    jwtKeyId: string;
    userIdentifierValue: string;
}
export interface GetOAuthJwtSecrets {
    clientSecret: string;
    privateKey: string;
    privateKeyPassword: string | null;
}
interface GetOAuthJwtAccessTokenOpts {
    connectorId?: string;
    tokenUrl: string;
    logger: Logger;
    configurationUtilities: ActionsConfigurationUtilities;
    credentials: {
        config: GetOAuthJwtConfig;
        secrets: GetOAuthJwtSecrets;
    };
    connectorTokenClient?: ConnectorTokenClientContract;
}
export declare const getOAuthJwtAccessToken: ({ connectorId, logger, tokenUrl, configurationUtilities, credentials, connectorTokenClient, }: GetOAuthJwtAccessTokenOpts) => Promise<string | null>;
export {};
