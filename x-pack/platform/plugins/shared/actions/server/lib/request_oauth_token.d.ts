import type { Logger } from '@kbn/core/server';
import type { ActionsConfigurationUtilities } from '../actions_config';
import type { AsApiContract } from '../../common';
export interface OAuthTokenResponse {
    tokenType: string;
    accessToken: string;
    expiresIn?: number;
    refreshToken?: string;
    refreshTokenExpiresIn?: number;
}
export declare function requestOAuthToken<T>(tokenUrl: string, grantType: string, configurationUtilities: ActionsConfigurationUtilities, logger: Logger, bodyRequest: AsApiContract<T>, useBasicAuth?: boolean): Promise<OAuthTokenResponse>;
