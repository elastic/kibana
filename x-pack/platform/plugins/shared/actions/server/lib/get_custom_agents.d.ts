import type { Agent as HttpAgent } from 'http';
import type { Agent as HttpsAgent } from 'https';
import type { Logger } from '@kbn/core/server';
import type { ProxySettings, SSLSettings } from '@kbn/actions-utils';
import type { ActionsConfigurationUtilities } from '../actions_config';
/**
 * Create http and https proxy agents with custom proxy /hosts/SSL settings from configurationUtilities
 */
export interface CustomAgents {
    httpAgent: HttpAgent | undefined;
    httpsAgent: HttpsAgent | undefined;
}
export declare function getCustomAgents(configurationUtilities: ActionsConfigurationUtilities, logger: Logger, url: string, sslOverrides?: SSLSettings, proxySettingsOverrides?: ProxySettings): CustomAgents;
