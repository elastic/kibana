import { ICON_SOURCE, STYLE_TYPE, SYMBOLIZE_AS_TYPES } from '../../../../../../common/constants';
export declare const symbolizeAsOptions: import("@kbn/config-schema").ObjectType<{
    value: import("@kbn/config-schema").Type<SYMBOLIZE_AS_TYPES | undefined>;
}>;
export declare const symbolizeAsSchema: import("@kbn/config-schema").ObjectType<{
    options: import("@kbn/config-schema").ObjectType<{
        value: import("@kbn/config-schema").Type<SYMBOLIZE_AS_TYPES | undefined>;
    }>;
}>;
export declare const iconStop: import("@kbn/config-schema").ObjectType<{
    stop: import("@kbn/config-schema").Type<string | null>;
    icon: import("@kbn/config-schema").Type<string>;
    iconSource: import("@kbn/config-schema").Type<ICON_SOURCE | undefined>;
}>;
export declare const iconDynamicOptions: import("@kbn/config-schema").ObjectType<{
    iconPaletteId: import("@kbn/config-schema").Type<string | null>;
    customIconStops: import("@kbn/config-schema").Type<Readonly<{
        iconSource?: ICON_SOURCE | undefined;
    } & {
        stop: string | null;
        icon: string;
    }>[] | undefined>;
    useCustomIconMap: import("@kbn/config-schema").Type<boolean | undefined>;
    field: import("@kbn/config-schema").Type<Readonly<{} & {
        name: string;
        origin: import("../../../../../../common/constants").FIELD_ORIGIN;
    }> | undefined>;
    fieldMetaOptions: import("@kbn/config-schema").ObjectType<{
        isEnabled: import("@kbn/config-schema").Type<boolean>;
        sigma: import("@kbn/config-schema").Type<number | undefined>;
        percentiles: import("@kbn/config-schema").Type<number[] | undefined>;
    }>;
}>;
export declare const iconStaticOptions: import("@kbn/config-schema").ObjectType<{
    value: import("@kbn/config-schema").Type<string>;
    label: import("@kbn/config-schema").Type<string | undefined>;
    svg: import("@kbn/config-schema").Type<string | undefined>;
    iconSource: import("@kbn/config-schema").Type<ICON_SOURCE | undefined>;
}>;
export declare const iconSchema: import("@kbn/config-schema").Type<Readonly<{} & {
    type: STYLE_TYPE.STATIC;
    options: Readonly<{
        label?: string | undefined;
        svg?: string | undefined;
        iconSource?: ICON_SOURCE | undefined;
    } & {
        value: string;
    }>;
}> | Readonly<{} & {
    type: STYLE_TYPE.DYNAMIC;
    options: Readonly<{
        field?: Readonly<{} & {
            name: string;
            origin: import("../../../../../../common/constants").FIELD_ORIGIN;
        }> | undefined;
        customIconStops?: Readonly<{
            iconSource?: ICON_SOURCE | undefined;
        } & {
            stop: string | null;
            icon: string;
        }>[] | undefined;
        useCustomIconMap?: boolean | undefined;
    } & {
        fieldMetaOptions: Readonly<{
            percentiles?: number[] | undefined;
            sigma?: number | undefined;
        } & {
            isEnabled: boolean;
        }>;
        iconPaletteId: string | null;
    }>;
}>>;
export declare const orientationDynamicOptions: import("@kbn/config-schema").ObjectType<{
    field: import("@kbn/config-schema").Type<Readonly<{} & {
        name: string;
        origin: import("../../../../../../common/constants").FIELD_ORIGIN;
    }> | undefined>;
    fieldMetaOptions: import("@kbn/config-schema").ObjectType<{
        isEnabled: import("@kbn/config-schema").Type<boolean>;
        sigma: import("@kbn/config-schema").Type<number | undefined>;
        percentiles: import("@kbn/config-schema").Type<number[] | undefined>;
    }>;
}>;
export declare const orientationStaticOptions: import("@kbn/config-schema").ObjectType<{
    orientation: import("@kbn/config-schema").Type<number>;
}>;
export declare const orientationSchema: import("@kbn/config-schema").Type<Readonly<{} & {
    type: STYLE_TYPE.STATIC;
    options: Readonly<{} & {
        orientation: number;
    }>;
}> | Readonly<{} & {
    type: STYLE_TYPE.DYNAMIC;
    options: Readonly<{
        field?: Readonly<{} & {
            name: string;
            origin: import("../../../../../../common/constants").FIELD_ORIGIN;
        }> | undefined;
    } & {
        fieldMetaOptions: Readonly<{
            percentiles?: number[] | undefined;
            sigma?: number | undefined;
        } & {
            isEnabled: boolean;
        }>;
    }>;
}>>;
export declare const sizeDynamicOptions: import("@kbn/config-schema").ObjectType<{
    minSize: import("@kbn/config-schema").Type<number>;
    maxSize: import("@kbn/config-schema").Type<number>;
    field: import("@kbn/config-schema").Type<Readonly<{} & {
        name: string;
        origin: import("../../../../../../common/constants").FIELD_ORIGIN;
    }> | undefined>;
    fieldMetaOptions: import("@kbn/config-schema").ObjectType<{
        isEnabled: import("@kbn/config-schema").Type<boolean>;
        sigma: import("@kbn/config-schema").Type<number | undefined>;
        percentiles: import("@kbn/config-schema").Type<number[] | undefined>;
    }>;
    invert: import("@kbn/config-schema").Type<boolean | undefined>;
}>;
export declare const sizeStaticOptions: import("@kbn/config-schema").ObjectType<{
    size: import("@kbn/config-schema").Type<number>;
}>;
export declare const sizeSchema: import("@kbn/config-schema").Type<Readonly<{} & {
    type: STYLE_TYPE.STATIC;
    options: Readonly<{} & {
        size: number;
    }>;
}> | Readonly<{} & {
    type: STYLE_TYPE.DYNAMIC;
    options: Readonly<{
        field?: Readonly<{} & {
            name: string;
            origin: import("../../../../../../common/constants").FIELD_ORIGIN;
        }> | undefined;
        invert?: boolean | undefined;
    } & {
        maxSize: number;
        minSize: number;
        fieldMetaOptions: Readonly<{
            percentiles?: number[] | undefined;
            sigma?: number | undefined;
        } & {
            isEnabled: boolean;
        }>;
    }>;
}>>;
export declare const lineWidthSchema: import("@kbn/config-schema").Type<Readonly<{} & {
    type: STYLE_TYPE.STATIC;
    options: Readonly<{} & {
        size: number;
    }>;
}> | Readonly<{} & {
    type: STYLE_TYPE.DYNAMIC;
    options: Readonly<{
        field?: Readonly<{} & {
            name: string;
            origin: import("../../../../../../common/constants").FIELD_ORIGIN;
        }> | undefined;
        invert?: boolean | undefined;
    } & {
        maxSize: number;
        minSize: number;
        fieldMetaOptions: Readonly<{
            percentiles?: number[] | undefined;
            sigma?: number | undefined;
        } & {
            isEnabled: boolean;
        }>;
    }>;
}>>;
export declare const iconSizeSchema: import("@kbn/config-schema").Type<Readonly<{} & {
    type: STYLE_TYPE.STATIC;
    options: Readonly<{} & {
        size: number;
    }>;
}> | Readonly<{} & {
    type: STYLE_TYPE.DYNAMIC;
    options: Readonly<{
        field?: Readonly<{} & {
            name: string;
            origin: import("../../../../../../common/constants").FIELD_ORIGIN;
        }> | undefined;
        invert?: boolean | undefined;
    } & {
        maxSize: number;
        minSize: number;
        fieldMetaOptions: Readonly<{
            percentiles?: number[] | undefined;
            sigma?: number | undefined;
        } & {
            isEnabled: boolean;
        }>;
    }>;
}>>;
export declare const labelSizeSchema: import("@kbn/config-schema").Type<Readonly<{} & {
    type: STYLE_TYPE.STATIC;
    options: Readonly<{} & {
        size: number;
    }>;
}> | Readonly<{} & {
    type: STYLE_TYPE.DYNAMIC;
    options: Readonly<{
        field?: Readonly<{} & {
            name: string;
            origin: import("../../../../../../common/constants").FIELD_ORIGIN;
        }> | undefined;
        invert?: boolean | undefined;
    } & {
        maxSize: number;
        minSize: number;
        fieldMetaOptions: Readonly<{
            percentiles?: number[] | undefined;
            sigma?: number | undefined;
        } & {
            isEnabled: boolean;
        }>;
    }>;
}>>;
