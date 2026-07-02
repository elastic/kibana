import type { CoreSetup, IRouter, Logger } from '@kbn/core/server';
import type { ILicenseState } from '../lib';
import type { ActionsRequestHandlerContext } from '../types';
import type { ActionsPluginsStart } from '../plugin';
import type { OAuthRateLimiter } from '../lib/oauth_rate_limiter';
import type { ActionsConfigurationUtilities } from '../actions_config';
/**
 * Registers OAuth2 authorization start routes:
 *
 * - **POST** `/internal/actions/connector/{connectorId}/_start_oauth_flow` — JSON `{ authorizationUrl, state }` (internal).
 * - **GET** `/api/actions/connector/{connectorId}/oauth/start` — **302** to the IdP (public).
 *   Absolute link: `{server.publicBaseUrl}/api/actions/connector/{connectorId}/oauth/start`
 *   e.g. for Slack: `https://my.kibana.example/api/actions/connector/my-id/oauth/start`
 *
 * Both require an authenticated Kibana user with `profile_uid` and the same OAuth privileges.
 */
export declare const oauthAuthorizeRoute: (router: IRouter<ActionsRequestHandlerContext>, licenseState: ILicenseState, logger: Logger, coreSetup: CoreSetup<ActionsPluginsStart>, oauthRateLimiter: OAuthRateLimiter, actionsConfigUtils: ActionsConfigurationUtilities) => void;
