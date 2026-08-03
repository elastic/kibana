import { type DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import type { TimeRange } from '@kbn/es-query';
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
    readonly getTimeRange: (params: LogsLocatorParams) => TimeRange | undefined;
    readonly setTimeRange: (params: LogsLocatorParams, timeRange?: TimeRange) => {
        timeRange: TimeRange | undefined;
        savedSearchId?: string;
        dataViewId?: string;
        indexPatternId?: string;
        dataViewSpec?: import("@kbn/data-views-plugin/common").DataViewSpec;
        refreshInterval?: import("@kbn/data-service-server").RefreshInterval & import("@kbn/utility-types").SerializableRecord;
        filters?: import("@kbn/es-query").Filter[];
        query?: import("@kbn/es-query").Query | import("@kbn/es-query").AggregateQuery;
        useHash?: boolean;
        searchSessionId?: string;
        tab?: {
            id: typeof import("@kbn/discover-plugin/common/constants").NEW_TAB_ID | string;
            label?: string;
        };
        columns?: string[];
        grid?: import("@kbn/saved-search-plugin/common").DiscoverGridSettings;
        interval?: string;
        sort?: string[][];
        savedQuery?: string;
        viewMode?: import("@kbn/discover-plugin/common/constants").VIEW_MODE;
        hideAggregatedPreview?: boolean;
        breakdownField?: string;
        hideChart?: boolean;
        hideTable?: boolean;
        hideSidebar?: boolean;
        sampleSize?: number;
        isAlertResults?: boolean;
        esqlControls?: import("@kbn/control-group-renderer").ControlPanelsState<import("@kbn/controls-schemas").OptionsListESQLControlState> & import("@kbn/utility-types").SerializableRecord;
        esqlVariables?: import("@kbn/esql-types").ESQLControlVariable[];
        isApproximate?: boolean;
        profileState?: import("@kbn/discover-plugin/common/context_awareness").ProfileStateMap;
    };
    readonly getLocation: (params: LogsLocatorParams) => Promise<import("@kbn/share-plugin/public").KibanaLocation<object>>;
}
