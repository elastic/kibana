import { SOURCE_TYPES } from '../../../../../common';
export declare const ESJoinSourceSchema: import("@kbn/config-schema").ObjectType<Omit<Omit<{
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
            operator: import("../../../../../common/constants").MASK_OPERATOR;
        }> | undefined;
    } & {
        type: import("../../../../../common").AGG_TYPE.COUNT;
    }> | Readonly<{
        label?: string | undefined;
        mask?: Readonly<{} & {
            value: number;
            operator: import("../../../../../common/constants").MASK_OPERATOR;
        }> | undefined;
        field?: string | undefined;
    } & {
        type: import("../../../../../common").AGG_TYPE.AVG | import("../../../../../common").AGG_TYPE.MAX | import("../../../../../common").AGG_TYPE.MIN | import("../../../../../common").AGG_TYPE.SUM | import("../../../../../common").AGG_TYPE.TERMS | import("../../../../../common").AGG_TYPE.UNIQUE_COUNT;
    }> | Readonly<{
        label?: string | undefined;
        mask?: Readonly<{} & {
            value: number;
            operator: import("../../../../../common/constants").MASK_OPERATOR;
        }> | undefined;
        field?: string | undefined;
        percentile?: number | undefined;
    } & {
        type: import("../../../../../common").AGG_TYPE.PERCENTILE;
    }>)[] | undefined>;
}, "type" | "whereQuery"> & {
    type: import("@kbn/config-schema").Type<string>;
    whereQuery: import("@kbn/config-schema").Type<Readonly<{} & {
        query: string | Record<string, any>;
        language: string;
    }> | undefined>;
}>;
export declare const ESDistanceSourceSchema: import("@kbn/config-schema").ObjectType<Omit<Omit<Omit<{
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
            operator: import("../../../../../common/constants").MASK_OPERATOR;
        }> | undefined;
    } & {
        type: import("../../../../../common").AGG_TYPE.COUNT;
    }> | Readonly<{
        label?: string | undefined;
        mask?: Readonly<{} & {
            value: number;
            operator: import("../../../../../common/constants").MASK_OPERATOR;
        }> | undefined;
        field?: string | undefined;
    } & {
        type: import("../../../../../common").AGG_TYPE.AVG | import("../../../../../common").AGG_TYPE.MAX | import("../../../../../common").AGG_TYPE.MIN | import("../../../../../common").AGG_TYPE.SUM | import("../../../../../common").AGG_TYPE.TERMS | import("../../../../../common").AGG_TYPE.UNIQUE_COUNT;
    }> | Readonly<{
        label?: string | undefined;
        mask?: Readonly<{} & {
            value: number;
            operator: import("../../../../../common/constants").MASK_OPERATOR;
        }> | undefined;
        field?: string | undefined;
        percentile?: number | undefined;
    } & {
        type: import("../../../../../common").AGG_TYPE.PERCENTILE;
    }>)[] | undefined>;
}, "type" | "whereQuery"> & {
    type: import("@kbn/config-schema").Type<string>;
    whereQuery: import("@kbn/config-schema").Type<Readonly<{} & {
        query: string | Record<string, any>;
        language: string;
    }> | undefined>;
}, "type" | "geoField" | "distance"> & {
    type: import("@kbn/config-schema").Type<SOURCE_TYPES.ES_DISTANCE_SOURCE>;
    geoField: import("@kbn/config-schema").Type<string>;
    distance: import("@kbn/config-schema").Type<number>;
}>;
export declare const ESTermSourceSchema: import("@kbn/config-schema").ObjectType<Omit<Omit<Omit<{
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
            operator: import("../../../../../common/constants").MASK_OPERATOR;
        }> | undefined;
    } & {
        type: import("../../../../../common").AGG_TYPE.COUNT;
    }> | Readonly<{
        label?: string | undefined;
        mask?: Readonly<{} & {
            value: number;
            operator: import("../../../../../common/constants").MASK_OPERATOR;
        }> | undefined;
        field?: string | undefined;
    } & {
        type: import("../../../../../common").AGG_TYPE.AVG | import("../../../../../common").AGG_TYPE.MAX | import("../../../../../common").AGG_TYPE.MIN | import("../../../../../common").AGG_TYPE.SUM | import("../../../../../common").AGG_TYPE.TERMS | import("../../../../../common").AGG_TYPE.UNIQUE_COUNT;
    }> | Readonly<{
        label?: string | undefined;
        mask?: Readonly<{} & {
            value: number;
            operator: import("../../../../../common/constants").MASK_OPERATOR;
        }> | undefined;
        field?: string | undefined;
        percentile?: number | undefined;
    } & {
        type: import("../../../../../common").AGG_TYPE.PERCENTILE;
    }>)[] | undefined>;
}, "type" | "whereQuery"> & {
    type: import("@kbn/config-schema").Type<string>;
    whereQuery: import("@kbn/config-schema").Type<Readonly<{} & {
        query: string | Record<string, any>;
        language: string;
    }> | undefined>;
}, "type" | "term" | "size"> & {
    type: import("@kbn/config-schema").Type<SOURCE_TYPES.ES_TERM_SOURCE>;
    term: import("@kbn/config-schema").Type<string>;
    size: import("@kbn/config-schema").Type<number | undefined>;
}>;
export declare const joinSourceSchema: import("@kbn/config-schema").Type<Readonly<{} & {
    type: string;
    id: string;
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
        mask?: Readonly<{} & {
            value: number;
            operator: import("../../../../../common/constants").MASK_OPERATOR;
        }> | undefined;
        field?: string | undefined;
    } & {
        type: import("../../../../../common").AGG_TYPE.AVG | import("../../../../../common").AGG_TYPE.MAX | import("../../../../../common").AGG_TYPE.MIN | import("../../../../../common").AGG_TYPE.SUM | import("../../../../../common").AGG_TYPE.TERMS | import("../../../../../common").AGG_TYPE.UNIQUE_COUNT;
    }> | Readonly<{
        label?: string | undefined;
        mask?: Readonly<{} & {
            value: number;
            operator: import("../../../../../common/constants").MASK_OPERATOR;
        }> | undefined;
        field?: string | undefined;
        percentile?: number | undefined;
    } & {
        type: import("../../../../../common").AGG_TYPE.PERCENTILE;
    }>)[] | undefined;
    applyForceRefresh?: boolean | undefined;
    applyGlobalQuery?: boolean | undefined;
    applyGlobalTime?: boolean | undefined;
    whereQuery?: Readonly<{} & {
        query: string | Record<string, any>;
        language: string;
    }> | undefined;
} & {
    type: SOURCE_TYPES.ES_DISTANCE_SOURCE;
    id: string;
    indexPatternId: string;
    geoField: string;
    distance: number;
}> | Readonly<{
    size?: number | undefined;
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
        mask?: Readonly<{} & {
            value: number;
            operator: import("../../../../../common/constants").MASK_OPERATOR;
        }> | undefined;
        field?: string | undefined;
    } & {
        type: import("../../../../../common").AGG_TYPE.AVG | import("../../../../../common").AGG_TYPE.MAX | import("../../../../../common").AGG_TYPE.MIN | import("../../../../../common").AGG_TYPE.SUM | import("../../../../../common").AGG_TYPE.TERMS | import("../../../../../common").AGG_TYPE.UNIQUE_COUNT;
    }> | Readonly<{
        label?: string | undefined;
        mask?: Readonly<{} & {
            value: number;
            operator: import("../../../../../common/constants").MASK_OPERATOR;
        }> | undefined;
        field?: string | undefined;
        percentile?: number | undefined;
    } & {
        type: import("../../../../../common").AGG_TYPE.PERCENTILE;
    }>)[] | undefined;
    applyForceRefresh?: boolean | undefined;
    applyGlobalQuery?: boolean | undefined;
    applyGlobalTime?: boolean | undefined;
    whereQuery?: Readonly<{} & {
        query: string | Record<string, any>;
        language: string;
    }> | undefined;
} & {
    type: SOURCE_TYPES.ES_TERM_SOURCE;
    id: string;
    term: string;
    indexPatternId: string;
}>>;
