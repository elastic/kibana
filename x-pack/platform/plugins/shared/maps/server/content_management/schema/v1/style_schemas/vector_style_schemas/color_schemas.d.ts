import { COLOR_MAP_TYPE, DATA_MAPPING_FUNCTION, STYLE_TYPE } from '../../../../../../common/constants';
export declare const categoryColorStop: import("@kbn/config-schema").ObjectType<{
    stop: import("@kbn/config-schema").Type<string | null>;
    color: import("@kbn/config-schema").Type<string>;
}>;
export declare const ordinalColorStop: import("@kbn/config-schema").ObjectType<{
    stop: import("@kbn/config-schema").Type<number>;
    color: import("@kbn/config-schema").Type<string>;
}>;
export declare const colorDynamicOptions: import("@kbn/config-schema").ObjectType<{
    color: import("@kbn/config-schema").Type<string | undefined>;
    customColorRamp: import("@kbn/config-schema").Type<Readonly<{} & {
        stop: number;
        color: string;
    }>[] | undefined>;
    useCustomColorRamp: import("@kbn/config-schema").Type<boolean | undefined>;
    dataMappingFunction: import("@kbn/config-schema").Type<DATA_MAPPING_FUNCTION | undefined>;
    invert: import("@kbn/config-schema").Type<boolean | undefined>;
    colorCategory: import("@kbn/config-schema").Type<string | undefined>;
    customColorPalette: import("@kbn/config-schema").Type<Readonly<{} & {
        stop: string | null;
        color: string;
    }>[] | undefined>;
    useCustomColorPalette: import("@kbn/config-schema").Type<boolean | undefined>;
    otherCategoryColor: import("@kbn/config-schema").Type<string | undefined>;
    field: import("@kbn/config-schema").Type<Readonly<{} & {
        name: string;
        origin: import("../../../../../../common/constants").FIELD_ORIGIN;
    }> | undefined>;
    fieldMetaOptions: import("@kbn/config-schema").ObjectType<{
        isEnabled: import("@kbn/config-schema").Type<boolean>;
        sigma: import("@kbn/config-schema").Type<number | undefined>;
        percentiles: import("@kbn/config-schema").Type<number[] | undefined>;
    }>;
    type: import("@kbn/config-schema").Type<COLOR_MAP_TYPE | undefined>;
}>;
export declare const colorStaticOptions: import("@kbn/config-schema").ObjectType<{
    color: import("@kbn/config-schema").Type<string>;
}>;
export declare const colorStaticSchema: import("@kbn/config-schema").ObjectType<{
    type: import("@kbn/config-schema").Type<STYLE_TYPE.STATIC>;
    options: import("@kbn/config-schema").ObjectType<{
        color: import("@kbn/config-schema").Type<string>;
    }>;
}>;
export declare const colorDynamicSchema: import("@kbn/config-schema").ObjectType<{
    type: import("@kbn/config-schema").Type<STYLE_TYPE.DYNAMIC>;
    options: import("@kbn/config-schema").ObjectType<{
        color: import("@kbn/config-schema").Type<string | undefined>;
        customColorRamp: import("@kbn/config-schema").Type<Readonly<{} & {
            stop: number;
            color: string;
        }>[] | undefined>;
        useCustomColorRamp: import("@kbn/config-schema").Type<boolean | undefined>;
        dataMappingFunction: import("@kbn/config-schema").Type<DATA_MAPPING_FUNCTION | undefined>;
        invert: import("@kbn/config-schema").Type<boolean | undefined>;
        colorCategory: import("@kbn/config-schema").Type<string | undefined>;
        customColorPalette: import("@kbn/config-schema").Type<Readonly<{} & {
            stop: string | null;
            color: string;
        }>[] | undefined>;
        useCustomColorPalette: import("@kbn/config-schema").Type<boolean | undefined>;
        otherCategoryColor: import("@kbn/config-schema").Type<string | undefined>;
        field: import("@kbn/config-schema").Type<Readonly<{} & {
            name: string;
            origin: import("../../../../../../common/constants").FIELD_ORIGIN;
        }> | undefined>;
        fieldMetaOptions: import("@kbn/config-schema").ObjectType<{
            isEnabled: import("@kbn/config-schema").Type<boolean>;
            sigma: import("@kbn/config-schema").Type<number | undefined>;
            percentiles: import("@kbn/config-schema").Type<number[] | undefined>;
        }>;
        type: import("@kbn/config-schema").Type<COLOR_MAP_TYPE | undefined>;
    }>;
}>;
export declare const colorSchema: import("@kbn/config-schema").Type<Readonly<{} & {
    type: STYLE_TYPE.STATIC;
    options: Readonly<{} & {
        color: string;
    }>;
}> | Readonly<{} & {
    type: STYLE_TYPE.DYNAMIC;
    options: Readonly<{
        type?: COLOR_MAP_TYPE | undefined;
        field?: Readonly<{} & {
            name: string;
            origin: import("../../../../../../common/constants").FIELD_ORIGIN;
        }> | undefined;
        color?: string | undefined;
        invert?: boolean | undefined;
        customColorRamp?: Readonly<{} & {
            stop: number;
            color: string;
        }>[] | undefined;
        useCustomColorRamp?: boolean | undefined;
        dataMappingFunction?: DATA_MAPPING_FUNCTION | undefined;
        colorCategory?: string | undefined;
        customColorPalette?: Readonly<{} & {
            stop: string | null;
            color: string;
        }>[] | undefined;
        useCustomColorPalette?: boolean | undefined;
        otherCategoryColor?: string | undefined;
    } & {
        fieldMetaOptions: Readonly<{
            percentiles?: number[] | undefined;
            sigma?: number | undefined;
        } & {
            isEnabled: boolean;
        }>;
    }>;
}>>;
export declare const fillColorSchema: import("@kbn/config-schema").Type<Readonly<{} & {
    type: STYLE_TYPE.STATIC;
    options: Readonly<{} & {
        color: string;
    }>;
}> | Readonly<{} & {
    type: STYLE_TYPE.DYNAMIC;
    options: Readonly<{
        type?: COLOR_MAP_TYPE | undefined;
        field?: Readonly<{} & {
            name: string;
            origin: import("../../../../../../common/constants").FIELD_ORIGIN;
        }> | undefined;
        color?: string | undefined;
        invert?: boolean | undefined;
        customColorRamp?: Readonly<{} & {
            stop: number;
            color: string;
        }>[] | undefined;
        useCustomColorRamp?: boolean | undefined;
        dataMappingFunction?: DATA_MAPPING_FUNCTION | undefined;
        colorCategory?: string | undefined;
        customColorPalette?: Readonly<{} & {
            stop: string | null;
            color: string;
        }>[] | undefined;
        useCustomColorPalette?: boolean | undefined;
        otherCategoryColor?: string | undefined;
    } & {
        fieldMetaOptions: Readonly<{
            percentiles?: number[] | undefined;
            sigma?: number | undefined;
        } & {
            isEnabled: boolean;
        }>;
    }>;
}>>;
export declare const lineColorSchema: import("@kbn/config-schema").Type<Readonly<{} & {
    type: STYLE_TYPE.STATIC;
    options: Readonly<{} & {
        color: string;
    }>;
}> | Readonly<{} & {
    type: STYLE_TYPE.DYNAMIC;
    options: Readonly<{
        type?: COLOR_MAP_TYPE | undefined;
        field?: Readonly<{} & {
            name: string;
            origin: import("../../../../../../common/constants").FIELD_ORIGIN;
        }> | undefined;
        color?: string | undefined;
        invert?: boolean | undefined;
        customColorRamp?: Readonly<{} & {
            stop: number;
            color: string;
        }>[] | undefined;
        useCustomColorRamp?: boolean | undefined;
        dataMappingFunction?: DATA_MAPPING_FUNCTION | undefined;
        colorCategory?: string | undefined;
        customColorPalette?: Readonly<{} & {
            stop: string | null;
            color: string;
        }>[] | undefined;
        useCustomColorPalette?: boolean | undefined;
        otherCategoryColor?: string | undefined;
    } & {
        fieldMetaOptions: Readonly<{
            percentiles?: number[] | undefined;
            sigma?: number | undefined;
        } & {
            isEnabled: boolean;
        }>;
    }>;
}>>;
export declare const labelColorSchema: import("@kbn/config-schema").Type<Readonly<{} & {
    type: STYLE_TYPE.STATIC;
    options: Readonly<{} & {
        color: string;
    }>;
}> | Readonly<{} & {
    type: STYLE_TYPE.DYNAMIC;
    options: Readonly<{
        type?: COLOR_MAP_TYPE | undefined;
        field?: Readonly<{} & {
            name: string;
            origin: import("../../../../../../common/constants").FIELD_ORIGIN;
        }> | undefined;
        color?: string | undefined;
        invert?: boolean | undefined;
        customColorRamp?: Readonly<{} & {
            stop: number;
            color: string;
        }>[] | undefined;
        useCustomColorRamp?: boolean | undefined;
        dataMappingFunction?: DATA_MAPPING_FUNCTION | undefined;
        colorCategory?: string | undefined;
        customColorPalette?: Readonly<{} & {
            stop: string | null;
            color: string;
        }>[] | undefined;
        useCustomColorPalette?: boolean | undefined;
        otherCategoryColor?: string | undefined;
    } & {
        fieldMetaOptions: Readonly<{
            percentiles?: number[] | undefined;
            sigma?: number | undefined;
        } & {
            isEnabled: boolean;
        }>;
    }>;
}>>;
export declare const labelBorderColorSchema: import("@kbn/config-schema").Type<Readonly<{} & {
    type: STYLE_TYPE.STATIC;
    options: Readonly<{} & {
        color: string;
    }>;
}> | Readonly<{} & {
    type: STYLE_TYPE.DYNAMIC;
    options: Readonly<{
        type?: COLOR_MAP_TYPE | undefined;
        field?: Readonly<{} & {
            name: string;
            origin: import("../../../../../../common/constants").FIELD_ORIGIN;
        }> | undefined;
        color?: string | undefined;
        invert?: boolean | undefined;
        customColorRamp?: Readonly<{} & {
            stop: number;
            color: string;
        }>[] | undefined;
        useCustomColorRamp?: boolean | undefined;
        dataMappingFunction?: DATA_MAPPING_FUNCTION | undefined;
        colorCategory?: string | undefined;
        customColorPalette?: Readonly<{} & {
            stop: string | null;
            color: string;
        }>[] | undefined;
        useCustomColorPalette?: boolean | undefined;
        otherCategoryColor?: string | undefined;
    } & {
        fieldMetaOptions: Readonly<{
            percentiles?: number[] | undefined;
            sigma?: number | undefined;
        } & {
            isEnabled: boolean;
        }>;
    }>;
}>>;
