import type { PluginSetup as DataPluginSetup, PluginStart as DataPluginStart } from '@kbn/data-plugin/server';
import type { PluginStart as DataViewsPluginStart } from '@kbn/data-views-plugin/server';
export interface LogsDataAccessPluginSetupDeps {
    data: DataPluginSetup;
}
export interface LogsDataAccessPluginStartDeps {
    data: DataPluginStart;
    dataViews: DataViewsPluginStart;
}
