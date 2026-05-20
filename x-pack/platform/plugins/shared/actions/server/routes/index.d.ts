import type { IRouter } from '@kbn/core/server';
import type { UsageCounter } from '@kbn/usage-collection-plugin/server';
import type { Logger, CoreSetup } from '@kbn/core/server';
import type { ILicenseState } from '../lib';
import type { ActionsRequestHandlerContext } from '../types';
import type { ActionsConfigurationUtilities } from '../actions_config';
import type { ActionsPluginsStart } from '../plugin';
import type { OAuthRateLimiter } from '../lib/oauth_rate_limiter';
export interface RouteOptions {
    router: IRouter<ActionsRequestHandlerContext>;
    licenseState: ILicenseState;
    actionsConfigUtils: ActionsConfigurationUtilities;
    usageCounter?: UsageCounter;
    logger: Logger;
    core: CoreSetup<ActionsPluginsStart>;
    oauthRateLimiter: OAuthRateLimiter;
}
export declare function defineRoutes(opts: RouteOptions): void;
