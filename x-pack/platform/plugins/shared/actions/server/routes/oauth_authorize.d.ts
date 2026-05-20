import type { IRouter, Logger, CoreSetup } from '@kbn/core/server';
import type { ILicenseState } from '../lib';
import type { ActionsRequestHandlerContext } from '../types';
import type { ActionsPluginsStart } from '../plugin';
import type { OAuthRateLimiter } from '../lib/oauth_rate_limiter';
import type { ActionsConfigurationUtilities } from '../actions_config';
/**
 * Initiates OAuth2 Authorization Code flow
 * Returns authorization URL for user to visit
 */
export declare const oauthAuthorizeRoute: (router: IRouter<ActionsRequestHandlerContext>, licenseState: ILicenseState, logger: Logger, coreSetup: CoreSetup<ActionsPluginsStart>, oauthRateLimiter: OAuthRateLimiter, actionsConfigUtils: ActionsConfigurationUtilities) => void;
