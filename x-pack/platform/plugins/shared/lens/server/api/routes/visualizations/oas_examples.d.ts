export declare const createLensVisualizationOASOperationObject: {
    description: string;
    'x-codeSamples': {
        lang: string;
        label: string;
        source: string;
    }[];
    requestBody: {
        content: {
            'application/json': {
                examples: {
                    createMetricVisualization: {
                        summary: string;
                        value: {
                            type: "metric";
                            title: string;
                            data_source: {
                                type: "data_view_spec";
                                index_pattern: string;
                                time_field: string;
                            };
                            sampling: number;
                            ignore_global_filters: false;
                            metrics: {
                                type: "primary";
                                operation: "count";
                                empty_as_null: false;
                            }[];
                        };
                    };
                    createXYVisualization: {
                        summary: string;
                        value: {
                            type: "xy";
                            title: string;
                            layers: {
                                type: "line";
                                data_source: {
                                    type: "data_view_spec";
                                    index_pattern: string;
                                    time_field: string;
                                };
                                sampling: number;
                                ignore_global_filters: false;
                                x: {
                                    operation: "date_histogram";
                                    field: string;
                                    suggested_interval: string;
                                    use_original_time_range: false;
                                    include_empty_rows: true;
                                    drop_partial_intervals: false;
                                };
                                y: {
                                    operation: "count";
                                    empty_as_null: false;
                                }[];
                            }[];
                        };
                    };
                    createPieVisualization: {
                        summary: string;
                        value: {
                            type: "pie";
                            title: string;
                            data_source: {
                                type: "data_view_spec";
                                index_pattern: string;
                                time_field: string;
                            };
                            sampling: number;
                            ignore_global_filters: false;
                            metrics: {
                                operation: "count";
                                empty_as_null: false;
                            }[];
                            group_by: {
                                operation: "terms";
                                fields: string[];
                                limit: number;
                            }[];
                            styling: {
                                values: {
                                    visible: true;
                                    mode: "percentage";
                                };
                                donut_hole: "m";
                                labels: {
                                    visible: true;
                                    position: "outside";
                                };
                            };
                        };
                    };
                    createDataTableVisualization: {
                        summary: string;
                        value: {
                            type: "data_table";
                            title: string;
                            data_source: {
                                type: "data_view_spec";
                                index_pattern: string;
                                time_field: string;
                            };
                            sampling: number;
                            ignore_global_filters: false;
                            metrics: {
                                operation: "count";
                                empty_as_null: false;
                            }[];
                            rows: {
                                operation: "terms";
                                fields: string[];
                                limit: number;
                            }[];
                        };
                    };
                    createDataViewReferenceVisualization: {
                        summary: string;
                        value: {
                            type: "metric";
                            title: string;
                            data_source: {
                                type: "data_view_reference";
                                ref_id: string;
                            };
                            sampling: number;
                            ignore_global_filters: false;
                            metrics: {
                                type: "primary";
                                operation: "count";
                                empty_as_null: false;
                            }[];
                        };
                    };
                };
            };
        };
    };
    responses: {
        201: {
            content: {
                'application/json': {
                    examples: {
                        createMetricVisualizationResponse: {
                            summary: string;
                            description: string;
                            value: {
                                id: string;
                                data: {
                                    title: string;
                                    data_source: {
                                        type: "data_view_spec";
                                        index_pattern: string;
                                        time_field: string;
                                    };
                                    type: "metric";
                                    sampling: number;
                                    ignore_global_filters: false;
                                    metrics: {
                                        type: "primary";
                                        operation: "count";
                                        empty_as_null: false;
                                    }[];
                                    styling: {
                                        primary: {
                                            position: "bottom";
                                            labels: {
                                                alignment: "left";
                                            };
                                            value: {
                                                sizing: "auto";
                                                alignment: "right";
                                            };
                                        };
                                    };
                                };
                                meta: {
                                    created_at: string;
                                    managed: false;
                                    updated_at: string;
                                    version: string;
                                };
                            };
                        };
                        createXYVisualizationResponse: {
                            summary: string;
                            description: string;
                            value: {
                                id: string;
                                data: {
                                    title: string;
                                    type: "xy";
                                    layers: {
                                        type: "line";
                                        data_source: {
                                            type: "data_view_spec";
                                            index_pattern: string;
                                            time_field: string;
                                        };
                                        sampling: number;
                                        ignore_global_filters: false;
                                        x: {
                                            operation: "date_histogram";
                                            field: string;
                                            suggested_interval: string;
                                            use_original_time_range: false;
                                            include_empty_rows: true;
                                            drop_partial_intervals: false;
                                        };
                                        y: {
                                            operation: "count";
                                            empty_as_null: false;
                                            axis: "y";
                                        }[];
                                    }[];
                                    axis: {
                                        x: {
                                            title: {
                                                visible: true;
                                            };
                                            ticks: {
                                                visible: true;
                                            };
                                            grid: {
                                                visible: true;
                                            };
                                            domain: {
                                                type: "fit";
                                                rounding: false;
                                            };
                                            labels: {
                                                orientation: "horizontal";
                                            };
                                        };
                                        y: {
                                            title: {
                                                visible: true;
                                            };
                                            scale: "linear";
                                            ticks: {
                                                visible: true;
                                            };
                                            grid: {
                                                visible: true;
                                            };
                                            domain: {
                                                type: "full";
                                                rounding: true;
                                            };
                                            labels: {
                                                orientation: "horizontal";
                                            };
                                        };
                                    };
                                    styling: {
                                        overlays: {
                                            partial_buckets: {
                                                visible: false;
                                            };
                                            current_time_marker: {
                                                visible: false;
                                            };
                                        };
                                        interpolation: "linear";
                                        points: {
                                            visibility: "auto";
                                        };
                                    };
                                    legend: {
                                        visibility: "hidden";
                                        placement: "outside";
                                        position: "right";
                                        layout: {
                                            type: "grid";
                                            truncate: {
                                                max_lines: number;
                                            };
                                        };
                                    };
                                };
                                meta: {
                                    created_at: string;
                                    managed: false;
                                    updated_at: string;
                                    version: string;
                                };
                            };
                        };
                        createPieVisualizationResponse: {
                            summary: string;
                            description: string;
                            value: {
                                id: string;
                                data: {
                                    title: string;
                                    type: "pie";
                                    sampling: number;
                                    ignore_global_filters: false;
                                    metrics: {
                                        operation: "count";
                                        empty_as_null: false;
                                    }[];
                                    group_by: {
                                        operation: "terms";
                                        fields: string[];
                                        limit: number;
                                        rank_by: {
                                            type: "metric";
                                            metric_index: number;
                                            direction: "desc";
                                        };
                                    }[];
                                    data_source: {
                                        type: "data_view_spec";
                                        index_pattern: string;
                                        time_field: string;
                                    };
                                    legend: {
                                        visibility: "auto";
                                    };
                                    styling: {
                                        values: {
                                            visible: true;
                                            mode: "percentage";
                                        };
                                        donut_hole: "m";
                                        labels: {
                                            visible: true;
                                            position: "outside";
                                        };
                                    };
                                };
                                meta: {
                                    created_at: string;
                                    managed: false;
                                    updated_at: string;
                                    version: string;
                                };
                            };
                        };
                        createDataTableVisualizationResponse: {
                            summary: string;
                            description: string;
                            value: {
                                id: string;
                                data: {
                                    title: string;
                                    type: "data_table";
                                    data_source: {
                                        type: "data_view_spec";
                                        index_pattern: string;
                                        time_field: string;
                                    };
                                    sampling: number;
                                    ignore_global_filters: false;
                                    metrics: {
                                        operation: "count";
                                        empty_as_null: false;
                                    }[];
                                    rows: {
                                        operation: "terms";
                                        fields: string[];
                                        limit: number;
                                        rank_by: {
                                            type: "metric";
                                            metric_index: number;
                                            direction: "desc";
                                        };
                                    }[];
                                };
                                meta: {
                                    created_at: string;
                                    managed: false;
                                    updated_at: string;
                                    version: string;
                                };
                            };
                        };
                        createDataViewReferenceResponse: {
                            summary: string;
                            description: string;
                            value: {
                                id: string;
                                data: {
                                    title: string;
                                    data_source: {
                                        type: "data_view_reference";
                                        ref_id: string;
                                    };
                                    type: "metric";
                                    sampling: number;
                                    ignore_global_filters: false;
                                    metrics: {
                                        type: "primary";
                                        operation: "count";
                                        empty_as_null: false;
                                    }[];
                                    styling: {
                                        primary: {
                                            position: "bottom";
                                            labels: {
                                                alignment: "left";
                                            };
                                            value: {
                                                sizing: "auto";
                                                alignment: "right";
                                            };
                                        };
                                    };
                                };
                                meta: {
                                    created_at: string;
                                    managed: false;
                                    updated_at: string;
                                    version: string;
                                };
                            };
                        };
                    };
                };
            };
        };
    };
};
export declare const searchLensVisualizationOASOperationObject: {
    'x-codeSamples': {
        lang: string;
        label: string;
        source: string;
    }[];
    responses: {
        200: {
            content: {
                'application/json': {
                    examples: {
                        searchVisualizationsResponse: {
                            summary: string;
                            description: string;
                            value: {
                                data: ({
                                    id: string;
                                    data: {
                                        title: string;
                                        data_source: {
                                            type: "data_view_spec";
                                            index_pattern: string;
                                            time_field: string;
                                        };
                                        type: "metric";
                                        sampling: number;
                                        ignore_global_filters: false;
                                        metrics: {
                                            type: "primary";
                                            operation: "count";
                                            empty_as_null: false;
                                        }[];
                                        styling: {
                                            primary: {
                                                position: "bottom";
                                                labels: {
                                                    alignment: "left";
                                                };
                                                value: {
                                                    sizing: "auto";
                                                    alignment: "right";
                                                };
                                            };
                                            overlays?: undefined;
                                            interpolation?: undefined;
                                            points?: undefined;
                                        };
                                        layers?: undefined;
                                        axis?: undefined;
                                        legend?: undefined;
                                    };
                                    meta: {
                                        created_at: string;
                                        managed: false;
                                        updated_at: string;
                                        version: string;
                                    };
                                } | {
                                    id: string;
                                    data: {
                                        title: string;
                                        type: "xy";
                                        layers: {
                                            type: "line";
                                            data_source: {
                                                type: "data_view_spec";
                                                index_pattern: string;
                                                time_field: string;
                                            };
                                            sampling: number;
                                            ignore_global_filters: false;
                                            x: {
                                                operation: "date_histogram";
                                                field: string;
                                                suggested_interval: string;
                                                use_original_time_range: false;
                                                include_empty_rows: true;
                                                drop_partial_intervals: false;
                                            };
                                            y: {
                                                operation: "count";
                                                empty_as_null: false;
                                                axis: "y";
                                            }[];
                                        }[];
                                        axis: {
                                            x: {
                                                title: {
                                                    visible: true;
                                                };
                                                ticks: {
                                                    visible: true;
                                                };
                                                grid: {
                                                    visible: true;
                                                };
                                                domain: {
                                                    type: "fit";
                                                    rounding: false;
                                                };
                                                labels: {
                                                    orientation: "horizontal";
                                                };
                                            };
                                            y: {
                                                title: {
                                                    visible: true;
                                                };
                                                scale: "linear";
                                                ticks: {
                                                    visible: true;
                                                };
                                                grid: {
                                                    visible: true;
                                                };
                                                domain: {
                                                    type: "full";
                                                    rounding: true;
                                                };
                                                labels: {
                                                    orientation: "horizontal";
                                                };
                                            };
                                        };
                                        styling: {
                                            overlays: {
                                                partial_buckets: {
                                                    visible: false;
                                                };
                                                current_time_marker: {
                                                    visible: false;
                                                };
                                            };
                                            interpolation: "linear";
                                            points: {
                                                visibility: "auto";
                                            };
                                            primary?: undefined;
                                        };
                                        legend: {
                                            visibility: "hidden";
                                            placement: "outside";
                                            position: "right";
                                            layout: {
                                                type: "grid";
                                                truncate: {
                                                    max_lines: number;
                                                };
                                            };
                                        };
                                        data_source?: undefined;
                                        sampling?: undefined;
                                        ignore_global_filters?: undefined;
                                        metrics?: undefined;
                                    };
                                    meta: {
                                        created_at: string;
                                        managed: false;
                                        updated_at: string;
                                        version: string;
                                    };
                                })[];
                                meta: {
                                    page: number;
                                    per_page: number;
                                    total: number;
                                };
                            };
                        };
                    };
                };
            };
        };
    };
};
export declare const readLensVisualizationOASOperationObject: {
    'x-codeSamples': {
        lang: string;
        label: string;
        source: string;
    }[];
    responses: {
        200: {
            content: {
                'application/json': {
                    examples: {
                        getVisualizationResponse: {
                            summary: string;
                            description: string;
                            value: {
                                id: string;
                                data: {
                                    title: string;
                                    data_source: {
                                        type: "data_view_spec";
                                        index_pattern: string;
                                        time_field: string;
                                    };
                                    type: "metric";
                                    sampling: number;
                                    ignore_global_filters: false;
                                    metrics: {
                                        type: "primary";
                                        operation: "count";
                                        empty_as_null: false;
                                    }[];
                                    styling: {
                                        primary: {
                                            position: "bottom";
                                            labels: {
                                                alignment: "left";
                                            };
                                            value: {
                                                sizing: "auto";
                                                alignment: "right";
                                            };
                                        };
                                    };
                                };
                                meta: {
                                    created_at: string;
                                    managed: false;
                                    updated_at: string;
                                    version: string;
                                };
                            };
                        };
                    };
                };
            };
        };
    };
};
export declare const updateLensVisualizationOASOperationObject: {
    'x-codeSamples': {
        lang: string;
        label: string;
        source: string;
    }[];
    requestBody: {
        content: {
            'application/json': {
                examples: {
                    updateVisualization: {
                        summary: string;
                        value: {
                            type: "metric";
                            title: string;
                            data_source: {
                                type: "data_view_spec";
                                index_pattern: string;
                                time_field: string;
                            };
                            sampling: number;
                            ignore_global_filters: false;
                            metrics: {
                                type: "primary";
                                operation: "count";
                                empty_as_null: false;
                            }[];
                        };
                    };
                };
            };
        };
    };
    responses: {
        200: {
            content: {
                'application/json': {
                    examples: {
                        updateVisualizationResponse: {
                            summary: string;
                            description: string;
                            value: {
                                id: string;
                                data: {
                                    title: string;
                                    data_source: {
                                        type: "data_view_spec";
                                        index_pattern: string;
                                        time_field: string;
                                    };
                                    type: "metric";
                                    sampling: number;
                                    ignore_global_filters: false;
                                    metrics: {
                                        type: "primary";
                                        operation: "count";
                                        empty_as_null: false;
                                    }[];
                                    styling: {
                                        primary: {
                                            position: "bottom";
                                            labels: {
                                                alignment: "left";
                                            };
                                            value: {
                                                sizing: "auto";
                                                alignment: "right";
                                            };
                                        };
                                    };
                                };
                                meta: {
                                    created_at: string;
                                    managed: false;
                                    updated_at: string;
                                    version: string;
                                };
                            };
                        };
                    };
                };
            };
        };
        201: {
            content: {
                'application/json': {
                    examples: {
                        createdVisualizationResponse: {
                            summary: string;
                            description: string;
                            value: {
                                id: string;
                                data: {
                                    title: string;
                                    data_source: {
                                        type: "data_view_spec";
                                        index_pattern: string;
                                        time_field: string;
                                    };
                                    type: "metric";
                                    sampling: number;
                                    ignore_global_filters: false;
                                    metrics: {
                                        type: "primary";
                                        operation: "count";
                                        empty_as_null: false;
                                    }[];
                                    styling: {
                                        primary: {
                                            position: "bottom";
                                            labels: {
                                                alignment: "left";
                                            };
                                            value: {
                                                sizing: "auto";
                                                alignment: "right";
                                            };
                                        };
                                    };
                                };
                                meta: {
                                    created_at: string;
                                    managed: false;
                                    updated_at: string;
                                    version: string;
                                };
                            };
                        };
                    };
                };
            };
        };
    };
};
export declare const deleteLensVisualizationOASOperationObject: {
    'x-codeSamples': {
        lang: string;
        label: string;
        source: string;
    }[];
};
