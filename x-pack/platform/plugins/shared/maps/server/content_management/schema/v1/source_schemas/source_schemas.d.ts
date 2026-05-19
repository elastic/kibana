import { SOURCE_TYPES } from '../../../../../common';
import { MVT_FIELD_TYPE } from '../../../../../common/constants';
export declare const EMSFileSourceSchema: import("@kbn/config-schema").ObjectType<{
    id: import("@kbn/config-schema").Type<string>;
    type: import("@kbn/config-schema").Type<SOURCE_TYPES.EMS_FILE>;
    tooltipProperties: import("@kbn/config-schema").Type<string[] | undefined>;
}>;
export declare const EMSTMSSourceSchema: import("@kbn/config-schema").ObjectType<{
    id: import("@kbn/config-schema").Type<string | undefined>;
    type: import("@kbn/config-schema").Type<SOURCE_TYPES.EMS_TMS>;
    isAutoSelect: import("@kbn/config-schema").Type<boolean | undefined>;
    lightModeDefault: import("@kbn/config-schema").Type<string | undefined>;
}>;
export declare const kibanaTilemapSourceSchema: import("@kbn/config-schema").ObjectType<{
    type: import("@kbn/config-schema").Type<SOURCE_TYPES.KIBANA_TILEMAP>;
}>;
export declare const WMSSourceSchema: import("@kbn/config-schema").ObjectType<{
    serviceUrl: import("@kbn/config-schema").Type<string>;
    layers: import("@kbn/config-schema").Type<string>;
    styles: import("@kbn/config-schema").Type<string>;
    type: import("@kbn/config-schema").Type<SOURCE_TYPES.WMS>;
}>;
export declare const XYZTMSSourceSchema: import("@kbn/config-schema").ObjectType<{
    urlTemplate: import("@kbn/config-schema").Type<string>;
    type: import("@kbn/config-schema").Type<SOURCE_TYPES.EMS_XYZ>;
}>;
export declare const MVTFieldSchema: import("@kbn/config-schema").ObjectType<{
    name: import("@kbn/config-schema").Type<string>;
    type: import("@kbn/config-schema").Type<MVT_FIELD_TYPE>;
}>;
export declare const TiledSingleLayerVectorSourceSchema: import("@kbn/config-schema").ObjectType<{
    fields: import("@kbn/config-schema").Type<Readonly<{} & {
        name: string;
        type: MVT_FIELD_TYPE;
    }>[] | undefined>;
    layerName: import("@kbn/config-schema").Type<string>;
    maxSourceZoom: import("@kbn/config-schema").Type<number | undefined>;
    minSourceZoom: import("@kbn/config-schema").Type<number>;
    urlTemplate: import("@kbn/config-schema").Type<string>;
    tooltipProperties: import("@kbn/config-schema").Type<string[] | undefined>;
    type: import("@kbn/config-schema").Type<SOURCE_TYPES.MVT_SINGLE_LAYER>;
}>;
export declare const sourceSchema: import("@kbn/config-schema").Type<Readonly<{
    id?: string | undefined;
    isAutoSelect?: boolean | undefined;
    lightModeDefault?: string | undefined;
} & {
    type: SOURCE_TYPES.EMS_TMS;
}> | Readonly<{
    metrics?: (Readonly<{
        label?: string | undefined;
        mask?: Readonly<{} & {
            value: number;
            operator: import("../../../../../common/constants").MASK_OPERATOR;
        }> | undefined;
    } & {
        type: import("../../../../../common").AGG_TYPE.COUNT;
    }> | Readonly<{
        label?: string | undefined;
        field?: string | undefined;
        mask?: Readonly<{} & {
            value: number;
            operator: import("../../../../../common/constants").MASK_OPERATOR;
        }> | undefined;
    } & {
        type: import("../../../../../common").AGG_TYPE.AVG | import("../../../../../common").AGG_TYPE.MAX | import("../../../../../common").AGG_TYPE.MIN | import("../../../../../common").AGG_TYPE.SUM | import("../../../../../common").AGG_TYPE.TERMS | import("../../../../../common").AGG_TYPE.UNIQUE_COUNT;
    }> | Readonly<{
        label?: string | undefined;
        field?: string | undefined;
        mask?: Readonly<{} & {
            value: number;
            operator: import("../../../../../common/constants").MASK_OPERATOR;
        }> | undefined;
        percentile?: number | undefined;
    } & {
        type: import("../../../../../common").AGG_TYPE.PERCENTILE;
    }>)[] | undefined;
    applyForceRefresh?: boolean | undefined;
    applyGlobalQuery?: boolean | undefined;
    applyGlobalTime?: boolean | undefined;
} & {
    id: string;
    type: SOURCE_TYPES.ES_GEO_GRID;
    resolution: import("../../../../../common/constants").GRID_RESOLUTION;
    indexPatternId: string;
    geoField: string;
    requestType: import("../../../../../common/constants").RENDER_AS;
}> | Readonly<{} & {
    type: SOURCE_TYPES.KIBANA_TILEMAP;
}> | Readonly<{} & {
    type: SOURCE_TYPES.WMS;
    layers: string;
    styles: string;
    serviceUrl: string;
}> | Readonly<{} & {
    type: SOURCE_TYPES.EMS_XYZ;
    urlTemplate: string;
}> | Readonly<{
    tooltipProperties?: string[] | undefined;
} & {
    id: string;
    type: SOURCE_TYPES.EMS_FILE;
}> | Readonly<{
    fields?: Readonly<{} & {
        name: string;
        type: MVT_FIELD_TYPE;
    }>[] | undefined;
    tooltipProperties?: string[] | undefined;
    maxSourceZoom?: number | undefined;
} & {
    type: SOURCE_TYPES.MVT_SINGLE_LAYER;
    urlTemplate: string;
    layerName: string;
    minSourceZoom: number;
}> | Readonly<{
    metrics?: (Readonly<{
        label?: string | undefined;
        mask?: Readonly<{} & {
            value: number;
            operator: import("../../../../../common/constants").MASK_OPERATOR;
        }> | undefined;
    } & {
        type: import("../../../../../common").AGG_TYPE.COUNT;
    }> | Readonly<{
        label?: string | undefined;
        field?: string | undefined;
        mask?: Readonly<{} & {
            value: number;
            operator: import("../../../../../common/constants").MASK_OPERATOR;
        }> | undefined;
    } & {
        type: import("../../../../../common").AGG_TYPE.AVG | import("../../../../../common").AGG_TYPE.MAX | import("../../../../../common").AGG_TYPE.MIN | import("../../../../../common").AGG_TYPE.SUM | import("../../../../../common").AGG_TYPE.TERMS | import("../../../../../common").AGG_TYPE.UNIQUE_COUNT;
    }> | Readonly<{
        label?: string | undefined;
        field?: string | undefined;
        mask?: Readonly<{} & {
            value: number;
            operator: import("../../../../../common/constants").MASK_OPERATOR;
        }> | undefined;
        percentile?: number | undefined;
    } & {
        type: import("../../../../../common").AGG_TYPE.PERCENTILE;
    }>)[] | undefined;
    sortField?: string | undefined;
    splitField?: string | undefined;
    applyForceRefresh?: boolean | undefined;
    applyGlobalQuery?: boolean | undefined;
    applyGlobalTime?: boolean | undefined;
    groupByTimeseries?: boolean | undefined;
    lineSimplificationSize?: number | undefined;
} & {
    id: string;
    type: SOURCE_TYPES.ES_GEO_LINE;
    indexPatternId: string;
    geoField: string;
}> | Readonly<{
    metrics?: (Readonly<{
        label?: string | undefined;
        mask?: Readonly<{} & {
            value: number;
            operator: import("../../../../../common/constants").MASK_OPERATOR;
        }> | undefined;
    } & {
        type: import("../../../../../common").AGG_TYPE.COUNT;
    }> | Readonly<{
        label?: string | undefined;
        field?: string | undefined;
        mask?: Readonly<{} & {
            value: number;
            operator: import("../../../../../common/constants").MASK_OPERATOR;
        }> | undefined;
    } & {
        type: import("../../../../../common").AGG_TYPE.AVG | import("../../../../../common").AGG_TYPE.MAX | import("../../../../../common").AGG_TYPE.MIN | import("../../../../../common").AGG_TYPE.SUM | import("../../../../../common").AGG_TYPE.TERMS | import("../../../../../common").AGG_TYPE.UNIQUE_COUNT;
    }> | Readonly<{
        label?: string | undefined;
        field?: string | undefined;
        mask?: Readonly<{} & {
            value: number;
            operator: import("../../../../../common/constants").MASK_OPERATOR;
        }> | undefined;
        percentile?: number | undefined;
    } & {
        type: import("../../../../../common").AGG_TYPE.PERCENTILE;
    }>)[] | undefined;
    applyForceRefresh?: boolean | undefined;
    applyGlobalQuery?: boolean | undefined;
    applyGlobalTime?: boolean | undefined;
} & {
    id: string;
    type: SOURCE_TYPES.ES_PEW_PEW;
    indexPatternId: string;
    destGeoField: string;
    sourceGeoField: string;
}> | Readonly<{
    sortField?: string | undefined;
    sortOrder?: import("@kbn/data-plugin/public").SortDirection | undefined;
    topHitsSize?: number | undefined;
    applyForceRefresh?: boolean | undefined;
    applyGlobalQuery?: boolean | undefined;
    applyGlobalTime?: boolean | undefined;
    tooltipProperties?: string[] | undefined;
    filterByMapBounds?: boolean | undefined;
    scalingType?: import("../../../../../common").SCALING_TYPES | undefined;
    topHitsGroupByTimeseries?: boolean | undefined;
    topHitsSplitField?: string | undefined;
} & {
    id: string;
    type: SOURCE_TYPES.ES_SEARCH;
    indexPatternId: string;
    geoField: string;
}> | Readonly<{
    geoField?: string | undefined;
    dateField?: string | undefined;
    applyForceRefresh?: boolean | undefined;
    narrowByMapBounds?: boolean | undefined;
    narrowByGlobalSearch?: boolean | undefined;
    narrowByGlobalTime?: boolean | undefined;
} & {
    id: string;
    type: SOURCE_TYPES.ESQL;
    esql: string;
}> | Readonly<{} & {
    type: string;
}>>;
