import type { PluginSetup as DataPluginSetup, PluginStart as DataPluginStart } from '@kbn/data-plugin/server';
import type { LogViewsServiceStart } from '../log_views/types';
export interface LogEntriesServiceSetupDeps {
    data: DataPluginSetup;
}
export interface LogEntriesServicePluginsStartDeps {
    data: DataPluginStart;
}
export interface LogEntriesServicePluginSelfDeps {
    logViews: LogViewsServiceStart;
}
