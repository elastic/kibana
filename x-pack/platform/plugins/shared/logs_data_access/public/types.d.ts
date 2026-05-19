import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
export interface LogsDataAccessPluginSetupDeps {
}
export interface LogsDataAccessPluginStartDeps {
    data: DataPublicPluginStart;
}
