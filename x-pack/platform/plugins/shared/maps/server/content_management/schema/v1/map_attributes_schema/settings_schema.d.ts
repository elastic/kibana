import { INITIAL_LOCATION } from '../../../../../common';
export declare const customIconSchema: import("@kbn/config-schema").ObjectType<{
    symbolId: import("@kbn/config-schema").Type<string>;
    svg: import("@kbn/config-schema").Type<string>;
    label: import("@kbn/config-schema").Type<string>;
    cutoff: import("@kbn/config-schema").Type<number>;
    radius: import("@kbn/config-schema").Type<number>;
}>;
export declare const settingsSchema: import("@kbn/config-schema").ObjectType<{
    autoFitToDataBounds: import("@kbn/config-schema").Type<boolean | undefined>;
    backgroundColor: import("@kbn/config-schema").Type<string | undefined>;
    customIcons: import("@kbn/config-schema").Type<Readonly<{} & {
        label: string;
        svg: string;
        radius: number;
        symbolId: string;
        cutoff: number;
    }>[] | undefined>;
    disableInteractive: import("@kbn/config-schema").Type<boolean | undefined>;
    disableTooltipControl: import("@kbn/config-schema").Type<boolean | undefined>;
    hideToolbarOverlay: import("@kbn/config-schema").Type<boolean | undefined>;
    hideLayerControl: import("@kbn/config-schema").Type<boolean | undefined>;
    hideViewControl: import("@kbn/config-schema").Type<boolean | undefined>;
    initialLocation: import("@kbn/config-schema").Type<INITIAL_LOCATION | undefined>;
    fixedLocation: import("@kbn/config-schema").Type<Readonly<{} & {
        lat: number;
        lon: number;
        zoom: number;
    }> | undefined>;
    browserLocation: import("@kbn/config-schema").Type<Readonly<{} & {
        zoom: number;
    }> | undefined>;
    keydownScrollZoom: import("@kbn/config-schema").Type<boolean | undefined>;
    maxZoom: import("@kbn/config-schema").Type<number | undefined>;
    minZoom: import("@kbn/config-schema").Type<number | undefined>;
    projection: import("@kbn/config-schema").Type<"globeInterpolate" | "mercator" | undefined>;
    showScaleControl: import("@kbn/config-schema").Type<boolean | undefined>;
    showSpatialFilters: import("@kbn/config-schema").Type<boolean | undefined>;
    showTimesliderToggleButton: import("@kbn/config-schema").Type<boolean | undefined>;
    spatialFiltersAlpa: import("@kbn/config-schema").Type<number | undefined>;
    spatialFiltersFillColor: import("@kbn/config-schema").Type<string | undefined>;
    spatialFiltersLineColor: import("@kbn/config-schema").Type<string | undefined>;
}>;
