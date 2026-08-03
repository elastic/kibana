import { SortDirection } from '@kbn/data-plugin/common/search';
import { SCALING_TYPES, SOURCE_TYPES } from '../../../../../common';
export declare const BaseESSourceSchema: import("@kbn/config-schema").ObjectType<{
    applyForceRefresh: import("@kbn/config-schema").Type<boolean | undefined>;
    applyGlobalQuery: import("@kbn/config-schema").Type<boolean | undefined>;
    applyGlobalTime: import("@kbn/config-schema").Type<boolean | undefined>;
    id: import("@kbn/config-schema").Type<string>;
    indexPatternId: import("@kbn/config-schema").Type<string>;
}>;
export declare const ESSearchSourceSchema: import("@kbn/config-schema").ObjectType<Omit<{
    applyForceRefresh: import("@kbn/config-schema").Type<boolean | undefined>;
    applyGlobalQuery: import("@kbn/config-schema").Type<boolean | undefined>;
    applyGlobalTime: import("@kbn/config-schema").Type<boolean | undefined>;
    id: import("@kbn/config-schema").Type<string>;
    indexPatternId: import("@kbn/config-schema").Type<string>;
}, "type" | "sortField" | "sortOrder" | "geoField" | "topHitsSize" | "tooltipProperties" | "filterByMapBounds" | "scalingType" | "topHitsGroupByTimeseries" | "topHitsSplitField"> & {
    type: import("@kbn/config-schema").Type<SOURCE_TYPES.ES_SEARCH>;
    sortField: import("@kbn/config-schema").Type<string | undefined>;
    sortOrder: import("@kbn/config-schema").Type<SortDirection | undefined>;
    geoField: import("@kbn/config-schema").Type<string>;
    topHitsSize: import("@kbn/config-schema").Type<number | undefined>;
    tooltipProperties: import("@kbn/config-schema").Type<string[] | undefined>;
    filterByMapBounds: import("@kbn/config-schema").Type<boolean | undefined>;
    scalingType: import("@kbn/config-schema").Type<SCALING_TYPES | undefined>;
    topHitsGroupByTimeseries: import("@kbn/config-schema").Type<boolean | undefined>;
    topHitsSplitField: import("@kbn/config-schema").Type<string | undefined>;
}>;
export declare const ESQLSourceSchema: import("@kbn/config-schema").ObjectType<{
    applyForceRefresh: import("@kbn/config-schema").Type<boolean | undefined>;
    dateField: import("@kbn/config-schema").Type<string | undefined>;
    esql: import("@kbn/config-schema").Type<string>;
    geoField: import("@kbn/config-schema").Type<string | undefined>;
    id: import("@kbn/config-schema").Type<string>;
    narrowByMapBounds: import("@kbn/config-schema").Type<boolean | undefined>;
    narrowByGlobalSearch: import("@kbn/config-schema").Type<boolean | undefined>;
    narrowByGlobalTime: import("@kbn/config-schema").Type<boolean | undefined>;
    type: import("@kbn/config-schema").Type<SOURCE_TYPES.ESQL>;
}>;
