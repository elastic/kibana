import { LAYER_TYPE } from '../../../../../common';
export declare const attributionSchema: import("@kbn/config-schema").ObjectType<{
    label: import("@kbn/config-schema").Type<string>;
    url: import("@kbn/config-schema").Type<string>;
}>;
export declare const EMSVectorTileLayerSchema: import("@kbn/config-schema").ObjectType<Omit<{
    alpha: import("@kbn/config-schema").Type<number | undefined>;
    attribution: import("@kbn/config-schema").Type<Readonly<{} & {
        url: string;
        label: string;
    }> | undefined>;
    id: import("@kbn/config-schema").Type<string>;
    includeInFitToBounds: import("@kbn/config-schema").Type<boolean | undefined>;
    label: import("@kbn/config-schema").Type<string | undefined>;
    maxZoom: import("@kbn/config-schema").Type<number | undefined>;
    minZoom: import("@kbn/config-schema").Type<number | undefined>;
    parent: import("@kbn/config-schema").Type<string | undefined>;
    query: import("@kbn/config-schema").Type<Readonly<{} & {
        query: string | Record<string, any>;
        language: string;
    }> | undefined>;
    visible: import("@kbn/config-schema").Type<boolean | undefined>;
}, "locale" | "type" | "style" | "areLabelsOnTop" | "sourceDescriptor"> & {
    locale: import("@kbn/config-schema").Type<string | undefined>;
    type: import("@kbn/config-schema").Type<LAYER_TYPE.EMS_VECTOR_TILE>;
    style: import("@kbn/config-schema").Type<Readonly<{} & {
        type: import("../../../../../common").LAYER_STYLE_TYPE.EMS_VECTOR_TILE;
        color: string;
    }> | undefined>;
    areLabelsOnTop: import("@kbn/config-schema").Type<boolean | undefined>;
    sourceDescriptor: import("@kbn/config-schema").ObjectType<{
        id: import("@kbn/config-schema").Type<string | undefined>;
        type: import("@kbn/config-schema").Type<import("../../../../../common").SOURCE_TYPES.EMS_TMS>;
        isAutoSelect: import("@kbn/config-schema").Type<boolean | undefined>;
        lightModeDefault: import("@kbn/config-schema").Type<string | undefined>;
    }>;
}>;
export declare const heatmapLayerSchema: import("@kbn/config-schema").ObjectType<Omit<{
    alpha: import("@kbn/config-schema").Type<number | undefined>;
    attribution: import("@kbn/config-schema").Type<Readonly<{} & {
        url: string;
        label: string;
    }> | undefined>;
    id: import("@kbn/config-schema").Type<string>;
    includeInFitToBounds: import("@kbn/config-schema").Type<boolean | undefined>;
    label: import("@kbn/config-schema").Type<string | undefined>;
    maxZoom: import("@kbn/config-schema").Type<number | undefined>;
    minZoom: import("@kbn/config-schema").Type<number | undefined>;
    parent: import("@kbn/config-schema").Type<string | undefined>;
    query: import("@kbn/config-schema").Type<Readonly<{} & {
        query: string | Record<string, any>;
        language: string;
    }> | undefined>;
    visible: import("@kbn/config-schema").Type<boolean | undefined>;
}, "type" | "style" | "sourceDescriptor"> & {
    type: import("@kbn/config-schema").Type<LAYER_TYPE.HEATMAP>;
    style: import("@kbn/config-schema").Type<Readonly<{
        colorRampName?: "Blues" | "Greens" | "Greys" | "Reds" | "Yellow to Red" | "Green to Red" | "Blue to Red" | "theclassic" | undefined;
    } & {
        type: import("../../../../../common").LAYER_STYLE_TYPE.HEATMAP;
    }> | undefined>;
    sourceDescriptor: import("@kbn/config-schema").ObjectType<Omit<Omit<{
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
        }>)[] | undefined>;
    }, "type" | "resolution" | "geoField" | "requestType"> & {
        type: import("@kbn/config-schema").Type<import("../../../../../common").SOURCE_TYPES.ES_GEO_GRID>;
        resolution: import("@kbn/config-schema").Type<import("../../../../../common/constants").GRID_RESOLUTION>;
        geoField: import("@kbn/config-schema").Type<string>;
        requestType: import("@kbn/config-schema").Type<import("../../../../../common/constants").RENDER_AS>;
    }>;
}>;
export declare const layerGroupSchema: import("@kbn/config-schema").ObjectType<Omit<{
    alpha: import("@kbn/config-schema").Type<number | undefined>;
    attribution: import("@kbn/config-schema").Type<Readonly<{} & {
        url: string;
        label: string;
    }> | undefined>;
    id: import("@kbn/config-schema").Type<string>;
    includeInFitToBounds: import("@kbn/config-schema").Type<boolean | undefined>;
    label: import("@kbn/config-schema").Type<string | undefined>;
    maxZoom: import("@kbn/config-schema").Type<number | undefined>;
    minZoom: import("@kbn/config-schema").Type<number | undefined>;
    parent: import("@kbn/config-schema").Type<string | undefined>;
    query: import("@kbn/config-schema").Type<Readonly<{} & {
        query: string | Record<string, any>;
        language: string;
    }> | undefined>;
    visible: import("@kbn/config-schema").Type<boolean | undefined>;
}, "type" | "label" | "visible"> & {
    type: import("@kbn/config-schema").Type<LAYER_TYPE.LAYER_GROUP>;
    label: import("@kbn/config-schema").Type<string>;
    visible: import("@kbn/config-schema").Type<boolean>;
}>;
export declare const rasterLayerSchema: import("@kbn/config-schema").ObjectType<Omit<{
    alpha: import("@kbn/config-schema").Type<number | undefined>;
    attribution: import("@kbn/config-schema").Type<Readonly<{} & {
        url: string;
        label: string;
    }> | undefined>;
    id: import("@kbn/config-schema").Type<string>;
    includeInFitToBounds: import("@kbn/config-schema").Type<boolean | undefined>;
    label: import("@kbn/config-schema").Type<string | undefined>;
    maxZoom: import("@kbn/config-schema").Type<number | undefined>;
    minZoom: import("@kbn/config-schema").Type<number | undefined>;
    parent: import("@kbn/config-schema").Type<string | undefined>;
    query: import("@kbn/config-schema").Type<Readonly<{} & {
        query: string | Record<string, any>;
        language: string;
    }> | undefined>;
    visible: import("@kbn/config-schema").Type<boolean | undefined>;
}, "type" | "sourceDescriptor"> & {
    type: import("@kbn/config-schema").Type<LAYER_TYPE.RASTER_TILE>;
    sourceDescriptor: import("@kbn/config-schema").Type<Readonly<{} & {
        type: string;
    }> | Readonly<{} & {
        type: import("../../../../../common").SOURCE_TYPES.KIBANA_TILEMAP;
    }> | Readonly<{} & {
        type: import("../../../../../common").SOURCE_TYPES.WMS;
        layers: string;
        styles: string;
        serviceUrl: string;
    }> | Readonly<{} & {
        type: import("../../../../../common").SOURCE_TYPES.EMS_XYZ;
        urlTemplate: string;
    }>>;
}>;
export declare const vectorLayerSchema: import("@kbn/config-schema").ObjectType<Omit<{
    alpha: import("@kbn/config-schema").Type<number | undefined>;
    attribution: import("@kbn/config-schema").Type<Readonly<{} & {
        url: string;
        label: string;
    }> | undefined>;
    id: import("@kbn/config-schema").Type<string>;
    includeInFitToBounds: import("@kbn/config-schema").Type<boolean | undefined>;
    label: import("@kbn/config-schema").Type<string | undefined>;
    maxZoom: import("@kbn/config-schema").Type<number | undefined>;
    minZoom: import("@kbn/config-schema").Type<number | undefined>;
    parent: import("@kbn/config-schema").Type<string | undefined>;
    query: import("@kbn/config-schema").Type<Readonly<{} & {
        query: string | Record<string, any>;
        language: string;
    }> | undefined>;
    visible: import("@kbn/config-schema").Type<boolean | undefined>;
}, "type" | "style" | "sourceDescriptor" | "disableTooltips" | "joins"> & {
    type: import("@kbn/config-schema").Type<LAYER_TYPE.GEOJSON_VECTOR | LAYER_TYPE.BLENDED_VECTOR | LAYER_TYPE.MVT_VECTOR>;
    style: import("@kbn/config-schema").Type<Readonly<{
        isTimeAware?: boolean | undefined;
    } & {
        type: import("../../../../../common").LAYER_STYLE_TYPE.VECTOR;
        properties: Readonly<{
            symbolizeAs?: Readonly<{} & {
                options: Readonly<{
                    value?: import("../../../../../common").SYMBOLIZE_AS_TYPES | undefined;
                } & {}>;
            }> | undefined;
            fillColor?: Readonly<{} & {
                type: import("../../../../../common").STYLE_TYPE.STATIC;
                options: Readonly<{} & {
                    color: string;
                }>;
            }> | Readonly<{} & {
                type: import("../../../../../common").STYLE_TYPE.DYNAMIC;
                options: Readonly<{
                    type?: import("../../../../../common").COLOR_MAP_TYPE | undefined;
                    field?: Readonly<{} & {
                        name: string;
                        origin: import("../../../../../common").FIELD_ORIGIN;
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
                type: import("../../../../../common").STYLE_TYPE.STATIC;
                options: Readonly<{} & {
                    color: string;
                }>;
            }> | Readonly<{} & {
                type: import("../../../../../common").STYLE_TYPE.DYNAMIC;
                options: Readonly<{
                    type?: import("../../../../../common").COLOR_MAP_TYPE | undefined;
                    field?: Readonly<{} & {
                        name: string;
                        origin: import("../../../../../common").FIELD_ORIGIN;
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
                type: import("../../../../../common").STYLE_TYPE.STATIC;
                options: Readonly<{} & {
                    size: number;
                }>;
            }> | Readonly<{} & {
                type: import("../../../../../common").STYLE_TYPE.DYNAMIC;
                options: Readonly<{
                    field?: Readonly<{} & {
                        name: string;
                        origin: import("../../../../../common").FIELD_ORIGIN;
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
                type: import("../../../../../common").STYLE_TYPE.STATIC;
                options: Readonly<{
                    label?: string | undefined;
                    svg?: string | undefined;
                    iconSource?: import("../../../../../common/constants").ICON_SOURCE | undefined;
                } & {
                    value: string;
                }>;
            }> | Readonly<{} & {
                type: import("../../../../../common").STYLE_TYPE.DYNAMIC;
                options: Readonly<{
                    field?: Readonly<{} & {
                        name: string;
                        origin: import("../../../../../common").FIELD_ORIGIN;
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
                type: import("../../../../../common").STYLE_TYPE.STATIC;
                options: Readonly<{} & {
                    size: number;
                }>;
            }> | Readonly<{} & {
                type: import("../../../../../common").STYLE_TYPE.DYNAMIC;
                options: Readonly<{
                    field?: Readonly<{} & {
                        name: string;
                        origin: import("../../../../../common").FIELD_ORIGIN;
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
                type: import("../../../../../common").STYLE_TYPE.STATIC;
                options: Readonly<{} & {
                    orientation: number;
                }>;
            }> | Readonly<{} & {
                type: import("../../../../../common").STYLE_TYPE.DYNAMIC;
                options: Readonly<{
                    field?: Readonly<{} & {
                        name: string;
                        origin: import("../../../../../common").FIELD_ORIGIN;
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
                type: import("../../../../../common").STYLE_TYPE.STATIC;
                options: Readonly<{} & {
                    value: string;
                }>;
            }> | Readonly<{} & {
                type: import("../../../../../common").STYLE_TYPE.DYNAMIC;
                options: Readonly<{
                    field?: Readonly<{} & {
                        name: string;
                        origin: import("../../../../../common").FIELD_ORIGIN;
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
                type: import("../../../../../common").STYLE_TYPE.STATIC;
                options: Readonly<{} & {
                    color: string;
                }>;
            }> | Readonly<{} & {
                type: import("../../../../../common").STYLE_TYPE.DYNAMIC;
                options: Readonly<{
                    type?: import("../../../../../common").COLOR_MAP_TYPE | undefined;
                    field?: Readonly<{} & {
                        name: string;
                        origin: import("../../../../../common").FIELD_ORIGIN;
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
                type: import("../../../../../common").STYLE_TYPE.STATIC;
                options: Readonly<{} & {
                    size: number;
                }>;
            }> | Readonly<{} & {
                type: import("../../../../../common").STYLE_TYPE.DYNAMIC;
                options: Readonly<{
                    field?: Readonly<{} & {
                        name: string;
                        origin: import("../../../../../common").FIELD_ORIGIN;
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
                type: import("../../../../../common").STYLE_TYPE.STATIC;
                options: Readonly<{} & {
                    color: string;
                }>;
            }> | Readonly<{} & {
                type: import("../../../../../common").STYLE_TYPE.DYNAMIC;
                options: Readonly<{
                    type?: import("../../../../../common").COLOR_MAP_TYPE | undefined;
                    field?: Readonly<{} & {
                        name: string;
                        origin: import("../../../../../common").FIELD_ORIGIN;
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
                    size: import("../../../../../common").LABEL_BORDER_SIZES;
                }>;
            }> | undefined;
            labelPosition?: Readonly<{} & {
                options: Readonly<{} & {
                    position: import("../../../../../common").LABEL_POSITIONS;
                }>;
            }> | undefined;
        } & {}>;
    }> | undefined>;
    sourceDescriptor: import("@kbn/config-schema").Type<Readonly<{
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
        type: import("../../../../../common").SOURCE_TYPES.ES_GEO_GRID;
        resolution: import("../../../../../common/constants").GRID_RESOLUTION;
        indexPatternId: string;
        geoField: string;
        requestType: import("../../../../../common/constants").RENDER_AS;
    }> | Readonly<{} & {
        type: string;
    }> | Readonly<{
        tooltipProperties?: string[] | undefined;
    } & {
        id: string;
        type: import("../../../../../common").SOURCE_TYPES.EMS_FILE;
    }> | Readonly<{
        fields?: Readonly<{} & {
            name: string;
            type: import("../../../../../common/constants").MVT_FIELD_TYPE;
        }>[] | undefined;
        tooltipProperties?: string[] | undefined;
        maxSourceZoom?: number | undefined;
    } & {
        type: import("../../../../../common").SOURCE_TYPES.MVT_SINGLE_LAYER;
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
        type: import("../../../../../common").SOURCE_TYPES.ES_GEO_LINE;
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
        type: import("../../../../../common").SOURCE_TYPES.ES_PEW_PEW;
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
        type: import("../../../../../common").SOURCE_TYPES.ES_SEARCH;
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
        type: import("../../../../../common").SOURCE_TYPES.ESQL;
        esql: string;
    }>>;
    disableTooltips: import("@kbn/config-schema").Type<boolean | undefined>;
    joins: import("@kbn/config-schema").Type<Readonly<{
        leftField?: string | undefined;
    } & {
        right: Readonly<{} & {
            id: string;
            type: string;
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
            whereQuery?: Readonly<{} & {
                query: string | Record<string, any>;
                language: string;
            }> | undefined;
        } & {
            id: string;
            type: import("../../../../../common").SOURCE_TYPES.ES_DISTANCE_SOURCE;
            distance: number;
            indexPatternId: string;
            geoField: string;
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
            whereQuery?: Readonly<{} & {
                query: string | Record<string, any>;
                language: string;
            }> | undefined;
        } & {
            id: string;
            type: import("../../../../../common").SOURCE_TYPES.ES_TERM_SOURCE;
            term: string;
            indexPatternId: string;
        }>;
    }>[] | undefined>;
}>;
export declare const layersSchema: import("@kbn/config-schema").Type<Readonly<{
    locale?: string | undefined;
    query?: Readonly<{} & {
        query: string | Record<string, any>;
        language: string;
    }> | undefined;
    label?: string | undefined;
    style?: Readonly<{} & {
        type: import("../../../../../common").LAYER_STYLE_TYPE.EMS_VECTOR_TILE;
        color: string;
    }> | undefined;
    visible?: boolean | undefined;
    alpha?: number | undefined;
    parent?: string | undefined;
    attribution?: Readonly<{} & {
        url: string;
        label: string;
    }> | undefined;
    minZoom?: number | undefined;
    maxZoom?: number | undefined;
    includeInFitToBounds?: boolean | undefined;
    areLabelsOnTop?: boolean | undefined;
} & {
    id: string;
    type: LAYER_TYPE.EMS_VECTOR_TILE;
    sourceDescriptor: Readonly<{
        id?: string | undefined;
        isAutoSelect?: boolean | undefined;
        lightModeDefault?: string | undefined;
    } & {
        type: import("../../../../../common").SOURCE_TYPES.EMS_TMS;
    }>;
}> | Readonly<{
    query?: Readonly<{} & {
        query: string | Record<string, any>;
        language: string;
    }> | undefined;
    label?: string | undefined;
    style?: Readonly<{
        colorRampName?: "Blues" | "Greens" | "Greys" | "Reds" | "Yellow to Red" | "Green to Red" | "Blue to Red" | "theclassic" | undefined;
    } & {
        type: import("../../../../../common").LAYER_STYLE_TYPE.HEATMAP;
    }> | undefined;
    visible?: boolean | undefined;
    alpha?: number | undefined;
    parent?: string | undefined;
    attribution?: Readonly<{} & {
        url: string;
        label: string;
    }> | undefined;
    minZoom?: number | undefined;
    maxZoom?: number | undefined;
    includeInFitToBounds?: boolean | undefined;
} & {
    id: string;
    type: LAYER_TYPE.HEATMAP;
    sourceDescriptor: Readonly<{
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
        type: import("../../../../../common").SOURCE_TYPES.ES_GEO_GRID;
        resolution: import("../../../../../common/constants").GRID_RESOLUTION;
        indexPatternId: string;
        geoField: string;
        requestType: import("../../../../../common/constants").RENDER_AS;
    }>;
}> | Readonly<{
    query?: Readonly<{} & {
        query: string | Record<string, any>;
        language: string;
    }> | undefined;
    alpha?: number | undefined;
    parent?: string | undefined;
    attribution?: Readonly<{} & {
        url: string;
        label: string;
    }> | undefined;
    minZoom?: number | undefined;
    maxZoom?: number | undefined;
    includeInFitToBounds?: boolean | undefined;
} & {
    id: string;
    type: LAYER_TYPE.LAYER_GROUP;
    label: string;
    visible: boolean;
}> | Readonly<{
    query?: Readonly<{} & {
        query: string | Record<string, any>;
        language: string;
    }> | undefined;
    label?: string | undefined;
    visible?: boolean | undefined;
    alpha?: number | undefined;
    parent?: string | undefined;
    attribution?: Readonly<{} & {
        url: string;
        label: string;
    }> | undefined;
    minZoom?: number | undefined;
    maxZoom?: number | undefined;
    includeInFitToBounds?: boolean | undefined;
} & {
    id: string;
    type: LAYER_TYPE.RASTER_TILE;
    sourceDescriptor: Readonly<{} & {
        type: string;
    }> | Readonly<{} & {
        type: import("../../../../../common").SOURCE_TYPES.KIBANA_TILEMAP;
    }> | Readonly<{} & {
        type: import("../../../../../common").SOURCE_TYPES.WMS;
        layers: string;
        styles: string;
        serviceUrl: string;
    }> | Readonly<{} & {
        type: import("../../../../../common").SOURCE_TYPES.EMS_XYZ;
        urlTemplate: string;
    }>;
}> | Readonly<{
    query?: Readonly<{} & {
        query: string | Record<string, any>;
        language: string;
    }> | undefined;
    label?: string | undefined;
    style?: Readonly<{
        isTimeAware?: boolean | undefined;
    } & {
        type: import("../../../../../common").LAYER_STYLE_TYPE.VECTOR;
        properties: Readonly<{
            symbolizeAs?: Readonly<{} & {
                options: Readonly<{
                    value?: import("../../../../../common").SYMBOLIZE_AS_TYPES | undefined;
                } & {}>;
            }> | undefined;
            fillColor?: Readonly<{} & {
                type: import("../../../../../common").STYLE_TYPE.STATIC;
                options: Readonly<{} & {
                    color: string;
                }>;
            }> | Readonly<{} & {
                type: import("../../../../../common").STYLE_TYPE.DYNAMIC;
                options: Readonly<{
                    type?: import("../../../../../common").COLOR_MAP_TYPE | undefined;
                    field?: Readonly<{} & {
                        name: string;
                        origin: import("../../../../../common").FIELD_ORIGIN;
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
                type: import("../../../../../common").STYLE_TYPE.STATIC;
                options: Readonly<{} & {
                    color: string;
                }>;
            }> | Readonly<{} & {
                type: import("../../../../../common").STYLE_TYPE.DYNAMIC;
                options: Readonly<{
                    type?: import("../../../../../common").COLOR_MAP_TYPE | undefined;
                    field?: Readonly<{} & {
                        name: string;
                        origin: import("../../../../../common").FIELD_ORIGIN;
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
                type: import("../../../../../common").STYLE_TYPE.STATIC;
                options: Readonly<{} & {
                    size: number;
                }>;
            }> | Readonly<{} & {
                type: import("../../../../../common").STYLE_TYPE.DYNAMIC;
                options: Readonly<{
                    field?: Readonly<{} & {
                        name: string;
                        origin: import("../../../../../common").FIELD_ORIGIN;
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
                type: import("../../../../../common").STYLE_TYPE.STATIC;
                options: Readonly<{
                    label?: string | undefined;
                    svg?: string | undefined;
                    iconSource?: import("../../../../../common/constants").ICON_SOURCE | undefined;
                } & {
                    value: string;
                }>;
            }> | Readonly<{} & {
                type: import("../../../../../common").STYLE_TYPE.DYNAMIC;
                options: Readonly<{
                    field?: Readonly<{} & {
                        name: string;
                        origin: import("../../../../../common").FIELD_ORIGIN;
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
                type: import("../../../../../common").STYLE_TYPE.STATIC;
                options: Readonly<{} & {
                    size: number;
                }>;
            }> | Readonly<{} & {
                type: import("../../../../../common").STYLE_TYPE.DYNAMIC;
                options: Readonly<{
                    field?: Readonly<{} & {
                        name: string;
                        origin: import("../../../../../common").FIELD_ORIGIN;
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
                type: import("../../../../../common").STYLE_TYPE.STATIC;
                options: Readonly<{} & {
                    orientation: number;
                }>;
            }> | Readonly<{} & {
                type: import("../../../../../common").STYLE_TYPE.DYNAMIC;
                options: Readonly<{
                    field?: Readonly<{} & {
                        name: string;
                        origin: import("../../../../../common").FIELD_ORIGIN;
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
                type: import("../../../../../common").STYLE_TYPE.STATIC;
                options: Readonly<{} & {
                    value: string;
                }>;
            }> | Readonly<{} & {
                type: import("../../../../../common").STYLE_TYPE.DYNAMIC;
                options: Readonly<{
                    field?: Readonly<{} & {
                        name: string;
                        origin: import("../../../../../common").FIELD_ORIGIN;
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
                type: import("../../../../../common").STYLE_TYPE.STATIC;
                options: Readonly<{} & {
                    color: string;
                }>;
            }> | Readonly<{} & {
                type: import("../../../../../common").STYLE_TYPE.DYNAMIC;
                options: Readonly<{
                    type?: import("../../../../../common").COLOR_MAP_TYPE | undefined;
                    field?: Readonly<{} & {
                        name: string;
                        origin: import("../../../../../common").FIELD_ORIGIN;
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
                type: import("../../../../../common").STYLE_TYPE.STATIC;
                options: Readonly<{} & {
                    size: number;
                }>;
            }> | Readonly<{} & {
                type: import("../../../../../common").STYLE_TYPE.DYNAMIC;
                options: Readonly<{
                    field?: Readonly<{} & {
                        name: string;
                        origin: import("../../../../../common").FIELD_ORIGIN;
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
                type: import("../../../../../common").STYLE_TYPE.STATIC;
                options: Readonly<{} & {
                    color: string;
                }>;
            }> | Readonly<{} & {
                type: import("../../../../../common").STYLE_TYPE.DYNAMIC;
                options: Readonly<{
                    type?: import("../../../../../common").COLOR_MAP_TYPE | undefined;
                    field?: Readonly<{} & {
                        name: string;
                        origin: import("../../../../../common").FIELD_ORIGIN;
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
                    size: import("../../../../../common").LABEL_BORDER_SIZES;
                }>;
            }> | undefined;
            labelPosition?: Readonly<{} & {
                options: Readonly<{} & {
                    position: import("../../../../../common").LABEL_POSITIONS;
                }>;
            }> | undefined;
        } & {}>;
    }> | undefined;
    visible?: boolean | undefined;
    alpha?: number | undefined;
    parent?: string | undefined;
    attribution?: Readonly<{} & {
        url: string;
        label: string;
    }> | undefined;
    minZoom?: number | undefined;
    maxZoom?: number | undefined;
    includeInFitToBounds?: boolean | undefined;
    disableTooltips?: boolean | undefined;
    joins?: Readonly<{
        leftField?: string | undefined;
    } & {
        right: Readonly<{} & {
            id: string;
            type: string;
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
            whereQuery?: Readonly<{} & {
                query: string | Record<string, any>;
                language: string;
            }> | undefined;
        } & {
            id: string;
            type: import("../../../../../common").SOURCE_TYPES.ES_DISTANCE_SOURCE;
            distance: number;
            indexPatternId: string;
            geoField: string;
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
            whereQuery?: Readonly<{} & {
                query: string | Record<string, any>;
                language: string;
            }> | undefined;
        } & {
            id: string;
            type: import("../../../../../common").SOURCE_TYPES.ES_TERM_SOURCE;
            term: string;
            indexPatternId: string;
        }>;
    }>[] | undefined;
} & {
    id: string;
    type: LAYER_TYPE.GEOJSON_VECTOR | LAYER_TYPE.BLENDED_VECTOR | LAYER_TYPE.MVT_VECTOR;
    sourceDescriptor: Readonly<{
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
        type: import("../../../../../common").SOURCE_TYPES.ES_GEO_GRID;
        resolution: import("../../../../../common/constants").GRID_RESOLUTION;
        indexPatternId: string;
        geoField: string;
        requestType: import("../../../../../common/constants").RENDER_AS;
    }> | Readonly<{} & {
        type: string;
    }> | Readonly<{
        tooltipProperties?: string[] | undefined;
    } & {
        id: string;
        type: import("../../../../../common").SOURCE_TYPES.EMS_FILE;
    }> | Readonly<{
        fields?: Readonly<{} & {
            name: string;
            type: import("../../../../../common/constants").MVT_FIELD_TYPE;
        }>[] | undefined;
        tooltipProperties?: string[] | undefined;
        maxSourceZoom?: number | undefined;
    } & {
        type: import("../../../../../common").SOURCE_TYPES.MVT_SINGLE_LAYER;
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
        type: import("../../../../../common").SOURCE_TYPES.ES_GEO_LINE;
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
        type: import("../../../../../common").SOURCE_TYPES.ES_PEW_PEW;
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
        type: import("../../../../../common").SOURCE_TYPES.ES_SEARCH;
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
        type: import("../../../../../common").SOURCE_TYPES.ESQL;
        esql: string;
    }>;
}> | Readonly<{} & {}>>;
