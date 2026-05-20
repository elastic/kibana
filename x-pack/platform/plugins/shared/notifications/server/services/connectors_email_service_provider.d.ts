import type { Logger } from '@kbn/core/server';
import type { PluginSetupContract, PluginStartContract } from '@kbn/actions-plugin/server';
import type { LicensingPluginSetup, LicensingPluginStart } from '@kbn/licensing-plugin/server';
import type { EmailServiceStart, IEmailServiceProvider } from './types';
import type { NotificationsConfigType } from '../config';
export interface EmailServiceSetupDeps {
    actions?: PluginSetupContract;
    licensing?: LicensingPluginSetup;
}
export interface EmailServiceStartDeps {
    actions?: PluginStartContract;
    licensing?: LicensingPluginStart;
}
export declare class EmailServiceProvider implements IEmailServiceProvider<EmailServiceSetupDeps, EmailServiceStartDeps> {
    private config;
    private logger;
    private setupSuccessful;
    private setupError;
    constructor(config: NotificationsConfigType, logger: Logger);
    setup(plugins: EmailServiceSetupDeps): void;
    start(plugins: EmailServiceStartDeps): EmailServiceStart;
    private _registerInitializationError;
}
