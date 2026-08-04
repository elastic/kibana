import { type RefreshInterval, type TimeRange } from '@kbn/data-plugin/common';
import type { Filter } from '@kbn/es-query';
import type { RouteAccess } from '@kbn/core-http-server';
export * from './paths';
export declare const PLUGIN_ID = "lens";
export declare const APP_ID = "lens";
export declare const DOC_TYPE = "lens";
export declare const LENS_APP_NAME = "lens";
export declare const LENS_DASHBOARD_APP_TYPE = "lens-dashboard-app";
export declare const NOT_INTERNATIONALIZED_PRODUCT_NAME = "Lens Visualizations";
export declare const LENS_EDIT_BY_VALUE = "edit_by_value";
export declare const LENS_ICON = "lensApp";
export declare const STAGE_ID = "production";
export declare const LENS_API_VERSION = "2023-10-31";
export declare const LENS_API_ACCESS: RouteAccess;
export declare const LENS_INTERNAL_API_VERSION = "1";
/**
 * In the OpenAPISpec this represents the endpoint group name
 */
export declare const LENS_API_TAG = "oas-tag:Visualizations";
export declare const INDEX_PATTERN_TYPE = "index-pattern";
export declare const PieChartTypes: {
    readonly PIE: "pie";
    readonly DONUT: "donut";
    readonly TREEMAP: "treemap";
    readonly MOSAIC: "mosaic";
    readonly WAFFLE: "waffle";
};
export declare const CategoryDisplay: {
    readonly DEFAULT: "default";
    readonly INSIDE: "inside";
    readonly HIDE: "hide";
};
export declare const NumberDisplay: {
    readonly HIDDEN: "hidden";
    readonly PERCENT: "percent";
    readonly VALUE: "value";
};
export declare const LegendDisplay: {
    readonly DEFAULT: "default";
    readonly SHOW: "show";
    readonly HIDE: "hide";
};
export declare const DOCUMENT_FIELD_NAME = "___records___";
export declare function getBasePath(): string;
export declare function getEditPath(id: string | undefined, timeRange?: TimeRange, filters?: Filter[], refreshInterval?: RefreshInterval): string;
export declare function getFullPath(id?: string): string;
export declare const COLOR_MAPPING_OFF_BY_DEFAULT = false;
export declare const DISCOVER_DRILLDOWN_TYPE = "discover_drilldown";
export declare const DISCOVER_DRILLDOWN_SUPPORTED_TRIGGERS: string[];
