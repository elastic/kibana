import { LAYER_STYLE_TYPE } from '../../../../../../common/constants';
export declare const vectorStylePropertiesSchema: import("@kbn/config-schema").ObjectType<{
    symbolizeAs: import("@kbn/config-schema").Type<Readonly<{} & {
        options: Readonly<{
            value?: import("../../../../../../common").SYMBOLIZE_AS_TYPES | undefined;
        } & {}>;
    }> | undefined>;
    fillColor: import("@kbn/config-schema").Type<Readonly<{} & {
        type: import("../../../../../../common").STYLE_TYPE.STATIC;
        options: Readonly<{} & {
            color: string;
        }>;
    }> | Readonly<{} & {
        type: import("../../../../../../common").STYLE_TYPE.DYNAMIC;
        options: Readonly<{
            type?: import("../../../../../../common").COLOR_MAP_TYPE | undefined;
            field?: Readonly<{} & {
                name: string;
                origin: import("../../../../../../common").FIELD_ORIGIN;
            }> | undefined;
            color?: string | undefined;
            invert?: boolean | undefined;
            customColorRamp?: Readonly<{} & {
                stop: number;
                color: string;
            }>[] | undefined;
            useCustomColorRamp?: boolean | undefined;
            dataMappingFunction?: import("../../../../../../common/constants").DATA_MAPPING_FUNCTION | undefined;
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
    }> | undefined>;
    lineColor: import("@kbn/config-schema").Type<Readonly<{} & {
        type: import("../../../../../../common").STYLE_TYPE.STATIC;
        options: Readonly<{} & {
            color: string;
        }>;
    }> | Readonly<{} & {
        type: import("../../../../../../common").STYLE_TYPE.DYNAMIC;
        options: Readonly<{
            type?: import("../../../../../../common").COLOR_MAP_TYPE | undefined;
            field?: Readonly<{} & {
                name: string;
                origin: import("../../../../../../common").FIELD_ORIGIN;
            }> | undefined;
            color?: string | undefined;
            invert?: boolean | undefined;
            customColorRamp?: Readonly<{} & {
                stop: number;
                color: string;
            }>[] | undefined;
            useCustomColorRamp?: boolean | undefined;
            dataMappingFunction?: import("../../../../../../common/constants").DATA_MAPPING_FUNCTION | undefined;
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
    }> | undefined>;
    lineWidth: import("@kbn/config-schema").Type<Readonly<{} & {
        type: import("../../../../../../common").STYLE_TYPE.STATIC;
        options: Readonly<{} & {
            size: number;
        }>;
    }> | Readonly<{} & {
        type: import("../../../../../../common").STYLE_TYPE.DYNAMIC;
        options: Readonly<{
            field?: Readonly<{} & {
                name: string;
                origin: import("../../../../../../common").FIELD_ORIGIN;
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
    }> | undefined>;
    icon: import("@kbn/config-schema").Type<Readonly<{} & {
        type: import("../../../../../../common").STYLE_TYPE.STATIC;
        options: Readonly<{
            label?: string | undefined;
            svg?: string | undefined;
            iconSource?: import("../../../../../../common/constants").ICON_SOURCE | undefined;
        } & {
            value: string;
        }>;
    }> | Readonly<{} & {
        type: import("../../../../../../common").STYLE_TYPE.DYNAMIC;
        options: Readonly<{
            field?: Readonly<{} & {
                name: string;
                origin: import("../../../../../../common").FIELD_ORIGIN;
            }> | undefined;
            customIconStops?: Readonly<{
                iconSource?: import("../../../../../../common/constants").ICON_SOURCE | undefined;
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
    }> | undefined>;
    iconSize: import("@kbn/config-schema").Type<Readonly<{} & {
        type: import("../../../../../../common").STYLE_TYPE.STATIC;
        options: Readonly<{} & {
            size: number;
        }>;
    }> | Readonly<{} & {
        type: import("../../../../../../common").STYLE_TYPE.DYNAMIC;
        options: Readonly<{
            field?: Readonly<{} & {
                name: string;
                origin: import("../../../../../../common").FIELD_ORIGIN;
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
    }> | undefined>;
    iconOrientation: import("@kbn/config-schema").Type<Readonly<{} & {
        type: import("../../../../../../common").STYLE_TYPE.STATIC;
        options: Readonly<{} & {
            orientation: number;
        }>;
    }> | Readonly<{} & {
        type: import("../../../../../../common").STYLE_TYPE.DYNAMIC;
        options: Readonly<{
            field?: Readonly<{} & {
                name: string;
                origin: import("../../../../../../common").FIELD_ORIGIN;
            }> | undefined;
        } & {
            fieldMetaOptions: Readonly<{
                percentiles?: number[] | undefined;
                sigma?: number | undefined;
            } & {
                isEnabled: boolean;
            }>;
        }>;
    }> | undefined>;
    labelText: import("@kbn/config-schema").Type<Readonly<{} & {
        type: import("../../../../../../common").STYLE_TYPE.STATIC;
        options: Readonly<{} & {
            value: string;
        }>;
    }> | Readonly<{} & {
        type: import("../../../../../../common").STYLE_TYPE.DYNAMIC;
        options: Readonly<{
            field?: Readonly<{} & {
                name: string;
                origin: import("../../../../../../common").FIELD_ORIGIN;
            }> | undefined;
        } & {}>;
    }> | undefined>;
    labelZoomRange: import("@kbn/config-schema").Type<Readonly<{} & {
        options: Readonly<{} & {
            minZoom: number;
            maxZoom: number;
            useLayerZoomRange: boolean;
        }>;
    }> | undefined>;
    labelColor: import("@kbn/config-schema").Type<Readonly<{} & {
        type: import("../../../../../../common").STYLE_TYPE.STATIC;
        options: Readonly<{} & {
            color: string;
        }>;
    }> | Readonly<{} & {
        type: import("../../../../../../common").STYLE_TYPE.DYNAMIC;
        options: Readonly<{
            type?: import("../../../../../../common").COLOR_MAP_TYPE | undefined;
            field?: Readonly<{} & {
                name: string;
                origin: import("../../../../../../common").FIELD_ORIGIN;
            }> | undefined;
            color?: string | undefined;
            invert?: boolean | undefined;
            customColorRamp?: Readonly<{} & {
                stop: number;
                color: string;
            }>[] | undefined;
            useCustomColorRamp?: boolean | undefined;
            dataMappingFunction?: import("../../../../../../common/constants").DATA_MAPPING_FUNCTION | undefined;
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
    }> | undefined>;
    labelSize: import("@kbn/config-schema").Type<Readonly<{} & {
        type: import("../../../../../../common").STYLE_TYPE.STATIC;
        options: Readonly<{} & {
            size: number;
        }>;
    }> | Readonly<{} & {
        type: import("../../../../../../common").STYLE_TYPE.DYNAMIC;
        options: Readonly<{
            field?: Readonly<{} & {
                name: string;
                origin: import("../../../../../../common").FIELD_ORIGIN;
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
    }> | undefined>;
    labelBorderColor: import("@kbn/config-schema").Type<Readonly<{} & {
        type: import("../../../../../../common").STYLE_TYPE.STATIC;
        options: Readonly<{} & {
            color: string;
        }>;
    }> | Readonly<{} & {
        type: import("../../../../../../common").STYLE_TYPE.DYNAMIC;
        options: Readonly<{
            type?: import("../../../../../../common").COLOR_MAP_TYPE | undefined;
            field?: Readonly<{} & {
                name: string;
                origin: import("../../../../../../common").FIELD_ORIGIN;
            }> | undefined;
            color?: string | undefined;
            invert?: boolean | undefined;
            customColorRamp?: Readonly<{} & {
                stop: number;
                color: string;
            }>[] | undefined;
            useCustomColorRamp?: boolean | undefined;
            dataMappingFunction?: import("../../../../../../common/constants").DATA_MAPPING_FUNCTION | undefined;
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
    }> | undefined>;
    labelBorderSize: import("@kbn/config-schema").Type<Readonly<{} & {
        options: Readonly<{} & {
            size: import("../../../../../../common").LABEL_BORDER_SIZES;
        }>;
    }> | undefined>;
    labelPosition: import("@kbn/config-schema").Type<Readonly<{} & {
        options: Readonly<{} & {
            position: import("../../../../../../common").LABEL_POSITIONS;
        }>;
    }> | undefined>;
}>;
export declare const vectorStyleSchema: import("@kbn/config-schema").ObjectType<{
    properties: import("@kbn/config-schema").ObjectType<{
        symbolizeAs: import("@kbn/config-schema").Type<Readonly<{} & {
            options: Readonly<{
                value?: import("../../../../../../common").SYMBOLIZE_AS_TYPES | undefined;
            } & {}>;
        }> | undefined>;
        fillColor: import("@kbn/config-schema").Type<Readonly<{} & {
            type: import("../../../../../../common").STYLE_TYPE.STATIC;
            options: Readonly<{} & {
                color: string;
            }>;
        }> | Readonly<{} & {
            type: import("../../../../../../common").STYLE_TYPE.DYNAMIC;
            options: Readonly<{
                type?: import("../../../../../../common").COLOR_MAP_TYPE | undefined;
                field?: Readonly<{} & {
                    name: string;
                    origin: import("../../../../../../common").FIELD_ORIGIN;
                }> | undefined;
                color?: string | undefined;
                invert?: boolean | undefined;
                customColorRamp?: Readonly<{} & {
                    stop: number;
                    color: string;
                }>[] | undefined;
                useCustomColorRamp?: boolean | undefined;
                dataMappingFunction?: import("../../../../../../common/constants").DATA_MAPPING_FUNCTION | undefined;
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
        }> | undefined>;
        lineColor: import("@kbn/config-schema").Type<Readonly<{} & {
            type: import("../../../../../../common").STYLE_TYPE.STATIC;
            options: Readonly<{} & {
                color: string;
            }>;
        }> | Readonly<{} & {
            type: import("../../../../../../common").STYLE_TYPE.DYNAMIC;
            options: Readonly<{
                type?: import("../../../../../../common").COLOR_MAP_TYPE | undefined;
                field?: Readonly<{} & {
                    name: string;
                    origin: import("../../../../../../common").FIELD_ORIGIN;
                }> | undefined;
                color?: string | undefined;
                invert?: boolean | undefined;
                customColorRamp?: Readonly<{} & {
                    stop: number;
                    color: string;
                }>[] | undefined;
                useCustomColorRamp?: boolean | undefined;
                dataMappingFunction?: import("../../../../../../common/constants").DATA_MAPPING_FUNCTION | undefined;
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
        }> | undefined>;
        lineWidth: import("@kbn/config-schema").Type<Readonly<{} & {
            type: import("../../../../../../common").STYLE_TYPE.STATIC;
            options: Readonly<{} & {
                size: number;
            }>;
        }> | Readonly<{} & {
            type: import("../../../../../../common").STYLE_TYPE.DYNAMIC;
            options: Readonly<{
                field?: Readonly<{} & {
                    name: string;
                    origin: import("../../../../../../common").FIELD_ORIGIN;
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
        }> | undefined>;
        icon: import("@kbn/config-schema").Type<Readonly<{} & {
            type: import("../../../../../../common").STYLE_TYPE.STATIC;
            options: Readonly<{
                label?: string | undefined;
                svg?: string | undefined;
                iconSource?: import("../../../../../../common/constants").ICON_SOURCE | undefined;
            } & {
                value: string;
            }>;
        }> | Readonly<{} & {
            type: import("../../../../../../common").STYLE_TYPE.DYNAMIC;
            options: Readonly<{
                field?: Readonly<{} & {
                    name: string;
                    origin: import("../../../../../../common").FIELD_ORIGIN;
                }> | undefined;
                customIconStops?: Readonly<{
                    iconSource?: import("../../../../../../common/constants").ICON_SOURCE | undefined;
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
        }> | undefined>;
        iconSize: import("@kbn/config-schema").Type<Readonly<{} & {
            type: import("../../../../../../common").STYLE_TYPE.STATIC;
            options: Readonly<{} & {
                size: number;
            }>;
        }> | Readonly<{} & {
            type: import("../../../../../../common").STYLE_TYPE.DYNAMIC;
            options: Readonly<{
                field?: Readonly<{} & {
                    name: string;
                    origin: import("../../../../../../common").FIELD_ORIGIN;
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
        }> | undefined>;
        iconOrientation: import("@kbn/config-schema").Type<Readonly<{} & {
            type: import("../../../../../../common").STYLE_TYPE.STATIC;
            options: Readonly<{} & {
                orientation: number;
            }>;
        }> | Readonly<{} & {
            type: import("../../../../../../common").STYLE_TYPE.DYNAMIC;
            options: Readonly<{
                field?: Readonly<{} & {
                    name: string;
                    origin: import("../../../../../../common").FIELD_ORIGIN;
                }> | undefined;
            } & {
                fieldMetaOptions: Readonly<{
                    percentiles?: number[] | undefined;
                    sigma?: number | undefined;
                } & {
                    isEnabled: boolean;
                }>;
            }>;
        }> | undefined>;
        labelText: import("@kbn/config-schema").Type<Readonly<{} & {
            type: import("../../../../../../common").STYLE_TYPE.STATIC;
            options: Readonly<{} & {
                value: string;
            }>;
        }> | Readonly<{} & {
            type: import("../../../../../../common").STYLE_TYPE.DYNAMIC;
            options: Readonly<{
                field?: Readonly<{} & {
                    name: string;
                    origin: import("../../../../../../common").FIELD_ORIGIN;
                }> | undefined;
            } & {}>;
        }> | undefined>;
        labelZoomRange: import("@kbn/config-schema").Type<Readonly<{} & {
            options: Readonly<{} & {
                minZoom: number;
                maxZoom: number;
                useLayerZoomRange: boolean;
            }>;
        }> | undefined>;
        labelColor: import("@kbn/config-schema").Type<Readonly<{} & {
            type: import("../../../../../../common").STYLE_TYPE.STATIC;
            options: Readonly<{} & {
                color: string;
            }>;
        }> | Readonly<{} & {
            type: import("../../../../../../common").STYLE_TYPE.DYNAMIC;
            options: Readonly<{
                type?: import("../../../../../../common").COLOR_MAP_TYPE | undefined;
                field?: Readonly<{} & {
                    name: string;
                    origin: import("../../../../../../common").FIELD_ORIGIN;
                }> | undefined;
                color?: string | undefined;
                invert?: boolean | undefined;
                customColorRamp?: Readonly<{} & {
                    stop: number;
                    color: string;
                }>[] | undefined;
                useCustomColorRamp?: boolean | undefined;
                dataMappingFunction?: import("../../../../../../common/constants").DATA_MAPPING_FUNCTION | undefined;
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
        }> | undefined>;
        labelSize: import("@kbn/config-schema").Type<Readonly<{} & {
            type: import("../../../../../../common").STYLE_TYPE.STATIC;
            options: Readonly<{} & {
                size: number;
            }>;
        }> | Readonly<{} & {
            type: import("../../../../../../common").STYLE_TYPE.DYNAMIC;
            options: Readonly<{
                field?: Readonly<{} & {
                    name: string;
                    origin: import("../../../../../../common").FIELD_ORIGIN;
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
        }> | undefined>;
        labelBorderColor: import("@kbn/config-schema").Type<Readonly<{} & {
            type: import("../../../../../../common").STYLE_TYPE.STATIC;
            options: Readonly<{} & {
                color: string;
            }>;
        }> | Readonly<{} & {
            type: import("../../../../../../common").STYLE_TYPE.DYNAMIC;
            options: Readonly<{
                type?: import("../../../../../../common").COLOR_MAP_TYPE | undefined;
                field?: Readonly<{} & {
                    name: string;
                    origin: import("../../../../../../common").FIELD_ORIGIN;
                }> | undefined;
                color?: string | undefined;
                invert?: boolean | undefined;
                customColorRamp?: Readonly<{} & {
                    stop: number;
                    color: string;
                }>[] | undefined;
                useCustomColorRamp?: boolean | undefined;
                dataMappingFunction?: import("../../../../../../common/constants").DATA_MAPPING_FUNCTION | undefined;
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
        }> | undefined>;
        labelBorderSize: import("@kbn/config-schema").Type<Readonly<{} & {
            options: Readonly<{} & {
                size: import("../../../../../../common").LABEL_BORDER_SIZES;
            }>;
        }> | undefined>;
        labelPosition: import("@kbn/config-schema").Type<Readonly<{} & {
            options: Readonly<{} & {
                position: import("../../../../../../common").LABEL_POSITIONS;
            }>;
        }> | undefined>;
    }>;
    isTimeAware: import("@kbn/config-schema").Type<boolean | undefined>;
    type: import("@kbn/config-schema").Type<LAYER_STYLE_TYPE.VECTOR>;
}>;
