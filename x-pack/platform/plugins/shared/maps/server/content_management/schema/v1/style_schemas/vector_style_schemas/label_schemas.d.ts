import { LABEL_BORDER_SIZES, LABEL_POSITIONS, STYLE_TYPE } from '../../../../../../common/constants';
export declare const labelBorderSizeOptions: import("@kbn/config-schema").ObjectType<{
    size: import("@kbn/config-schema").Type<LABEL_BORDER_SIZES>;
}>;
export declare const labelBorderSizeSchema: import("@kbn/config-schema").ObjectType<{
    options: import("@kbn/config-schema").ObjectType<{
        size: import("@kbn/config-schema").Type<LABEL_BORDER_SIZES>;
    }>;
}>;
export declare const labelPositionSchema: import("@kbn/config-schema").ObjectType<{
    options: import("@kbn/config-schema").ObjectType<{
        position: import("@kbn/config-schema").Type<LABEL_POSITIONS>;
    }>;
}>;
export declare const labelZoomRangeSchema: import("@kbn/config-schema").ObjectType<{
    options: import("@kbn/config-schema").ObjectType<{
        useLayerZoomRange: import("@kbn/config-schema").Type<boolean>;
        minZoom: import("@kbn/config-schema").Type<number>;
        maxZoom: import("@kbn/config-schema").Type<number>;
    }>;
}>;
export declare const labelDynamicOptions: import("@kbn/config-schema").ObjectType<{
    field: import("@kbn/config-schema").Type<Readonly<{} & {
        name: string;
        origin: import("../../../../../../common/constants").FIELD_ORIGIN;
    }> | undefined>;
}>;
export declare const labelStaticOptions: import("@kbn/config-schema").ObjectType<{
    value: import("@kbn/config-schema").Type<string>;
}>;
export declare const labelSchema: import("@kbn/config-schema").Type<Readonly<{} & {
    type: STYLE_TYPE.STATIC;
    options: Readonly<{} & {
        value: string;
    }>;
}> | Readonly<{} & {
    type: STYLE_TYPE.DYNAMIC;
    options: Readonly<{
        field?: Readonly<{} & {
            name: string;
            origin: import("../../../../../../common/constants").FIELD_ORIGIN;
        }> | undefined;
    } & {}>;
}>>;
