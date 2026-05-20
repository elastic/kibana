import type { CoreStart } from '@kbn/core/public';
import type { LogsSharedClientCoreSetup, LogsSharedClientPluginClass, LogsSharedClientSetupDeps, LogsSharedClientStartDeps } from './types';
export declare class LogsSharedPlugin implements LogsSharedClientPluginClass {
    private logViews;
    constructor();
    setup(coreSetup: LogsSharedClientCoreSetup, pluginsSetup: LogsSharedClientSetupDeps): {
        logViews: import("./services/log_views").LogViewsServiceSetup;
        locators: {
            logsLocator: import("@kbn/share-plugin/common").LocatorPublic<import("@kbn/discover-plugin/common").DiscoverAppLocatorParams>;
        };
    };
    start(core: CoreStart, plugins: LogsSharedClientStartDeps): {
        logViews: import("./services/log_views").LogViewsServiceStart;
        LogsOverview: import("./components/logs_overview").SelfContainedLogsOverview;
        LogAIAssistant?: undefined;
    } | {
        logViews: import("./services/log_views").LogViewsServiceStart;
        LogAIAssistant: (props: Omit<import(".").LogAIAssistantProps, "observabilityAIAssistant">) => import("react").JSX.Element;
        LogsOverview: import("./components/logs_overview").SelfContainedLogsOverview;
    };
    stop(): void;
}
