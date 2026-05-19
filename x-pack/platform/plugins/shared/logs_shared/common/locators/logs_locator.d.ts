import { type DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import type { LogsDataAccessPluginStart } from '@kbn/logs-data-access-plugin/public';
import type { LocatorDefinition } from '@kbn/share-plugin/common';
import type { LocatorClient } from '@kbn/share-plugin/common/url_service';
/**
 * Locator used to link to all log sources in Discover.
 */
export declare const LOGS_LOCATOR_ID = "LOGS_LOCATOR";
/**
 * Accepts the same parameters as `DiscoverAppLocatorParams`, but automatically sets the `dataViewId` param to all log sources.
 */
export type LogsLocatorParams = DiscoverAppLocatorParams;
export declare class LogsLocatorDefinition implements LocatorDefinition<LogsLocatorParams> {
    private readonly deps;
    readonly id = "LOGS_LOCATOR";
    constructor(deps: {
        locators: LocatorClient;
        getLogSourcesService(): Promise<LogsDataAccessPluginStart['services']['logSourcesService']>;
        getIsEsqlDefault(): Promise<boolean>;
    });
    readonly getLocation: (params: LogsLocatorParams) => Promise<import("@kbn/share-plugin/common/url_service").KibanaLocation<object>>;
}
