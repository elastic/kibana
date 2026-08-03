import type { MapsAppLocatorDependencies, MapsAppLocatorParams } from './types';
export declare function getLocation(params: MapsAppLocatorParams, deps: MapsAppLocatorDependencies): {
    app: string;
    path: string;
    state: {
        dataViewSpec: import("@kbn/data-views-plugin/common").DataViewSpec;
    } | {
        dataViewSpec?: undefined;
    };
};
