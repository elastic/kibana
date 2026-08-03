import type { CoreSetup, IRouter, Logger } from '@kbn/core/server';
import type { ActionsPluginsStart } from '../plugin';
import type { ILicenseState } from '../lib';
import type { ActionsRequestHandlerContext } from '../types';
import type { ActionsConfigurationUtilities } from '../actions_config';
import type { OAuthRateLimiter } from '../lib/oauth_rate_limiter';
/**
 * OAuth2 callback endpoint - handles authorization code exchange
 */
export declare const oauthCallbackRoute: (router: IRouter<ActionsRequestHandlerContext>, licenseState: ILicenseState, configurationUtilities: ActionsConfigurationUtilities, logger: Logger, coreSetup: CoreSetup<ActionsPluginsStart>, oauthRateLimiter: OAuthRateLimiter) => void;
export declare const oauthCallbackScriptRoute: (router: IRouter<ActionsRequestHandlerContext>) => void;
