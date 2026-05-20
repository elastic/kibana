import type { LocatorDefinition } from '@kbn/share-plugin/public';
import type { MapsAppLocatorDependencies, MapsAppLocatorParams } from './types';
export declare const MAPS_APP_LOCATOR: "MAPS_APP_LOCATOR";
export declare class MapsAppLocatorDefinition implements LocatorDefinition<MapsAppLocatorParams> {
    protected readonly deps: MapsAppLocatorDependencies;
    readonly id: "MAPS_APP_LOCATOR";
    constructor(deps: MapsAppLocatorDependencies);
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
