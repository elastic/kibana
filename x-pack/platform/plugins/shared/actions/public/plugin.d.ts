import type { Plugin as CorePlugin, PluginInitializerContext } from '@kbn/core/public';
import type { ValidatedEmail, ValidateEmailAddressesOptions } from '../common';
export interface ActionsPublicPluginSetup {
    validateEmailAddresses(emails: string[], options?: ValidateEmailAddressesOptions): ValidatedEmail[];
    enabledEmailServices: string[];
    isWebhookSslWithPfxEnabled?: boolean;
    isEarsEnabled: boolean;
}
export interface Config {
    email: {
        domain_allowlist: string[];
        services: {
            enabled: string[];
        };
    };
    webhook: {
        ssl: {
            pfx: {
                enabled: boolean;
            };
        };
    };
    auth?: {
        ears?: {
            enabled: boolean;
        };
    };
}
export declare class Plugin implements CorePlugin<ActionsPublicPluginSetup> {
    private readonly allowedEmailDomains;
    private readonly enabledEmailServices;
    private readonly webhookSslWithPfxEnabled;
    private readonly earsEnabled;
    constructor(ctx: PluginInitializerContext<Config>);
    setup(): ActionsPublicPluginSetup;
    start(): void;
}
