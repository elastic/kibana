import { type CustomHostSettings, type ProxySettings, type SSLSettings } from '@kbn/actions-utils';
import type { ActionsConfig } from './config';
import type { AwsSesConfig, ResponseSettings } from './types';
import type { ValidateEmailAddressesOptions } from '../common';
export { AllowedHosts, EnabledActionTypes } from './config';
export declare const DEFAULT_MAX_ATTEMPTS = 3;
export interface ActionsConfigurationUtilities {
    isHostnameAllowed: (hostname: string) => boolean;
    isUriAllowed: (uri: string) => boolean;
    isActionTypeEnabled: (actionType: string) => boolean;
    ensureHostnameAllowed: (hostname: string) => void;
    ensureUriAllowed: (uri: string) => void;
    ensureActionTypeEnabled: (actionType: string) => void;
    getSSLSettings: () => SSLSettings;
    getProxySettings: () => undefined | ProxySettings;
    getResponseSettings: () => ResponseSettings;
    getCustomHostSettings: (targetUrl: string) => CustomHostSettings | undefined;
    getMicrosoftGraphApiUrl: () => string;
    getMicrosoftGraphApiScope: () => string;
    getMicrosoftExchangeUrl: () => string;
    getMaxAttempts: ({ actionTypeMaxAttempts, actionTypeId, }: {
        actionTypeMaxAttempts?: number;
        actionTypeId: string;
    }) => number;
    validateEmailAddresses(addresses: string[], options?: ValidateEmailAddressesOptions): string | undefined;
    enableFooterInEmail: () => boolean;
    getMaxQueued: () => number;
    getWebhookSettings(): {
        ssl: {
            pfx: {
                enabled: boolean;
            };
        };
    };
    getAwsSesConfig: () => AwsSesConfig;
    getEnabledEmailServices: () => string[];
    getMaxEmailBodyLength: () => number;
    getEarsUrl: () => string | undefined;
    isEarsEnabled: () => boolean;
}
export declare function getActionsConfigurationUtilities(config: ActionsConfig): ActionsConfigurationUtilities;
