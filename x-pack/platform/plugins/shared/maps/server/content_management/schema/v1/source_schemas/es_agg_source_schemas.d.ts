import { SOURCE_TYPES } from '../../../../../common';
import { AGG_TYPE, GRID_RESOLUTION, MASK_OPERATOR, RENDER_AS } from '../../../../../common/constants';
export declare const countAggSchema: import("@kbn/config-schema").ObjectType<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    mask: import("@kbn/config-schema").Type<Readonly<{} & {
        value: number;
        operator: MASK_OPERATOR;
    }> | undefined>;
    type: import("@kbn/config-schema").Type<AGG_TYPE.COUNT>;
}>;
export declare const fieldedAggSchema: import("@kbn/config-schema").ObjectType<{
    field: import("@kbn/config-schema").Type<string | undefined>;
    label: import("@kbn/config-schema").Type<string | undefined>;
    mask: import("@kbn/config-schema").Type<Readonly<{} & {
        value: number;
        operator: MASK_OPERATOR;
    }> | undefined>;
    type: import("@kbn/config-schema").Type<AGG_TYPE.AVG | AGG_TYPE.MAX | AGG_TYPE.MIN | AGG_TYPE.SUM | AGG_TYPE.TERMS | AGG_TYPE.UNIQUE_COUNT>;
}>;
export declare const percentileAggSchema: import("@kbn/config-schema").ObjectType<{
    field: import("@kbn/config-schema").Type<string | undefined>;
    label: import("@kbn/config-schema").Type<string | undefined>;
    mask: import("@kbn/config-schema").Type<Readonly<{} & {
        value: number;
        operator: MASK_OPERATOR;
    }> | undefined>;
    percentile: import("@kbn/config-schema").Type<number | undefined>;
    type: import("@kbn/config-schema").Type<AGG_TYPE.PERCENTILE>;
}>;
export declare const AggSchema: import("@kbn/config-schema").Type<Readonly<{
    label?: string | undefined;
    mask?: Readonly<{} & {
        value: number;
        operator: MASK_OPERATOR;
    }> | undefined;
} & {
    type: AGG_TYPE.COUNT;
}> | Readonly<{
    label?: string | undefined;
    field?: string | undefined;
    mask?: Readonly<{} & {
        value: number;
        operator: MASK_OPERATOR;
    }> | undefined;
} & {
    type: AGG_TYPE.AVG | AGG_TYPE.MAX | AGG_TYPE.MIN | AGG_TYPE.SUM | AGG_TYPE.TERMS | AGG_TYPE.UNIQUE_COUNT;
}> | Readonly<{
    label?: string | undefined;
    field?: string | undefined;
    mask?: Readonly<{} & {
        value: number;
        operator: MASK_OPERATOR;
    }> | undefined;
    percentile?: number | undefined;
} & {
    type: AGG_TYPE.PERCENTILE;
}>>;
export declare const BaseESAggSourceSchema: import("@kbn/config-schema").ObjectType<Omit<{
    applyForceRefresh: import("@kbn/config-schema").Type<boolean | undefined>;
    applyGlobalQuery: import("@kbn/config-schema").Type<boolean | undefined>;
    applyGlobalTime: import("@kbn/config-schema").Type<boolean | undefined>;
    id: import("@kbn/config-schema").Type<string>;
    indexPatternId: import("@kbn/config-schema").Type<string>;
}, "metrics"> & {
    metrics: import("@kbn/config-schema").Type<(Readonly<{
        label?: string | undefined;
        mask?: Readonly<{} & {
            value: number;
            operator: MASK_OPERATOR;
        }> | undefined;
    } & {
        type: AGG_TYPE.COUNT;
    }> | Readonly<{
        label?: string | undefined;
        field?: string | undefined;
        mask?: Readonly<{} & {
            value: number;
            operator: MASK_OPERATOR;
        }> | undefined;
    } & {
        type: AGG_TYPE.AVG | AGG_TYPE.MAX | AGG_TYPE.MIN | AGG_TYPE.SUM | AGG_TYPE.TERMS | AGG_TYPE.UNIQUE_COUNT;
    }> | Readonly<{
        label?: string | undefined;
        field?: string | undefined;
        mask?: Readonly<{} & {
            value: number;
            operator: MASK_OPERATOR;
        }> | undefined;
        percentile?: number | undefined;
    } & {
        type: AGG_TYPE.PERCENTILE;
    }>)[] | undefined>;
}>;
export declare const ESGeoGridSourceSchema: import("@kbn/config-schema").ObjectType<Omit<Omit<{
    applyForceRefresh: import("@kbn/config-schema").Type<boolean | undefined>;
    applyGlobalQuery: import("@kbn/config-schema").Type<boolean | undefined>;
    applyGlobalTime: import("@kbn/config-schema").Type<boolean | undefined>;
    id: import("@kbn/config-schema").Type<string>;
    indexPatternId: import("@kbn/config-schema").Type<string>;
}, "metrics"> & {
    metrics: import("@kbn/config-schema").Type<(Readonly<{
        label?: string | undefined;
        mask?: Readonly<{} & {
            value: number;
            operator: MASK_OPERATOR;
        }> | undefined;
    } & {
        type: AGG_TYPE.COUNT;
    }> | Readonly<{
        label?: string | undefined;
        field?: string | undefined;
        mask?: Readonly<{} & {
            value: number;
            operator: MASK_OPERATOR;
        }> | undefined;
    } & {
        type: AGG_TYPE.AVG | AGG_TYPE.MAX | AGG_TYPE.MIN | AGG_TYPE.SUM | AGG_TYPE.TERMS | AGG_TYPE.UNIQUE_COUNT;
    }> | Readonly<{
        label?: string | undefined;
        field?: string | undefined;
        mask?: Readonly<{} & {
            value: number;
            operator: MASK_OPERATOR;
        }> | undefined;
        percentile?: number | undefined;
    } & {
        type: AGG_TYPE.PERCENTILE;
    }>)[] | undefined>;
}, "type" | "resolution" | "geoField" | "requestType"> & {
    type: import("@kbn/config-schema").Type<SOURCE_TYPES.ES_GEO_GRID>;
    resolution: import("@kbn/config-schema").Type<GRID_RESOLUTION>;
    geoField: import("@kbn/config-schema").Type<string>;
    requestType: import("@kbn/config-schema").Type<RENDER_AS>;
}>;
export declare const ESGeoLineSourceSchema: import("@kbn/config-schema").ObjectType<Omit<Omit<{
    applyForceRefresh: import("@kbn/config-schema").Type<boolean | undefined>;
    applyGlobalQuery: import("@kbn/config-schema").Type<boolean | undefined>;
    applyGlobalTime: import("@kbn/config-schema").Type<boolean | undefined>;
    id: import("@kbn/config-schema").Type<string>;
    indexPatternId: import("@kbn/config-schema").Type<string>;
}, "metrics"> & {
    metrics: import("@kbn/config-schema").Type<(Readonly<{
        label?: string | undefined;
        mask?: Readonly<{} & {
            value: number;
            operator: MASK_OPERATOR;
        }> | undefined;
    } & {
        type: AGG_TYPE.COUNT;
    }> | Readonly<{
        label?: string | undefined;
        field?: string | undefined;
        mask?: Readonly<{} & {
            value: number;
            operator: MASK_OPERATOR;
        }> | undefined;
    } & {
        type: AGG_TYPE.AVG | AGG_TYPE.MAX | AGG_TYPE.MIN | AGG_TYPE.SUM | AGG_TYPE.TERMS | AGG_TYPE.UNIQUE_COUNT;
    }> | Readonly<{
        label?: string | undefined;
        field?: string | undefined;
        mask?: Readonly<{} & {
            value: number;
            operator: MASK_OPERATOR;
        }> | undefined;
        percentile?: number | undefined;
    } & {
        type: AGG_TYPE.PERCENTILE;
    }>)[] | undefined>;
}, "type" | "sortField" | "geoField" | "splitField" | "groupByTimeseries" | "lineSimplificationSize"> & {
    type: import("@kbn/config-schema").Type<SOURCE_TYPES.ES_GEO_LINE>;
    sortField: import("@kbn/config-schema").Type<string | undefined>;
    geoField: import("@kbn/config-schema").Type<string>;
    splitField: import("@kbn/config-schema").Type<string | undefined>;
    groupByTimeseries: import("@kbn/config-schema").Type<boolean | undefined>;
    lineSimplificationSize: import("@kbn/config-schema").Type<number | undefined>;
}>;
export declare const ESPewPewSourceSchema: import("@kbn/config-schema").ObjectType<Omit<Omit<{
    applyForceRefresh: import("@kbn/config-schema").Type<boolean | undefined>;
    applyGlobalQuery: import("@kbn/config-schema").Type<boolean | undefined>;
    applyGlobalTime: import("@kbn/config-schema").Type<boolean | undefined>;
    id: import("@kbn/config-schema").Type<string>;
    indexPatternId: import("@kbn/config-schema").Type<string>;
}, "metrics"> & {
    metrics: import("@kbn/config-schema").Type<(Readonly<{
        label?: string | undefined;
        mask?: Readonly<{} & {
            value: number;
            operator: MASK_OPERATOR;
        }> | undefined;
    } & {
        type: AGG_TYPE.COUNT;
    }> | Readonly<{
        label?: string | undefined;
        field?: string | undefined;
        mask?: Readonly<{} & {
            value: number;
            operator: MASK_OPERATOR;
        }> | undefined;
    } & {
        type: AGG_TYPE.AVG | AGG_TYPE.MAX | AGG_TYPE.MIN | AGG_TYPE.SUM | AGG_TYPE.TERMS | AGG_TYPE.UNIQUE_COUNT;
    }> | Readonly<{
        label?: string | undefined;
        field?: string | undefined;
        mask?: Readonly<{} & {
            value: number;
            operator: MASK_OPERATOR;
        }> | undefined;
        percentile?: number | undefined;
    } & {
        type: AGG_TYPE.PERCENTILE;
    }>)[] | undefined>;
}, "type" | "destGeoField" | "sourceGeoField"> & {
    type: import("@kbn/config-schema").Type<SOURCE_TYPES.ES_PEW_PEW>;
    destGeoField: import("@kbn/config-schema").Type<string>;
    sourceGeoField: import("@kbn/config-schema").Type<string>;
}>;
