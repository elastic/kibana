import type { DrilldownTransforms } from '@kbn/embeddable-plugin/common';
export declare function getTransforms(drilldownTransforms: DrilldownTransforms): {
    transformIn: (state: import("../types").MapEmbeddableState) => {
        state: import("./types").StoredMapEmbeddableState;
        references: import("@kbn/content-management-utils").Reference[];
    };
    transformOut: (storedState: import("./types").StoredMapEmbeddableState, panelReferences?: import("@kbn/content-management-utils").Reference[], containerReferences?: import("@kbn/content-management-utils").Reference[]) => {
        title?: string | undefined;
        description?: string | undefined;
        time_range?: Readonly<{
            mode?: "absolute" | "relative" | undefined;
        } & {
            from: string;
            to: string;
        }> | undefined;
        hide_title?: boolean | undefined;
        hide_border?: boolean | undefined;
        drilldowns?: import("@kbn/embeddable-plugin/server").DrilldownState[] | undefined;
        isLayerTOCOpen?: boolean | undefined;
        openTOCDetails?: string[] | undefined;
        mapCenter?: import("../../descriptor_types").MapCenterAndZoom | undefined;
        mapBuffer?: import("../../descriptor_types").MapExtent | undefined;
        mapSettings?: Partial<import("../../descriptor_types").MapSettings> | undefined;
        hiddenLayers?: string[] | undefined;
        filterByMapExtent?: boolean | undefined;
        isMovementSynchronized?: boolean | undefined;
    } | {
        savedObjectId: string;
        title?: string | undefined;
        description?: string | undefined;
        time_range?: Readonly<{
            mode?: "absolute" | "relative" | undefined;
        } & {
            from: string;
            to: string;
        }> | undefined;
        hide_title?: boolean | undefined;
        hide_border?: boolean | undefined;
        drilldowns?: import("@kbn/embeddable-plugin/server").DrilldownState[] | undefined;
        isLayerTOCOpen?: boolean | undefined;
        openTOCDetails?: string[] | undefined;
        mapCenter?: import("../../descriptor_types").MapCenterAndZoom | undefined;
        mapBuffer?: import("../../descriptor_types").MapExtent | undefined;
        mapSettings?: Partial<import("../../descriptor_types").MapSettings> | undefined;
        hiddenLayers?: string[] | undefined;
        filterByMapExtent?: boolean | undefined;
        isMovementSynchronized?: boolean | undefined;
    } | {
        savedObjectId: string;
        title?: string | undefined;
        description?: string | undefined;
        time_range?: Readonly<{
            mode?: "absolute" | "relative" | undefined;
        } & {
            from: string;
            to: string;
        }> | undefined;
        hide_title?: boolean | undefined;
        hide_border?: boolean | undefined;
        drilldowns?: import("@kbn/embeddable-plugin/server").DrilldownState[] | undefined;
        isLayerTOCOpen?: boolean | undefined;
        openTOCDetails?: string[] | undefined;
        mapCenter?: import("../../descriptor_types").MapCenterAndZoom | undefined;
        mapBuffer?: import("../../descriptor_types").MapExtent | undefined;
        mapSettings?: Partial<import("../../descriptor_types").MapSettings> | undefined;
        hiddenLayers?: string[] | undefined;
        filterByMapExtent?: boolean | undefined;
        isMovementSynchronized?: boolean | undefined;
        attributes: import("../../../server").StoredMapAttributes;
    } | {
        attributes: Readonly<{
            query?: Readonly<{} & {
                query: string | Record<string, any>;
                language: string;
            }> | undefined;
            layers?: (Readonly<{
                query?: Readonly<{} & {
                    query: string | Record<string, any>;
                    language: string;
                }> | undefined;
                style?: Readonly<{} & {
                    type: import("../..").LAYER_STYLE_TYPE.EMS_VECTOR_TILE;
                    color: string;
                }> | undefined;
                label?: string | undefined;
                locale?: string | undefined;
                parent?: string | undefined;
                visible?: boolean | undefined;
                alpha?: number | undefined;
                attribution?: Readonly<{} & {
                    label: string;
                    url: string;
                }> | undefined;
                minZoom?: number | undefined;
                maxZoom?: number | undefined;
                includeInFitToBounds?: boolean | undefined;
                areLabelsOnTop?: boolean | undefined;
            } & {
                type: import("../..").LAYER_TYPE.EMS_VECTOR_TILE;
                id: string;
                sourceDescriptor: Readonly<{
                    id?: string | undefined;
                    isAutoSelect?: boolean | undefined;
                    lightModeDefault?: string | undefined;
                } & {
                    type: import("../..").SOURCE_TYPES.EMS_TMS;
                }>;
            }> | Readonly<{
                query?: Readonly<{} & {
                    query: string | Record<string, any>;
                    language: string;
                }> | undefined;
                style?: Readonly<{
                    colorRampName?: "Blues" | "Greens" | "Greys" | "Reds" | "Yellow to Red" | "Green to Red" | "Blue to Red" | "theclassic" | undefined;
                } & {
                    type: import("../..").LAYER_STYLE_TYPE.HEATMAP;
                }> | undefined;
                label?: string | undefined;
                parent?: string | undefined;
                visible?: boolean | undefined;
                alpha?: number | undefined;
                attribution?: Readonly<{} & {
                    label: string;
                    url: string;
                }> | undefined;
                minZoom?: number | undefined;
                maxZoom?: number | undefined;
                includeInFitToBounds?: boolean | undefined;
            } & {
                type: import("../..").LAYER_TYPE.HEATMAP;
                id: string;
                sourceDescriptor: Readonly<{
                    metrics?: (Readonly<{
                        label?: string | undefined;
                        mask?: Readonly<{} & {
                            value: number;
                            operator: import("../../constants").MASK_OPERATOR;
                        }> | undefined;
                    } & {
                        type: import("../..").AGG_TYPE.COUNT;
                    }> | Readonly<{
                        label?: string | undefined;
                        mask?: Readonly<{} & {
                            value: number;
                            operator: import("../../constants").MASK_OPERATOR;
                        }> | undefined;
                        field?: string | undefined;
                    } & {
                        type: import("../..").AGG_TYPE.AVG | import("../..").AGG_TYPE.MAX | import("../..").AGG_TYPE.MIN | import("../..").AGG_TYPE.SUM | import("../..").AGG_TYPE.TERMS | import("../..").AGG_TYPE.UNIQUE_COUNT;
                    }> | Readonly<{
                        label?: string | undefined;
                        mask?: Readonly<{} & {
                            value: number;
                            operator: import("../../constants").MASK_OPERATOR;
                        }> | undefined;
                        field?: string | undefined;
                        percentile?: number | undefined;
                    } & {
                        type: import("../..").AGG_TYPE.PERCENTILE;
                    }>)[] | undefined;
                    applyForceRefresh?: boolean | undefined;
                    applyGlobalQuery?: boolean | undefined;
                    applyGlobalTime?: boolean | undefined;
                } & {
                    type: import("../..").SOURCE_TYPES.ES_GEO_GRID;
                    id: string;
                    indexPatternId: string;
                    geoField: string;
                    resolution: import("../../constants").GRID_RESOLUTION;
                    requestType: import("../../constants").RENDER_AS;
                }>;
            }> | Readonly<{
                query?: Readonly<{} & {
                    query: string | Record<string, any>;
                    language: string;
                }> | undefined;
                parent?: string | undefined;
                alpha?: number | undefined;
                attribution?: Readonly<{} & {
                    label: string;
                    url: string;
                }> | undefined;
                minZoom?: number | undefined;
                maxZoom?: number | undefined;
                includeInFitToBounds?: boolean | undefined;
            } & {
                type: import("../..").LAYER_TYPE.LAYER_GROUP;
                id: string;
                label: string;
                visible: boolean;
            }> | Readonly<{
                query?: Readonly<{} & {
                    query: string | Record<string, any>;
                    language: string;
                }> | undefined;
                label?: string | undefined;
                parent?: string | undefined;
                visible?: boolean | undefined;
                alpha?: number | undefined;
                attribution?: Readonly<{} & {
                    label: string;
                    url: string;
                }> | undefined;
                minZoom?: number | undefined;
                maxZoom?: number | undefined;
                includeInFitToBounds?: boolean | undefined;
            } & {
                type: import("../..").LAYER_TYPE.RASTER_TILE;
                id: string;
                sourceDescriptor: Readonly<{} & {
                    type: string;
                }> | Readonly<{} & {
                    type: import("../..").SOURCE_TYPES.KIBANA_TILEMAP;
                }> | Readonly<{} & {
                    type: import("../..").SOURCE_TYPES.WMS;
                    layers: string;
                    styles: string;
                    serviceUrl: string;
                }> | Readonly<{} & {
                    type: import("../..").SOURCE_TYPES.EMS_XYZ;
                    urlTemplate: string;
                }>;
            }> | Readonly<{
                query?: Readonly<{} & {
                    query: string | Record<string, any>;
                    language: string;
                }> | undefined;
                style?: Readonly<{
                    isTimeAware?: boolean | undefined;
                } & {
                    type: import("../..").LAYER_STYLE_TYPE.VECTOR;
                    properties: Readonly<{
                        symbolizeAs?: Readonly<{} & {
                            options: Readonly<{
                                value?: import("../..").SYMBOLIZE_AS_TYPES | undefined;
                            } & {}>;
                        }> | undefined;
                        fillColor?: Readonly<{} & {
                            type: import("../..").STYLE_TYPE.STATIC;
                            options: Readonly<{} & {
                                color: string;
                            }>;
                        }> | Readonly<{} & {
                            type: import("../..").STYLE_TYPE.DYNAMIC;
                            options: Readonly<{
                                type?: import("../..").COLOR_MAP_TYPE | undefined;
                                color?: string | undefined;
                                invert?: boolean | undefined;
                                field?: Readonly<{} & {
                                    name: string;
                                    origin: import("../..").FIELD_ORIGIN;
                                }> | undefined;
                                customColorRamp?: Readonly<{} & {
                                    color: string;
                                    stop: number;
                                }>[] | undefined;
                                useCustomColorRamp?: boolean | undefined;
                                dataMappingFunction?: import("../../constants").DATA_MAPPING_FUNCTION | undefined;
                                colorCategory?: string | undefined;
                                customColorPalette?: Readonly<{} & {
                                    color: string;
                                    stop: string | null;
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
                            type: import("../..").STYLE_TYPE.STATIC;
                            options: Readonly<{} & {
                                color: string;
                            }>;
                        }> | Readonly<{} & {
                            type: import("../..").STYLE_TYPE.DYNAMIC;
                            options: Readonly<{
                                type?: import("../..").COLOR_MAP_TYPE | undefined;
                                color?: string | undefined;
                                invert?: boolean | undefined;
                                field?: Readonly<{} & {
                                    name: string;
                                    origin: import("../..").FIELD_ORIGIN;
                                }> | undefined;
                                customColorRamp?: Readonly<{} & {
                                    color: string;
                                    stop: number;
                                }>[] | undefined;
                                useCustomColorRamp?: boolean | undefined;
                                dataMappingFunction?: import("../../constants").DATA_MAPPING_FUNCTION | undefined;
                                colorCategory?: string | undefined;
                                customColorPalette?: Readonly<{} & {
                                    color: string;
                                    stop: string | null;
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
                            type: import("../..").STYLE_TYPE.STATIC;
                            options: Readonly<{} & {
                                size: number;
                            }>;
                        }> | Readonly<{} & {
                            type: import("../..").STYLE_TYPE.DYNAMIC;
                            options: Readonly<{
                                invert?: boolean | undefined;
                                field?: Readonly<{} & {
                                    name: string;
                                    origin: import("../..").FIELD_ORIGIN;
                                }> | undefined;
                            } & {
                                minSize: number;
                                maxSize: number;
                                fieldMetaOptions: Readonly<{
                                    percentiles?: number[] | undefined;
                                    sigma?: number | undefined;
                                } & {
                                    isEnabled: boolean;
                                }>;
                            }>;
                        }> | undefined;
                        icon?: Readonly<{} & {
                            type: import("../..").STYLE_TYPE.STATIC;
                            options: Readonly<{
                                label?: string | undefined;
                                svg?: string | undefined;
                                iconSource?: import("../../constants").ICON_SOURCE | undefined;
                            } & {
                                value: string;
                            }>;
                        }> | Readonly<{} & {
                            type: import("../..").STYLE_TYPE.DYNAMIC;
                            options: Readonly<{
                                field?: Readonly<{} & {
                                    name: string;
                                    origin: import("../..").FIELD_ORIGIN;
                                }> | undefined;
                                customIconStops?: Readonly<{
                                    iconSource?: import("../../constants").ICON_SOURCE | undefined;
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
                            type: import("../..").STYLE_TYPE.STATIC;
                            options: Readonly<{} & {
                                size: number;
                            }>;
                        }> | Readonly<{} & {
                            type: import("../..").STYLE_TYPE.DYNAMIC;
                            options: Readonly<{
                                invert?: boolean | undefined;
                                field?: Readonly<{} & {
                                    name: string;
                                    origin: import("../..").FIELD_ORIGIN;
                                }> | undefined;
                            } & {
                                minSize: number;
                                maxSize: number;
                                fieldMetaOptions: Readonly<{
                                    percentiles?: number[] | undefined;
                                    sigma?: number | undefined;
                                } & {
                                    isEnabled: boolean;
                                }>;
                            }>;
                        }> | undefined;
                        iconOrientation?: Readonly<{} & {
                            type: import("../..").STYLE_TYPE.STATIC;
                            options: Readonly<{} & {
                                orientation: number;
                            }>;
                        }> | Readonly<{} & {
                            type: import("../..").STYLE_TYPE.DYNAMIC;
                            options: Readonly<{
                                field?: Readonly<{} & {
                                    name: string;
                                    origin: import("../..").FIELD_ORIGIN;
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
                            type: import("../..").STYLE_TYPE.STATIC;
                            options: Readonly<{} & {
                                value: string;
                            }>;
                        }> | Readonly<{} & {
                            type: import("../..").STYLE_TYPE.DYNAMIC;
                            options: Readonly<{
                                field?: Readonly<{} & {
                                    name: string;
                                    origin: import("../..").FIELD_ORIGIN;
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
                            type: import("../..").STYLE_TYPE.STATIC;
                            options: Readonly<{} & {
                                color: string;
                            }>;
                        }> | Readonly<{} & {
                            type: import("../..").STYLE_TYPE.DYNAMIC;
                            options: Readonly<{
                                type?: import("../..").COLOR_MAP_TYPE | undefined;
                                color?: string | undefined;
                                invert?: boolean | undefined;
                                field?: Readonly<{} & {
                                    name: string;
                                    origin: import("../..").FIELD_ORIGIN;
                                }> | undefined;
                                customColorRamp?: Readonly<{} & {
                                    color: string;
                                    stop: number;
                                }>[] | undefined;
                                useCustomColorRamp?: boolean | undefined;
                                dataMappingFunction?: import("../../constants").DATA_MAPPING_FUNCTION | undefined;
                                colorCategory?: string | undefined;
                                customColorPalette?: Readonly<{} & {
                                    color: string;
                                    stop: string | null;
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
                            type: import("../..").STYLE_TYPE.STATIC;
                            options: Readonly<{} & {
                                size: number;
                            }>;
                        }> | Readonly<{} & {
                            type: import("../..").STYLE_TYPE.DYNAMIC;
                            options: Readonly<{
                                invert?: boolean | undefined;
                                field?: Readonly<{} & {
                                    name: string;
                                    origin: import("../..").FIELD_ORIGIN;
                                }> | undefined;
                            } & {
                                minSize: number;
                                maxSize: number;
                                fieldMetaOptions: Readonly<{
                                    percentiles?: number[] | undefined;
                                    sigma?: number | undefined;
                                } & {
                                    isEnabled: boolean;
                                }>;
                            }>;
                        }> | undefined;
                        labelBorderColor?: Readonly<{} & {
                            type: import("../..").STYLE_TYPE.STATIC;
                            options: Readonly<{} & {
                                color: string;
                            }>;
                        }> | Readonly<{} & {
                            type: import("../..").STYLE_TYPE.DYNAMIC;
                            options: Readonly<{
                                type?: import("../..").COLOR_MAP_TYPE | undefined;
                                color?: string | undefined;
                                invert?: boolean | undefined;
                                field?: Readonly<{} & {
                                    name: string;
                                    origin: import("../..").FIELD_ORIGIN;
                                }> | undefined;
                                customColorRamp?: Readonly<{} & {
                                    color: string;
                                    stop: number;
                                }>[] | undefined;
                                useCustomColorRamp?: boolean | undefined;
                                dataMappingFunction?: import("../../constants").DATA_MAPPING_FUNCTION | undefined;
                                colorCategory?: string | undefined;
                                customColorPalette?: Readonly<{} & {
                                    color: string;
                                    stop: string | null;
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
                                size: import("../..").LABEL_BORDER_SIZES;
                            }>;
                        }> | undefined;
                        labelPosition?: Readonly<{} & {
                            options: Readonly<{} & {
                                position: import("../..").LABEL_POSITIONS;
                            }>;
                        }> | undefined;
                    } & {}>;
                }> | undefined;
                label?: string | undefined;
                parent?: string | undefined;
                visible?: boolean | undefined;
                alpha?: number | undefined;
                attribution?: Readonly<{} & {
                    label: string;
                    url: string;
                }> | undefined;
                minZoom?: number | undefined;
                maxZoom?: number | undefined;
                includeInFitToBounds?: boolean | undefined;
                disableTooltips?: boolean | undefined;
                joins?: Readonly<{
                    leftField?: string | undefined;
                } & {
                    right: Readonly<{} & {
                        type: string;
                        id: string;
                    }> | Readonly<{
                        metrics?: (Readonly<{
                            label?: string | undefined;
                            mask?: Readonly<{} & {
                                value: number;
                                operator: import("../../constants").MASK_OPERATOR;
                            }> | undefined;
                        } & {
                            type: import("../..").AGG_TYPE.COUNT;
                        }> | Readonly<{
                            label?: string | undefined;
                            mask?: Readonly<{} & {
                                value: number;
                                operator: import("../../constants").MASK_OPERATOR;
                            }> | undefined;
                            field?: string | undefined;
                        } & {
                            type: import("../..").AGG_TYPE.AVG | import("../..").AGG_TYPE.MAX | import("../..").AGG_TYPE.MIN | import("../..").AGG_TYPE.SUM | import("../..").AGG_TYPE.TERMS | import("../..").AGG_TYPE.UNIQUE_COUNT;
                        }> | Readonly<{
                            label?: string | undefined;
                            mask?: Readonly<{} & {
                                value: number;
                                operator: import("../../constants").MASK_OPERATOR;
                            }> | undefined;
                            field?: string | undefined;
                            percentile?: number | undefined;
                        } & {
                            type: import("../..").AGG_TYPE.PERCENTILE;
                        }>)[] | undefined;
                        applyForceRefresh?: boolean | undefined;
                        applyGlobalQuery?: boolean | undefined;
                        applyGlobalTime?: boolean | undefined;
                        whereQuery?: Readonly<{} & {
                            query: string | Record<string, any>;
                            language: string;
                        }> | undefined;
                    } & {
                        type: import("../..").SOURCE_TYPES.ES_DISTANCE_SOURCE;
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
                                operator: import("../../constants").MASK_OPERATOR;
                            }> | undefined;
                        } & {
                            type: import("../..").AGG_TYPE.COUNT;
                        }> | Readonly<{
                            label?: string | undefined;
                            mask?: Readonly<{} & {
                                value: number;
                                operator: import("../../constants").MASK_OPERATOR;
                            }> | undefined;
                            field?: string | undefined;
                        } & {
                            type: import("../..").AGG_TYPE.AVG | import("../..").AGG_TYPE.MAX | import("../..").AGG_TYPE.MIN | import("../..").AGG_TYPE.SUM | import("../..").AGG_TYPE.TERMS | import("../..").AGG_TYPE.UNIQUE_COUNT;
                        }> | Readonly<{
                            label?: string | undefined;
                            mask?: Readonly<{} & {
                                value: number;
                                operator: import("../../constants").MASK_OPERATOR;
                            }> | undefined;
                            field?: string | undefined;
                            percentile?: number | undefined;
                        } & {
                            type: import("../..").AGG_TYPE.PERCENTILE;
                        }>)[] | undefined;
                        applyForceRefresh?: boolean | undefined;
                        applyGlobalQuery?: boolean | undefined;
                        applyGlobalTime?: boolean | undefined;
                        whereQuery?: Readonly<{} & {
                            query: string | Record<string, any>;
                            language: string;
                        }> | undefined;
                    } & {
                        type: import("../..").SOURCE_TYPES.ES_TERM_SOURCE;
                        id: string;
                        term: string;
                        indexPatternId: string;
                    }>;
                }>[] | undefined;
            } & {
                type: import("../..").LAYER_TYPE.GEOJSON_VECTOR | import("../..").LAYER_TYPE.BLENDED_VECTOR | import("../..").LAYER_TYPE.MVT_VECTOR;
                id: string;
                sourceDescriptor: Readonly<{
                    metrics?: (Readonly<{
                        label?: string | undefined;
                        mask?: Readonly<{} & {
                            value: number;
                            operator: import("../../constants").MASK_OPERATOR;
                        }> | undefined;
                    } & {
                        type: import("../..").AGG_TYPE.COUNT;
                    }> | Readonly<{
                        label?: string | undefined;
                        mask?: Readonly<{} & {
                            value: number;
                            operator: import("../../constants").MASK_OPERATOR;
                        }> | undefined;
                        field?: string | undefined;
                    } & {
                        type: import("../..").AGG_TYPE.AVG | import("../..").AGG_TYPE.MAX | import("../..").AGG_TYPE.MIN | import("../..").AGG_TYPE.SUM | import("../..").AGG_TYPE.TERMS | import("../..").AGG_TYPE.UNIQUE_COUNT;
                    }> | Readonly<{
                        label?: string | undefined;
                        mask?: Readonly<{} & {
                            value: number;
                            operator: import("../../constants").MASK_OPERATOR;
                        }> | undefined;
                        field?: string | undefined;
                        percentile?: number | undefined;
                    } & {
                        type: import("../..").AGG_TYPE.PERCENTILE;
                    }>)[] | undefined;
                    applyForceRefresh?: boolean | undefined;
                    applyGlobalQuery?: boolean | undefined;
                    applyGlobalTime?: boolean | undefined;
                } & {
                    type: import("../..").SOURCE_TYPES.ES_GEO_GRID;
                    id: string;
                    indexPatternId: string;
                    geoField: string;
                    resolution: import("../../constants").GRID_RESOLUTION;
                    requestType: import("../../constants").RENDER_AS;
                }> | Readonly<{} & {
                    type: string;
                }> | Readonly<{
                    tooltipProperties?: string[] | undefined;
                } & {
                    type: import("../..").SOURCE_TYPES.EMS_FILE;
                    id: string;
                }> | Readonly<{
                    fields?: Readonly<{} & {
                        type: import("../../constants").MVT_FIELD_TYPE;
                        name: string;
                    }>[] | undefined;
                    tooltipProperties?: string[] | undefined;
                    maxSourceZoom?: number | undefined;
                } & {
                    type: import("../..").SOURCE_TYPES.MVT_SINGLE_LAYER;
                    urlTemplate: string;
                    layerName: string;
                    minSourceZoom: number;
                }> | Readonly<{
                    metrics?: (Readonly<{
                        label?: string | undefined;
                        mask?: Readonly<{} & {
                            value: number;
                            operator: import("../../constants").MASK_OPERATOR;
                        }> | undefined;
                    } & {
                        type: import("../..").AGG_TYPE.COUNT;
                    }> | Readonly<{
                        label?: string | undefined;
                        mask?: Readonly<{} & {
                            value: number;
                            operator: import("../../constants").MASK_OPERATOR;
                        }> | undefined;
                        field?: string | undefined;
                    } & {
                        type: import("../..").AGG_TYPE.AVG | import("../..").AGG_TYPE.MAX | import("../..").AGG_TYPE.MIN | import("../..").AGG_TYPE.SUM | import("../..").AGG_TYPE.TERMS | import("../..").AGG_TYPE.UNIQUE_COUNT;
                    }> | Readonly<{
                        label?: string | undefined;
                        mask?: Readonly<{} & {
                            value: number;
                            operator: import("../../constants").MASK_OPERATOR;
                        }> | undefined;
                        field?: string | undefined;
                        percentile?: number | undefined;
                    } & {
                        type: import("../..").AGG_TYPE.PERCENTILE;
                    }>)[] | undefined;
                    sortField?: string | undefined;
                    splitField?: string | undefined;
                    applyForceRefresh?: boolean | undefined;
                    applyGlobalQuery?: boolean | undefined;
                    applyGlobalTime?: boolean | undefined;
                    groupByTimeseries?: boolean | undefined;
                    lineSimplificationSize?: number | undefined;
                } & {
                    type: import("../..").SOURCE_TYPES.ES_GEO_LINE;
                    id: string;
                    indexPatternId: string;
                    geoField: string;
                }> | Readonly<{
                    metrics?: (Readonly<{
                        label?: string | undefined;
                        mask?: Readonly<{} & {
                            value: number;
                            operator: import("../../constants").MASK_OPERATOR;
                        }> | undefined;
                    } & {
                        type: import("../..").AGG_TYPE.COUNT;
                    }> | Readonly<{
                        label?: string | undefined;
                        mask?: Readonly<{} & {
                            value: number;
                            operator: import("../../constants").MASK_OPERATOR;
                        }> | undefined;
                        field?: string | undefined;
                    } & {
                        type: import("../..").AGG_TYPE.AVG | import("../..").AGG_TYPE.MAX | import("../..").AGG_TYPE.MIN | import("../..").AGG_TYPE.SUM | import("../..").AGG_TYPE.TERMS | import("../..").AGG_TYPE.UNIQUE_COUNT;
                    }> | Readonly<{
                        label?: string | undefined;
                        mask?: Readonly<{} & {
                            value: number;
                            operator: import("../../constants").MASK_OPERATOR;
                        }> | undefined;
                        field?: string | undefined;
                        percentile?: number | undefined;
                    } & {
                        type: import("../..").AGG_TYPE.PERCENTILE;
                    }>)[] | undefined;
                    applyForceRefresh?: boolean | undefined;
                    applyGlobalQuery?: boolean | undefined;
                    applyGlobalTime?: boolean | undefined;
                } & {
                    type: import("../..").SOURCE_TYPES.ES_PEW_PEW;
                    id: string;
                    indexPatternId: string;
                    destGeoField: string;
                    sourceGeoField: string;
                }> | Readonly<{
                    sortField?: string | undefined;
                    sortOrder?: import("@kbn/data-plugin/common").SortDirection | undefined;
                    applyForceRefresh?: boolean | undefined;
                    applyGlobalQuery?: boolean | undefined;
                    applyGlobalTime?: boolean | undefined;
                    tooltipProperties?: string[] | undefined;
                    filterByMapBounds?: boolean | undefined;
                    scalingType?: import("../..").SCALING_TYPES | undefined;
                    topHitsGroupByTimeseries?: boolean | undefined;
                    topHitsSplitField?: string | undefined;
                    topHitsSize?: number | undefined;
                } & {
                    type: import("../..").SOURCE_TYPES.ES_SEARCH;
                    id: string;
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
                    type: import("../..").SOURCE_TYPES.ESQL;
                    id: string;
                    esql: string;
                }>;
            }> | Readonly<{} & {}>)[] | undefined;
            settings?: Readonly<{
                backgroundColor?: string | undefined;
                minZoom?: number | undefined;
                maxZoom?: number | undefined;
                autoFitToDataBounds?: boolean | undefined;
                customIcons?: Readonly<{} & {
                    label: string;
                    svg: string;
                    radius: number;
                    symbolId: string;
                    cutoff: number;
                }>[] | undefined;
                disableInteractive?: boolean | undefined;
                disableTooltipControl?: boolean | undefined;
                hideToolbarOverlay?: boolean | undefined;
                hideLayerControl?: boolean | undefined;
                hideViewControl?: boolean | undefined;
                initialLocation?: import("../..").INITIAL_LOCATION | undefined;
                fixedLocation?: Readonly<{} & {
                    lat: number;
                    lon: number;
                    zoom: number;
                }> | undefined;
                browserLocation?: Readonly<{} & {
                    zoom: number;
                }> | undefined;
                keydownScrollZoom?: boolean | undefined;
                projection?: "globeInterpolate" | "mercator" | undefined;
                showScaleControl?: boolean | undefined;
                showSpatialFilters?: boolean | undefined;
                showTimesliderToggleButton?: boolean | undefined;
                spatialFiltersAlpa?: number | undefined;
                spatialFiltersFillColor?: string | undefined;
                spatialFiltersLineColor?: string | undefined;
            } & {}> | undefined;
            center?: Readonly<{} & {
                lat: number;
                lon: number;
            }> | undefined;
            description?: string | undefined;
            filters?: Readonly<{
                query?: Record<string, any> | undefined;
                $state?: Readonly<{
                    store: import("@kbn/es-query-constants").FilterStateStore;
                }> | undefined;
            } & {
                meta: Readonly<{
                    type?: string | undefined;
                    index?: string | undefined;
                    key?: string | undefined;
                    field?: string | undefined;
                    value?: any;
                    params?: any;
                    disabled?: boolean | undefined;
                    group?: string | undefined;
                    alias?: string | null | undefined;
                    negate?: boolean | undefined;
                    relation?: string | undefined;
                    controlledBy?: string | undefined;
                    isMultiIndex?: boolean | undefined;
                } & {}>;
            }>[] | undefined;
            refreshInterval?: Readonly<{} & {
                pause: boolean;
                value: number;
            }> | undefined;
            zoom?: number | undefined;
            adHocDataViews?: Readonly<{
                name?: string | undefined;
                timeFieldName?: string | undefined;
                allowHidden?: boolean | undefined;
            } & {
                id: string;
                title: string;
            }>[] | undefined;
            isLayerTOCOpen?: boolean | undefined;
            openTOCDetails?: string[] | undefined;
            timeFilters?: Readonly<{
                mode?: "absolute" | "relative" | undefined;
            } & {
                from: string;
                to: string;
            }> | undefined;
        } & {
            title: string;
        }>;
        title?: string | undefined;
        description?: string | undefined;
        time_range?: Readonly<{
            mode?: "absolute" | "relative" | undefined;
        } & {
            from: string;
            to: string;
        }> | undefined;
        hide_title?: boolean | undefined;
        hide_border?: boolean | undefined;
        drilldowns?: import("@kbn/embeddable-plugin/server").DrilldownState[] | undefined;
        isLayerTOCOpen?: boolean | undefined;
        openTOCDetails?: string[] | undefined;
        mapCenter?: import("../../descriptor_types").MapCenterAndZoom | undefined;
        mapBuffer?: import("../../descriptor_types").MapExtent | undefined;
        mapSettings?: Partial<import("../../descriptor_types").MapSettings> | undefined;
        hiddenLayers?: string[] | undefined;
        filterByMapExtent?: boolean | undefined;
        isMovementSynchronized?: boolean | undefined;
    };
};
