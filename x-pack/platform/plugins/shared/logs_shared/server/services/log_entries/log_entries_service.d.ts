import type { CoreSetup } from '@kbn/core/server';
import type { LogEntriesServiceSetupDeps, LogEntriesServicePluginsStartDeps, LogEntriesServicePluginSelfDeps } from './types';
export declare class LogEntriesService {
    setup(core: CoreSetup<LogEntriesServicePluginsStartDeps, LogEntriesServicePluginSelfDeps>, setupDeps: LogEntriesServiceSetupDeps): void;
    start(_startDeps: LogEntriesServicePluginsStartDeps): void;
}
