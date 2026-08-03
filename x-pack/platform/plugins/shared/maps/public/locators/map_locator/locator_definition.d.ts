import type { LocatorDefinition } from '@kbn/share-plugin/public';
import type { TimeRange } from '@kbn/es-query';
import type { MapsAppLocatorDependencies, MapsAppLocatorParams } from './types';
export declare const MAPS_APP_LOCATOR: "MAPS_APP_LOCATOR";
export declare class MapsAppLocatorDefinition implements LocatorDefinition<MapsAppLocatorParams> {
    protected readonly deps: MapsAppLocatorDependencies;
    readonly id: "MAPS_APP_LOCATOR";
    constructor(deps: MapsAppLocatorDependencies);
    readonly getTimeRange: (params: MapsAppLocatorParams) => TimeRange | undefined;
    readonly setTimeRange: (params: MapsAppLocatorParams, timeRange?: TimeRange) => {
        timeRange: TimeRange | undefined;
        mapId?: string;
        initialLayers?: import("../../../common").LayerDescriptor[] & import("@kbn/utility-types").SerializableRecord;
        refreshInterval?: import("@kbn/data-service-server").RefreshInterval & import("@kbn/utility-types").SerializableRecord;
        filters?: import("@kbn/es-query").Filter[];
        query?: import("@kbn/es-query").Query;
        hash?: boolean;
        dataViewSpec?: import("@kbn/data-views-plugin/common").DataViewSpec;
    };
    readonly getLocation: (params: MapsAppLocatorParams) => Promise<{
        app: string;
        path: string;
        state: {
            dataViewSpec: import("@kbn/data-views-plugin/common").DataViewSpec;
        } | {
            dataViewSpec?: undefined;
        };
    }>;
}
