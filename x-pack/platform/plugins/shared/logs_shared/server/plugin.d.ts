import type { CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { LogsSharedConfig } from '../common/plugin_config';
import type { LogsSharedPluginCoreSetup, LogsSharedPluginSetup, LogsSharedPluginStart, LogsSharedServerPluginSetupDeps, LogsSharedServerPluginStartDeps, UsageCollector } from './types';
export declare class LogsSharedPlugin implements Plugin<LogsSharedPluginSetup, LogsSharedPluginStart, LogsSharedServerPluginSetupDeps, LogsSharedServerPluginStartDeps> {
    private readonly context;
    private readonly logger;
    private config;
    private libs;
    private logViews;
    private usageCollector;
    constructor(context: PluginInitializerContext<LogsSharedConfig>);
    setup(core: LogsSharedPluginCoreSetup, plugins: LogsSharedServerPluginSetupDeps): {
        logViews: import("./services/log_views").LogViewsServiceSetup;
        registerUsageCollectorActions: (usageCollector: UsageCollector) => void;
        logEntries: import("./lib/domains/log_entries_domain").ILogsSharedLogEntriesDomain;
    };
    start(core: CoreStart, plugins: LogsSharedServerPluginStartDeps): {
        logViews: import("./services/log_views").LogViewsServiceStart;
    };
    stop(): void;
}
