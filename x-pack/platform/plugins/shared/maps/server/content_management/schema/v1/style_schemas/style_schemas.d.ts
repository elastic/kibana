import { LAYER_STYLE_TYPE } from '../../../../../common/constants';
export declare const EMSVectorTileStyleSchema: import("@kbn/config-schema").ObjectType<{
    color: import("@kbn/config-schema").Type<string>;
    type: import("@kbn/config-schema").Type<LAYER_STYLE_TYPE.EMS_VECTOR_TILE>;
}>;
export declare const heatmapStyleSchema: import("@kbn/config-schema").ObjectType<{
    colorRampName: import("@kbn/config-schema").Type<"Blues" | "Greens" | "Greys" | "Reds" | "Yellow to Red" | "Green to Red" | "Blue to Red" | "theclassic" | undefined>;
    type: import("@kbn/config-schema").Type<LAYER_STYLE_TYPE.HEATMAP>;
}>;
export declare const styleSchema: import("@kbn/config-schema").Type<Readonly<{} & {
    type: LAYER_STYLE_TYPE.EMS_VECTOR_TILE;
    color: string;
}> | Readonly<{
    colorRampName?: "Blues" | "Greens" | "Greys" | "Reds" | "Yellow to Red" | "Green to Red" | "Blue to Red" | "theclassic" | undefined;
} & {
    type: LAYER_STYLE_TYPE.HEATMAP;
}> | Readonly<{
    isTimeAware?: boolean | undefined;
} & {
    type: LAYER_STYLE_TYPE.VECTOR;
    properties: Readonly<{
        symbolizeAs?: Readonly<{} & {
            options: Readonly<{
                value?: import("../../../../../common/constants").SYMBOLIZE_AS_TYPES | undefined;
            } & {}>;
        }> | undefined;
        fillColor?: Readonly<{} & {
            type: import("../../../../../common/constants").STYLE_TYPE.STATIC;
            options: Readonly<{} & {
                color: string;
            }>;
        }> | Readonly<{} & {
            type: import("../../../../../common/constants").STYLE_TYPE.DYNAMIC;
            options: Readonly<{
                type?: import("../../../../../common/constants").COLOR_MAP_TYPE | undefined;
                field?: Readonly<{} & {
                    name: string;
                    origin: import("../../../../../common/constants").FIELD_ORIGIN;
                }> | undefined;
                color?: string | undefined;
                invert?: boolean | undefined;
                customColorRamp?: Readonly<{} & {
                    stop: number;
                    color: string;
                }>[] | undefined;
                useCustomColorRamp?: boolean | undefined;
                dataMappingFunction?: import("../../../../../common/constants").DATA_MAPPING_FUNCTION | undefined;
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
        }> | undefined;
        lineColor?: Readonly<{} & {
            type: import("../../../../../common/constants").STYLE_TYPE.STATIC;
            options: Readonly<{} & {
                color: string;
            }>;
        }> | Readonly<{} & {
            type: import("../../../../../common/constants").STYLE_TYPE.DYNAMIC;
            options: Readonly<{
                type?: import("../../../../../common/constants").COLOR_MAP_TYPE | undefined;
                field?: Readonly<{} & {
                    name: string;
                    origin: import("../../../../../common/constants").FIELD_ORIGIN;
                }> | undefined;
                color?: string | undefined;
                invert?: boolean | undefined;
                customColorRamp?: Readonly<{} & {
                    stop: number;
                    color: string;
                }>[] | undefined;
                useCustomColorRamp?: boolean | undefined;
                dataMappingFunction?: import("../../../../../common/constants").DATA_MAPPING_FUNCTION | undefined;
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
        }> | undefined;
        lineWidth?: Readonly<{} & {
            type: import("../../../../../common/constants").STYLE_TYPE.STATIC;
            options: Readonly<{} & {
                size: number;
            }>;
        }> | Readonly<{} & {
            type: import("../../../../../common/constants").STYLE_TYPE.DYNAMIC;
            options: Readonly<{
                field?: Readonly<{} & {
                    name: string;
                    origin: import("../../../../../common/constants").FIELD_ORIGIN;
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
        }> | undefined;
        icon?: Readonly<{} & {
            type: import("../../../../../common/constants").STYLE_TYPE.STATIC;
            options: Readonly<{
                label?: string | undefined;
                svg?: string | undefined;
                iconSource?: import("../../../../../common/constants").ICON_SOURCE | undefined;
            } & {
                value: string;
            }>;
        }> | Readonly<{} & {
            type: import("../../../../../common/constants").STYLE_TYPE.DYNAMIC;
            options: Readonly<{
                field?: Readonly<{} & {
                    name: string;
                    origin: import("../../../../../common/constants").FIELD_ORIGIN;
                }> | undefined;
                customIconStops?: Readonly<{
                    iconSource?: import("../../../../../common/constants").ICON_SOURCE | undefined;
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
        }> | undefined;
        iconSize?: Readonly<{} & {
            type: import("../../../../../common/constants").STYLE_TYPE.STATIC;
            options: Readonly<{} & {
                size: number;
            }>;
        }> | Readonly<{} & {
            type: import("../../../../../common/constants").STYLE_TYPE.DYNAMIC;
            options: Readonly<{
                field?: Readonly<{} & {
                    name: string;
                    origin: import("../../../../../common/constants").FIELD_ORIGIN;
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
        }> | undefined;
        iconOrientation?: Readonly<{} & {
            type: import("../../../../../common/constants").STYLE_TYPE.STATIC;
            options: Readonly<{} & {
                orientation: number;
            }>;
        }> | Readonly<{} & {
            type: import("../../../../../common/constants").STYLE_TYPE.DYNAMIC;
            options: Readonly<{
                field?: Readonly<{} & {
                    name: string;
                    origin: import("../../../../../common/constants").FIELD_ORIGIN;
                }> | undefined;
            } & {
                fieldMetaOptions: Readonly<{
                    percentiles?: number[] | undefined;
                    sigma?: number | undefined;
                } & {
                    isEnabled: boolean;
                }>;
            }>;
        }> | undefined;
        labelText?: Readonly<{} & {
            type: import("../../../../../common/constants").STYLE_TYPE.STATIC;
            options: Readonly<{} & {
                value: string;
            }>;
        }> | Readonly<{} & {
            type: import("../../../../../common/constants").STYLE_TYPE.DYNAMIC;
            options: Readonly<{
                field?: Readonly<{} & {
                    name: string;
                    origin: import("../../../../../common/constants").FIELD_ORIGIN;
                }> | undefined;
            } & {}>;
        }> | undefined;
        labelZoomRange?: Readonly<{} & {
            options: Readonly<{} & {
                minZoom: number;
                maxZoom: number;
                useLayerZoomRange: boolean;
            }>;
        }> | undefined;
        labelColor?: Readonly<{} & {
            type: import("../../../../../common/constants").STYLE_TYPE.STATIC;
            options: Readonly<{} & {
                color: string;
            }>;
        }> | Readonly<{} & {
            type: import("../../../../../common/constants").STYLE_TYPE.DYNAMIC;
            options: Readonly<{
                type?: import("../../../../../common/constants").COLOR_MAP_TYPE | undefined;
                field?: Readonly<{} & {
                    name: string;
                    origin: import("../../../../../common/constants").FIELD_ORIGIN;
                }> | undefined;
                color?: string | undefined;
                invert?: boolean | undefined;
                customColorRamp?: Readonly<{} & {
                    stop: number;
                    color: string;
                }>[] | undefined;
                useCustomColorRamp?: boolean | undefined;
                dataMappingFunction?: import("../../../../../common/constants").DATA_MAPPING_FUNCTION | undefined;
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
        }> | undefined;
        labelSize?: Readonly<{} & {
            type: import("../../../../../common/constants").STYLE_TYPE.STATIC;
            options: Readonly<{} & {
                size: number;
            }>;
        }> | Readonly<{} & {
            type: import("../../../../../common/constants").STYLE_TYPE.DYNAMIC;
            options: Readonly<{
                field?: Readonly<{} & {
                    name: string;
                    origin: import("../../../../../common/constants").FIELD_ORIGIN;
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
        }> | undefined;
        labelBorderColor?: Readonly<{} & {
            type: import("../../../../../common/constants").STYLE_TYPE.STATIC;
            options: Readonly<{} & {
                color: string;
            }>;
        }> | Readonly<{} & {
            type: import("../../../../../common/constants").STYLE_TYPE.DYNAMIC;
            options: Readonly<{
                type?: import("../../../../../common/constants").COLOR_MAP_TYPE | undefined;
                field?: Readonly<{} & {
                    name: string;
                    origin: import("../../../../../common/constants").FIELD_ORIGIN;
                }> | undefined;
                color?: string | undefined;
                invert?: boolean | undefined;
                customColorRamp?: Readonly<{} & {
                    stop: number;
                    color: string;
                }>[] | undefined;
                useCustomColorRamp?: boolean | undefined;
                dataMappingFunction?: import("../../../../../common/constants").DATA_MAPPING_FUNCTION | undefined;
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
        }> | undefined;
        labelBorderSize?: Readonly<{} & {
            options: Readonly<{} & {
                size: import("../../../../../common/constants").LABEL_BORDER_SIZES;
            }>;
        }> | undefined;
        labelPosition?: Readonly<{} & {
            options: Readonly<{} & {
                position: import("../../../../../common/constants").LABEL_POSITIONS;
            }>;
        }> | undefined;
    } & {}>;
}> | Readonly<{} & {
    type: string;
}>>;
