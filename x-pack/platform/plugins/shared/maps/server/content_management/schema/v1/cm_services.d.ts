import type { ContentManagementServicesDefinition as ServicesDefinition } from '@kbn/object-versioning';
export declare const mapSavedObjectSchema: import("@kbn/config-schema").ObjectType<{
    id: import("@kbn/config-schema").Type<string>;
    type: import("@kbn/config-schema").Type<string>;
    version: import("@kbn/config-schema").Type<string | undefined>;
    createdAt: import("@kbn/config-schema").Type<string | undefined>;
    updatedAt: import("@kbn/config-schema").Type<string | undefined>;
    createdBy: import("@kbn/config-schema").Type<string | undefined>;
    updatedBy: import("@kbn/config-schema").Type<string | undefined>;
    error: import("@kbn/config-schema").Type<Readonly<{} & {
        metadata: Readonly<{} & {}>;
        error: string;
        message: string;
        statusCode: number;
    }> | undefined>;
    attributes: import("@kbn/config-schema").ObjectType<{
        adHocDataViews: import("@kbn/config-schema").Type<Readonly<{
            name?: string | undefined;
            timeFieldName?: string | undefined;
            allowHidden?: boolean | undefined;
        } & {
            id: string;
            title: string;
        }>[] | undefined>;
        center: import("@kbn/config-schema").Type<Readonly<{} & {
            lat: number;
            lon: number;
        }> | undefined>;
        description: import("@kbn/config-schema").Type<string | undefined>;
        filters: import("@kbn/config-schema").Type<Readonly<{
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
        }>[] | undefined>;
        isLayerTOCOpen: import("@kbn/config-schema").Type<boolean | undefined>;
        layers: import("@kbn/config-schema").Type<(Readonly<{
            locale?: string | undefined;
            query?: Readonly<{} & {
                query: string | Record<string, any>;
                language: string;
            }> | undefined;
            label?: string | undefined;
            style?: Readonly<{} & {
                type: import("../../../../common").LAYER_STYLE_TYPE.EMS_VECTOR_TILE;
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
            type: import("../../../../common").LAYER_TYPE.EMS_VECTOR_TILE;
            sourceDescriptor: Readonly<{
                id?: string | undefined;
                isAutoSelect?: boolean | undefined;
                lightModeDefault?: string | undefined;
            } & {
                type: import("../../../../common").SOURCE_TYPES.EMS_TMS;
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
                type: import("../../../../common").LAYER_STYLE_TYPE.HEATMAP;
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
            type: import("../../../../common").LAYER_TYPE.HEATMAP;
            sourceDescriptor: Readonly<{
                metrics?: (Readonly<{
                    label?: string | undefined;
                    mask?: Readonly<{} & {
                        value: number;
                        operator: import("../../../../common/constants").MASK_OPERATOR;
                    }> | undefined;
                } & {
                    type: import("../../../../common").AGG_TYPE.COUNT;
                }> | Readonly<{
                    label?: string | undefined;
                    field?: string | undefined;
                    mask?: Readonly<{} & {
                        value: number;
                        operator: import("../../../../common/constants").MASK_OPERATOR;
                    }> | undefined;
                } & {
                    type: import("../../../../common").AGG_TYPE.AVG | import("../../../../common").AGG_TYPE.MAX | import("../../../../common").AGG_TYPE.MIN | import("../../../../common").AGG_TYPE.SUM | import("../../../../common").AGG_TYPE.TERMS | import("../../../../common").AGG_TYPE.UNIQUE_COUNT;
                }> | Readonly<{
                    label?: string | undefined;
                    field?: string | undefined;
                    mask?: Readonly<{} & {
                        value: number;
                        operator: import("../../../../common/constants").MASK_OPERATOR;
                    }> | undefined;
                    percentile?: number | undefined;
                } & {
                    type: import("../../../../common").AGG_TYPE.PERCENTILE;
                }>)[] | undefined;
                applyForceRefresh?: boolean | undefined;
                applyGlobalQuery?: boolean | undefined;
                applyGlobalTime?: boolean | undefined;
            } & {
                id: string;
                type: import("../../../../common").SOURCE_TYPES.ES_GEO_GRID;
                resolution: import("../../../../common/constants").GRID_RESOLUTION;
                indexPatternId: string;
                geoField: string;
                requestType: import("../../../../common/constants").RENDER_AS;
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
            type: import("../../../../common").LAYER_TYPE.LAYER_GROUP;
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
            type: import("../../../../common").LAYER_TYPE.RASTER_TILE;
            sourceDescriptor: Readonly<{} & {
                type: string;
            }> | Readonly<{} & {
                type: import("../../../../common").SOURCE_TYPES.KIBANA_TILEMAP;
            }> | Readonly<{} & {
                type: import("../../../../common").SOURCE_TYPES.WMS;
                layers: string;
                styles: string;
                serviceUrl: string;
            }> | Readonly<{} & {
                type: import("../../../../common").SOURCE_TYPES.EMS_XYZ;
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
                type: import("../../../../common").LAYER_STYLE_TYPE.VECTOR;
                properties: Readonly<{
                    symbolizeAs?: Readonly<{} & {
                        options: Readonly<{
                            value?: import("../../../../common").SYMBOLIZE_AS_TYPES | undefined;
                        } & {}>;
                    }> | undefined;
                    fillColor?: Readonly<{} & {
                        type: import("../../../../common").STYLE_TYPE.STATIC;
                        options: Readonly<{} & {
                            color: string;
                        }>;
                    }> | Readonly<{} & {
                        type: import("../../../../common").STYLE_TYPE.DYNAMIC;
                        options: Readonly<{
                            type?: import("../../../../common").COLOR_MAP_TYPE | undefined;
                            field?: Readonly<{} & {
                                name: string;
                                origin: import("../../../../common").FIELD_ORIGIN;
                            }> | undefined;
                            color?: string | undefined;
                            invert?: boolean | undefined;
                            customColorRamp?: Readonly<{} & {
                                stop: number;
                                color: string;
                            }>[] | undefined;
                            useCustomColorRamp?: boolean | undefined;
                            dataMappingFunction?: import("../../../../common/constants").DATA_MAPPING_FUNCTION | undefined;
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
                        type: import("../../../../common").STYLE_TYPE.STATIC;
                        options: Readonly<{} & {
                            color: string;
                        }>;
                    }> | Readonly<{} & {
                        type: import("../../../../common").STYLE_TYPE.DYNAMIC;
                        options: Readonly<{
                            type?: import("../../../../common").COLOR_MAP_TYPE | undefined;
                            field?: Readonly<{} & {
                                name: string;
                                origin: import("../../../../common").FIELD_ORIGIN;
                            }> | undefined;
                            color?: string | undefined;
                            invert?: boolean | undefined;
                            customColorRamp?: Readonly<{} & {
                                stop: number;
                                color: string;
                            }>[] | undefined;
                            useCustomColorRamp?: boolean | undefined;
                            dataMappingFunction?: import("../../../../common/constants").DATA_MAPPING_FUNCTION | undefined;
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
                        type: import("../../../../common").STYLE_TYPE.STATIC;
                        options: Readonly<{} & {
                            size: number;
                        }>;
                    }> | Readonly<{} & {
                        type: import("../../../../common").STYLE_TYPE.DYNAMIC;
                        options: Readonly<{
                            field?: Readonly<{} & {
                                name: string;
                                origin: import("../../../../common").FIELD_ORIGIN;
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
                        type: import("../../../../common").STYLE_TYPE.STATIC;
                        options: Readonly<{
                            label?: string | undefined;
                            svg?: string | undefined;
                            iconSource?: import("../../../../common/constants").ICON_SOURCE | undefined;
                        } & {
                            value: string;
                        }>;
                    }> | Readonly<{} & {
                        type: import("../../../../common").STYLE_TYPE.DYNAMIC;
                        options: Readonly<{
                            field?: Readonly<{} & {
                                name: string;
                                origin: import("../../../../common").FIELD_ORIGIN;
                            }> | undefined;
                            customIconStops?: Readonly<{
                                iconSource?: import("../../../../common/constants").ICON_SOURCE | undefined;
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
                        type: import("../../../../common").STYLE_TYPE.STATIC;
                        options: Readonly<{} & {
                            size: number;
                        }>;
                    }> | Readonly<{} & {
                        type: import("../../../../common").STYLE_TYPE.DYNAMIC;
                        options: Readonly<{
                            field?: Readonly<{} & {
                                name: string;
                                origin: import("../../../../common").FIELD_ORIGIN;
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
                        type: import("../../../../common").STYLE_TYPE.STATIC;
                        options: Readonly<{} & {
                            orientation: number;
                        }>;
                    }> | Readonly<{} & {
                        type: import("../../../../common").STYLE_TYPE.DYNAMIC;
                        options: Readonly<{
                            field?: Readonly<{} & {
                                name: string;
                                origin: import("../../../../common").FIELD_ORIGIN;
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
                        type: import("../../../../common").STYLE_TYPE.STATIC;
                        options: Readonly<{} & {
                            value: string;
                        }>;
                    }> | Readonly<{} & {
                        type: import("../../../../common").STYLE_TYPE.DYNAMIC;
                        options: Readonly<{
                            field?: Readonly<{} & {
                                name: string;
                                origin: import("../../../../common").FIELD_ORIGIN;
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
                        type: import("../../../../common").STYLE_TYPE.STATIC;
                        options: Readonly<{} & {
                            color: string;
                        }>;
                    }> | Readonly<{} & {
                        type: import("../../../../common").STYLE_TYPE.DYNAMIC;
                        options: Readonly<{
                            type?: import("../../../../common").COLOR_MAP_TYPE | undefined;
                            field?: Readonly<{} & {
                                name: string;
                                origin: import("../../../../common").FIELD_ORIGIN;
                            }> | undefined;
                            color?: string | undefined;
                            invert?: boolean | undefined;
                            customColorRamp?: Readonly<{} & {
                                stop: number;
                                color: string;
                            }>[] | undefined;
                            useCustomColorRamp?: boolean | undefined;
                            dataMappingFunction?: import("../../../../common/constants").DATA_MAPPING_FUNCTION | undefined;
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
                        type: import("../../../../common").STYLE_TYPE.STATIC;
                        options: Readonly<{} & {
                            size: number;
                        }>;
                    }> | Readonly<{} & {
                        type: import("../../../../common").STYLE_TYPE.DYNAMIC;
                        options: Readonly<{
                            field?: Readonly<{} & {
                                name: string;
                                origin: import("../../../../common").FIELD_ORIGIN;
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
                        type: import("../../../../common").STYLE_TYPE.STATIC;
                        options: Readonly<{} & {
                            color: string;
                        }>;
                    }> | Readonly<{} & {
                        type: import("../../../../common").STYLE_TYPE.DYNAMIC;
                        options: Readonly<{
                            type?: import("../../../../common").COLOR_MAP_TYPE | undefined;
                            field?: Readonly<{} & {
                                name: string;
                                origin: import("../../../../common").FIELD_ORIGIN;
                            }> | undefined;
                            color?: string | undefined;
                            invert?: boolean | undefined;
                            customColorRamp?: Readonly<{} & {
                                stop: number;
                                color: string;
                            }>[] | undefined;
                            useCustomColorRamp?: boolean | undefined;
                            dataMappingFunction?: import("../../../../common/constants").DATA_MAPPING_FUNCTION | undefined;
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
                            size: import("../../../../common").LABEL_BORDER_SIZES;
                        }>;
                    }> | undefined;
                    labelPosition?: Readonly<{} & {
                        options: Readonly<{} & {
                            position: import("../../../../common").LABEL_POSITIONS;
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
                            operator: import("../../../../common/constants").MASK_OPERATOR;
                        }> | undefined;
                    } & {
                        type: import("../../../../common").AGG_TYPE.COUNT;
                    }> | Readonly<{
                        label?: string | undefined;
                        field?: string | undefined;
                        mask?: Readonly<{} & {
                            value: number;
                            operator: import("../../../../common/constants").MASK_OPERATOR;
                        }> | undefined;
                    } & {
                        type: import("../../../../common").AGG_TYPE.AVG | import("../../../../common").AGG_TYPE.MAX | import("../../../../common").AGG_TYPE.MIN | import("../../../../common").AGG_TYPE.SUM | import("../../../../common").AGG_TYPE.TERMS | import("../../../../common").AGG_TYPE.UNIQUE_COUNT;
                    }> | Readonly<{
                        label?: string | undefined;
                        field?: string | undefined;
                        mask?: Readonly<{} & {
                            value: number;
                            operator: import("../../../../common/constants").MASK_OPERATOR;
                        }> | undefined;
                        percentile?: number | undefined;
                    } & {
                        type: import("../../../../common").AGG_TYPE.PERCENTILE;
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
                    type: import("../../../../common").SOURCE_TYPES.ES_DISTANCE_SOURCE;
                    distance: number;
                    indexPatternId: string;
                    geoField: string;
                }> | Readonly<{
                    size?: number | undefined;
                    metrics?: (Readonly<{
                        label?: string | undefined;
                        mask?: Readonly<{} & {
                            value: number;
                            operator: import("../../../../common/constants").MASK_OPERATOR;
                        }> | undefined;
                    } & {
                        type: import("../../../../common").AGG_TYPE.COUNT;
                    }> | Readonly<{
                        label?: string | undefined;
                        field?: string | undefined;
                        mask?: Readonly<{} & {
                            value: number;
                            operator: import("../../../../common/constants").MASK_OPERATOR;
                        }> | undefined;
                    } & {
                        type: import("../../../../common").AGG_TYPE.AVG | import("../../../../common").AGG_TYPE.MAX | import("../../../../common").AGG_TYPE.MIN | import("../../../../common").AGG_TYPE.SUM | import("../../../../common").AGG_TYPE.TERMS | import("../../../../common").AGG_TYPE.UNIQUE_COUNT;
                    }> | Readonly<{
                        label?: string | undefined;
                        field?: string | undefined;
                        mask?: Readonly<{} & {
                            value: number;
                            operator: import("../../../../common/constants").MASK_OPERATOR;
                        }> | undefined;
                        percentile?: number | undefined;
                    } & {
                        type: import("../../../../common").AGG_TYPE.PERCENTILE;
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
                    type: import("../../../../common").SOURCE_TYPES.ES_TERM_SOURCE;
                    term: string;
                    indexPatternId: string;
                }>;
            }>[] | undefined;
        } & {
            id: string;
            type: import("../../../../common").LAYER_TYPE.GEOJSON_VECTOR | import("../../../../common").LAYER_TYPE.BLENDED_VECTOR | import("../../../../common").LAYER_TYPE.MVT_VECTOR;
            sourceDescriptor: Readonly<{
                metrics?: (Readonly<{
                    label?: string | undefined;
                    mask?: Readonly<{} & {
                        value: number;
                        operator: import("../../../../common/constants").MASK_OPERATOR;
                    }> | undefined;
                } & {
                    type: import("../../../../common").AGG_TYPE.COUNT;
                }> | Readonly<{
                    label?: string | undefined;
                    field?: string | undefined;
                    mask?: Readonly<{} & {
                        value: number;
                        operator: import("../../../../common/constants").MASK_OPERATOR;
                    }> | undefined;
                } & {
                    type: import("../../../../common").AGG_TYPE.AVG | import("../../../../common").AGG_TYPE.MAX | import("../../../../common").AGG_TYPE.MIN | import("../../../../common").AGG_TYPE.SUM | import("../../../../common").AGG_TYPE.TERMS | import("../../../../common").AGG_TYPE.UNIQUE_COUNT;
                }> | Readonly<{
                    label?: string | undefined;
                    field?: string | undefined;
                    mask?: Readonly<{} & {
                        value: number;
                        operator: import("../../../../common/constants").MASK_OPERATOR;
                    }> | undefined;
                    percentile?: number | undefined;
                } & {
                    type: import("../../../../common").AGG_TYPE.PERCENTILE;
                }>)[] | undefined;
                applyForceRefresh?: boolean | undefined;
                applyGlobalQuery?: boolean | undefined;
                applyGlobalTime?: boolean | undefined;
            } & {
                id: string;
                type: import("../../../../common").SOURCE_TYPES.ES_GEO_GRID;
                resolution: import("../../../../common/constants").GRID_RESOLUTION;
                indexPatternId: string;
                geoField: string;
                requestType: import("../../../../common/constants").RENDER_AS;
            }> | Readonly<{} & {
                type: string;
            }> | Readonly<{
                tooltipProperties?: string[] | undefined;
            } & {
                id: string;
                type: import("../../../../common").SOURCE_TYPES.EMS_FILE;
            }> | Readonly<{
                fields?: Readonly<{} & {
                    name: string;
                    type: import("../../../../common/constants").MVT_FIELD_TYPE;
                }>[] | undefined;
                tooltipProperties?: string[] | undefined;
                maxSourceZoom?: number | undefined;
            } & {
                type: import("../../../../common").SOURCE_TYPES.MVT_SINGLE_LAYER;
                urlTemplate: string;
                layerName: string;
                minSourceZoom: number;
            }> | Readonly<{
                metrics?: (Readonly<{
                    label?: string | undefined;
                    mask?: Readonly<{} & {
                        value: number;
                        operator: import("../../../../common/constants").MASK_OPERATOR;
                    }> | undefined;
                } & {
                    type: import("../../../../common").AGG_TYPE.COUNT;
                }> | Readonly<{
                    label?: string | undefined;
                    field?: string | undefined;
                    mask?: Readonly<{} & {
                        value: number;
                        operator: import("../../../../common/constants").MASK_OPERATOR;
                    }> | undefined;
                } & {
                    type: import("../../../../common").AGG_TYPE.AVG | import("../../../../common").AGG_TYPE.MAX | import("../../../../common").AGG_TYPE.MIN | import("../../../../common").AGG_TYPE.SUM | import("../../../../common").AGG_TYPE.TERMS | import("../../../../common").AGG_TYPE.UNIQUE_COUNT;
                }> | Readonly<{
                    label?: string | undefined;
                    field?: string | undefined;
                    mask?: Readonly<{} & {
                        value: number;
                        operator: import("../../../../common/constants").MASK_OPERATOR;
                    }> | undefined;
                    percentile?: number | undefined;
                } & {
                    type: import("../../../../common").AGG_TYPE.PERCENTILE;
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
                type: import("../../../../common").SOURCE_TYPES.ES_GEO_LINE;
                indexPatternId: string;
                geoField: string;
            }> | Readonly<{
                metrics?: (Readonly<{
                    label?: string | undefined;
                    mask?: Readonly<{} & {
                        value: number;
                        operator: import("../../../../common/constants").MASK_OPERATOR;
                    }> | undefined;
                } & {
                    type: import("../../../../common").AGG_TYPE.COUNT;
                }> | Readonly<{
                    label?: string | undefined;
                    field?: string | undefined;
                    mask?: Readonly<{} & {
                        value: number;
                        operator: import("../../../../common/constants").MASK_OPERATOR;
                    }> | undefined;
                } & {
                    type: import("../../../../common").AGG_TYPE.AVG | import("../../../../common").AGG_TYPE.MAX | import("../../../../common").AGG_TYPE.MIN | import("../../../../common").AGG_TYPE.SUM | import("../../../../common").AGG_TYPE.TERMS | import("../../../../common").AGG_TYPE.UNIQUE_COUNT;
                }> | Readonly<{
                    label?: string | undefined;
                    field?: string | undefined;
                    mask?: Readonly<{} & {
                        value: number;
                        operator: import("../../../../common/constants").MASK_OPERATOR;
                    }> | undefined;
                    percentile?: number | undefined;
                } & {
                    type: import("../../../../common").AGG_TYPE.PERCENTILE;
                }>)[] | undefined;
                applyForceRefresh?: boolean | undefined;
                applyGlobalQuery?: boolean | undefined;
                applyGlobalTime?: boolean | undefined;
            } & {
                id: string;
                type: import("../../../../common").SOURCE_TYPES.ES_PEW_PEW;
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
                scalingType?: import("../../../../common").SCALING_TYPES | undefined;
                topHitsGroupByTimeseries?: boolean | undefined;
                topHitsSplitField?: string | undefined;
            } & {
                id: string;
                type: import("../../../../common").SOURCE_TYPES.ES_SEARCH;
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
                type: import("../../../../common").SOURCE_TYPES.ESQL;
                esql: string;
            }>;
        }> | Readonly<{} & {}>)[] | undefined>;
        openTOCDetails: import("@kbn/config-schema").Type<string[] | undefined>;
        query: import("@kbn/config-schema").Type<Readonly<{} & {
            query: string | Record<string, any>;
            language: string;
        }> | undefined>;
        refreshInterval: import("@kbn/config-schema").Type<Readonly<{} & {
            value: number;
            pause: boolean;
        }> | undefined>;
        settings: import("@kbn/config-schema").Type<Readonly<{
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
            initialLocation?: import("../../../../common").INITIAL_LOCATION | undefined;
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
        } & {}> | undefined>;
        timeFilters: import("@kbn/config-schema").Type<Readonly<{
            mode?: "absolute" | "relative" | undefined;
        } & {
            from: string;
            to: string;
        }> | undefined>;
        title: import("@kbn/config-schema").Type<string>;
        zoom: import("@kbn/config-schema").Type<number | undefined>;
    }>;
    references: import("@kbn/config-schema").Type<Readonly<{} & {
        name: string;
        id: string;
        type: string;
    }>[]>;
    namespaces: import("@kbn/config-schema").Type<string[] | undefined>;
    originId: import("@kbn/config-schema").Type<string | undefined>;
    managed: import("@kbn/config-schema").Type<boolean | undefined>;
}>;
export declare const searchOptionsSchema: import("@kbn/config-schema").Type<Readonly<{
    onlyTitle?: boolean | undefined;
} & {}> | undefined>;
export declare const mapsSearchOptionsSchema: import("@kbn/config-schema").Type<Readonly<{
    onlyTitle?: boolean | undefined;
} & {}> | undefined>;
export declare const mapsCreateOptionsSchema: import("@kbn/config-schema").Type<Readonly<{
    references?: Readonly<{} & {
        name: string;
        id: string;
        type: string;
    }>[] | undefined;
} & {}> | undefined>;
export declare const mapsUpdateOptionsSchema: import("@kbn/config-schema").Type<Readonly<{
    references?: Readonly<{} & {
        name: string;
        id: string;
        type: string;
    }>[] | undefined;
} & {}> | undefined>;
export declare const mapsGetResultSchema: import("@kbn/config-schema").ObjectType<{
    item: import("@kbn/config-schema").ObjectType<{
        id: import("@kbn/config-schema").Type<string>;
        type: import("@kbn/config-schema").Type<string>;
        version: import("@kbn/config-schema").Type<string | undefined>;
        createdAt: import("@kbn/config-schema").Type<string | undefined>;
        updatedAt: import("@kbn/config-schema").Type<string | undefined>;
        createdBy: import("@kbn/config-schema").Type<string | undefined>;
        updatedBy: import("@kbn/config-schema").Type<string | undefined>;
        error: import("@kbn/config-schema").Type<Readonly<{} & {
            metadata: Readonly<{} & {}>;
            error: string;
            message: string;
            statusCode: number;
        }> | undefined>;
        attributes: import("@kbn/config-schema").ObjectType<{
            adHocDataViews: import("@kbn/config-schema").Type<Readonly<{
                name?: string | undefined;
                timeFieldName?: string | undefined;
                allowHidden?: boolean | undefined;
            } & {
                id: string;
                title: string;
            }>[] | undefined>;
            center: import("@kbn/config-schema").Type<Readonly<{} & {
                lat: number;
                lon: number;
            }> | undefined>;
            description: import("@kbn/config-schema").Type<string | undefined>;
            filters: import("@kbn/config-schema").Type<Readonly<{
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
            }>[] | undefined>;
            isLayerTOCOpen: import("@kbn/config-schema").Type<boolean | undefined>;
            layers: import("@kbn/config-schema").Type<(Readonly<{
                locale?: string | undefined;
                query?: Readonly<{} & {
                    query: string | Record<string, any>;
                    language: string;
                }> | undefined;
                label?: string | undefined;
                style?: Readonly<{} & {
                    type: import("../../../../common").LAYER_STYLE_TYPE.EMS_VECTOR_TILE;
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
                type: import("../../../../common").LAYER_TYPE.EMS_VECTOR_TILE;
                sourceDescriptor: Readonly<{
                    id?: string | undefined;
                    isAutoSelect?: boolean | undefined;
                    lightModeDefault?: string | undefined;
                } & {
                    type: import("../../../../common").SOURCE_TYPES.EMS_TMS;
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
                    type: import("../../../../common").LAYER_STYLE_TYPE.HEATMAP;
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
                type: import("../../../../common").LAYER_TYPE.HEATMAP;
                sourceDescriptor: Readonly<{
                    metrics?: (Readonly<{
                        label?: string | undefined;
                        mask?: Readonly<{} & {
                            value: number;
                            operator: import("../../../../common/constants").MASK_OPERATOR;
                        }> | undefined;
                    } & {
                        type: import("../../../../common").AGG_TYPE.COUNT;
                    }> | Readonly<{
                        label?: string | undefined;
                        field?: string | undefined;
                        mask?: Readonly<{} & {
                            value: number;
                            operator: import("../../../../common/constants").MASK_OPERATOR;
                        }> | undefined;
                    } & {
                        type: import("../../../../common").AGG_TYPE.AVG | import("../../../../common").AGG_TYPE.MAX | import("../../../../common").AGG_TYPE.MIN | import("../../../../common").AGG_TYPE.SUM | import("../../../../common").AGG_TYPE.TERMS | import("../../../../common").AGG_TYPE.UNIQUE_COUNT;
                    }> | Readonly<{
                        label?: string | undefined;
                        field?: string | undefined;
                        mask?: Readonly<{} & {
                            value: number;
                            operator: import("../../../../common/constants").MASK_OPERATOR;
                        }> | undefined;
                        percentile?: number | undefined;
                    } & {
                        type: import("../../../../common").AGG_TYPE.PERCENTILE;
                    }>)[] | undefined;
                    applyForceRefresh?: boolean | undefined;
                    applyGlobalQuery?: boolean | undefined;
                    applyGlobalTime?: boolean | undefined;
                } & {
                    id: string;
                    type: import("../../../../common").SOURCE_TYPES.ES_GEO_GRID;
                    resolution: import("../../../../common/constants").GRID_RESOLUTION;
                    indexPatternId: string;
                    geoField: string;
                    requestType: import("../../../../common/constants").RENDER_AS;
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
                type: import("../../../../common").LAYER_TYPE.LAYER_GROUP;
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
                type: import("../../../../common").LAYER_TYPE.RASTER_TILE;
                sourceDescriptor: Readonly<{} & {
                    type: string;
                }> | Readonly<{} & {
                    type: import("../../../../common").SOURCE_TYPES.KIBANA_TILEMAP;
                }> | Readonly<{} & {
                    type: import("../../../../common").SOURCE_TYPES.WMS;
                    layers: string;
                    styles: string;
                    serviceUrl: string;
                }> | Readonly<{} & {
                    type: import("../../../../common").SOURCE_TYPES.EMS_XYZ;
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
                    type: import("../../../../common").LAYER_STYLE_TYPE.VECTOR;
                    properties: Readonly<{
                        symbolizeAs?: Readonly<{} & {
                            options: Readonly<{
                                value?: import("../../../../common").SYMBOLIZE_AS_TYPES | undefined;
                            } & {}>;
                        }> | undefined;
                        fillColor?: Readonly<{} & {
                            type: import("../../../../common").STYLE_TYPE.STATIC;
                            options: Readonly<{} & {
                                color: string;
                            }>;
                        }> | Readonly<{} & {
                            type: import("../../../../common").STYLE_TYPE.DYNAMIC;
                            options: Readonly<{
                                type?: import("../../../../common").COLOR_MAP_TYPE | undefined;
                                field?: Readonly<{} & {
                                    name: string;
                                    origin: import("../../../../common").FIELD_ORIGIN;
                                }> | undefined;
                                color?: string | undefined;
                                invert?: boolean | undefined;
                                customColorRamp?: Readonly<{} & {
                                    stop: number;
                                    color: string;
                                }>[] | undefined;
                                useCustomColorRamp?: boolean | undefined;
                                dataMappingFunction?: import("../../../../common/constants").DATA_MAPPING_FUNCTION | undefined;
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
                            type: import("../../../../common").STYLE_TYPE.STATIC;
                            options: Readonly<{} & {
                                color: string;
                            }>;
                        }> | Readonly<{} & {
                            type: import("../../../../common").STYLE_TYPE.DYNAMIC;
                            options: Readonly<{
                                type?: import("../../../../common").COLOR_MAP_TYPE | undefined;
                                field?: Readonly<{} & {
                                    name: string;
                                    origin: import("../../../../common").FIELD_ORIGIN;
                                }> | undefined;
                                color?: string | undefined;
                                invert?: boolean | undefined;
                                customColorRamp?: Readonly<{} & {
                                    stop: number;
                                    color: string;
                                }>[] | undefined;
                                useCustomColorRamp?: boolean | undefined;
                                dataMappingFunction?: import("../../../../common/constants").DATA_MAPPING_FUNCTION | undefined;
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
                            type: import("../../../../common").STYLE_TYPE.STATIC;
                            options: Readonly<{} & {
                                size: number;
                            }>;
                        }> | Readonly<{} & {
                            type: import("../../../../common").STYLE_TYPE.DYNAMIC;
                            options: Readonly<{
                                field?: Readonly<{} & {
                                    name: string;
                                    origin: import("../../../../common").FIELD_ORIGIN;
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
                            type: import("../../../../common").STYLE_TYPE.STATIC;
                            options: Readonly<{
                                label?: string | undefined;
                                svg?: string | undefined;
                                iconSource?: import("../../../../common/constants").ICON_SOURCE | undefined;
                            } & {
                                value: string;
                            }>;
                        }> | Readonly<{} & {
                            type: import("../../../../common").STYLE_TYPE.DYNAMIC;
                            options: Readonly<{
                                field?: Readonly<{} & {
                                    name: string;
                                    origin: import("../../../../common").FIELD_ORIGIN;
                                }> | undefined;
                                customIconStops?: Readonly<{
                                    iconSource?: import("../../../../common/constants").ICON_SOURCE | undefined;
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
                            type: import("../../../../common").STYLE_TYPE.STATIC;
                            options: Readonly<{} & {
                                size: number;
                            }>;
                        }> | Readonly<{} & {
                            type: import("../../../../common").STYLE_TYPE.DYNAMIC;
                            options: Readonly<{
                                field?: Readonly<{} & {
                                    name: string;
                                    origin: import("../../../../common").FIELD_ORIGIN;
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
                            type: import("../../../../common").STYLE_TYPE.STATIC;
                            options: Readonly<{} & {
                                orientation: number;
                            }>;
                        }> | Readonly<{} & {
                            type: import("../../../../common").STYLE_TYPE.DYNAMIC;
                            options: Readonly<{
                                field?: Readonly<{} & {
                                    name: string;
                                    origin: import("../../../../common").FIELD_ORIGIN;
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
                            type: import("../../../../common").STYLE_TYPE.STATIC;
                            options: Readonly<{} & {
                                value: string;
                            }>;
                        }> | Readonly<{} & {
                            type: import("../../../../common").STYLE_TYPE.DYNAMIC;
                            options: Readonly<{
                                field?: Readonly<{} & {
                                    name: string;
                                    origin: import("../../../../common").FIELD_ORIGIN;
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
                            type: import("../../../../common").STYLE_TYPE.STATIC;
                            options: Readonly<{} & {
                                color: string;
                            }>;
                        }> | Readonly<{} & {
                            type: import("../../../../common").STYLE_TYPE.DYNAMIC;
                            options: Readonly<{
                                type?: import("../../../../common").COLOR_MAP_TYPE | undefined;
                                field?: Readonly<{} & {
                                    name: string;
                                    origin: import("../../../../common").FIELD_ORIGIN;
                                }> | undefined;
                                color?: string | undefined;
                                invert?: boolean | undefined;
                                customColorRamp?: Readonly<{} & {
                                    stop: number;
                                    color: string;
                                }>[] | undefined;
                                useCustomColorRamp?: boolean | undefined;
                                dataMappingFunction?: import("../../../../common/constants").DATA_MAPPING_FUNCTION | undefined;
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
                            type: import("../../../../common").STYLE_TYPE.STATIC;
                            options: Readonly<{} & {
                                size: number;
                            }>;
                        }> | Readonly<{} & {
                            type: import("../../../../common").STYLE_TYPE.DYNAMIC;
                            options: Readonly<{
                                field?: Readonly<{} & {
                                    name: string;
                                    origin: import("../../../../common").FIELD_ORIGIN;
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
                            type: import("../../../../common").STYLE_TYPE.STATIC;
                            options: Readonly<{} & {
                                color: string;
                            }>;
                        }> | Readonly<{} & {
                            type: import("../../../../common").STYLE_TYPE.DYNAMIC;
                            options: Readonly<{
                                type?: import("../../../../common").COLOR_MAP_TYPE | undefined;
                                field?: Readonly<{} & {
                                    name: string;
                                    origin: import("../../../../common").FIELD_ORIGIN;
                                }> | undefined;
                                color?: string | undefined;
                                invert?: boolean | undefined;
                                customColorRamp?: Readonly<{} & {
                                    stop: number;
                                    color: string;
                                }>[] | undefined;
                                useCustomColorRamp?: boolean | undefined;
                                dataMappingFunction?: import("../../../../common/constants").DATA_MAPPING_FUNCTION | undefined;
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
                                size: import("../../../../common").LABEL_BORDER_SIZES;
                            }>;
                        }> | undefined;
                        labelPosition?: Readonly<{} & {
                            options: Readonly<{} & {
                                position: import("../../../../common").LABEL_POSITIONS;
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
                                operator: import("../../../../common/constants").MASK_OPERATOR;
                            }> | undefined;
                        } & {
                            type: import("../../../../common").AGG_TYPE.COUNT;
                        }> | Readonly<{
                            label?: string | undefined;
                            field?: string | undefined;
                            mask?: Readonly<{} & {
                                value: number;
                                operator: import("../../../../common/constants").MASK_OPERATOR;
                            }> | undefined;
                        } & {
                            type: import("../../../../common").AGG_TYPE.AVG | import("../../../../common").AGG_TYPE.MAX | import("../../../../common").AGG_TYPE.MIN | import("../../../../common").AGG_TYPE.SUM | import("../../../../common").AGG_TYPE.TERMS | import("../../../../common").AGG_TYPE.UNIQUE_COUNT;
                        }> | Readonly<{
                            label?: string | undefined;
                            field?: string | undefined;
                            mask?: Readonly<{} & {
                                value: number;
                                operator: import("../../../../common/constants").MASK_OPERATOR;
                            }> | undefined;
                            percentile?: number | undefined;
                        } & {
                            type: import("../../../../common").AGG_TYPE.PERCENTILE;
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
                        type: import("../../../../common").SOURCE_TYPES.ES_DISTANCE_SOURCE;
                        distance: number;
                        indexPatternId: string;
                        geoField: string;
                    }> | Readonly<{
                        size?: number | undefined;
                        metrics?: (Readonly<{
                            label?: string | undefined;
                            mask?: Readonly<{} & {
                                value: number;
                                operator: import("../../../../common/constants").MASK_OPERATOR;
                            }> | undefined;
                        } & {
                            type: import("../../../../common").AGG_TYPE.COUNT;
                        }> | Readonly<{
                            label?: string | undefined;
                            field?: string | undefined;
                            mask?: Readonly<{} & {
                                value: number;
                                operator: import("../../../../common/constants").MASK_OPERATOR;
                            }> | undefined;
                        } & {
                            type: import("../../../../common").AGG_TYPE.AVG | import("../../../../common").AGG_TYPE.MAX | import("../../../../common").AGG_TYPE.MIN | import("../../../../common").AGG_TYPE.SUM | import("../../../../common").AGG_TYPE.TERMS | import("../../../../common").AGG_TYPE.UNIQUE_COUNT;
                        }> | Readonly<{
                            label?: string | undefined;
                            field?: string | undefined;
                            mask?: Readonly<{} & {
                                value: number;
                                operator: import("../../../../common/constants").MASK_OPERATOR;
                            }> | undefined;
                            percentile?: number | undefined;
                        } & {
                            type: import("../../../../common").AGG_TYPE.PERCENTILE;
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
                        type: import("../../../../common").SOURCE_TYPES.ES_TERM_SOURCE;
                        term: string;
                        indexPatternId: string;
                    }>;
                }>[] | undefined;
            } & {
                id: string;
                type: import("../../../../common").LAYER_TYPE.GEOJSON_VECTOR | import("../../../../common").LAYER_TYPE.BLENDED_VECTOR | import("../../../../common").LAYER_TYPE.MVT_VECTOR;
                sourceDescriptor: Readonly<{
                    metrics?: (Readonly<{
                        label?: string | undefined;
                        mask?: Readonly<{} & {
                            value: number;
                            operator: import("../../../../common/constants").MASK_OPERATOR;
                        }> | undefined;
                    } & {
                        type: import("../../../../common").AGG_TYPE.COUNT;
                    }> | Readonly<{
                        label?: string | undefined;
                        field?: string | undefined;
                        mask?: Readonly<{} & {
                            value: number;
                            operator: import("../../../../common/constants").MASK_OPERATOR;
                        }> | undefined;
                    } & {
                        type: import("../../../../common").AGG_TYPE.AVG | import("../../../../common").AGG_TYPE.MAX | import("../../../../common").AGG_TYPE.MIN | import("../../../../common").AGG_TYPE.SUM | import("../../../../common").AGG_TYPE.TERMS | import("../../../../common").AGG_TYPE.UNIQUE_COUNT;
                    }> | Readonly<{
                        label?: string | undefined;
                        field?: string | undefined;
                        mask?: Readonly<{} & {
                            value: number;
                            operator: import("../../../../common/constants").MASK_OPERATOR;
                        }> | undefined;
                        percentile?: number | undefined;
                    } & {
                        type: import("../../../../common").AGG_TYPE.PERCENTILE;
                    }>)[] | undefined;
                    applyForceRefresh?: boolean | undefined;
                    applyGlobalQuery?: boolean | undefined;
                    applyGlobalTime?: boolean | undefined;
                } & {
                    id: string;
                    type: import("../../../../common").SOURCE_TYPES.ES_GEO_GRID;
                    resolution: import("../../../../common/constants").GRID_RESOLUTION;
                    indexPatternId: string;
                    geoField: string;
                    requestType: import("../../../../common/constants").RENDER_AS;
                }> | Readonly<{} & {
                    type: string;
                }> | Readonly<{
                    tooltipProperties?: string[] | undefined;
                } & {
                    id: string;
                    type: import("../../../../common").SOURCE_TYPES.EMS_FILE;
                }> | Readonly<{
                    fields?: Readonly<{} & {
                        name: string;
                        type: import("../../../../common/constants").MVT_FIELD_TYPE;
                    }>[] | undefined;
                    tooltipProperties?: string[] | undefined;
                    maxSourceZoom?: number | undefined;
                } & {
                    type: import("../../../../common").SOURCE_TYPES.MVT_SINGLE_LAYER;
                    urlTemplate: string;
                    layerName: string;
                    minSourceZoom: number;
                }> | Readonly<{
                    metrics?: (Readonly<{
                        label?: string | undefined;
                        mask?: Readonly<{} & {
                            value: number;
                            operator: import("../../../../common/constants").MASK_OPERATOR;
                        }> | undefined;
                    } & {
                        type: import("../../../../common").AGG_TYPE.COUNT;
                    }> | Readonly<{
                        label?: string | undefined;
                        field?: string | undefined;
                        mask?: Readonly<{} & {
                            value: number;
                            operator: import("../../../../common/constants").MASK_OPERATOR;
                        }> | undefined;
                    } & {
                        type: import("../../../../common").AGG_TYPE.AVG | import("../../../../common").AGG_TYPE.MAX | import("../../../../common").AGG_TYPE.MIN | import("../../../../common").AGG_TYPE.SUM | import("../../../../common").AGG_TYPE.TERMS | import("../../../../common").AGG_TYPE.UNIQUE_COUNT;
                    }> | Readonly<{
                        label?: string | undefined;
                        field?: string | undefined;
                        mask?: Readonly<{} & {
                            value: number;
                            operator: import("../../../../common/constants").MASK_OPERATOR;
                        }> | undefined;
                        percentile?: number | undefined;
                    } & {
                        type: import("../../../../common").AGG_TYPE.PERCENTILE;
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
                    type: import("../../../../common").SOURCE_TYPES.ES_GEO_LINE;
                    indexPatternId: string;
                    geoField: string;
                }> | Readonly<{
                    metrics?: (Readonly<{
                        label?: string | undefined;
                        mask?: Readonly<{} & {
                            value: number;
                            operator: import("../../../../common/constants").MASK_OPERATOR;
                        }> | undefined;
                    } & {
                        type: import("../../../../common").AGG_TYPE.COUNT;
                    }> | Readonly<{
                        label?: string | undefined;
                        field?: string | undefined;
                        mask?: Readonly<{} & {
                            value: number;
                            operator: import("../../../../common/constants").MASK_OPERATOR;
                        }> | undefined;
                    } & {
                        type: import("../../../../common").AGG_TYPE.AVG | import("../../../../common").AGG_TYPE.MAX | import("../../../../common").AGG_TYPE.MIN | import("../../../../common").AGG_TYPE.SUM | import("../../../../common").AGG_TYPE.TERMS | import("../../../../common").AGG_TYPE.UNIQUE_COUNT;
                    }> | Readonly<{
                        label?: string | undefined;
                        field?: string | undefined;
                        mask?: Readonly<{} & {
                            value: number;
                            operator: import("../../../../common/constants").MASK_OPERATOR;
                        }> | undefined;
                        percentile?: number | undefined;
                    } & {
                        type: import("../../../../common").AGG_TYPE.PERCENTILE;
                    }>)[] | undefined;
                    applyForceRefresh?: boolean | undefined;
                    applyGlobalQuery?: boolean | undefined;
                    applyGlobalTime?: boolean | undefined;
                } & {
                    id: string;
                    type: import("../../../../common").SOURCE_TYPES.ES_PEW_PEW;
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
                    scalingType?: import("../../../../common").SCALING_TYPES | undefined;
                    topHitsGroupByTimeseries?: boolean | undefined;
                    topHitsSplitField?: string | undefined;
                } & {
                    id: string;
                    type: import("../../../../common").SOURCE_TYPES.ES_SEARCH;
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
                    type: import("../../../../common").SOURCE_TYPES.ESQL;
                    esql: string;
                }>;
            }> | Readonly<{} & {}>)[] | undefined>;
            openTOCDetails: import("@kbn/config-schema").Type<string[] | undefined>;
            query: import("@kbn/config-schema").Type<Readonly<{} & {
                query: string | Record<string, any>;
                language: string;
            }> | undefined>;
            refreshInterval: import("@kbn/config-schema").Type<Readonly<{} & {
                value: number;
                pause: boolean;
            }> | undefined>;
            settings: import("@kbn/config-schema").Type<Readonly<{
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
                initialLocation?: import("../../../../common").INITIAL_LOCATION | undefined;
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
            } & {}> | undefined>;
            timeFilters: import("@kbn/config-schema").Type<Readonly<{
                mode?: "absolute" | "relative" | undefined;
            } & {
                from: string;
                to: string;
            }> | undefined>;
            title: import("@kbn/config-schema").Type<string>;
            zoom: import("@kbn/config-schema").Type<number | undefined>;
        }>;
        references: import("@kbn/config-schema").Type<Readonly<{} & {
            name: string;
            id: string;
            type: string;
        }>[]>;
        namespaces: import("@kbn/config-schema").Type<string[] | undefined>;
        originId: import("@kbn/config-schema").Type<string | undefined>;
        managed: import("@kbn/config-schema").Type<boolean | undefined>;
    }>;
    meta: import("@kbn/config-schema").ObjectType<{
        outcome: import("@kbn/config-schema").Type<"conflict" | "exactMatch" | "aliasMatch">;
        aliasTargetId: import("@kbn/config-schema").Type<string | undefined>;
        aliasPurpose: import("@kbn/config-schema").Type<"savedObjectConversion" | "savedObjectImport" | undefined>;
    }>;
}>;
export declare const mapsCreateResultSchema: import("@kbn/config-schema").ObjectType<{
    item: import("@kbn/config-schema").ObjectType<{
        id: import("@kbn/config-schema").Type<string>;
        type: import("@kbn/config-schema").Type<string>;
        version: import("@kbn/config-schema").Type<string | undefined>;
        createdAt: import("@kbn/config-schema").Type<string | undefined>;
        updatedAt: import("@kbn/config-schema").Type<string | undefined>;
        createdBy: import("@kbn/config-schema").Type<string | undefined>;
        updatedBy: import("@kbn/config-schema").Type<string | undefined>;
        error: import("@kbn/config-schema").Type<Readonly<{} & {
            metadata: Readonly<{} & {}>;
            error: string;
            message: string;
            statusCode: number;
        }> | undefined>;
        attributes: import("@kbn/config-schema").ObjectType<{
            adHocDataViews: import("@kbn/config-schema").Type<Readonly<{
                name?: string | undefined;
                timeFieldName?: string | undefined;
                allowHidden?: boolean | undefined;
            } & {
                id: string;
                title: string;
            }>[] | undefined>;
            center: import("@kbn/config-schema").Type<Readonly<{} & {
                lat: number;
                lon: number;
            }> | undefined>;
            description: import("@kbn/config-schema").Type<string | undefined>;
            filters: import("@kbn/config-schema").Type<Readonly<{
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
            }>[] | undefined>;
            isLayerTOCOpen: import("@kbn/config-schema").Type<boolean | undefined>;
            layers: import("@kbn/config-schema").Type<(Readonly<{
                locale?: string | undefined;
                query?: Readonly<{} & {
                    query: string | Record<string, any>;
                    language: string;
                }> | undefined;
                label?: string | undefined;
                style?: Readonly<{} & {
                    type: import("../../../../common").LAYER_STYLE_TYPE.EMS_VECTOR_TILE;
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
                type: import("../../../../common").LAYER_TYPE.EMS_VECTOR_TILE;
                sourceDescriptor: Readonly<{
                    id?: string | undefined;
                    isAutoSelect?: boolean | undefined;
                    lightModeDefault?: string | undefined;
                } & {
                    type: import("../../../../common").SOURCE_TYPES.EMS_TMS;
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
                    type: import("../../../../common").LAYER_STYLE_TYPE.HEATMAP;
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
                type: import("../../../../common").LAYER_TYPE.HEATMAP;
                sourceDescriptor: Readonly<{
                    metrics?: (Readonly<{
                        label?: string | undefined;
                        mask?: Readonly<{} & {
                            value: number;
                            operator: import("../../../../common/constants").MASK_OPERATOR;
                        }> | undefined;
                    } & {
                        type: import("../../../../common").AGG_TYPE.COUNT;
                    }> | Readonly<{
                        label?: string | undefined;
                        field?: string | undefined;
                        mask?: Readonly<{} & {
                            value: number;
                            operator: import("../../../../common/constants").MASK_OPERATOR;
                        }> | undefined;
                    } & {
                        type: import("../../../../common").AGG_TYPE.AVG | import("../../../../common").AGG_TYPE.MAX | import("../../../../common").AGG_TYPE.MIN | import("../../../../common").AGG_TYPE.SUM | import("../../../../common").AGG_TYPE.TERMS | import("../../../../common").AGG_TYPE.UNIQUE_COUNT;
                    }> | Readonly<{
                        label?: string | undefined;
                        field?: string | undefined;
                        mask?: Readonly<{} & {
                            value: number;
                            operator: import("../../../../common/constants").MASK_OPERATOR;
                        }> | undefined;
                        percentile?: number | undefined;
                    } & {
                        type: import("../../../../common").AGG_TYPE.PERCENTILE;
                    }>)[] | undefined;
                    applyForceRefresh?: boolean | undefined;
                    applyGlobalQuery?: boolean | undefined;
                    applyGlobalTime?: boolean | undefined;
                } & {
                    id: string;
                    type: import("../../../../common").SOURCE_TYPES.ES_GEO_GRID;
                    resolution: import("../../../../common/constants").GRID_RESOLUTION;
                    indexPatternId: string;
                    geoField: string;
                    requestType: import("../../../../common/constants").RENDER_AS;
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
                type: import("../../../../common").LAYER_TYPE.LAYER_GROUP;
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
                type: import("../../../../common").LAYER_TYPE.RASTER_TILE;
                sourceDescriptor: Readonly<{} & {
                    type: string;
                }> | Readonly<{} & {
                    type: import("../../../../common").SOURCE_TYPES.KIBANA_TILEMAP;
                }> | Readonly<{} & {
                    type: import("../../../../common").SOURCE_TYPES.WMS;
                    layers: string;
                    styles: string;
                    serviceUrl: string;
                }> | Readonly<{} & {
                    type: import("../../../../common").SOURCE_TYPES.EMS_XYZ;
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
                    type: import("../../../../common").LAYER_STYLE_TYPE.VECTOR;
                    properties: Readonly<{
                        symbolizeAs?: Readonly<{} & {
                            options: Readonly<{
                                value?: import("../../../../common").SYMBOLIZE_AS_TYPES | undefined;
                            } & {}>;
                        }> | undefined;
                        fillColor?: Readonly<{} & {
                            type: import("../../../../common").STYLE_TYPE.STATIC;
                            options: Readonly<{} & {
                                color: string;
                            }>;
                        }> | Readonly<{} & {
                            type: import("../../../../common").STYLE_TYPE.DYNAMIC;
                            options: Readonly<{
                                type?: import("../../../../common").COLOR_MAP_TYPE | undefined;
                                field?: Readonly<{} & {
                                    name: string;
                                    origin: import("../../../../common").FIELD_ORIGIN;
                                }> | undefined;
                                color?: string | undefined;
                                invert?: boolean | undefined;
                                customColorRamp?: Readonly<{} & {
                                    stop: number;
                                    color: string;
                                }>[] | undefined;
                                useCustomColorRamp?: boolean | undefined;
                                dataMappingFunction?: import("../../../../common/constants").DATA_MAPPING_FUNCTION | undefined;
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
                            type: import("../../../../common").STYLE_TYPE.STATIC;
                            options: Readonly<{} & {
                                color: string;
                            }>;
                        }> | Readonly<{} & {
                            type: import("../../../../common").STYLE_TYPE.DYNAMIC;
                            options: Readonly<{
                                type?: import("../../../../common").COLOR_MAP_TYPE | undefined;
                                field?: Readonly<{} & {
                                    name: string;
                                    origin: import("../../../../common").FIELD_ORIGIN;
                                }> | undefined;
                                color?: string | undefined;
                                invert?: boolean | undefined;
                                customColorRamp?: Readonly<{} & {
                                    stop: number;
                                    color: string;
                                }>[] | undefined;
                                useCustomColorRamp?: boolean | undefined;
                                dataMappingFunction?: import("../../../../common/constants").DATA_MAPPING_FUNCTION | undefined;
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
                            type: import("../../../../common").STYLE_TYPE.STATIC;
                            options: Readonly<{} & {
                                size: number;
                            }>;
                        }> | Readonly<{} & {
                            type: import("../../../../common").STYLE_TYPE.DYNAMIC;
                            options: Readonly<{
                                field?: Readonly<{} & {
                                    name: string;
                                    origin: import("../../../../common").FIELD_ORIGIN;
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
                            type: import("../../../../common").STYLE_TYPE.STATIC;
                            options: Readonly<{
                                label?: string | undefined;
                                svg?: string | undefined;
                                iconSource?: import("../../../../common/constants").ICON_SOURCE | undefined;
                            } & {
                                value: string;
                            }>;
                        }> | Readonly<{} & {
                            type: import("../../../../common").STYLE_TYPE.DYNAMIC;
                            options: Readonly<{
                                field?: Readonly<{} & {
                                    name: string;
                                    origin: import("../../../../common").FIELD_ORIGIN;
                                }> | undefined;
                                customIconStops?: Readonly<{
                                    iconSource?: import("../../../../common/constants").ICON_SOURCE | undefined;
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
                            type: import("../../../../common").STYLE_TYPE.STATIC;
                            options: Readonly<{} & {
                                size: number;
                            }>;
                        }> | Readonly<{} & {
                            type: import("../../../../common").STYLE_TYPE.DYNAMIC;
                            options: Readonly<{
                                field?: Readonly<{} & {
                                    name: string;
                                    origin: import("../../../../common").FIELD_ORIGIN;
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
                            type: import("../../../../common").STYLE_TYPE.STATIC;
                            options: Readonly<{} & {
                                orientation: number;
                            }>;
                        }> | Readonly<{} & {
                            type: import("../../../../common").STYLE_TYPE.DYNAMIC;
                            options: Readonly<{
                                field?: Readonly<{} & {
                                    name: string;
                                    origin: import("../../../../common").FIELD_ORIGIN;
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
                            type: import("../../../../common").STYLE_TYPE.STATIC;
                            options: Readonly<{} & {
                                value: string;
                            }>;
                        }> | Readonly<{} & {
                            type: import("../../../../common").STYLE_TYPE.DYNAMIC;
                            options: Readonly<{
                                field?: Readonly<{} & {
                                    name: string;
                                    origin: import("../../../../common").FIELD_ORIGIN;
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
                            type: import("../../../../common").STYLE_TYPE.STATIC;
                            options: Readonly<{} & {
                                color: string;
                            }>;
                        }> | Readonly<{} & {
                            type: import("../../../../common").STYLE_TYPE.DYNAMIC;
                            options: Readonly<{
                                type?: import("../../../../common").COLOR_MAP_TYPE | undefined;
                                field?: Readonly<{} & {
                                    name: string;
                                    origin: import("../../../../common").FIELD_ORIGIN;
                                }> | undefined;
                                color?: string | undefined;
                                invert?: boolean | undefined;
                                customColorRamp?: Readonly<{} & {
                                    stop: number;
                                    color: string;
                                }>[] | undefined;
                                useCustomColorRamp?: boolean | undefined;
                                dataMappingFunction?: import("../../../../common/constants").DATA_MAPPING_FUNCTION | undefined;
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
                            type: import("../../../../common").STYLE_TYPE.STATIC;
                            options: Readonly<{} & {
                                size: number;
                            }>;
                        }> | Readonly<{} & {
                            type: import("../../../../common").STYLE_TYPE.DYNAMIC;
                            options: Readonly<{
                                field?: Readonly<{} & {
                                    name: string;
                                    origin: import("../../../../common").FIELD_ORIGIN;
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
                            type: import("../../../../common").STYLE_TYPE.STATIC;
                            options: Readonly<{} & {
                                color: string;
                            }>;
                        }> | Readonly<{} & {
                            type: import("../../../../common").STYLE_TYPE.DYNAMIC;
                            options: Readonly<{
                                type?: import("../../../../common").COLOR_MAP_TYPE | undefined;
                                field?: Readonly<{} & {
                                    name: string;
                                    origin: import("../../../../common").FIELD_ORIGIN;
                                }> | undefined;
                                color?: string | undefined;
                                invert?: boolean | undefined;
                                customColorRamp?: Readonly<{} & {
                                    stop: number;
                                    color: string;
                                }>[] | undefined;
                                useCustomColorRamp?: boolean | undefined;
                                dataMappingFunction?: import("../../../../common/constants").DATA_MAPPING_FUNCTION | undefined;
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
                                size: import("../../../../common").LABEL_BORDER_SIZES;
                            }>;
                        }> | undefined;
                        labelPosition?: Readonly<{} & {
                            options: Readonly<{} & {
                                position: import("../../../../common").LABEL_POSITIONS;
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
                                operator: import("../../../../common/constants").MASK_OPERATOR;
                            }> | undefined;
                        } & {
                            type: import("../../../../common").AGG_TYPE.COUNT;
                        }> | Readonly<{
                            label?: string | undefined;
                            field?: string | undefined;
                            mask?: Readonly<{} & {
                                value: number;
                                operator: import("../../../../common/constants").MASK_OPERATOR;
                            }> | undefined;
                        } & {
                            type: import("../../../../common").AGG_TYPE.AVG | import("../../../../common").AGG_TYPE.MAX | import("../../../../common").AGG_TYPE.MIN | import("../../../../common").AGG_TYPE.SUM | import("../../../../common").AGG_TYPE.TERMS | import("../../../../common").AGG_TYPE.UNIQUE_COUNT;
                        }> | Readonly<{
                            label?: string | undefined;
                            field?: string | undefined;
                            mask?: Readonly<{} & {
                                value: number;
                                operator: import("../../../../common/constants").MASK_OPERATOR;
                            }> | undefined;
                            percentile?: number | undefined;
                        } & {
                            type: import("../../../../common").AGG_TYPE.PERCENTILE;
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
                        type: import("../../../../common").SOURCE_TYPES.ES_DISTANCE_SOURCE;
                        distance: number;
                        indexPatternId: string;
                        geoField: string;
                    }> | Readonly<{
                        size?: number | undefined;
                        metrics?: (Readonly<{
                            label?: string | undefined;
                            mask?: Readonly<{} & {
                                value: number;
                                operator: import("../../../../common/constants").MASK_OPERATOR;
                            }> | undefined;
                        } & {
                            type: import("../../../../common").AGG_TYPE.COUNT;
                        }> | Readonly<{
                            label?: string | undefined;
                            field?: string | undefined;
                            mask?: Readonly<{} & {
                                value: number;
                                operator: import("../../../../common/constants").MASK_OPERATOR;
                            }> | undefined;
                        } & {
                            type: import("../../../../common").AGG_TYPE.AVG | import("../../../../common").AGG_TYPE.MAX | import("../../../../common").AGG_TYPE.MIN | import("../../../../common").AGG_TYPE.SUM | import("../../../../common").AGG_TYPE.TERMS | import("../../../../common").AGG_TYPE.UNIQUE_COUNT;
                        }> | Readonly<{
                            label?: string | undefined;
                            field?: string | undefined;
                            mask?: Readonly<{} & {
                                value: number;
                                operator: import("../../../../common/constants").MASK_OPERATOR;
                            }> | undefined;
                            percentile?: number | undefined;
                        } & {
                            type: import("../../../../common").AGG_TYPE.PERCENTILE;
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
                        type: import("../../../../common").SOURCE_TYPES.ES_TERM_SOURCE;
                        term: string;
                        indexPatternId: string;
                    }>;
                }>[] | undefined;
            } & {
                id: string;
                type: import("../../../../common").LAYER_TYPE.GEOJSON_VECTOR | import("../../../../common").LAYER_TYPE.BLENDED_VECTOR | import("../../../../common").LAYER_TYPE.MVT_VECTOR;
                sourceDescriptor: Readonly<{
                    metrics?: (Readonly<{
                        label?: string | undefined;
                        mask?: Readonly<{} & {
                            value: number;
                            operator: import("../../../../common/constants").MASK_OPERATOR;
                        }> | undefined;
                    } & {
                        type: import("../../../../common").AGG_TYPE.COUNT;
                    }> | Readonly<{
                        label?: string | undefined;
                        field?: string | undefined;
                        mask?: Readonly<{} & {
                            value: number;
                            operator: import("../../../../common/constants").MASK_OPERATOR;
                        }> | undefined;
                    } & {
                        type: import("../../../../common").AGG_TYPE.AVG | import("../../../../common").AGG_TYPE.MAX | import("../../../../common").AGG_TYPE.MIN | import("../../../../common").AGG_TYPE.SUM | import("../../../../common").AGG_TYPE.TERMS | import("../../../../common").AGG_TYPE.UNIQUE_COUNT;
                    }> | Readonly<{
                        label?: string | undefined;
                        field?: string | undefined;
                        mask?: Readonly<{} & {
                            value: number;
                            operator: import("../../../../common/constants").MASK_OPERATOR;
                        }> | undefined;
                        percentile?: number | undefined;
                    } & {
                        type: import("../../../../common").AGG_TYPE.PERCENTILE;
                    }>)[] | undefined;
                    applyForceRefresh?: boolean | undefined;
                    applyGlobalQuery?: boolean | undefined;
                    applyGlobalTime?: boolean | undefined;
                } & {
                    id: string;
                    type: import("../../../../common").SOURCE_TYPES.ES_GEO_GRID;
                    resolution: import("../../../../common/constants").GRID_RESOLUTION;
                    indexPatternId: string;
                    geoField: string;
                    requestType: import("../../../../common/constants").RENDER_AS;
                }> | Readonly<{} & {
                    type: string;
                }> | Readonly<{
                    tooltipProperties?: string[] | undefined;
                } & {
                    id: string;
                    type: import("../../../../common").SOURCE_TYPES.EMS_FILE;
                }> | Readonly<{
                    fields?: Readonly<{} & {
                        name: string;
                        type: import("../../../../common/constants").MVT_FIELD_TYPE;
                    }>[] | undefined;
                    tooltipProperties?: string[] | undefined;
                    maxSourceZoom?: number | undefined;
                } & {
                    type: import("../../../../common").SOURCE_TYPES.MVT_SINGLE_LAYER;
                    urlTemplate: string;
                    layerName: string;
                    minSourceZoom: number;
                }> | Readonly<{
                    metrics?: (Readonly<{
                        label?: string | undefined;
                        mask?: Readonly<{} & {
                            value: number;
                            operator: import("../../../../common/constants").MASK_OPERATOR;
                        }> | undefined;
                    } & {
                        type: import("../../../../common").AGG_TYPE.COUNT;
                    }> | Readonly<{
                        label?: string | undefined;
                        field?: string | undefined;
                        mask?: Readonly<{} & {
                            value: number;
                            operator: import("../../../../common/constants").MASK_OPERATOR;
                        }> | undefined;
                    } & {
                        type: import("../../../../common").AGG_TYPE.AVG | import("../../../../common").AGG_TYPE.MAX | import("../../../../common").AGG_TYPE.MIN | import("../../../../common").AGG_TYPE.SUM | import("../../../../common").AGG_TYPE.TERMS | import("../../../../common").AGG_TYPE.UNIQUE_COUNT;
                    }> | Readonly<{
                        label?: string | undefined;
                        field?: string | undefined;
                        mask?: Readonly<{} & {
                            value: number;
                            operator: import("../../../../common/constants").MASK_OPERATOR;
                        }> | undefined;
                        percentile?: number | undefined;
                    } & {
                        type: import("../../../../common").AGG_TYPE.PERCENTILE;
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
                    type: import("../../../../common").SOURCE_TYPES.ES_GEO_LINE;
                    indexPatternId: string;
                    geoField: string;
                }> | Readonly<{
                    metrics?: (Readonly<{
                        label?: string | undefined;
                        mask?: Readonly<{} & {
                            value: number;
                            operator: import("../../../../common/constants").MASK_OPERATOR;
                        }> | undefined;
                    } & {
                        type: import("../../../../common").AGG_TYPE.COUNT;
                    }> | Readonly<{
                        label?: string | undefined;
                        field?: string | undefined;
                        mask?: Readonly<{} & {
                            value: number;
                            operator: import("../../../../common/constants").MASK_OPERATOR;
                        }> | undefined;
                    } & {
                        type: import("../../../../common").AGG_TYPE.AVG | import("../../../../common").AGG_TYPE.MAX | import("../../../../common").AGG_TYPE.MIN | import("../../../../common").AGG_TYPE.SUM | import("../../../../common").AGG_TYPE.TERMS | import("../../../../common").AGG_TYPE.UNIQUE_COUNT;
                    }> | Readonly<{
                        label?: string | undefined;
                        field?: string | undefined;
                        mask?: Readonly<{} & {
                            value: number;
                            operator: import("../../../../common/constants").MASK_OPERATOR;
                        }> | undefined;
                        percentile?: number | undefined;
                    } & {
                        type: import("../../../../common").AGG_TYPE.PERCENTILE;
                    }>)[] | undefined;
                    applyForceRefresh?: boolean | undefined;
                    applyGlobalQuery?: boolean | undefined;
                    applyGlobalTime?: boolean | undefined;
                } & {
                    id: string;
                    type: import("../../../../common").SOURCE_TYPES.ES_PEW_PEW;
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
                    scalingType?: import("../../../../common").SCALING_TYPES | undefined;
                    topHitsGroupByTimeseries?: boolean | undefined;
                    topHitsSplitField?: string | undefined;
                } & {
                    id: string;
                    type: import("../../../../common").SOURCE_TYPES.ES_SEARCH;
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
                    type: import("../../../../common").SOURCE_TYPES.ESQL;
                    esql: string;
                }>;
            }> | Readonly<{} & {}>)[] | undefined>;
            openTOCDetails: import("@kbn/config-schema").Type<string[] | undefined>;
            query: import("@kbn/config-schema").Type<Readonly<{} & {
                query: string | Record<string, any>;
                language: string;
            }> | undefined>;
            refreshInterval: import("@kbn/config-schema").Type<Readonly<{} & {
                value: number;
                pause: boolean;
            }> | undefined>;
            settings: import("@kbn/config-schema").Type<Readonly<{
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
                initialLocation?: import("../../../../common").INITIAL_LOCATION | undefined;
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
            } & {}> | undefined>;
            timeFilters: import("@kbn/config-schema").Type<Readonly<{
                mode?: "absolute" | "relative" | undefined;
            } & {
                from: string;
                to: string;
            }> | undefined>;
            title: import("@kbn/config-schema").Type<string>;
            zoom: import("@kbn/config-schema").Type<number | undefined>;
        }>;
        references: import("@kbn/config-schema").Type<Readonly<{} & {
            name: string;
            id: string;
            type: string;
        }>[]>;
        namespaces: import("@kbn/config-schema").Type<string[] | undefined>;
        originId: import("@kbn/config-schema").Type<string | undefined>;
        managed: import("@kbn/config-schema").Type<boolean | undefined>;
    }>;
}>;
export declare const serviceDefinition: ServicesDefinition;
