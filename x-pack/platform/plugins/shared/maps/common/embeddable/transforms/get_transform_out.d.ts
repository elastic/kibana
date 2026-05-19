import type { Reference } from '@kbn/content-management-utils/src/types';
import type { DrilldownTransforms } from '@kbn/embeddable-plugin/common';
import type { StoredMapEmbeddableState } from './types';
export declare function getTransformOut(transformDrilldownsOut: DrilldownTransforms['transformOut']): (storedState: StoredMapEmbeddableState, panelReferences?: Reference[], containerReferences?: Reference[]) => {
    description?: string | undefined;
    title?: string | undefined;
    hide_title?: boolean | undefined;
    hide_border?: boolean | undefined;
    time_range?: Readonly<{
        mode?: "absolute" | "relative" | undefined;
    } & {
        from: string;
        to: string;
    }> | undefined;
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
    description?: string | undefined;
    title?: string | undefined;
    hide_title?: boolean | undefined;
    hide_border?: boolean | undefined;
    time_range?: Readonly<{
        mode?: "absolute" | "relative" | undefined;
    } & {
        from: string;
        to: string;
    }> | undefined;
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
    description?: string | undefined;
    title?: string | undefined;
    hide_title?: boolean | undefined;
    hide_border?: boolean | undefined;
    time_range?: Readonly<{
        mode?: "absolute" | "relative" | undefined;
    } & {
        from: string;
        to: string;
    }> | undefined;
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
        filters?: Readonly<{
            query?: Record<string, any> | undefined;
            $state?: Readonly<{} & {
                store: import("@kbn/es-query-constants").FilterStateStore;
            }> | undefined;
        } & {
            meta: Readonly<{
                index?: string | undefined;
                type?: string | undefined;
                params?: any;
                key?: string | undefined;
                value?: any;
                group?: string | undefined;
                disabled?: boolean | undefined;
                field?: string | undefined;
                alias?: string | null | undefined;
                negate?: boolean | undefined;
                controlledBy?: string | undefined;
                isMultiIndex?: boolean | undefined;
                relation?: string | undefined;
            } & {}>;
        }>[] | undefined;
        query?: Readonly<{} & {
            query: string | Record<string, any>;
            language: string;
        }> | undefined;
        description?: string | undefined;
        settings?: Readonly<{
            backgroundColor?: string | undefined;
            projection?: "globeInterpolate" | "mercator" | undefined;
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
            initialLocation?: import("../../constants").INITIAL_LOCATION | undefined;
            fixedLocation?: Readonly<{} & {
                lat: number;
                lon: number;
                zoom: number;
            }> | undefined;
            browserLocation?: Readonly<{} & {
                zoom: number;
            }> | undefined;
            keydownScrollZoom?: boolean | undefined;
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
        layers?: (Readonly<{
            locale?: string | undefined;
            query?: Readonly<{} & {
                query: string | Record<string, any>;
                language: string;
            }> | undefined;
            label?: string | undefined;
            style?: Readonly<{} & {
                type: import("../../constants").LAYER_STYLE_TYPE.EMS_VECTOR_TILE;
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
            type: import("../../constants").LAYER_TYPE.EMS_VECTOR_TILE;
            sourceDescriptor: Readonly<{
                id?: string | undefined;
                isAutoSelect?: boolean | undefined;
                lightModeDefault?: string | undefined;
            } & {
                type: import("../../constants").SOURCE_TYPES.EMS_TMS;
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
                type: import("../../constants").LAYER_STYLE_TYPE.HEATMAP;
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
            type: import("../../constants").LAYER_TYPE.HEATMAP;
            sourceDescriptor: Readonly<{
                metrics?: (Readonly<{
                    label?: string | undefined;
                    mask?: Readonly<{} & {
                        value: number;
                        operator: import("../../constants").MASK_OPERATOR;
                    }> | undefined;
                } & {
                    type: import("../../constants").AGG_TYPE.COUNT;
                }> | Readonly<{
                    label?: string | undefined;
                    field?: string | undefined;
                    mask?: Readonly<{} & {
                        value: number;
                        operator: import("../../constants").MASK_OPERATOR;
                    }> | undefined;
                } & {
                    type: import("../../constants").AGG_TYPE.AVG | import("../../constants").AGG_TYPE.MAX | import("../../constants").AGG_TYPE.MIN | import("../../constants").AGG_TYPE.SUM | import("../../constants").AGG_TYPE.TERMS | import("../../constants").AGG_TYPE.UNIQUE_COUNT;
                }> | Readonly<{
                    label?: string | undefined;
                    field?: string | undefined;
                    mask?: Readonly<{} & {
                        value: number;
                        operator: import("../../constants").MASK_OPERATOR;
                    }> | undefined;
                    percentile?: number | undefined;
                } & {
                    type: import("../../constants").AGG_TYPE.PERCENTILE;
                }>)[] | undefined;
                applyForceRefresh?: boolean | undefined;
                applyGlobalQuery?: boolean | undefined;
                applyGlobalTime?: boolean | undefined;
            } & {
                id: string;
                type: import("../../constants").SOURCE_TYPES.ES_GEO_GRID;
                resolution: import("../../constants").GRID_RESOLUTION;
                indexPatternId: string;
                geoField: string;
                requestType: import("../../constants").RENDER_AS;
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
            type: import("../../constants").LAYER_TYPE.LAYER_GROUP;
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
            type: import("../../constants").LAYER_TYPE.RASTER_TILE;
            sourceDescriptor: Readonly<{} & {
                type: string;
            }> | Readonly<{} & {
                type: import("../../constants").SOURCE_TYPES.KIBANA_TILEMAP;
            }> | Readonly<{} & {
                type: import("../../constants").SOURCE_TYPES.WMS;
                layers: string;
                styles: string;
                serviceUrl: string;
            }> | Readonly<{} & {
                type: import("../../constants").SOURCE_TYPES.EMS_XYZ;
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
                type: import("../../constants").LAYER_STYLE_TYPE.VECTOR;
                properties: Readonly<{
                    symbolizeAs?: Readonly<{} & {
                        options: Readonly<{
                            value?: import("../../constants").SYMBOLIZE_AS_TYPES | undefined;
                        } & {}>;
                    }> | undefined;
                    fillColor?: Readonly<{} & {
                        type: import("../../constants").STYLE_TYPE.STATIC;
                        options: Readonly<{} & {
                            color: string;
                        }>;
                    }> | Readonly<{} & {
                        type: import("../../constants").STYLE_TYPE.DYNAMIC;
                        options: Readonly<{
                            type?: import("../../constants").COLOR_MAP_TYPE | undefined;
                            field?: Readonly<{} & {
                                name: string;
                                origin: import("../../constants").FIELD_ORIGIN;
                            }> | undefined;
                            color?: string | undefined;
                            invert?: boolean | undefined;
                            customColorRamp?: Readonly<{} & {
                                stop: number;
                                color: string;
                            }>[] | undefined;
                            useCustomColorRamp?: boolean | undefined;
                            dataMappingFunction?: import("../../constants").DATA_MAPPING_FUNCTION | undefined;
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
                        type: import("../../constants").STYLE_TYPE.STATIC;
                        options: Readonly<{} & {
                            color: string;
                        }>;
                    }> | Readonly<{} & {
                        type: import("../../constants").STYLE_TYPE.DYNAMIC;
                        options: Readonly<{
                            type?: import("../../constants").COLOR_MAP_TYPE | undefined;
                            field?: Readonly<{} & {
                                name: string;
                                origin: import("../../constants").FIELD_ORIGIN;
                            }> | undefined;
                            color?: string | undefined;
                            invert?: boolean | undefined;
                            customColorRamp?: Readonly<{} & {
                                stop: number;
                                color: string;
                            }>[] | undefined;
                            useCustomColorRamp?: boolean | undefined;
                            dataMappingFunction?: import("../../constants").DATA_MAPPING_FUNCTION | undefined;
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
                        type: import("../../constants").STYLE_TYPE.STATIC;
                        options: Readonly<{} & {
                            size: number;
                        }>;
                    }> | Readonly<{} & {
                        type: import("../../constants").STYLE_TYPE.DYNAMIC;
                        options: Readonly<{
                            field?: Readonly<{} & {
                                name: string;
                                origin: import("../../constants").FIELD_ORIGIN;
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
                        type: import("../../constants").STYLE_TYPE.STATIC;
                        options: Readonly<{
                            label?: string | undefined;
                            svg?: string | undefined;
                            iconSource?: import("../../constants").ICON_SOURCE | undefined;
                        } & {
                            value: string;
                        }>;
                    }> | Readonly<{} & {
                        type: import("../../constants").STYLE_TYPE.DYNAMIC;
                        options: Readonly<{
                            field?: Readonly<{} & {
                                name: string;
                                origin: import("../../constants").FIELD_ORIGIN;
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
                        type: import("../../constants").STYLE_TYPE.STATIC;
                        options: Readonly<{} & {
                            size: number;
                        }>;
                    }> | Readonly<{} & {
                        type: import("../../constants").STYLE_TYPE.DYNAMIC;
                        options: Readonly<{
                            field?: Readonly<{} & {
                                name: string;
                                origin: import("../../constants").FIELD_ORIGIN;
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
                        type: import("../../constants").STYLE_TYPE.STATIC;
                        options: Readonly<{} & {
                            orientation: number;
                        }>;
                    }> | Readonly<{} & {
                        type: import("../../constants").STYLE_TYPE.DYNAMIC;
                        options: Readonly<{
                            field?: Readonly<{} & {
                                name: string;
                                origin: import("../../constants").FIELD_ORIGIN;
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
                        type: import("../../constants").STYLE_TYPE.STATIC;
                        options: Readonly<{} & {
                            value: string;
                        }>;
                    }> | Readonly<{} & {
                        type: import("../../constants").STYLE_TYPE.DYNAMIC;
                        options: Readonly<{
                            field?: Readonly<{} & {
                                name: string;
                                origin: import("../../constants").FIELD_ORIGIN;
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
                        type: import("../../constants").STYLE_TYPE.STATIC;
                        options: Readonly<{} & {
                            color: string;
                        }>;
                    }> | Readonly<{} & {
                        type: import("../../constants").STYLE_TYPE.DYNAMIC;
                        options: Readonly<{
                            type?: import("../../constants").COLOR_MAP_TYPE | undefined;
                            field?: Readonly<{} & {
                                name: string;
                                origin: import("../../constants").FIELD_ORIGIN;
                            }> | undefined;
                            color?: string | undefined;
                            invert?: boolean | undefined;
                            customColorRamp?: Readonly<{} & {
                                stop: number;
                                color: string;
                            }>[] | undefined;
                            useCustomColorRamp?: boolean | undefined;
                            dataMappingFunction?: import("../../constants").DATA_MAPPING_FUNCTION | undefined;
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
                        type: import("../../constants").STYLE_TYPE.STATIC;
                        options: Readonly<{} & {
                            size: number;
                        }>;
                    }> | Readonly<{} & {
                        type: import("../../constants").STYLE_TYPE.DYNAMIC;
                        options: Readonly<{
                            field?: Readonly<{} & {
                                name: string;
                                origin: import("../../constants").FIELD_ORIGIN;
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
                        type: import("../../constants").STYLE_TYPE.STATIC;
                        options: Readonly<{} & {
                            color: string;
                        }>;
                    }> | Readonly<{} & {
                        type: import("../../constants").STYLE_TYPE.DYNAMIC;
                        options: Readonly<{
                            type?: import("../../constants").COLOR_MAP_TYPE | undefined;
                            field?: Readonly<{} & {
                                name: string;
                                origin: import("../../constants").FIELD_ORIGIN;
                            }> | undefined;
                            color?: string | undefined;
                            invert?: boolean | undefined;
                            customColorRamp?: Readonly<{} & {
                                stop: number;
                                color: string;
                            }>[] | undefined;
                            useCustomColorRamp?: boolean | undefined;
                            dataMappingFunction?: import("../../constants").DATA_MAPPING_FUNCTION | undefined;
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
                            size: import("../../constants").LABEL_BORDER_SIZES;
                        }>;
                    }> | undefined;
                    labelPosition?: Readonly<{} & {
                        options: Readonly<{} & {
                            position: import("../../constants").LABEL_POSITIONS;
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
                            operator: import("../../constants").MASK_OPERATOR;
                        }> | undefined;
                    } & {
                        type: import("../../constants").AGG_TYPE.COUNT;
                    }> | Readonly<{
                        label?: string | undefined;
                        field?: string | undefined;
                        mask?: Readonly<{} & {
                            value: number;
                            operator: import("../../constants").MASK_OPERATOR;
                        }> | undefined;
                    } & {
                        type: import("../../constants").AGG_TYPE.AVG | import("../../constants").AGG_TYPE.MAX | import("../../constants").AGG_TYPE.MIN | import("../../constants").AGG_TYPE.SUM | import("../../constants").AGG_TYPE.TERMS | import("../../constants").AGG_TYPE.UNIQUE_COUNT;
                    }> | Readonly<{
                        label?: string | undefined;
                        field?: string | undefined;
                        mask?: Readonly<{} & {
                            value: number;
                            operator: import("../../constants").MASK_OPERATOR;
                        }> | undefined;
                        percentile?: number | undefined;
                    } & {
                        type: import("../../constants").AGG_TYPE.PERCENTILE;
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
                    type: import("../../constants").SOURCE_TYPES.ES_DISTANCE_SOURCE;
                    distance: number;
                    indexPatternId: string;
                    geoField: string;
                }> | Readonly<{
                    size?: number | undefined;
                    metrics?: (Readonly<{
                        label?: string | undefined;
                        mask?: Readonly<{} & {
                            value: number;
                            operator: import("../../constants").MASK_OPERATOR;
                        }> | undefined;
                    } & {
                        type: import("../../constants").AGG_TYPE.COUNT;
                    }> | Readonly<{
                        label?: string | undefined;
                        field?: string | undefined;
                        mask?: Readonly<{} & {
                            value: number;
                            operator: import("../../constants").MASK_OPERATOR;
                        }> | undefined;
                    } & {
                        type: import("../../constants").AGG_TYPE.AVG | import("../../constants").AGG_TYPE.MAX | import("../../constants").AGG_TYPE.MIN | import("../../constants").AGG_TYPE.SUM | import("../../constants").AGG_TYPE.TERMS | import("../../constants").AGG_TYPE.UNIQUE_COUNT;
                    }> | Readonly<{
                        label?: string | undefined;
                        field?: string | undefined;
                        mask?: Readonly<{} & {
                            value: number;
                            operator: import("../../constants").MASK_OPERATOR;
                        }> | undefined;
                        percentile?: number | undefined;
                    } & {
                        type: import("../../constants").AGG_TYPE.PERCENTILE;
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
                    type: import("../../constants").SOURCE_TYPES.ES_TERM_SOURCE;
                    term: string;
                    indexPatternId: string;
                }>;
            }>[] | undefined;
        } & {
            id: string;
            type: import("../../constants").LAYER_TYPE.GEOJSON_VECTOR | import("../../constants").LAYER_TYPE.BLENDED_VECTOR | import("../../constants").LAYER_TYPE.MVT_VECTOR;
            sourceDescriptor: Readonly<{
                metrics?: (Readonly<{
                    label?: string | undefined;
                    mask?: Readonly<{} & {
                        value: number;
                        operator: import("../../constants").MASK_OPERATOR;
                    }> | undefined;
                } & {
                    type: import("../../constants").AGG_TYPE.COUNT;
                }> | Readonly<{
                    label?: string | undefined;
                    field?: string | undefined;
                    mask?: Readonly<{} & {
                        value: number;
                        operator: import("../../constants").MASK_OPERATOR;
                    }> | undefined;
                } & {
                    type: import("../../constants").AGG_TYPE.AVG | import("../../constants").AGG_TYPE.MAX | import("../../constants").AGG_TYPE.MIN | import("../../constants").AGG_TYPE.SUM | import("../../constants").AGG_TYPE.TERMS | import("../../constants").AGG_TYPE.UNIQUE_COUNT;
                }> | Readonly<{
                    label?: string | undefined;
                    field?: string | undefined;
                    mask?: Readonly<{} & {
                        value: number;
                        operator: import("../../constants").MASK_OPERATOR;
                    }> | undefined;
                    percentile?: number | undefined;
                } & {
                    type: import("../../constants").AGG_TYPE.PERCENTILE;
                }>)[] | undefined;
                applyForceRefresh?: boolean | undefined;
                applyGlobalQuery?: boolean | undefined;
                applyGlobalTime?: boolean | undefined;
            } & {
                id: string;
                type: import("../../constants").SOURCE_TYPES.ES_GEO_GRID;
                resolution: import("../../constants").GRID_RESOLUTION;
                indexPatternId: string;
                geoField: string;
                requestType: import("../../constants").RENDER_AS;
            }> | Readonly<{} & {
                type: string;
            }> | Readonly<{
                tooltipProperties?: string[] | undefined;
            } & {
                id: string;
                type: import("../../constants").SOURCE_TYPES.EMS_FILE;
            }> | Readonly<{
                fields?: Readonly<{} & {
                    name: string;
                    type: import("../../constants").MVT_FIELD_TYPE;
                }>[] | undefined;
                tooltipProperties?: string[] | undefined;
                maxSourceZoom?: number | undefined;
            } & {
                type: import("../../constants").SOURCE_TYPES.MVT_SINGLE_LAYER;
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
                    type: import("../../constants").AGG_TYPE.COUNT;
                }> | Readonly<{
                    label?: string | undefined;
                    field?: string | undefined;
                    mask?: Readonly<{} & {
                        value: number;
                        operator: import("../../constants").MASK_OPERATOR;
                    }> | undefined;
                } & {
                    type: import("../../constants").AGG_TYPE.AVG | import("../../constants").AGG_TYPE.MAX | import("../../constants").AGG_TYPE.MIN | import("../../constants").AGG_TYPE.SUM | import("../../constants").AGG_TYPE.TERMS | import("../../constants").AGG_TYPE.UNIQUE_COUNT;
                }> | Readonly<{
                    label?: string | undefined;
                    field?: string | undefined;
                    mask?: Readonly<{} & {
                        value: number;
                        operator: import("../../constants").MASK_OPERATOR;
                    }> | undefined;
                    percentile?: number | undefined;
                } & {
                    type: import("../../constants").AGG_TYPE.PERCENTILE;
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
                type: import("../../constants").SOURCE_TYPES.ES_GEO_LINE;
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
                    type: import("../../constants").AGG_TYPE.COUNT;
                }> | Readonly<{
                    label?: string | undefined;
                    field?: string | undefined;
                    mask?: Readonly<{} & {
                        value: number;
                        operator: import("../../constants").MASK_OPERATOR;
                    }> | undefined;
                } & {
                    type: import("../../constants").AGG_TYPE.AVG | import("../../constants").AGG_TYPE.MAX | import("../../constants").AGG_TYPE.MIN | import("../../constants").AGG_TYPE.SUM | import("../../constants").AGG_TYPE.TERMS | import("../../constants").AGG_TYPE.UNIQUE_COUNT;
                }> | Readonly<{
                    label?: string | undefined;
                    field?: string | undefined;
                    mask?: Readonly<{} & {
                        value: number;
                        operator: import("../../constants").MASK_OPERATOR;
                    }> | undefined;
                    percentile?: number | undefined;
                } & {
                    type: import("../../constants").AGG_TYPE.PERCENTILE;
                }>)[] | undefined;
                applyForceRefresh?: boolean | undefined;
                applyGlobalQuery?: boolean | undefined;
                applyGlobalTime?: boolean | undefined;
            } & {
                id: string;
                type: import("../../constants").SOURCE_TYPES.ES_PEW_PEW;
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
                scalingType?: import("../../constants").SCALING_TYPES | undefined;
                topHitsGroupByTimeseries?: boolean | undefined;
                topHitsSplitField?: string | undefined;
            } & {
                id: string;
                type: import("../../constants").SOURCE_TYPES.ES_SEARCH;
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
                type: import("../../constants").SOURCE_TYPES.ESQL;
                esql: string;
            }>;
        }> | Readonly<{} & {}>)[] | undefined;
        zoom?: number | undefined;
        refreshInterval?: Readonly<{} & {
            value: number;
            pause: boolean;
        }> | undefined;
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
    description?: string | undefined;
    title?: string | undefined;
    hide_title?: boolean | undefined;
    hide_border?: boolean | undefined;
    time_range?: Readonly<{
        mode?: "absolute" | "relative" | undefined;
    } & {
        from: string;
        to: string;
    }> | undefined;
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
