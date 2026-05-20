import type { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from '@kbn/core/server';
import type { NotificationsServerSetupDependencies, NotificationsServerStartDependencies, NotificationsServerStart, NotificationsServerSetup } from './types';
import type { NotificationsConfigType } from './config';
export declare class NotificationsPlugin implements Plugin<NotificationsServerSetup, NotificationsServerStart, NotificationsServerSetupDependencies, NotificationsServerStartDependencies> {
    private emailServiceProvider;
    constructor(initializerContext: PluginInitializerContext<NotificationsConfigType>);
    setup(_core: CoreSetup, plugins: NotificationsServerSetupDependencies): void;
    start(_core: CoreStart, plugins: NotificationsServerStartDependencies): {
        isEmailServiceAvailable(): boolean;
        getEmailService(): import("./services").EmailService;
    };
    stop(): void;
}
