import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
/**
 * Central registry for all supported chart types.
 *
 * To add a new chart type:
 * 1. Add its value to the `SupportedChartType` enum in agent-builder-common
 * 2. Ensure the ESQL schema is exported from kbn-lens-embeddable-utils
 * 3. Add one entry here with the schema import and LLM guidance
 *
 * TypeScript enforces exhaustiveness via `satisfies Record<SupportedChartType, ...>` —
 * a missing entry is a compile error.
 */
export declare const chartTypeRegistry: {
    metric: {
        schema: import("@kbn/config-schema").ObjectType<{
            metrics: import("@kbn/config-schema").Type<(Readonly<{
                color?: Readonly<{} & {
                    shift: boolean;
                    type: "legacy_dynamic";
                    palette: string;
                    range: "absolute" | "percentage";
                    steps: Readonly<{
                        lt?: number | null | undefined;
                        gte?: number | null | undefined;
                        lte?: number | null | undefined;
                    } & {
                        color: string;
                    }>[];
                }> | Readonly<{} & {
                    type: "dynamic";
                    range: "absolute";
                    steps: Readonly<{
                        lt?: number | null | undefined;
                        gte?: number | null | undefined;
                        lte?: number | null | undefined;
                    } & {
                        color: string;
                    }>[];
                }> | Readonly<{} & {
                    type: "dynamic";
                    range: "percentage";
                    steps: Readonly<{
                        lt?: number | null | undefined;
                        gte?: number | null | undefined;
                        lte?: number | null | undefined;
                    } & {
                        color: string;
                    }>[];
                }> | Readonly<{} & {
                    color: string;
                    type: "static";
                }> | undefined;
                position?: "top" | "bottom" | undefined;
                label?: string | undefined;
                icon?: Readonly<{} & {
                    align: "left" | "right";
                    name: string;
                }> | undefined;
                format?: Readonly<{
                    suffix?: string | undefined;
                } & {
                    type: "number" | "percent";
                    compact: boolean;
                    decimals: number;
                }> | Readonly<{
                    suffix?: string | undefined;
                } & {
                    type: "bytes" | "bits";
                    decimals: number;
                }> | Readonly<{
                    suffix?: string | undefined;
                } & {
                    type: "duration";
                    from: string;
                    to: string;
                }> | Readonly<{} & {
                    pattern: string;
                    type: "custom";
                }> | undefined;
                apply_color_to?: "background" | "value" | undefined;
                background_chart?: Readonly<{
                    direction?: "horizontal" | "vertical" | undefined;
                } & {
                    type: "bar";
                    max_value: Readonly<{} & {
                        operation: "value";
                        column: string;
                    }>;
                }> | undefined;
                sub_label?: string | undefined;
                title_weight?: "bold" | "normal" | undefined;
            } & {
                type: "primary";
                operation: "value";
                column: string;
                fit: boolean;
                alignments: Readonly<{} & {
                    value: "left" | "right" | "center";
                    labels: "left" | "right" | "center";
                }>;
            }> | Readonly<{
                prefix?: string | undefined;
                color?: Readonly<{} & {
                    color: string;
                    type: "static";
                }> | undefined;
                label?: string | undefined;
                compare?: Readonly<{
                    value?: boolean | undefined;
                    icon?: boolean | undefined;
                    palette?: string | undefined;
                } & {
                    baseline: number;
                    to: "baseline";
                }> | Readonly<{
                    value?: boolean | undefined;
                    icon?: boolean | undefined;
                    palette?: string | undefined;
                } & {
                    to: "primary";
                }> | undefined;
                format?: Readonly<{
                    suffix?: string | undefined;
                } & {
                    type: "number" | "percent";
                    compact: boolean;
                    decimals: number;
                }> | Readonly<{
                    suffix?: string | undefined;
                } & {
                    type: "bytes" | "bits";
                    decimals: number;
                }> | Readonly<{
                    suffix?: string | undefined;
                } & {
                    type: "duration";
                    from: string;
                    to: string;
                }> | Readonly<{} & {
                    pattern: string;
                    type: "custom";
                }> | undefined;
                alignments?: Readonly<{} & {
                    value: "left" | "right" | "center";
                }> | undefined;
            } & {
                type: "secondary";
                operation: "value";
                column: string;
                label_position: "after" | "before";
            }>)[]>;
            breakdown_by: import("@kbn/config-schema").Type<Readonly<{
                collapse_by?: "max" | "min" | "avg" | "sum" | undefined;
            } & {
                columns: number;
                operation: "value";
                column: string;
            }> | undefined>;
            dataset: import("@kbn/config-schema").Type<Readonly<{} & {
                type: "esql";
                query: string;
            }> | Readonly<{
                table?: any;
            } & {
                type: "table";
            }>>;
            ignore_global_filters: import("@kbn/config-schema").Type<boolean>;
            sampling: import("@kbn/config-schema").Type<number>;
            title: import("@kbn/config-schema").Type<string | undefined>;
            description: import("@kbn/config-schema").Type<string | undefined>;
            filters: import("@kbn/config-schema").Type<import("@kbn/config-schema/src/types").ObjectResultUnionType<(Omit<{
                disabled: import("@kbn/config-schema").Type<boolean | undefined>;
                negate: import("@kbn/config-schema").Type<boolean | undefined>;
                controlled_by: import("@kbn/config-schema").Type<string | undefined>;
                data_view_id: import("@kbn/config-schema").Type<string | undefined>;
                label: import("@kbn/config-schema").Type<string | undefined>;
                is_multi_index: import("@kbn/config-schema").Type<boolean | undefined>;
            }, "type" | "condition"> & {
                type: import("@kbn/config-schema").Type<"condition">;
                condition: import("@kbn/config-schema").Type<import("@kbn/config-schema/src/types").ObjectResultUnionType<(Omit<{
                    field: import("@kbn/config-schema").Type<string>;
                    negate: import("@kbn/config-schema").Type<boolean | undefined>;
                }, "value" | "operator"> & {
                    value: import("@kbn/config-schema").Type<string | number | boolean>;
                    operator: import("@kbn/config-schema").Type<"is">;
                }) | (Omit<{
                    field: import("@kbn/config-schema").Type<string>;
                    negate: import("@kbn/config-schema").Type<boolean | undefined>;
                }, "value" | "operator"> & {
                    value: import("@kbn/config-schema").Type<number[] | string[] | boolean[]>;
                    operator: import("@kbn/config-schema").Type<"is_one_of">;
                }) | (Omit<{
                    field: import("@kbn/config-schema").Type<string>;
                    negate: import("@kbn/config-schema").Type<boolean | undefined>;
                }, "value" | "operator"> & {
                    value: import("@kbn/config-schema").ObjectType<{
                        gte: import("@kbn/config-schema").Type<string | number | undefined>;
                        lte: import("@kbn/config-schema").Type<string | number | undefined>;
                        gt: import("@kbn/config-schema").Type<string | number | undefined>;
                        lt: import("@kbn/config-schema").Type<string | number | undefined>;
                        format: import("@kbn/config-schema").Type<string | undefined>;
                    }>;
                    operator: import("@kbn/config-schema").Type<"range">;
                }) | (Omit<{
                    field: import("@kbn/config-schema").Type<string>;
                    negate: import("@kbn/config-schema").Type<boolean | undefined>;
                }, "operator"> & {
                    operator: import("@kbn/config-schema").Type<"exists">;
                })>>;
            }) | (Omit<{
                disabled: import("@kbn/config-schema").Type<boolean | undefined>;
                negate: import("@kbn/config-schema").Type<boolean | undefined>;
                controlled_by: import("@kbn/config-schema").Type<string | undefined>;
                data_view_id: import("@kbn/config-schema").Type<string | undefined>;
                label: import("@kbn/config-schema").Type<string | undefined>;
                is_multi_index: import("@kbn/config-schema").Type<boolean | undefined>;
            }, "group" | "type"> & {
                group: import("@kbn/config-schema").ObjectType<{
                    operator: import("@kbn/config-schema").Type<"and" | "or">;
                    conditions: import("@kbn/config-schema").Type<(import("@kbn/config-schema/src/types").ObjectResultUnionType<(Omit<{
                        field: import("@kbn/config-schema").Type<string>;
                        negate: import("@kbn/config-schema").Type<boolean | undefined>;
                    }, "value" | "operator"> & {
                        value: import("@kbn/config-schema").Type<string | number | boolean>;
                        operator: import("@kbn/config-schema").Type<"is">;
                    }) | (Omit<{
                        field: import("@kbn/config-schema").Type<string>;
                        negate: import("@kbn/config-schema").Type<boolean | undefined>;
                    }, "value" | "operator"> & {
                        value: import("@kbn/config-schema").Type<number[] | string[] | boolean[]>;
                        operator: import("@kbn/config-schema").Type<"is_one_of">;
                    }) | (Omit<{
                        field: import("@kbn/config-schema").Type<string>;
                        negate: import("@kbn/config-schema").Type<boolean | undefined>;
                    }, "value" | "operator"> & {
                        value: import("@kbn/config-schema").ObjectType<{
                            gte: import("@kbn/config-schema").Type<string | number | undefined>;
                            lte: import("@kbn/config-schema").Type<string | number | undefined>;
                            gt: import("@kbn/config-schema").Type<string | number | undefined>;
                            lt: import("@kbn/config-schema").Type<string | number | undefined>;
                            format: import("@kbn/config-schema").Type<string | undefined>;
                        }>;
                        operator: import("@kbn/config-schema").Type<"range">;
                    }) | (Omit<{
                        field: import("@kbn/config-schema").Type<string>;
                        negate: import("@kbn/config-schema").Type<boolean | undefined>;
                    }, "operator"> & {
                        operator: import("@kbn/config-schema").Type<"exists">;
                    })> | import("@kbn/as-code-filters-schema").AsCodeGroupFilterRecursive)[]>;
                }>;
                type: import("@kbn/config-schema").Type<"group">;
            }) | (Omit<{
                disabled: import("@kbn/config-schema").Type<boolean | undefined>;
                negate: import("@kbn/config-schema").Type<boolean | undefined>;
                controlled_by: import("@kbn/config-schema").Type<string | undefined>;
                data_view_id: import("@kbn/config-schema").Type<string | undefined>;
                label: import("@kbn/config-schema").Type<string | undefined>;
                is_multi_index: import("@kbn/config-schema").Type<boolean | undefined>;
            }, "field" | "type" | "params" | "dsl"> & {
                field: import("@kbn/config-schema").Type<string | undefined>;
                type: import("@kbn/config-schema").Type<"dsl">;
                params: import("@kbn/config-schema").Type<any>;
                dsl: import("@kbn/config-schema").Type<Record<string, any>>;
            }) | (Omit<{
                disabled: import("@kbn/config-schema").Type<boolean | undefined>;
                negate: import("@kbn/config-schema").Type<boolean | undefined>;
                controlled_by: import("@kbn/config-schema").Type<string | undefined>;
                data_view_id: import("@kbn/config-schema").Type<string | undefined>;
                label: import("@kbn/config-schema").Type<string | undefined>;
                is_multi_index: import("@kbn/config-schema").Type<boolean | undefined>;
            }, "type" | "dsl"> & {
                type: import("@kbn/config-schema").Type<"spatial">;
                dsl: import("@kbn/config-schema").Type<Record<string, any>>;
            })>[] | undefined>;
            type: import("@kbn/config-schema").Type<"metric">;
        }>;
        guidance: {
            description: string;
            guideline: string;
        };
    };
    gauge: {
        schema: import("@kbn/config-schema").ObjectType<{
            metric: import("@kbn/config-schema").ObjectType<Omit<Omit<{
                label: import("@kbn/config-schema").Type<string | undefined>;
                format: import("@kbn/config-schema").Type<Readonly<{
                    suffix?: string | undefined;
                } & {
                    type: "number" | "percent";
                    compact: boolean;
                    decimals: number;
                }> | Readonly<{
                    suffix?: string | undefined;
                } & {
                    type: "bytes" | "bits";
                    decimals: number;
                }> | Readonly<{
                    suffix?: string | undefined;
                } & {
                    type: "duration";
                    from: string;
                    to: string;
                }> | Readonly<{} & {
                    pattern: string;
                    type: "custom";
                }> | undefined>;
            }, "operation" | "column"> & {
                operation: import("@kbn/config-schema").Type<"value">;
                column: import("@kbn/config-schema").Type<string>;
            }, "title" | "color" | "max" | "min" | "hide_title" | "ticks" | "goal" | "sub_title"> & {
                title: import("@kbn/config-schema").Type<string | undefined>;
                color: import("@kbn/config-schema").Type<Readonly<{} & {
                    shift: boolean;
                    type: "legacy_dynamic";
                    palette: string;
                    range: "absolute" | "percentage";
                    steps: Readonly<{
                        lt?: number | null | undefined;
                        gte?: number | null | undefined;
                        lte?: number | null | undefined;
                    } & {
                        color: string;
                    }>[];
                }> | Readonly<{} & {
                    type: "dynamic";
                    range: "absolute";
                    steps: Readonly<{
                        lt?: number | null | undefined;
                        gte?: number | null | undefined;
                        lte?: number | null | undefined;
                    } & {
                        color: string;
                    }>[];
                }> | Readonly<{} & {
                    type: "dynamic";
                    range: "percentage";
                    steps: Readonly<{
                        lt?: number | null | undefined;
                        gte?: number | null | undefined;
                        lte?: number | null | undefined;
                    } & {
                        color: string;
                    }>[];
                }> | undefined>;
                max: import("@kbn/config-schema").Type<Readonly<{} & {
                    operation: "value";
                    column: string;
                }> | undefined>;
                min: import("@kbn/config-schema").Type<Readonly<{} & {
                    operation: "value";
                    column: string;
                }> | undefined>;
                hide_title: import("@kbn/config-schema").Type<boolean | undefined>;
                ticks: import("@kbn/config-schema").Type<"hidden" | "auto" | "bands" | undefined>;
                goal: import("@kbn/config-schema").Type<Readonly<{} & {
                    operation: "value";
                    column: string;
                }> | undefined>;
                sub_title: import("@kbn/config-schema").Type<string | undefined>;
            }>;
            shape: import("@kbn/config-schema").Type<Readonly<{} & {
                direction: "horizontal" | "vertical";
                type: "bullet";
            }> | Readonly<{} & {
                type: "circle" | "arc" | "semi_circle";
            }> | undefined>;
            dataset: import("@kbn/config-schema").Type<Readonly<{} & {
                type: "esql";
                query: string;
            }> | Readonly<{
                table?: any;
            } & {
                type: "table";
            }>>;
            ignore_global_filters: import("@kbn/config-schema").Type<boolean>;
            sampling: import("@kbn/config-schema").Type<number>;
            title: import("@kbn/config-schema").Type<string | undefined>;
            description: import("@kbn/config-schema").Type<string | undefined>;
            filters: import("@kbn/config-schema").Type<import("@kbn/config-schema/src/types").ObjectResultUnionType<(Omit<{
                disabled: import("@kbn/config-schema").Type<boolean | undefined>;
                negate: import("@kbn/config-schema").Type<boolean | undefined>;
                controlled_by: import("@kbn/config-schema").Type<string | undefined>;
                data_view_id: import("@kbn/config-schema").Type<string | undefined>;
                label: import("@kbn/config-schema").Type<string | undefined>;
                is_multi_index: import("@kbn/config-schema").Type<boolean | undefined>;
            }, "type" | "condition"> & {
                type: import("@kbn/config-schema").Type<"condition">;
                condition: import("@kbn/config-schema").Type<import("@kbn/config-schema/src/types").ObjectResultUnionType<(Omit<{
                    field: import("@kbn/config-schema").Type<string>;
                    negate: import("@kbn/config-schema").Type<boolean | undefined>;
                }, "value" | "operator"> & {
                    value: import("@kbn/config-schema").Type<string | number | boolean>;
                    operator: import("@kbn/config-schema").Type<"is">;
                }) | (Omit<{
                    field: import("@kbn/config-schema").Type<string>;
                    negate: import("@kbn/config-schema").Type<boolean | undefined>;
                }, "value" | "operator"> & {
                    value: import("@kbn/config-schema").Type<number[] | string[] | boolean[]>;
                    operator: import("@kbn/config-schema").Type<"is_one_of">;
                }) | (Omit<{
                    field: import("@kbn/config-schema").Type<string>;
                    negate: import("@kbn/config-schema").Type<boolean | undefined>;
                }, "value" | "operator"> & {
                    value: import("@kbn/config-schema").ObjectType<{
                        gte: import("@kbn/config-schema").Type<string | number | undefined>;
                        lte: import("@kbn/config-schema").Type<string | number | undefined>;
                        gt: import("@kbn/config-schema").Type<string | number | undefined>;
                        lt: import("@kbn/config-schema").Type<string | number | undefined>;
                        format: import("@kbn/config-schema").Type<string | undefined>;
                    }>;
                    operator: import("@kbn/config-schema").Type<"range">;
                }) | (Omit<{
                    field: import("@kbn/config-schema").Type<string>;
                    negate: import("@kbn/config-schema").Type<boolean | undefined>;
                }, "operator"> & {
                    operator: import("@kbn/config-schema").Type<"exists">;
                })>>;
            }) | (Omit<{
                disabled: import("@kbn/config-schema").Type<boolean | undefined>;
                negate: import("@kbn/config-schema").Type<boolean | undefined>;
                controlled_by: import("@kbn/config-schema").Type<string | undefined>;
                data_view_id: import("@kbn/config-schema").Type<string | undefined>;
                label: import("@kbn/config-schema").Type<string | undefined>;
                is_multi_index: import("@kbn/config-schema").Type<boolean | undefined>;
            }, "group" | "type"> & {
                group: import("@kbn/config-schema").ObjectType<{
                    operator: import("@kbn/config-schema").Type<"and" | "or">;
                    conditions: import("@kbn/config-schema").Type<(import("@kbn/config-schema/src/types").ObjectResultUnionType<(Omit<{
                        field: import("@kbn/config-schema").Type<string>;
                        negate: import("@kbn/config-schema").Type<boolean | undefined>;
                    }, "value" | "operator"> & {
                        value: import("@kbn/config-schema").Type<string | number | boolean>;
                        operator: import("@kbn/config-schema").Type<"is">;
                    }) | (Omit<{
                        field: import("@kbn/config-schema").Type<string>;
                        negate: import("@kbn/config-schema").Type<boolean | undefined>;
                    }, "value" | "operator"> & {
                        value: import("@kbn/config-schema").Type<number[] | string[] | boolean[]>;
                        operator: import("@kbn/config-schema").Type<"is_one_of">;
                    }) | (Omit<{
                        field: import("@kbn/config-schema").Type<string>;
                        negate: import("@kbn/config-schema").Type<boolean | undefined>;
                    }, "value" | "operator"> & {
                        value: import("@kbn/config-schema").ObjectType<{
                            gte: import("@kbn/config-schema").Type<string | number | undefined>;
                            lte: import("@kbn/config-schema").Type<string | number | undefined>;
                            gt: import("@kbn/config-schema").Type<string | number | undefined>;
                            lt: import("@kbn/config-schema").Type<string | number | undefined>;
                            format: import("@kbn/config-schema").Type<string | undefined>;
                        }>;
                        operator: import("@kbn/config-schema").Type<"range">;
                    }) | (Omit<{
                        field: import("@kbn/config-schema").Type<string>;
                        negate: import("@kbn/config-schema").Type<boolean | undefined>;
                    }, "operator"> & {
                        operator: import("@kbn/config-schema").Type<"exists">;
                    })> | import("@kbn/as-code-filters-schema").AsCodeGroupFilterRecursive)[]>;
                }>;
                type: import("@kbn/config-schema").Type<"group">;
            }) | (Omit<{
                disabled: import("@kbn/config-schema").Type<boolean | undefined>;
                negate: import("@kbn/config-schema").Type<boolean | undefined>;
                controlled_by: import("@kbn/config-schema").Type<string | undefined>;
                data_view_id: import("@kbn/config-schema").Type<string | undefined>;
                label: import("@kbn/config-schema").Type<string | undefined>;
                is_multi_index: import("@kbn/config-schema").Type<boolean | undefined>;
            }, "field" | "type" | "params" | "dsl"> & {
                field: import("@kbn/config-schema").Type<string | undefined>;
                type: import("@kbn/config-schema").Type<"dsl">;
                params: import("@kbn/config-schema").Type<any>;
                dsl: import("@kbn/config-schema").Type<Record<string, any>>;
            }) | (Omit<{
                disabled: import("@kbn/config-schema").Type<boolean | undefined>;
                negate: import("@kbn/config-schema").Type<boolean | undefined>;
                controlled_by: import("@kbn/config-schema").Type<string | undefined>;
                data_view_id: import("@kbn/config-schema").Type<string | undefined>;
                label: import("@kbn/config-schema").Type<string | undefined>;
                is_multi_index: import("@kbn/config-schema").Type<boolean | undefined>;
            }, "type" | "dsl"> & {
                type: import("@kbn/config-schema").Type<"spatial">;
                dsl: import("@kbn/config-schema").Type<Record<string, any>>;
            })>[] | undefined>;
            type: import("@kbn/config-schema").Type<"gauge">;
        }>;
        guidance: {
            description: string;
            guideline: string;
        };
    };
    xy: {
        schema: import("@kbn/config-schema").ObjectType<{
            layers: import("@kbn/config-schema").Type<Readonly<{
                x?: Readonly<{} & {
                    operation: "value";
                    column: string;
                }> | undefined;
                breakdown_by?: Readonly<{
                    color?: Readonly<{
                        unassignedColor?: Readonly<{
                            palette?: string | undefined;
                        } & {
                            type: "from_palette";
                            index: number;
                        }> | Readonly<{} & {
                            type: "color_code";
                            value: string;
                        }> | undefined;
                    } & {
                        mapping: Readonly<{} & {
                            values: (string | number | Readonly<{} & {
                                type: "range_key";
                                from: string | number;
                                to: string | number;
                                ranges: Readonly<{} & {
                                    label: string;
                                    from: string | number;
                                    to: string | number;
                                }>[];
                            }> | Readonly<{} & {
                                keys: string[];
                                type: "multi_field_key";
                            }>)[];
                            color: Readonly<{
                                palette?: string | undefined;
                            } & {
                                type: "from_palette";
                                index: number;
                            }> | Readonly<{} & {
                                type: "color_code";
                                value: string;
                            }>;
                        }>[];
                        palette: string;
                        mode: "categorical";
                    }> | Readonly<{
                        sort?: "desc" | "asc" | undefined;
                        gradient?: (Readonly<{
                            palette?: string | undefined;
                        } & {
                            type: "from_palette";
                            index: number;
                        }> | Readonly<{} & {
                            type: "color_code";
                            value: string;
                        }>)[] | undefined;
                        mapping?: Readonly<{} & {
                            values: (string | number | Readonly<{} & {
                                type: "range_key";
                                from: string | number;
                                to: string | number;
                                ranges: Readonly<{} & {
                                    label: string;
                                    from: string | number;
                                    to: string | number;
                                }>[];
                            }> | Readonly<{} & {
                                keys: string[];
                                type: "multi_field_key";
                            }>)[];
                        }>[] | undefined;
                        unassignedColor?: Readonly<{
                            palette?: string | undefined;
                        } & {
                            type: "from_palette";
                            index: number;
                        }> | Readonly<{} & {
                            type: "color_code";
                            value: string;
                        }> | undefined;
                    } & {
                        palette: string;
                        mode: "gradient";
                    }> | undefined;
                    collapse_by?: "max" | "min" | "avg" | "sum" | undefined;
                } & {
                    operation: "value";
                    column: string;
                }> | undefined;
            } & {
                type: "area" | "line" | "bar" | "bar_stacked" | "area_stacked" | "bar_horizontal" | "bar_horizontal_stacked" | "area_percentage" | "bar_horizontal_percentage" | "bar_percentage";
                dataset: Readonly<{} & {
                    type: "esql";
                    query: string;
                }> | Readonly<{
                    table?: any;
                } & {
                    type: "table";
                }>;
                y: Readonly<{
                    color?: Readonly<{} & {
                        color: string;
                        type: "static";
                    }> | undefined;
                    axis?: "left" | "right" | undefined;
                } & {
                    operation: "value";
                    column: string;
                }>[];
                sampling: number;
                ignore_global_filters: boolean;
            }>[]>;
            legend: import("@kbn/config-schema").Type<Readonly<{
                size?: "small" | "medium" | "large" | "xlarge" | undefined;
                position?: "left" | "right" | "top" | "bottom" | undefined;
                statistics?: ("total" | "max" | "min" | "count" | "median" | "range" | "avg" | "variance" | "difference" | "last_value" | "standard_deviation" | "last_non_null_value" | "first_value" | "first_non_null_value" | "difference_percentage" | "distinct_count" | "current_and_last_value")[] | undefined;
                inside?: false | undefined;
                layout?: "list" | undefined;
                truncate_after_lines?: number | undefined;
            } & {
                visibility: "hidden" | "auto" | "visible";
            }> | Readonly<{
                columns?: number | undefined;
                statistics?: ("total" | "max" | "min" | "count" | "median" | "range" | "avg" | "variance" | "difference" | "last_value" | "standard_deviation" | "last_non_null_value" | "first_value" | "first_non_null_value" | "difference_percentage" | "distinct_count" | "current_and_last_value")[] | undefined;
                alignment?: "top_left" | "bottom_right" | "top_right" | "bottom_left" | undefined;
                truncate_after_lines?: number | undefined;
            } & {
                visibility: "hidden" | "auto" | "visible";
                inside: true;
            }> | undefined>;
            fitting: import("@kbn/config-schema").Type<Readonly<{
                dotted?: boolean | undefined;
                end_value?: "none" | "nearest" | "zero" | undefined;
            } & {
                type: "none" | "nearest" | "average" | "linear" | "zero" | "carry" | "lookahead";
            }> | undefined>;
            axis: import("@kbn/config-schema").Type<Readonly<{
                left?: Readonly<{
                    title?: Readonly<{
                        value?: string | undefined;
                        visible?: boolean | undefined;
                    } & {}> | undefined;
                    grid?: boolean | undefined;
                    scale?: "log" | "time" | "linear" | "sqrt" | undefined;
                    ticks?: boolean | undefined;
                    extent?: Readonly<{
                        integer_rounding?: boolean | undefined;
                    } & {
                        type: "full";
                    }> | Readonly<{} & {
                        type: "focus";
                    }> | Readonly<{
                        integer_rounding?: boolean | undefined;
                    } & {
                        type: "custom";
                        end: number;
                        start: number;
                    }> | undefined;
                    label_orientation?: "horizontal" | "vertical" | "angled" | undefined;
                } & {}> | undefined;
                right?: Readonly<{
                    title?: Readonly<{
                        value?: string | undefined;
                        visible?: boolean | undefined;
                    } & {}> | undefined;
                    grid?: boolean | undefined;
                    scale?: "log" | "time" | "linear" | "sqrt" | undefined;
                    ticks?: boolean | undefined;
                    extent?: Readonly<{
                        integer_rounding?: boolean | undefined;
                    } & {
                        type: "full";
                    }> | Readonly<{} & {
                        type: "focus";
                    }> | Readonly<{
                        integer_rounding?: boolean | undefined;
                    } & {
                        type: "custom";
                        end: number;
                        start: number;
                    }> | undefined;
                    label_orientation?: "horizontal" | "vertical" | "angled" | undefined;
                } & {}> | undefined;
                x?: Readonly<{
                    title?: Readonly<{
                        value?: string | undefined;
                        visible?: boolean | undefined;
                    } & {}> | undefined;
                    grid?: boolean | undefined;
                    scale?: "linear" | "ordinal" | "temporal" | undefined;
                    ticks?: boolean | undefined;
                    extent?: Readonly<{
                        integer_rounding?: boolean | undefined;
                    } & {
                        type: "full";
                    }> | Readonly<{
                        integer_rounding?: boolean | undefined;
                    } & {
                        type: "custom";
                        end: number;
                        start: number;
                    }> | undefined;
                    label_orientation?: "horizontal" | "vertical" | "angled" | undefined;
                } & {}> | undefined;
            } & {}> | undefined>;
            decorations: import("@kbn/config-schema").Type<Readonly<{
                show_end_zones?: boolean | undefined;
                show_current_time_marker?: boolean | undefined;
                point_visibility?: "auto" | "never" | "always" | undefined;
                line_interpolation?: "linear" | "smooth" | "stepped" | undefined;
                minimum_bar_height?: number | undefined;
                show_value_labels?: boolean | undefined;
                fill_opacity?: number | undefined;
            } & {}> | undefined>;
            title: import("@kbn/config-schema").Type<string | undefined>;
            description: import("@kbn/config-schema").Type<string | undefined>;
            filters: import("@kbn/config-schema").Type<import("@kbn/config-schema/src/types").ObjectResultUnionType<(Omit<{
                disabled: import("@kbn/config-schema").Type<boolean | undefined>;
                negate: import("@kbn/config-schema").Type<boolean | undefined>;
                controlled_by: import("@kbn/config-schema").Type<string | undefined>;
                data_view_id: import("@kbn/config-schema").Type<string | undefined>;
                label: import("@kbn/config-schema").Type<string | undefined>;
                is_multi_index: import("@kbn/config-schema").Type<boolean | undefined>;
            }, "type" | "condition"> & {
                type: import("@kbn/config-schema").Type<"condition">;
                condition: import("@kbn/config-schema").Type<import("@kbn/config-schema/src/types").ObjectResultUnionType<(Omit<{
                    field: import("@kbn/config-schema").Type<string>;
                    negate: import("@kbn/config-schema").Type<boolean | undefined>;
                }, "value" | "operator"> & {
                    value: import("@kbn/config-schema").Type<string | number | boolean>;
                    operator: import("@kbn/config-schema").Type<"is">;
                }) | (Omit<{
                    field: import("@kbn/config-schema").Type<string>;
                    negate: import("@kbn/config-schema").Type<boolean | undefined>;
                }, "value" | "operator"> & {
                    value: import("@kbn/config-schema").Type<number[] | string[] | boolean[]>;
                    operator: import("@kbn/config-schema").Type<"is_one_of">;
                }) | (Omit<{
                    field: import("@kbn/config-schema").Type<string>;
                    negate: import("@kbn/config-schema").Type<boolean | undefined>;
                }, "value" | "operator"> & {
                    value: import("@kbn/config-schema").ObjectType<{
                        gte: import("@kbn/config-schema").Type<string | number | undefined>;
                        lte: import("@kbn/config-schema").Type<string | number | undefined>;
                        gt: import("@kbn/config-schema").Type<string | number | undefined>;
                        lt: import("@kbn/config-schema").Type<string | number | undefined>;
                        format: import("@kbn/config-schema").Type<string | undefined>;
                    }>;
                    operator: import("@kbn/config-schema").Type<"range">;
                }) | (Omit<{
                    field: import("@kbn/config-schema").Type<string>;
                    negate: import("@kbn/config-schema").Type<boolean | undefined>;
                }, "operator"> & {
                    operator: import("@kbn/config-schema").Type<"exists">;
                })>>;
            }) | (Omit<{
                disabled: import("@kbn/config-schema").Type<boolean | undefined>;
                negate: import("@kbn/config-schema").Type<boolean | undefined>;
                controlled_by: import("@kbn/config-schema").Type<string | undefined>;
                data_view_id: import("@kbn/config-schema").Type<string | undefined>;
                label: import("@kbn/config-schema").Type<string | undefined>;
                is_multi_index: import("@kbn/config-schema").Type<boolean | undefined>;
            }, "group" | "type"> & {
                group: import("@kbn/config-schema").ObjectType<{
                    operator: import("@kbn/config-schema").Type<"and" | "or">;
                    conditions: import("@kbn/config-schema").Type<(import("@kbn/config-schema/src/types").ObjectResultUnionType<(Omit<{
                        field: import("@kbn/config-schema").Type<string>;
                        negate: import("@kbn/config-schema").Type<boolean | undefined>;
                    }, "value" | "operator"> & {
                        value: import("@kbn/config-schema").Type<string | number | boolean>;
                        operator: import("@kbn/config-schema").Type<"is">;
                    }) | (Omit<{
                        field: import("@kbn/config-schema").Type<string>;
                        negate: import("@kbn/config-schema").Type<boolean | undefined>;
                    }, "value" | "operator"> & {
                        value: import("@kbn/config-schema").Type<number[] | string[] | boolean[]>;
                        operator: import("@kbn/config-schema").Type<"is_one_of">;
                    }) | (Omit<{
                        field: import("@kbn/config-schema").Type<string>;
                        negate: import("@kbn/config-schema").Type<boolean | undefined>;
                    }, "value" | "operator"> & {
                        value: import("@kbn/config-schema").ObjectType<{
                            gte: import("@kbn/config-schema").Type<string | number | undefined>;
                            lte: import("@kbn/config-schema").Type<string | number | undefined>;
                            gt: import("@kbn/config-schema").Type<string | number | undefined>;
                            lt: import("@kbn/config-schema").Type<string | number | undefined>;
                            format: import("@kbn/config-schema").Type<string | undefined>;
                        }>;
                        operator: import("@kbn/config-schema").Type<"range">;
                    }) | (Omit<{
                        field: import("@kbn/config-schema").Type<string>;
                        negate: import("@kbn/config-schema").Type<boolean | undefined>;
                    }, "operator"> & {
                        operator: import("@kbn/config-schema").Type<"exists">;
                    })> | import("@kbn/as-code-filters-schema").AsCodeGroupFilterRecursive)[]>;
                }>;
                type: import("@kbn/config-schema").Type<"group">;
            }) | (Omit<{
                disabled: import("@kbn/config-schema").Type<boolean | undefined>;
                negate: import("@kbn/config-schema").Type<boolean | undefined>;
                controlled_by: import("@kbn/config-schema").Type<string | undefined>;
                data_view_id: import("@kbn/config-schema").Type<string | undefined>;
                label: import("@kbn/config-schema").Type<string | undefined>;
                is_multi_index: import("@kbn/config-schema").Type<boolean | undefined>;
            }, "field" | "type" | "params" | "dsl"> & {
                field: import("@kbn/config-schema").Type<string | undefined>;
                type: import("@kbn/config-schema").Type<"dsl">;
                params: import("@kbn/config-schema").Type<any>;
                dsl: import("@kbn/config-schema").Type<Record<string, any>>;
            }) | (Omit<{
                disabled: import("@kbn/config-schema").Type<boolean | undefined>;
                negate: import("@kbn/config-schema").Type<boolean | undefined>;
                controlled_by: import("@kbn/config-schema").Type<string | undefined>;
                data_view_id: import("@kbn/config-schema").Type<string | undefined>;
                label: import("@kbn/config-schema").Type<string | undefined>;
                is_multi_index: import("@kbn/config-schema").Type<boolean | undefined>;
            }, "type" | "dsl"> & {
                type: import("@kbn/config-schema").Type<"spatial">;
                dsl: import("@kbn/config-schema").Type<Record<string, any>>;
            })>[] | undefined>;
            type: import("@kbn/config-schema").Type<"xy">;
        }>;
        guidance: {
            description: string;
            guideline: string;
        };
    };
    heatmap: {
        schema: import("@kbn/config-schema").ObjectType<{
            metric: import("@kbn/config-schema").ObjectType<Omit<{
                operation: import("@kbn/config-schema").Type<"value">;
                column: import("@kbn/config-schema").Type<string>;
            }, "color"> & {
                color: import("@kbn/config-schema").Type<Readonly<{} & {
                    shift: boolean;
                    type: "legacy_dynamic";
                    palette: string;
                    range: "absolute" | "percentage";
                    steps: Readonly<{
                        lt?: number | null | undefined;
                        gte?: number | null | undefined;
                        lte?: number | null | undefined;
                    } & {
                        color: string;
                    }>[];
                }> | Readonly<{} & {
                    type: "dynamic";
                    range: "absolute";
                    steps: Readonly<{
                        lt?: number | null | undefined;
                        gte?: number | null | undefined;
                        lte?: number | null | undefined;
                    } & {
                        color: string;
                    }>[];
                }> | Readonly<{} & {
                    type: "dynamic";
                    range: "percentage";
                    steps: Readonly<{
                        lt?: number | null | undefined;
                        gte?: number | null | undefined;
                        lte?: number | null | undefined;
                    } & {
                        color: string;
                    }>[];
                }> | undefined>;
            }>;
            dataset: import("@kbn/config-schema").Type<Readonly<{} & {
                type: "esql";
                query: string;
            }> | Readonly<{
                table?: any;
            } & {
                type: "table";
            }>>;
            x: import("@kbn/config-schema").ObjectType<{
                operation: import("@kbn/config-schema").Type<"value">;
                column: import("@kbn/config-schema").Type<string>;
            }>;
            y: import("@kbn/config-schema").Type<Readonly<{} & {
                operation: "value";
                column: string;
            }> | undefined>;
            axis: import("@kbn/config-schema").Type<Readonly<{
                x?: Readonly<{
                    title?: Readonly<{
                        value?: string | undefined;
                        visible?: boolean | undefined;
                    } & {}> | undefined;
                    sort?: "desc" | "asc" | undefined;
                    labels?: Readonly<{
                        orientation?: "horizontal" | "vertical" | "angled" | undefined;
                        visible?: boolean | undefined;
                    } & {}> | undefined;
                } & {}> | undefined;
                y?: Readonly<{
                    title?: Readonly<{
                        value?: string | undefined;
                        visible?: boolean | undefined;
                    } & {}> | undefined;
                    sort?: "desc" | "asc" | undefined;
                    labels?: Readonly<{
                        visible?: boolean | undefined;
                    } & {}> | undefined;
                } & {}> | undefined;
            } & {}> | undefined>;
            cells: import("@kbn/config-schema").Type<Readonly<{
                labels?: Readonly<{
                    visible?: boolean | undefined;
                } & {}> | undefined;
            } & {}> | undefined>;
            ignore_global_filters: import("@kbn/config-schema").Type<boolean>;
            sampling: import("@kbn/config-schema").Type<number>;
            title: import("@kbn/config-schema").Type<string | undefined>;
            description: import("@kbn/config-schema").Type<string | undefined>;
            filters: import("@kbn/config-schema").Type<import("@kbn/config-schema/src/types").ObjectResultUnionType<(Omit<{
                disabled: import("@kbn/config-schema").Type<boolean | undefined>;
                negate: import("@kbn/config-schema").Type<boolean | undefined>;
                controlled_by: import("@kbn/config-schema").Type<string | undefined>;
                data_view_id: import("@kbn/config-schema").Type<string | undefined>;
                label: import("@kbn/config-schema").Type<string | undefined>;
                is_multi_index: import("@kbn/config-schema").Type<boolean | undefined>;
            }, "type" | "condition"> & {
                type: import("@kbn/config-schema").Type<"condition">;
                condition: import("@kbn/config-schema").Type<import("@kbn/config-schema/src/types").ObjectResultUnionType<(Omit<{
                    field: import("@kbn/config-schema").Type<string>;
                    negate: import("@kbn/config-schema").Type<boolean | undefined>;
                }, "value" | "operator"> & {
                    value: import("@kbn/config-schema").Type<string | number | boolean>;
                    operator: import("@kbn/config-schema").Type<"is">;
                }) | (Omit<{
                    field: import("@kbn/config-schema").Type<string>;
                    negate: import("@kbn/config-schema").Type<boolean | undefined>;
                }, "value" | "operator"> & {
                    value: import("@kbn/config-schema").Type<number[] | string[] | boolean[]>;
                    operator: import("@kbn/config-schema").Type<"is_one_of">;
                }) | (Omit<{
                    field: import("@kbn/config-schema").Type<string>;
                    negate: import("@kbn/config-schema").Type<boolean | undefined>;
                }, "value" | "operator"> & {
                    value: import("@kbn/config-schema").ObjectType<{
                        gte: import("@kbn/config-schema").Type<string | number | undefined>;
                        lte: import("@kbn/config-schema").Type<string | number | undefined>;
                        gt: import("@kbn/config-schema").Type<string | number | undefined>;
                        lt: import("@kbn/config-schema").Type<string | number | undefined>;
                        format: import("@kbn/config-schema").Type<string | undefined>;
                    }>;
                    operator: import("@kbn/config-schema").Type<"range">;
                }) | (Omit<{
                    field: import("@kbn/config-schema").Type<string>;
                    negate: import("@kbn/config-schema").Type<boolean | undefined>;
                }, "operator"> & {
                    operator: import("@kbn/config-schema").Type<"exists">;
                })>>;
            }) | (Omit<{
                disabled: import("@kbn/config-schema").Type<boolean | undefined>;
                negate: import("@kbn/config-schema").Type<boolean | undefined>;
                controlled_by: import("@kbn/config-schema").Type<string | undefined>;
                data_view_id: import("@kbn/config-schema").Type<string | undefined>;
                label: import("@kbn/config-schema").Type<string | undefined>;
                is_multi_index: import("@kbn/config-schema").Type<boolean | undefined>;
            }, "group" | "type"> & {
                group: import("@kbn/config-schema").ObjectType<{
                    operator: import("@kbn/config-schema").Type<"and" | "or">;
                    conditions: import("@kbn/config-schema").Type<(import("@kbn/config-schema/src/types").ObjectResultUnionType<(Omit<{
                        field: import("@kbn/config-schema").Type<string>;
                        negate: import("@kbn/config-schema").Type<boolean | undefined>;
                    }, "value" | "operator"> & {
                        value: import("@kbn/config-schema").Type<string | number | boolean>;
                        operator: import("@kbn/config-schema").Type<"is">;
                    }) | (Omit<{
                        field: import("@kbn/config-schema").Type<string>;
                        negate: import("@kbn/config-schema").Type<boolean | undefined>;
                    }, "value" | "operator"> & {
                        value: import("@kbn/config-schema").Type<number[] | string[] | boolean[]>;
                        operator: import("@kbn/config-schema").Type<"is_one_of">;
                    }) | (Omit<{
                        field: import("@kbn/config-schema").Type<string>;
                        negate: import("@kbn/config-schema").Type<boolean | undefined>;
                    }, "value" | "operator"> & {
                        value: import("@kbn/config-schema").ObjectType<{
                            gte: import("@kbn/config-schema").Type<string | number | undefined>;
                            lte: import("@kbn/config-schema").Type<string | number | undefined>;
                            gt: import("@kbn/config-schema").Type<string | number | undefined>;
                            lt: import("@kbn/config-schema").Type<string | number | undefined>;
                            format: import("@kbn/config-schema").Type<string | undefined>;
                        }>;
                        operator: import("@kbn/config-schema").Type<"range">;
                    }) | (Omit<{
                        field: import("@kbn/config-schema").Type<string>;
                        negate: import("@kbn/config-schema").Type<boolean | undefined>;
                    }, "operator"> & {
                        operator: import("@kbn/config-schema").Type<"exists">;
                    })> | import("@kbn/as-code-filters-schema").AsCodeGroupFilterRecursive)[]>;
                }>;
                type: import("@kbn/config-schema").Type<"group">;
            }) | (Omit<{
                disabled: import("@kbn/config-schema").Type<boolean | undefined>;
                negate: import("@kbn/config-schema").Type<boolean | undefined>;
                controlled_by: import("@kbn/config-schema").Type<string | undefined>;
                data_view_id: import("@kbn/config-schema").Type<string | undefined>;
                label: import("@kbn/config-schema").Type<string | undefined>;
                is_multi_index: import("@kbn/config-schema").Type<boolean | undefined>;
            }, "field" | "type" | "params" | "dsl"> & {
                field: import("@kbn/config-schema").Type<string | undefined>;
                type: import("@kbn/config-schema").Type<"dsl">;
                params: import("@kbn/config-schema").Type<any>;
                dsl: import("@kbn/config-schema").Type<Record<string, any>>;
            }) | (Omit<{
                disabled: import("@kbn/config-schema").Type<boolean | undefined>;
                negate: import("@kbn/config-schema").Type<boolean | undefined>;
                controlled_by: import("@kbn/config-schema").Type<string | undefined>;
                data_view_id: import("@kbn/config-schema").Type<string | undefined>;
                label: import("@kbn/config-schema").Type<string | undefined>;
                is_multi_index: import("@kbn/config-schema").Type<boolean | undefined>;
            }, "type" | "dsl"> & {
                type: import("@kbn/config-schema").Type<"spatial">;
                dsl: import("@kbn/config-schema").Type<Record<string, any>>;
            })>[] | undefined>;
            type: import("@kbn/config-schema").Type<"heat_map">;
            legend: import("@kbn/config-schema").Type<Readonly<{
                size?: "auto" | "small" | "medium" | "large" | "xlarge" | undefined;
                position?: "left" | "right" | "top" | "bottom" | undefined;
                visible?: boolean | undefined;
                truncate_after_lines?: number | undefined;
            } & {}> | undefined>;
        }>;
        guidance: {
            description: string;
            guideline: string;
        };
    };
    tagcloud: {
        schema: import("@kbn/config-schema").ObjectType<{
            metric: import("@kbn/config-schema").ObjectType<Omit<Omit<{
                label: import("@kbn/config-schema").Type<string | undefined>;
                format: import("@kbn/config-schema").Type<Readonly<{
                    suffix?: string | undefined;
                } & {
                    type: "number" | "percent";
                    compact: boolean;
                    decimals: number;
                }> | Readonly<{
                    suffix?: string | undefined;
                } & {
                    type: "bytes" | "bits";
                    decimals: number;
                }> | Readonly<{
                    suffix?: string | undefined;
                } & {
                    type: "duration";
                    from: string;
                    to: string;
                }> | Readonly<{} & {
                    pattern: string;
                    type: "custom";
                }> | undefined>;
            }, "operation" | "column"> & {
                operation: import("@kbn/config-schema").Type<"value">;
                column: import("@kbn/config-schema").Type<string>;
            }, "show_metric_label"> & {
                show_metric_label: import("@kbn/config-schema").Type<boolean | undefined>;
            }>;
            tag_by: import("@kbn/config-schema").ObjectType<Omit<{
                operation: import("@kbn/config-schema").Type<"value">;
                column: import("@kbn/config-schema").Type<string>;
            }, "color"> & {
                color: import("@kbn/config-schema").Type<Readonly<{
                    unassignedColor?: Readonly<{
                        palette?: string | undefined;
                    } & {
                        type: "from_palette";
                        index: number;
                    }> | Readonly<{} & {
                        type: "color_code";
                        value: string;
                    }> | undefined;
                } & {
                    mapping: Readonly<{} & {
                        values: (string | number | Readonly<{} & {
                            type: "range_key";
                            from: string | number;
                            to: string | number;
                            ranges: Readonly<{} & {
                                label: string;
                                from: string | number;
                                to: string | number;
                            }>[];
                        }> | Readonly<{} & {
                            keys: string[];
                            type: "multi_field_key";
                        }>)[];
                        color: Readonly<{
                            palette?: string | undefined;
                        } & {
                            type: "from_palette";
                            index: number;
                        }> | Readonly<{} & {
                            type: "color_code";
                            value: string;
                        }>;
                    }>[];
                    palette: string;
                    mode: "categorical";
                }> | Readonly<{
                    sort?: "desc" | "asc" | undefined;
                    gradient?: (Readonly<{
                        palette?: string | undefined;
                    } & {
                        type: "from_palette";
                        index: number;
                    }> | Readonly<{} & {
                        type: "color_code";
                        value: string;
                    }>)[] | undefined;
                    mapping?: Readonly<{} & {
                        values: (string | number | Readonly<{} & {
                            type: "range_key";
                            from: string | number;
                            to: string | number;
                            ranges: Readonly<{} & {
                                label: string;
                                from: string | number;
                                to: string | number;
                            }>[];
                        }> | Readonly<{} & {
                            keys: string[];
                            type: "multi_field_key";
                        }>)[];
                    }>[] | undefined;
                    unassignedColor?: Readonly<{
                        palette?: string | undefined;
                    } & {
                        type: "from_palette";
                        index: number;
                    }> | Readonly<{} & {
                        type: "color_code";
                        value: string;
                    }> | undefined;
                } & {
                    palette: string;
                    mode: "gradient";
                }> | undefined>;
            }>;
            orientation: import("@kbn/config-schema").Type<"horizontal" | "vertical" | "angled" | undefined>;
            font_size: import("@kbn/config-schema").Type<Readonly<{} & {
                max: number;
                min: number;
            }> | undefined>;
            dataset: import("@kbn/config-schema").Type<Readonly<{} & {
                type: "esql";
                query: string;
            }> | Readonly<{
                table?: any;
            } & {
                type: "table";
            }>>;
            ignore_global_filters: import("@kbn/config-schema").Type<boolean>;
            sampling: import("@kbn/config-schema").Type<number>;
            title: import("@kbn/config-schema").Type<string | undefined>;
            description: import("@kbn/config-schema").Type<string | undefined>;
            filters: import("@kbn/config-schema").Type<import("@kbn/config-schema/src/types").ObjectResultUnionType<(Omit<{
                disabled: import("@kbn/config-schema").Type<boolean | undefined>;
                negate: import("@kbn/config-schema").Type<boolean | undefined>;
                controlled_by: import("@kbn/config-schema").Type<string | undefined>;
                data_view_id: import("@kbn/config-schema").Type<string | undefined>;
                label: import("@kbn/config-schema").Type<string | undefined>;
                is_multi_index: import("@kbn/config-schema").Type<boolean | undefined>;
            }, "type" | "condition"> & {
                type: import("@kbn/config-schema").Type<"condition">;
                condition: import("@kbn/config-schema").Type<import("@kbn/config-schema/src/types").ObjectResultUnionType<(Omit<{
                    field: import("@kbn/config-schema").Type<string>;
                    negate: import("@kbn/config-schema").Type<boolean | undefined>;
                }, "value" | "operator"> & {
                    value: import("@kbn/config-schema").Type<string | number | boolean>;
                    operator: import("@kbn/config-schema").Type<"is">;
                }) | (Omit<{
                    field: import("@kbn/config-schema").Type<string>;
                    negate: import("@kbn/config-schema").Type<boolean | undefined>;
                }, "value" | "operator"> & {
                    value: import("@kbn/config-schema").Type<number[] | string[] | boolean[]>;
                    operator: import("@kbn/config-schema").Type<"is_one_of">;
                }) | (Omit<{
                    field: import("@kbn/config-schema").Type<string>;
                    negate: import("@kbn/config-schema").Type<boolean | undefined>;
                }, "value" | "operator"> & {
                    value: import("@kbn/config-schema").ObjectType<{
                        gte: import("@kbn/config-schema").Type<string | number | undefined>;
                        lte: import("@kbn/config-schema").Type<string | number | undefined>;
                        gt: import("@kbn/config-schema").Type<string | number | undefined>;
                        lt: import("@kbn/config-schema").Type<string | number | undefined>;
                        format: import("@kbn/config-schema").Type<string | undefined>;
                    }>;
                    operator: import("@kbn/config-schema").Type<"range">;
                }) | (Omit<{
                    field: import("@kbn/config-schema").Type<string>;
                    negate: import("@kbn/config-schema").Type<boolean | undefined>;
                }, "operator"> & {
                    operator: import("@kbn/config-schema").Type<"exists">;
                })>>;
            }) | (Omit<{
                disabled: import("@kbn/config-schema").Type<boolean | undefined>;
                negate: import("@kbn/config-schema").Type<boolean | undefined>;
                controlled_by: import("@kbn/config-schema").Type<string | undefined>;
                data_view_id: import("@kbn/config-schema").Type<string | undefined>;
                label: import("@kbn/config-schema").Type<string | undefined>;
                is_multi_index: import("@kbn/config-schema").Type<boolean | undefined>;
            }, "group" | "type"> & {
                group: import("@kbn/config-schema").ObjectType<{
                    operator: import("@kbn/config-schema").Type<"and" | "or">;
                    conditions: import("@kbn/config-schema").Type<(import("@kbn/config-schema/src/types").ObjectResultUnionType<(Omit<{
                        field: import("@kbn/config-schema").Type<string>;
                        negate: import("@kbn/config-schema").Type<boolean | undefined>;
                    }, "value" | "operator"> & {
                        value: import("@kbn/config-schema").Type<string | number | boolean>;
                        operator: import("@kbn/config-schema").Type<"is">;
                    }) | (Omit<{
                        field: import("@kbn/config-schema").Type<string>;
                        negate: import("@kbn/config-schema").Type<boolean | undefined>;
                    }, "value" | "operator"> & {
                        value: import("@kbn/config-schema").Type<number[] | string[] | boolean[]>;
                        operator: import("@kbn/config-schema").Type<"is_one_of">;
                    }) | (Omit<{
                        field: import("@kbn/config-schema").Type<string>;
                        negate: import("@kbn/config-schema").Type<boolean | undefined>;
                    }, "value" | "operator"> & {
                        value: import("@kbn/config-schema").ObjectType<{
                            gte: import("@kbn/config-schema").Type<string | number | undefined>;
                            lte: import("@kbn/config-schema").Type<string | number | undefined>;
                            gt: import("@kbn/config-schema").Type<string | number | undefined>;
                            lt: import("@kbn/config-schema").Type<string | number | undefined>;
                            format: import("@kbn/config-schema").Type<string | undefined>;
                        }>;
                        operator: import("@kbn/config-schema").Type<"range">;
                    }) | (Omit<{
                        field: import("@kbn/config-schema").Type<string>;
                        negate: import("@kbn/config-schema").Type<boolean | undefined>;
                    }, "operator"> & {
                        operator: import("@kbn/config-schema").Type<"exists">;
                    })> | import("@kbn/as-code-filters-schema").AsCodeGroupFilterRecursive)[]>;
                }>;
                type: import("@kbn/config-schema").Type<"group">;
            }) | (Omit<{
                disabled: import("@kbn/config-schema").Type<boolean | undefined>;
                negate: import("@kbn/config-schema").Type<boolean | undefined>;
                controlled_by: import("@kbn/config-schema").Type<string | undefined>;
                data_view_id: import("@kbn/config-schema").Type<string | undefined>;
                label: import("@kbn/config-schema").Type<string | undefined>;
                is_multi_index: import("@kbn/config-schema").Type<boolean | undefined>;
            }, "field" | "type" | "params" | "dsl"> & {
                field: import("@kbn/config-schema").Type<string | undefined>;
                type: import("@kbn/config-schema").Type<"dsl">;
                params: import("@kbn/config-schema").Type<any>;
                dsl: import("@kbn/config-schema").Type<Record<string, any>>;
            }) | (Omit<{
                disabled: import("@kbn/config-schema").Type<boolean | undefined>;
                negate: import("@kbn/config-schema").Type<boolean | undefined>;
                controlled_by: import("@kbn/config-schema").Type<string | undefined>;
                data_view_id: import("@kbn/config-schema").Type<string | undefined>;
                label: import("@kbn/config-schema").Type<string | undefined>;
                is_multi_index: import("@kbn/config-schema").Type<boolean | undefined>;
            }, "type" | "dsl"> & {
                type: import("@kbn/config-schema").Type<"spatial">;
                dsl: import("@kbn/config-schema").Type<Record<string, any>>;
            })>[] | undefined>;
            type: import("@kbn/config-schema").Type<"tag_cloud">;
        }>;
        guidance: {
            description: string;
            guideline: string;
        };
    };
    region_map: {
        schema: import("@kbn/config-schema").ObjectType<{
            metric: import("@kbn/config-schema").ObjectType<Omit<{
                label: import("@kbn/config-schema").Type<string | undefined>;
                format: import("@kbn/config-schema").Type<Readonly<{
                    suffix?: string | undefined;
                } & {
                    type: "number" | "percent";
                    compact: boolean;
                    decimals: number;
                }> | Readonly<{
                    suffix?: string | undefined;
                } & {
                    type: "bytes" | "bits";
                    decimals: number;
                }> | Readonly<{
                    suffix?: string | undefined;
                } & {
                    type: "duration";
                    from: string;
                    to: string;
                }> | Readonly<{} & {
                    pattern: string;
                    type: "custom";
                }> | undefined>;
            }, "operation" | "column"> & {
                operation: import("@kbn/config-schema").Type<"value">;
                column: import("@kbn/config-schema").Type<string>;
            }>;
            region: import("@kbn/config-schema").ObjectType<Omit<{
                operation: import("@kbn/config-schema").Type<"value">;
                column: import("@kbn/config-schema").Type<string>;
            }, "ems"> & {
                ems: import("@kbn/config-schema").Type<Readonly<{} & {
                    join: string;
                    boundaries: string;
                }> | undefined>;
            }>;
            dataset: import("@kbn/config-schema").Type<Readonly<{} & {
                type: "esql";
                query: string;
            }> | Readonly<{
                table?: any;
            } & {
                type: "table";
            }>>;
            ignore_global_filters: import("@kbn/config-schema").Type<boolean>;
            sampling: import("@kbn/config-schema").Type<number>;
            title: import("@kbn/config-schema").Type<string | undefined>;
            description: import("@kbn/config-schema").Type<string | undefined>;
            filters: import("@kbn/config-schema").Type<import("@kbn/config-schema/src/types").ObjectResultUnionType<(Omit<{
                disabled: import("@kbn/config-schema").Type<boolean | undefined>;
                negate: import("@kbn/config-schema").Type<boolean | undefined>;
                controlled_by: import("@kbn/config-schema").Type<string | undefined>;
                data_view_id: import("@kbn/config-schema").Type<string | undefined>;
                label: import("@kbn/config-schema").Type<string | undefined>;
                is_multi_index: import("@kbn/config-schema").Type<boolean | undefined>;
            }, "type" | "condition"> & {
                type: import("@kbn/config-schema").Type<"condition">;
                condition: import("@kbn/config-schema").Type<import("@kbn/config-schema/src/types").ObjectResultUnionType<(Omit<{
                    field: import("@kbn/config-schema").Type<string>;
                    negate: import("@kbn/config-schema").Type<boolean | undefined>;
                }, "value" | "operator"> & {
                    value: import("@kbn/config-schema").Type<string | number | boolean>;
                    operator: import("@kbn/config-schema").Type<"is">;
                }) | (Omit<{
                    field: import("@kbn/config-schema").Type<string>;
                    negate: import("@kbn/config-schema").Type<boolean | undefined>;
                }, "value" | "operator"> & {
                    value: import("@kbn/config-schema").Type<number[] | string[] | boolean[]>;
                    operator: import("@kbn/config-schema").Type<"is_one_of">;
                }) | (Omit<{
                    field: import("@kbn/config-schema").Type<string>;
                    negate: import("@kbn/config-schema").Type<boolean | undefined>;
                }, "value" | "operator"> & {
                    value: import("@kbn/config-schema").ObjectType<{
                        gte: import("@kbn/config-schema").Type<string | number | undefined>;
                        lte: import("@kbn/config-schema").Type<string | number | undefined>;
                        gt: import("@kbn/config-schema").Type<string | number | undefined>;
                        lt: import("@kbn/config-schema").Type<string | number | undefined>;
                        format: import("@kbn/config-schema").Type<string | undefined>;
                    }>;
                    operator: import("@kbn/config-schema").Type<"range">;
                }) | (Omit<{
                    field: import("@kbn/config-schema").Type<string>;
                    negate: import("@kbn/config-schema").Type<boolean | undefined>;
                }, "operator"> & {
                    operator: import("@kbn/config-schema").Type<"exists">;
                })>>;
            }) | (Omit<{
                disabled: import("@kbn/config-schema").Type<boolean | undefined>;
                negate: import("@kbn/config-schema").Type<boolean | undefined>;
                controlled_by: import("@kbn/config-schema").Type<string | undefined>;
                data_view_id: import("@kbn/config-schema").Type<string | undefined>;
                label: import("@kbn/config-schema").Type<string | undefined>;
                is_multi_index: import("@kbn/config-schema").Type<boolean | undefined>;
            }, "group" | "type"> & {
                group: import("@kbn/config-schema").ObjectType<{
                    operator: import("@kbn/config-schema").Type<"and" | "or">;
                    conditions: import("@kbn/config-schema").Type<(import("@kbn/config-schema/src/types").ObjectResultUnionType<(Omit<{
                        field: import("@kbn/config-schema").Type<string>;
                        negate: import("@kbn/config-schema").Type<boolean | undefined>;
                    }, "value" | "operator"> & {
                        value: import("@kbn/config-schema").Type<string | number | boolean>;
                        operator: import("@kbn/config-schema").Type<"is">;
                    }) | (Omit<{
                        field: import("@kbn/config-schema").Type<string>;
                        negate: import("@kbn/config-schema").Type<boolean | undefined>;
                    }, "value" | "operator"> & {
                        value: import("@kbn/config-schema").Type<number[] | string[] | boolean[]>;
                        operator: import("@kbn/config-schema").Type<"is_one_of">;
                    }) | (Omit<{
                        field: import("@kbn/config-schema").Type<string>;
                        negate: import("@kbn/config-schema").Type<boolean | undefined>;
                    }, "value" | "operator"> & {
                        value: import("@kbn/config-schema").ObjectType<{
                            gte: import("@kbn/config-schema").Type<string | number | undefined>;
                            lte: import("@kbn/config-schema").Type<string | number | undefined>;
                            gt: import("@kbn/config-schema").Type<string | number | undefined>;
                            lt: import("@kbn/config-schema").Type<string | number | undefined>;
                            format: import("@kbn/config-schema").Type<string | undefined>;
                        }>;
                        operator: import("@kbn/config-schema").Type<"range">;
                    }) | (Omit<{
                        field: import("@kbn/config-schema").Type<string>;
                        negate: import("@kbn/config-schema").Type<boolean | undefined>;
                    }, "operator"> & {
                        operator: import("@kbn/config-schema").Type<"exists">;
                    })> | import("@kbn/as-code-filters-schema").AsCodeGroupFilterRecursive)[]>;
                }>;
                type: import("@kbn/config-schema").Type<"group">;
            }) | (Omit<{
                disabled: import("@kbn/config-schema").Type<boolean | undefined>;
                negate: import("@kbn/config-schema").Type<boolean | undefined>;
                controlled_by: import("@kbn/config-schema").Type<string | undefined>;
                data_view_id: import("@kbn/config-schema").Type<string | undefined>;
                label: import("@kbn/config-schema").Type<string | undefined>;
                is_multi_index: import("@kbn/config-schema").Type<boolean | undefined>;
            }, "field" | "type" | "params" | "dsl"> & {
                field: import("@kbn/config-schema").Type<string | undefined>;
                type: import("@kbn/config-schema").Type<"dsl">;
                params: import("@kbn/config-schema").Type<any>;
                dsl: import("@kbn/config-schema").Type<Record<string, any>>;
            }) | (Omit<{
                disabled: import("@kbn/config-schema").Type<boolean | undefined>;
                negate: import("@kbn/config-schema").Type<boolean | undefined>;
                controlled_by: import("@kbn/config-schema").Type<string | undefined>;
                data_view_id: import("@kbn/config-schema").Type<string | undefined>;
                label: import("@kbn/config-schema").Type<string | undefined>;
                is_multi_index: import("@kbn/config-schema").Type<boolean | undefined>;
            }, "type" | "dsl"> & {
                type: import("@kbn/config-schema").Type<"spatial">;
                dsl: import("@kbn/config-schema").Type<Record<string, any>>;
            })>[] | undefined>;
            type: import("@kbn/config-schema").Type<"region_map">;
        }>;
        guidance: {
            description: string;
            guideline: string;
        };
    };
    datatable: {
        schema: import("@kbn/config-schema").ObjectType<{
            metrics: import("@kbn/config-schema").Type<Readonly<{
                width?: number | undefined;
                color?: Readonly<{} & {
                    shift: boolean;
                    type: "legacy_dynamic";
                    palette: string;
                    range: "absolute" | "percentage";
                    steps: Readonly<{
                        lt?: number | null | undefined;
                        gte?: number | null | undefined;
                        lte?: number | null | undefined;
                    } & {
                        color: string;
                    }>[];
                }> | Readonly<{} & {
                    type: "dynamic";
                    range: "absolute";
                    steps: Readonly<{
                        lt?: number | null | undefined;
                        gte?: number | null | undefined;
                        lte?: number | null | undefined;
                    } & {
                        color: string;
                    }>[];
                }> | Readonly<{} & {
                    type: "dynamic";
                    range: "percentage";
                    steps: Readonly<{
                        lt?: number | null | undefined;
                        gte?: number | null | undefined;
                        lte?: number | null | undefined;
                    } & {
                        color: string;
                    }>[];
                }> | Readonly<{
                    unassignedColor?: Readonly<{
                        palette?: string | undefined;
                    } & {
                        type: "from_palette";
                        index: number;
                    }> | Readonly<{} & {
                        type: "color_code";
                        value: string;
                    }> | undefined;
                } & {
                    mapping: Readonly<{} & {
                        values: (string | number | Readonly<{} & {
                            type: "range_key";
                            from: string | number;
                            to: string | number;
                            ranges: Readonly<{} & {
                                label: string;
                                from: string | number;
                                to: string | number;
                            }>[];
                        }> | Readonly<{} & {
                            keys: string[];
                            type: "multi_field_key";
                        }>)[];
                        color: Readonly<{
                            palette?: string | undefined;
                        } & {
                            type: "from_palette";
                            index: number;
                        }> | Readonly<{} & {
                            type: "color_code";
                            value: string;
                        }>;
                    }>[];
                    palette: string;
                    mode: "categorical";
                }> | Readonly<{
                    sort?: "desc" | "asc" | undefined;
                    gradient?: (Readonly<{
                        palette?: string | undefined;
                    } & {
                        type: "from_palette";
                        index: number;
                    }> | Readonly<{} & {
                        type: "color_code";
                        value: string;
                    }>)[] | undefined;
                    mapping?: Readonly<{} & {
                        values: (string | number | Readonly<{} & {
                            type: "range_key";
                            from: string | number;
                            to: string | number;
                            ranges: Readonly<{} & {
                                label: string;
                                from: string | number;
                                to: string | number;
                            }>[];
                        }> | Readonly<{} & {
                            keys: string[];
                            type: "multi_field_key";
                        }>)[];
                    }>[] | undefined;
                    unassignedColor?: Readonly<{
                        palette?: string | undefined;
                    } & {
                        type: "from_palette";
                        index: number;
                    }> | Readonly<{} & {
                        type: "color_code";
                        value: string;
                    }> | undefined;
                } & {
                    palette: string;
                    mode: "gradient";
                }> | undefined;
                label?: string | undefined;
                summary?: Readonly<{
                    label?: string | undefined;
                } & {
                    type: "max" | "min" | "count" | "avg" | "sum";
                }> | undefined;
                format?: Readonly<{
                    suffix?: string | undefined;
                } & {
                    type: "number" | "percent";
                    compact: boolean;
                    decimals: number;
                }> | Readonly<{
                    suffix?: string | undefined;
                } & {
                    type: "bytes" | "bits";
                    decimals: number;
                }> | Readonly<{
                    suffix?: string | undefined;
                } & {
                    type: "duration";
                    from: string;
                    to: string;
                }> | Readonly<{} & {
                    pattern: string;
                    type: "custom";
                }> | undefined;
                visible?: boolean | undefined;
                alignment?: "left" | "right" | "center" | undefined;
                apply_color_to?: "background" | "value" | undefined;
            } & {
                operation: "value";
                column: string;
            }>[] | undefined>;
            rows: import("@kbn/config-schema").Type<Readonly<{
                width?: number | undefined;
                color?: Readonly<{} & {
                    shift: boolean;
                    type: "legacy_dynamic";
                    palette: string;
                    range: "absolute" | "percentage";
                    steps: Readonly<{
                        lt?: number | null | undefined;
                        gte?: number | null | undefined;
                        lte?: number | null | undefined;
                    } & {
                        color: string;
                    }>[];
                }> | Readonly<{} & {
                    type: "dynamic";
                    range: "absolute";
                    steps: Readonly<{
                        lt?: number | null | undefined;
                        gte?: number | null | undefined;
                        lte?: number | null | undefined;
                    } & {
                        color: string;
                    }>[];
                }> | Readonly<{} & {
                    type: "dynamic";
                    range: "percentage";
                    steps: Readonly<{
                        lt?: number | null | undefined;
                        gte?: number | null | undefined;
                        lte?: number | null | undefined;
                    } & {
                        color: string;
                    }>[];
                }> | Readonly<{
                    unassignedColor?: Readonly<{
                        palette?: string | undefined;
                    } & {
                        type: "from_palette";
                        index: number;
                    }> | Readonly<{} & {
                        type: "color_code";
                        value: string;
                    }> | undefined;
                } & {
                    mapping: Readonly<{} & {
                        values: (string | number | Readonly<{} & {
                            type: "range_key";
                            from: string | number;
                            to: string | number;
                            ranges: Readonly<{} & {
                                label: string;
                                from: string | number;
                                to: string | number;
                            }>[];
                        }> | Readonly<{} & {
                            keys: string[];
                            type: "multi_field_key";
                        }>)[];
                        color: Readonly<{
                            palette?: string | undefined;
                        } & {
                            type: "from_palette";
                            index: number;
                        }> | Readonly<{} & {
                            type: "color_code";
                            value: string;
                        }>;
                    }>[];
                    palette: string;
                    mode: "categorical";
                }> | Readonly<{
                    sort?: "desc" | "asc" | undefined;
                    gradient?: (Readonly<{
                        palette?: string | undefined;
                    } & {
                        type: "from_palette";
                        index: number;
                    }> | Readonly<{} & {
                        type: "color_code";
                        value: string;
                    }>)[] | undefined;
                    mapping?: Readonly<{} & {
                        values: (string | number | Readonly<{} & {
                            type: "range_key";
                            from: string | number;
                            to: string | number;
                            ranges: Readonly<{} & {
                                label: string;
                                from: string | number;
                                to: string | number;
                            }>[];
                        }> | Readonly<{} & {
                            keys: string[];
                            type: "multi_field_key";
                        }>)[];
                    }>[] | undefined;
                    unassignedColor?: Readonly<{
                        palette?: string | undefined;
                    } & {
                        type: "from_palette";
                        index: number;
                    }> | Readonly<{} & {
                        type: "color_code";
                        value: string;
                    }> | undefined;
                } & {
                    palette: string;
                    mode: "gradient";
                }> | undefined;
                visible?: boolean | undefined;
                alignment?: "left" | "right" | "center" | undefined;
                apply_color_to?: "background" | "value" | undefined;
                collapse_by?: "max" | "min" | "avg" | "sum" | undefined;
                click_filter?: boolean | undefined;
            } & {
                operation: "value";
                column: string;
            }>[] | undefined>;
            split_metrics_by: import("@kbn/config-schema").Type<Readonly<{} & {
                operation: "value";
                column: string;
            }>[] | undefined>;
            density: import("@kbn/config-schema").Type<Readonly<{
                height?: Readonly<{
                    header?: Readonly<{} & {
                        type: "auto";
                    }> | Readonly<{} & {
                        type: "custom";
                        max_lines: number;
                    }> | undefined;
                    value?: Readonly<{} & {
                        type: "auto";
                    }> | Readonly<{} & {
                        type: "custom";
                        lines: number;
                    }> | undefined;
                } & {}> | undefined;
                mode?: "default" | "expanded" | "compact" | undefined;
            } & {}> | undefined>;
            paging: import("@kbn/config-schema").Type<100 | 10 | 50 | 20 | 30 | undefined>;
            sort_by: import("@kbn/config-schema").Type<Readonly<{} & {
                direction: "desc" | "asc";
                index: number;
                column_type: "row" | "metric";
            }> | Readonly<{} & {
                values: string[];
                direction: "desc" | "asc";
                index: number;
                column_type: "pivoted_metric";
            }> | undefined>;
            show_row_numbers: import("@kbn/config-schema").Type<boolean | undefined>;
            dataset: import("@kbn/config-schema").Type<Readonly<{} & {
                type: "esql";
                query: string;
            }> | Readonly<{
                table?: any;
            } & {
                type: "table";
            }>>;
            ignore_global_filters: import("@kbn/config-schema").Type<boolean>;
            sampling: import("@kbn/config-schema").Type<number>;
            title: import("@kbn/config-schema").Type<string | undefined>;
            description: import("@kbn/config-schema").Type<string | undefined>;
            filters: import("@kbn/config-schema").Type<import("@kbn/config-schema/src/types").ObjectResultUnionType<(Omit<{
                disabled: import("@kbn/config-schema").Type<boolean | undefined>;
                negate: import("@kbn/config-schema").Type<boolean | undefined>;
                controlled_by: import("@kbn/config-schema").Type<string | undefined>;
                data_view_id: import("@kbn/config-schema").Type<string | undefined>;
                label: import("@kbn/config-schema").Type<string | undefined>;
                is_multi_index: import("@kbn/config-schema").Type<boolean | undefined>;
            }, "type" | "condition"> & {
                type: import("@kbn/config-schema").Type<"condition">;
                condition: import("@kbn/config-schema").Type<import("@kbn/config-schema/src/types").ObjectResultUnionType<(Omit<{
                    field: import("@kbn/config-schema").Type<string>;
                    negate: import("@kbn/config-schema").Type<boolean | undefined>;
                }, "value" | "operator"> & {
                    value: import("@kbn/config-schema").Type<string | number | boolean>;
                    operator: import("@kbn/config-schema").Type<"is">;
                }) | (Omit<{
                    field: import("@kbn/config-schema").Type<string>;
                    negate: import("@kbn/config-schema").Type<boolean | undefined>;
                }, "value" | "operator"> & {
                    value: import("@kbn/config-schema").Type<number[] | string[] | boolean[]>;
                    operator: import("@kbn/config-schema").Type<"is_one_of">;
                }) | (Omit<{
                    field: import("@kbn/config-schema").Type<string>;
                    negate: import("@kbn/config-schema").Type<boolean | undefined>;
                }, "value" | "operator"> & {
                    value: import("@kbn/config-schema").ObjectType<{
                        gte: import("@kbn/config-schema").Type<string | number | undefined>;
                        lte: import("@kbn/config-schema").Type<string | number | undefined>;
                        gt: import("@kbn/config-schema").Type<string | number | undefined>;
                        lt: import("@kbn/config-schema").Type<string | number | undefined>;
                        format: import("@kbn/config-schema").Type<string | undefined>;
                    }>;
                    operator: import("@kbn/config-schema").Type<"range">;
                }) | (Omit<{
                    field: import("@kbn/config-schema").Type<string>;
                    negate: import("@kbn/config-schema").Type<boolean | undefined>;
                }, "operator"> & {
                    operator: import("@kbn/config-schema").Type<"exists">;
                })>>;
            }) | (Omit<{
                disabled: import("@kbn/config-schema").Type<boolean | undefined>;
                negate: import("@kbn/config-schema").Type<boolean | undefined>;
                controlled_by: import("@kbn/config-schema").Type<string | undefined>;
                data_view_id: import("@kbn/config-schema").Type<string | undefined>;
                label: import("@kbn/config-schema").Type<string | undefined>;
                is_multi_index: import("@kbn/config-schema").Type<boolean | undefined>;
            }, "group" | "type"> & {
                group: import("@kbn/config-schema").ObjectType<{
                    operator: import("@kbn/config-schema").Type<"and" | "or">;
                    conditions: import("@kbn/config-schema").Type<(import("@kbn/config-schema/src/types").ObjectResultUnionType<(Omit<{
                        field: import("@kbn/config-schema").Type<string>;
                        negate: import("@kbn/config-schema").Type<boolean | undefined>;
                    }, "value" | "operator"> & {
                        value: import("@kbn/config-schema").Type<string | number | boolean>;
                        operator: import("@kbn/config-schema").Type<"is">;
                    }) | (Omit<{
                        field: import("@kbn/config-schema").Type<string>;
                        negate: import("@kbn/config-schema").Type<boolean | undefined>;
                    }, "value" | "operator"> & {
                        value: import("@kbn/config-schema").Type<number[] | string[] | boolean[]>;
                        operator: import("@kbn/config-schema").Type<"is_one_of">;
                    }) | (Omit<{
                        field: import("@kbn/config-schema").Type<string>;
                        negate: import("@kbn/config-schema").Type<boolean | undefined>;
                    }, "value" | "operator"> & {
                        value: import("@kbn/config-schema").ObjectType<{
                            gte: import("@kbn/config-schema").Type<string | number | undefined>;
                            lte: import("@kbn/config-schema").Type<string | number | undefined>;
                            gt: import("@kbn/config-schema").Type<string | number | undefined>;
                            lt: import("@kbn/config-schema").Type<string | number | undefined>;
                            format: import("@kbn/config-schema").Type<string | undefined>;
                        }>;
                        operator: import("@kbn/config-schema").Type<"range">;
                    }) | (Omit<{
                        field: import("@kbn/config-schema").Type<string>;
                        negate: import("@kbn/config-schema").Type<boolean | undefined>;
                    }, "operator"> & {
                        operator: import("@kbn/config-schema").Type<"exists">;
                    })> | import("@kbn/as-code-filters-schema").AsCodeGroupFilterRecursive)[]>;
                }>;
                type: import("@kbn/config-schema").Type<"group">;
            }) | (Omit<{
                disabled: import("@kbn/config-schema").Type<boolean | undefined>;
                negate: import("@kbn/config-schema").Type<boolean | undefined>;
                controlled_by: import("@kbn/config-schema").Type<string | undefined>;
                data_view_id: import("@kbn/config-schema").Type<string | undefined>;
                label: import("@kbn/config-schema").Type<string | undefined>;
                is_multi_index: import("@kbn/config-schema").Type<boolean | undefined>;
            }, "field" | "type" | "params" | "dsl"> & {
                field: import("@kbn/config-schema").Type<string | undefined>;
                type: import("@kbn/config-schema").Type<"dsl">;
                params: import("@kbn/config-schema").Type<any>;
                dsl: import("@kbn/config-schema").Type<Record<string, any>>;
            }) | (Omit<{
                disabled: import("@kbn/config-schema").Type<boolean | undefined>;
                negate: import("@kbn/config-schema").Type<boolean | undefined>;
                controlled_by: import("@kbn/config-schema").Type<string | undefined>;
                data_view_id: import("@kbn/config-schema").Type<string | undefined>;
                label: import("@kbn/config-schema").Type<string | undefined>;
                is_multi_index: import("@kbn/config-schema").Type<boolean | undefined>;
            }, "type" | "dsl"> & {
                type: import("@kbn/config-schema").Type<"spatial">;
                dsl: import("@kbn/config-schema").Type<Record<string, any>>;
            })>[] | undefined>;
            type: import("@kbn/config-schema").Type<"data_table">;
        }>;
        guidance: {
            description: string;
            guideline: string;
        };
    };
    pie: {
        schema: import("@kbn/config-schema").ObjectType<{
            metrics: import("@kbn/config-schema").Type<Readonly<{
                color?: Readonly<{} & {
                    color: string;
                    type: "static";
                }> | undefined;
                label?: string | undefined;
                format?: Readonly<{
                    suffix?: string | undefined;
                } & {
                    type: "number" | "percent";
                    compact: boolean;
                    decimals: number;
                }> | Readonly<{
                    suffix?: string | undefined;
                } & {
                    type: "bytes" | "bits";
                    decimals: number;
                }> | Readonly<{
                    suffix?: string | undefined;
                } & {
                    type: "duration";
                    from: string;
                    to: string;
                }> | Readonly<{} & {
                    pattern: string;
                    type: "custom";
                }> | undefined;
            } & {
                operation: "value";
                column: string;
            }>[]>;
            group_by: import("@kbn/config-schema").Type<Readonly<{
                color?: Readonly<{
                    unassignedColor?: Readonly<{
                        palette?: string | undefined;
                    } & {
                        type: "from_palette";
                        index: number;
                    }> | Readonly<{} & {
                        type: "color_code";
                        value: string;
                    }> | undefined;
                } & {
                    mapping: Readonly<{} & {
                        values: (string | number | Readonly<{} & {
                            type: "range_key";
                            from: string | number;
                            to: string | number;
                            ranges: Readonly<{} & {
                                label: string;
                                from: string | number;
                                to: string | number;
                            }>[];
                        }> | Readonly<{} & {
                            keys: string[];
                            type: "multi_field_key";
                        }>)[];
                        color: Readonly<{
                            palette?: string | undefined;
                        } & {
                            type: "from_palette";
                            index: number;
                        }> | Readonly<{} & {
                            type: "color_code";
                            value: string;
                        }>;
                    }>[];
                    palette: string;
                    mode: "categorical";
                }> | Readonly<{
                    sort?: "desc" | "asc" | undefined;
                    gradient?: (Readonly<{
                        palette?: string | undefined;
                    } & {
                        type: "from_palette";
                        index: number;
                    }> | Readonly<{} & {
                        type: "color_code";
                        value: string;
                    }>)[] | undefined;
                    mapping?: Readonly<{} & {
                        values: (string | number | Readonly<{} & {
                            type: "range_key";
                            from: string | number;
                            to: string | number;
                            ranges: Readonly<{} & {
                                label: string;
                                from: string | number;
                                to: string | number;
                            }>[];
                        }> | Readonly<{} & {
                            keys: string[];
                            type: "multi_field_key";
                        }>)[];
                    }>[] | undefined;
                    unassignedColor?: Readonly<{
                        palette?: string | undefined;
                    } & {
                        type: "from_palette";
                        index: number;
                    }> | Readonly<{} & {
                        type: "color_code";
                        value: string;
                    }> | undefined;
                } & {
                    palette: string;
                    mode: "gradient";
                }> | undefined;
                collapse_by?: "max" | "min" | "avg" | "sum" | undefined;
            } & {
                operation: "value";
                column: string;
            }>[] | undefined>;
            legend: import("@kbn/config-schema").Type<Readonly<{
                size?: "auto" | "small" | "medium" | "large" | "xlarge" | undefined;
                nested?: boolean | undefined;
                visible?: "auto" | "show" | "hide" | undefined;
                truncate_after_lines?: number | undefined;
            } & {}> | undefined>;
            value_display: import("@kbn/config-schema").Type<Readonly<{
                percent_decimals?: number | undefined;
            } & {
                mode: "hidden" | "absolute" | "percentage";
            }> | undefined>;
            label_position: import("@kbn/config-schema").Type<"hidden" | "inside" | "outside" | undefined>;
            donut_hole: import("@kbn/config-schema").Type<"none" | "small" | "medium" | "large" | undefined>;
            dataset: import("@kbn/config-schema").Type<Readonly<{} & {
                type: "esql";
                query: string;
            }> | Readonly<{
                table?: any;
            } & {
                type: "table";
            }>>;
            ignore_global_filters: import("@kbn/config-schema").Type<boolean>;
            sampling: import("@kbn/config-schema").Type<number>;
            title: import("@kbn/config-schema").Type<string | undefined>;
            description: import("@kbn/config-schema").Type<string | undefined>;
            filters: import("@kbn/config-schema").Type<import("@kbn/config-schema/src/types").ObjectResultUnionType<(Omit<{
                disabled: import("@kbn/config-schema").Type<boolean | undefined>;
                negate: import("@kbn/config-schema").Type<boolean | undefined>;
                controlled_by: import("@kbn/config-schema").Type<string | undefined>;
                data_view_id: import("@kbn/config-schema").Type<string | undefined>;
                label: import("@kbn/config-schema").Type<string | undefined>;
                is_multi_index: import("@kbn/config-schema").Type<boolean | undefined>;
            }, "type" | "condition"> & {
                type: import("@kbn/config-schema").Type<"condition">;
                condition: import("@kbn/config-schema").Type<import("@kbn/config-schema/src/types").ObjectResultUnionType<(Omit<{
                    field: import("@kbn/config-schema").Type<string>;
                    negate: import("@kbn/config-schema").Type<boolean | undefined>;
                }, "value" | "operator"> & {
                    value: import("@kbn/config-schema").Type<string | number | boolean>;
                    operator: import("@kbn/config-schema").Type<"is">;
                }) | (Omit<{
                    field: import("@kbn/config-schema").Type<string>;
                    negate: import("@kbn/config-schema").Type<boolean | undefined>;
                }, "value" | "operator"> & {
                    value: import("@kbn/config-schema").Type<number[] | string[] | boolean[]>;
                    operator: import("@kbn/config-schema").Type<"is_one_of">;
                }) | (Omit<{
                    field: import("@kbn/config-schema").Type<string>;
                    negate: import("@kbn/config-schema").Type<boolean | undefined>;
                }, "value" | "operator"> & {
                    value: import("@kbn/config-schema").ObjectType<{
                        gte: import("@kbn/config-schema").Type<string | number | undefined>;
                        lte: import("@kbn/config-schema").Type<string | number | undefined>;
                        gt: import("@kbn/config-schema").Type<string | number | undefined>;
                        lt: import("@kbn/config-schema").Type<string | number | undefined>;
                        format: import("@kbn/config-schema").Type<string | undefined>;
                    }>;
                    operator: import("@kbn/config-schema").Type<"range">;
                }) | (Omit<{
                    field: import("@kbn/config-schema").Type<string>;
                    negate: import("@kbn/config-schema").Type<boolean | undefined>;
                }, "operator"> & {
                    operator: import("@kbn/config-schema").Type<"exists">;
                })>>;
            }) | (Omit<{
                disabled: import("@kbn/config-schema").Type<boolean | undefined>;
                negate: import("@kbn/config-schema").Type<boolean | undefined>;
                controlled_by: import("@kbn/config-schema").Type<string | undefined>;
                data_view_id: import("@kbn/config-schema").Type<string | undefined>;
                label: import("@kbn/config-schema").Type<string | undefined>;
                is_multi_index: import("@kbn/config-schema").Type<boolean | undefined>;
            }, "group" | "type"> & {
                group: import("@kbn/config-schema").ObjectType<{
                    operator: import("@kbn/config-schema").Type<"and" | "or">;
                    conditions: import("@kbn/config-schema").Type<(import("@kbn/config-schema/src/types").ObjectResultUnionType<(Omit<{
                        field: import("@kbn/config-schema").Type<string>;
                        negate: import("@kbn/config-schema").Type<boolean | undefined>;
                    }, "value" | "operator"> & {
                        value: import("@kbn/config-schema").Type<string | number | boolean>;
                        operator: import("@kbn/config-schema").Type<"is">;
                    }) | (Omit<{
                        field: import("@kbn/config-schema").Type<string>;
                        negate: import("@kbn/config-schema").Type<boolean | undefined>;
                    }, "value" | "operator"> & {
                        value: import("@kbn/config-schema").Type<number[] | string[] | boolean[]>;
                        operator: import("@kbn/config-schema").Type<"is_one_of">;
                    }) | (Omit<{
                        field: import("@kbn/config-schema").Type<string>;
                        negate: import("@kbn/config-schema").Type<boolean | undefined>;
                    }, "value" | "operator"> & {
                        value: import("@kbn/config-schema").ObjectType<{
                            gte: import("@kbn/config-schema").Type<string | number | undefined>;
                            lte: import("@kbn/config-schema").Type<string | number | undefined>;
                            gt: import("@kbn/config-schema").Type<string | number | undefined>;
                            lt: import("@kbn/config-schema").Type<string | number | undefined>;
                            format: import("@kbn/config-schema").Type<string | undefined>;
                        }>;
                        operator: import("@kbn/config-schema").Type<"range">;
                    }) | (Omit<{
                        field: import("@kbn/config-schema").Type<string>;
                        negate: import("@kbn/config-schema").Type<boolean | undefined>;
                    }, "operator"> & {
                        operator: import("@kbn/config-schema").Type<"exists">;
                    })> | import("@kbn/as-code-filters-schema").AsCodeGroupFilterRecursive)[]>;
                }>;
                type: import("@kbn/config-schema").Type<"group">;
            }) | (Omit<{
                disabled: import("@kbn/config-schema").Type<boolean | undefined>;
                negate: import("@kbn/config-schema").Type<boolean | undefined>;
                controlled_by: import("@kbn/config-schema").Type<string | undefined>;
                data_view_id: import("@kbn/config-schema").Type<string | undefined>;
                label: import("@kbn/config-schema").Type<string | undefined>;
                is_multi_index: import("@kbn/config-schema").Type<boolean | undefined>;
            }, "field" | "type" | "params" | "dsl"> & {
                field: import("@kbn/config-schema").Type<string | undefined>;
                type: import("@kbn/config-schema").Type<"dsl">;
                params: import("@kbn/config-schema").Type<any>;
                dsl: import("@kbn/config-schema").Type<Record<string, any>>;
            }) | (Omit<{
                disabled: import("@kbn/config-schema").Type<boolean | undefined>;
                negate: import("@kbn/config-schema").Type<boolean | undefined>;
                controlled_by: import("@kbn/config-schema").Type<string | undefined>;
                data_view_id: import("@kbn/config-schema").Type<string | undefined>;
                label: import("@kbn/config-schema").Type<string | undefined>;
                is_multi_index: import("@kbn/config-schema").Type<boolean | undefined>;
            }, "type" | "dsl"> & {
                type: import("@kbn/config-schema").Type<"spatial">;
                dsl: import("@kbn/config-schema").Type<Record<string, any>>;
            })>[] | undefined>;
            type: import("@kbn/config-schema").Type<"pie" | "donut">;
        }>;
        guidance: {
            description: string;
            guideline: string;
        };
    };
    treemap: {
        schema: import("@kbn/config-schema").ObjectType<{
            metrics: import("@kbn/config-schema").Type<Readonly<{
                color?: Readonly<{} & {
                    color: string;
                    type: "static";
                }> | undefined;
                label?: string | undefined;
                format?: Readonly<{
                    suffix?: string | undefined;
                } & {
                    type: "number" | "percent";
                    compact: boolean;
                    decimals: number;
                }> | Readonly<{
                    suffix?: string | undefined;
                } & {
                    type: "bytes" | "bits";
                    decimals: number;
                }> | Readonly<{
                    suffix?: string | undefined;
                } & {
                    type: "duration";
                    from: string;
                    to: string;
                }> | Readonly<{} & {
                    pattern: string;
                    type: "custom";
                }> | undefined;
            } & {
                operation: "value";
                column: string;
            }>[]>;
            group_by: import("@kbn/config-schema").Type<Readonly<{
                color?: Readonly<{
                    unassignedColor?: Readonly<{
                        palette?: string | undefined;
                    } & {
                        type: "from_palette";
                        index: number;
                    }> | Readonly<{} & {
                        type: "color_code";
                        value: string;
                    }> | undefined;
                } & {
                    mapping: Readonly<{} & {
                        values: (string | number | Readonly<{} & {
                            type: "range_key";
                            from: string | number;
                            to: string | number;
                            ranges: Readonly<{} & {
                                label: string;
                                from: string | number;
                                to: string | number;
                            }>[];
                        }> | Readonly<{} & {
                            keys: string[];
                            type: "multi_field_key";
                        }>)[];
                        color: Readonly<{
                            palette?: string | undefined;
                        } & {
                            type: "from_palette";
                            index: number;
                        }> | Readonly<{} & {
                            type: "color_code";
                            value: string;
                        }>;
                    }>[];
                    palette: string;
                    mode: "categorical";
                }> | Readonly<{
                    sort?: "desc" | "asc" | undefined;
                    gradient?: (Readonly<{
                        palette?: string | undefined;
                    } & {
                        type: "from_palette";
                        index: number;
                    }> | Readonly<{} & {
                        type: "color_code";
                        value: string;
                    }>)[] | undefined;
                    mapping?: Readonly<{} & {
                        values: (string | number | Readonly<{} & {
                            type: "range_key";
                            from: string | number;
                            to: string | number;
                            ranges: Readonly<{} & {
                                label: string;
                                from: string | number;
                                to: string | number;
                            }>[];
                        }> | Readonly<{} & {
                            keys: string[];
                            type: "multi_field_key";
                        }>)[];
                    }>[] | undefined;
                    unassignedColor?: Readonly<{
                        palette?: string | undefined;
                    } & {
                        type: "from_palette";
                        index: number;
                    }> | Readonly<{} & {
                        type: "color_code";
                        value: string;
                    }> | undefined;
                } & {
                    palette: string;
                    mode: "gradient";
                }> | undefined;
                collapse_by?: "max" | "min" | "avg" | "sum" | undefined;
            } & {
                operation: "value";
                column: string;
            }>[] | undefined>;
            legend: import("@kbn/config-schema").Type<Readonly<{
                size?: "auto" | "small" | "medium" | "large" | "xlarge" | undefined;
                nested?: boolean | undefined;
                visible?: "auto" | "show" | "hide" | undefined;
                truncate_after_lines?: number | undefined;
            } & {}> | undefined>;
            value_display: import("@kbn/config-schema").Type<Readonly<{
                percent_decimals?: number | undefined;
            } & {
                mode: "hidden" | "absolute" | "percentage";
            }> | undefined>;
            label_position: import("@kbn/config-schema").Type<"hidden" | "visible" | undefined>;
            dataset: import("@kbn/config-schema").Type<Readonly<{} & {
                type: "esql";
                query: string;
            }> | Readonly<{
                table?: any;
            } & {
                type: "table";
            }>>;
            ignore_global_filters: import("@kbn/config-schema").Type<boolean>;
            sampling: import("@kbn/config-schema").Type<number>;
            title: import("@kbn/config-schema").Type<string | undefined>;
            description: import("@kbn/config-schema").Type<string | undefined>;
            filters: import("@kbn/config-schema").Type<import("@kbn/config-schema/src/types").ObjectResultUnionType<(Omit<{
                disabled: import("@kbn/config-schema").Type<boolean | undefined>;
                negate: import("@kbn/config-schema").Type<boolean | undefined>;
                controlled_by: import("@kbn/config-schema").Type<string | undefined>;
                data_view_id: import("@kbn/config-schema").Type<string | undefined>;
                label: import("@kbn/config-schema").Type<string | undefined>;
                is_multi_index: import("@kbn/config-schema").Type<boolean | undefined>;
            }, "type" | "condition"> & {
                type: import("@kbn/config-schema").Type<"condition">;
                condition: import("@kbn/config-schema").Type<import("@kbn/config-schema/src/types").ObjectResultUnionType<(Omit<{
                    field: import("@kbn/config-schema").Type<string>;
                    negate: import("@kbn/config-schema").Type<boolean | undefined>;
                }, "value" | "operator"> & {
                    value: import("@kbn/config-schema").Type<string | number | boolean>;
                    operator: import("@kbn/config-schema").Type<"is">;
                }) | (Omit<{
                    field: import("@kbn/config-schema").Type<string>;
                    negate: import("@kbn/config-schema").Type<boolean | undefined>;
                }, "value" | "operator"> & {
                    value: import("@kbn/config-schema").Type<number[] | string[] | boolean[]>;
                    operator: import("@kbn/config-schema").Type<"is_one_of">;
                }) | (Omit<{
                    field: import("@kbn/config-schema").Type<string>;
                    negate: import("@kbn/config-schema").Type<boolean | undefined>;
                }, "value" | "operator"> & {
                    value: import("@kbn/config-schema").ObjectType<{
                        gte: import("@kbn/config-schema").Type<string | number | undefined>;
                        lte: import("@kbn/config-schema").Type<string | number | undefined>;
                        gt: import("@kbn/config-schema").Type<string | number | undefined>;
                        lt: import("@kbn/config-schema").Type<string | number | undefined>;
                        format: import("@kbn/config-schema").Type<string | undefined>;
                    }>;
                    operator: import("@kbn/config-schema").Type<"range">;
                }) | (Omit<{
                    field: import("@kbn/config-schema").Type<string>;
                    negate: import("@kbn/config-schema").Type<boolean | undefined>;
                }, "operator"> & {
                    operator: import("@kbn/config-schema").Type<"exists">;
                })>>;
            }) | (Omit<{
                disabled: import("@kbn/config-schema").Type<boolean | undefined>;
                negate: import("@kbn/config-schema").Type<boolean | undefined>;
                controlled_by: import("@kbn/config-schema").Type<string | undefined>;
                data_view_id: import("@kbn/config-schema").Type<string | undefined>;
                label: import("@kbn/config-schema").Type<string | undefined>;
                is_multi_index: import("@kbn/config-schema").Type<boolean | undefined>;
            }, "group" | "type"> & {
                group: import("@kbn/config-schema").ObjectType<{
                    operator: import("@kbn/config-schema").Type<"and" | "or">;
                    conditions: import("@kbn/config-schema").Type<(import("@kbn/config-schema/src/types").ObjectResultUnionType<(Omit<{
                        field: import("@kbn/config-schema").Type<string>;
                        negate: import("@kbn/config-schema").Type<boolean | undefined>;
                    }, "value" | "operator"> & {
                        value: import("@kbn/config-schema").Type<string | number | boolean>;
                        operator: import("@kbn/config-schema").Type<"is">;
                    }) | (Omit<{
                        field: import("@kbn/config-schema").Type<string>;
                        negate: import("@kbn/config-schema").Type<boolean | undefined>;
                    }, "value" | "operator"> & {
                        value: import("@kbn/config-schema").Type<number[] | string[] | boolean[]>;
                        operator: import("@kbn/config-schema").Type<"is_one_of">;
                    }) | (Omit<{
                        field: import("@kbn/config-schema").Type<string>;
                        negate: import("@kbn/config-schema").Type<boolean | undefined>;
                    }, "value" | "operator"> & {
                        value: import("@kbn/config-schema").ObjectType<{
                            gte: import("@kbn/config-schema").Type<string | number | undefined>;
                            lte: import("@kbn/config-schema").Type<string | number | undefined>;
                            gt: import("@kbn/config-schema").Type<string | number | undefined>;
                            lt: import("@kbn/config-schema").Type<string | number | undefined>;
                            format: import("@kbn/config-schema").Type<string | undefined>;
                        }>;
                        operator: import("@kbn/config-schema").Type<"range">;
                    }) | (Omit<{
                        field: import("@kbn/config-schema").Type<string>;
                        negate: import("@kbn/config-schema").Type<boolean | undefined>;
                    }, "operator"> & {
                        operator: import("@kbn/config-schema").Type<"exists">;
                    })> | import("@kbn/as-code-filters-schema").AsCodeGroupFilterRecursive)[]>;
                }>;
                type: import("@kbn/config-schema").Type<"group">;
            }) | (Omit<{
                disabled: import("@kbn/config-schema").Type<boolean | undefined>;
                negate: import("@kbn/config-schema").Type<boolean | undefined>;
                controlled_by: import("@kbn/config-schema").Type<string | undefined>;
                data_view_id: import("@kbn/config-schema").Type<string | undefined>;
                label: import("@kbn/config-schema").Type<string | undefined>;
                is_multi_index: import("@kbn/config-schema").Type<boolean | undefined>;
            }, "field" | "type" | "params" | "dsl"> & {
                field: import("@kbn/config-schema").Type<string | undefined>;
                type: import("@kbn/config-schema").Type<"dsl">;
                params: import("@kbn/config-schema").Type<any>;
                dsl: import("@kbn/config-schema").Type<Record<string, any>>;
            }) | (Omit<{
                disabled: import("@kbn/config-schema").Type<boolean | undefined>;
                negate: import("@kbn/config-schema").Type<boolean | undefined>;
                controlled_by: import("@kbn/config-schema").Type<string | undefined>;
                data_view_id: import("@kbn/config-schema").Type<string | undefined>;
                label: import("@kbn/config-schema").Type<string | undefined>;
                is_multi_index: import("@kbn/config-schema").Type<boolean | undefined>;
            }, "type" | "dsl"> & {
                type: import("@kbn/config-schema").Type<"spatial">;
                dsl: import("@kbn/config-schema").Type<Record<string, any>>;
            })>[] | undefined>;
            type: import("@kbn/config-schema").Type<"treemap">;
        }>;
        guidance: {
            description: string;
            guideline: string;
        };
    };
    waffle: {
        schema: import("@kbn/config-schema").ObjectType<{
            metrics: import("@kbn/config-schema").Type<Readonly<{
                color?: Readonly<{} & {
                    color: string;
                    type: "static";
                }> | undefined;
                label?: string | undefined;
                format?: Readonly<{
                    suffix?: string | undefined;
                } & {
                    type: "number" | "percent";
                    compact: boolean;
                    decimals: number;
                }> | Readonly<{
                    suffix?: string | undefined;
                } & {
                    type: "bytes" | "bits";
                    decimals: number;
                }> | Readonly<{
                    suffix?: string | undefined;
                } & {
                    type: "duration";
                    from: string;
                    to: string;
                }> | Readonly<{} & {
                    pattern: string;
                    type: "custom";
                }> | undefined;
            } & {
                operation: "value";
                column: string;
            }>[]>;
            group_by: import("@kbn/config-schema").Type<Readonly<{
                color?: Readonly<{
                    unassignedColor?: Readonly<{
                        palette?: string | undefined;
                    } & {
                        type: "from_palette";
                        index: number;
                    }> | Readonly<{} & {
                        type: "color_code";
                        value: string;
                    }> | undefined;
                } & {
                    mapping: Readonly<{} & {
                        values: (string | number | Readonly<{} & {
                            type: "range_key";
                            from: string | number;
                            to: string | number;
                            ranges: Readonly<{} & {
                                label: string;
                                from: string | number;
                                to: string | number;
                            }>[];
                        }> | Readonly<{} & {
                            keys: string[];
                            type: "multi_field_key";
                        }>)[];
                        color: Readonly<{
                            palette?: string | undefined;
                        } & {
                            type: "from_palette";
                            index: number;
                        }> | Readonly<{} & {
                            type: "color_code";
                            value: string;
                        }>;
                    }>[];
                    palette: string;
                    mode: "categorical";
                }> | Readonly<{
                    sort?: "desc" | "asc" | undefined;
                    gradient?: (Readonly<{
                        palette?: string | undefined;
                    } & {
                        type: "from_palette";
                        index: number;
                    }> | Readonly<{} & {
                        type: "color_code";
                        value: string;
                    }>)[] | undefined;
                    mapping?: Readonly<{} & {
                        values: (string | number | Readonly<{} & {
                            type: "range_key";
                            from: string | number;
                            to: string | number;
                            ranges: Readonly<{} & {
                                label: string;
                                from: string | number;
                                to: string | number;
                            }>[];
                        }> | Readonly<{} & {
                            keys: string[];
                            type: "multi_field_key";
                        }>)[];
                    }>[] | undefined;
                    unassignedColor?: Readonly<{
                        palette?: string | undefined;
                    } & {
                        type: "from_palette";
                        index: number;
                    }> | Readonly<{} & {
                        type: "color_code";
                        value: string;
                    }> | undefined;
                } & {
                    palette: string;
                    mode: "gradient";
                }> | undefined;
                collapse_by?: "max" | "min" | "avg" | "sum" | undefined;
            } & {
                operation: "value";
                column: string;
            }>[] | undefined>;
            legend: import("@kbn/config-schema").Type<Readonly<{
                size?: "auto" | "small" | "medium" | "large" | "xlarge" | undefined;
                values?: "absolute"[] | undefined;
                visible?: "auto" | "show" | "hide" | undefined;
                truncate_after_lines?: number | undefined;
            } & {}> | undefined>;
            value_display: import("@kbn/config-schema").Type<Readonly<{
                percent_decimals?: number | undefined;
            } & {
                mode: "hidden" | "absolute" | "percentage";
            }> | undefined>;
            dataset: import("@kbn/config-schema").Type<Readonly<{} & {
                type: "esql";
                query: string;
            }> | Readonly<{
                table?: any;
            } & {
                type: "table";
            }>>;
            ignore_global_filters: import("@kbn/config-schema").Type<boolean>;
            sampling: import("@kbn/config-schema").Type<number>;
            title: import("@kbn/config-schema").Type<string | undefined>;
            description: import("@kbn/config-schema").Type<string | undefined>;
            filters: import("@kbn/config-schema").Type<import("@kbn/config-schema/src/types").ObjectResultUnionType<(Omit<{
                disabled: import("@kbn/config-schema").Type<boolean | undefined>;
                negate: import("@kbn/config-schema").Type<boolean | undefined>;
                controlled_by: import("@kbn/config-schema").Type<string | undefined>;
                data_view_id: import("@kbn/config-schema").Type<string | undefined>;
                label: import("@kbn/config-schema").Type<string | undefined>;
                is_multi_index: import("@kbn/config-schema").Type<boolean | undefined>;
            }, "type" | "condition"> & {
                type: import("@kbn/config-schema").Type<"condition">;
                condition: import("@kbn/config-schema").Type<import("@kbn/config-schema/src/types").ObjectResultUnionType<(Omit<{
                    field: import("@kbn/config-schema").Type<string>;
                    negate: import("@kbn/config-schema").Type<boolean | undefined>;
                }, "value" | "operator"> & {
                    value: import("@kbn/config-schema").Type<string | number | boolean>;
                    operator: import("@kbn/config-schema").Type<"is">;
                }) | (Omit<{
                    field: import("@kbn/config-schema").Type<string>;
                    negate: import("@kbn/config-schema").Type<boolean | undefined>;
                }, "value" | "operator"> & {
                    value: import("@kbn/config-schema").Type<number[] | string[] | boolean[]>;
                    operator: import("@kbn/config-schema").Type<"is_one_of">;
                }) | (Omit<{
                    field: import("@kbn/config-schema").Type<string>;
                    negate: import("@kbn/config-schema").Type<boolean | undefined>;
                }, "value" | "operator"> & {
                    value: import("@kbn/config-schema").ObjectType<{
                        gte: import("@kbn/config-schema").Type<string | number | undefined>;
                        lte: import("@kbn/config-schema").Type<string | number | undefined>;
                        gt: import("@kbn/config-schema").Type<string | number | undefined>;
                        lt: import("@kbn/config-schema").Type<string | number | undefined>;
                        format: import("@kbn/config-schema").Type<string | undefined>;
                    }>;
                    operator: import("@kbn/config-schema").Type<"range">;
                }) | (Omit<{
                    field: import("@kbn/config-schema").Type<string>;
                    negate: import("@kbn/config-schema").Type<boolean | undefined>;
                }, "operator"> & {
                    operator: import("@kbn/config-schema").Type<"exists">;
                })>>;
            }) | (Omit<{
                disabled: import("@kbn/config-schema").Type<boolean | undefined>;
                negate: import("@kbn/config-schema").Type<boolean | undefined>;
                controlled_by: import("@kbn/config-schema").Type<string | undefined>;
                data_view_id: import("@kbn/config-schema").Type<string | undefined>;
                label: import("@kbn/config-schema").Type<string | undefined>;
                is_multi_index: import("@kbn/config-schema").Type<boolean | undefined>;
            }, "group" | "type"> & {
                group: import("@kbn/config-schema").ObjectType<{
                    operator: import("@kbn/config-schema").Type<"and" | "or">;
                    conditions: import("@kbn/config-schema").Type<(import("@kbn/config-schema/src/types").ObjectResultUnionType<(Omit<{
                        field: import("@kbn/config-schema").Type<string>;
                        negate: import("@kbn/config-schema").Type<boolean | undefined>;
                    }, "value" | "operator"> & {
                        value: import("@kbn/config-schema").Type<string | number | boolean>;
                        operator: import("@kbn/config-schema").Type<"is">;
                    }) | (Omit<{
                        field: import("@kbn/config-schema").Type<string>;
                        negate: import("@kbn/config-schema").Type<boolean | undefined>;
                    }, "value" | "operator"> & {
                        value: import("@kbn/config-schema").Type<number[] | string[] | boolean[]>;
                        operator: import("@kbn/config-schema").Type<"is_one_of">;
                    }) | (Omit<{
                        field: import("@kbn/config-schema").Type<string>;
                        negate: import("@kbn/config-schema").Type<boolean | undefined>;
                    }, "value" | "operator"> & {
                        value: import("@kbn/config-schema").ObjectType<{
                            gte: import("@kbn/config-schema").Type<string | number | undefined>;
                            lte: import("@kbn/config-schema").Type<string | number | undefined>;
                            gt: import("@kbn/config-schema").Type<string | number | undefined>;
                            lt: import("@kbn/config-schema").Type<string | number | undefined>;
                            format: import("@kbn/config-schema").Type<string | undefined>;
                        }>;
                        operator: import("@kbn/config-schema").Type<"range">;
                    }) | (Omit<{
                        field: import("@kbn/config-schema").Type<string>;
                        negate: import("@kbn/config-schema").Type<boolean | undefined>;
                    }, "operator"> & {
                        operator: import("@kbn/config-schema").Type<"exists">;
                    })> | import("@kbn/as-code-filters-schema").AsCodeGroupFilterRecursive)[]>;
                }>;
                type: import("@kbn/config-schema").Type<"group">;
            }) | (Omit<{
                disabled: import("@kbn/config-schema").Type<boolean | undefined>;
                negate: import("@kbn/config-schema").Type<boolean | undefined>;
                controlled_by: import("@kbn/config-schema").Type<string | undefined>;
                data_view_id: import("@kbn/config-schema").Type<string | undefined>;
                label: import("@kbn/config-schema").Type<string | undefined>;
                is_multi_index: import("@kbn/config-schema").Type<boolean | undefined>;
            }, "field" | "type" | "params" | "dsl"> & {
                field: import("@kbn/config-schema").Type<string | undefined>;
                type: import("@kbn/config-schema").Type<"dsl">;
                params: import("@kbn/config-schema").Type<any>;
                dsl: import("@kbn/config-schema").Type<Record<string, any>>;
            }) | (Omit<{
                disabled: import("@kbn/config-schema").Type<boolean | undefined>;
                negate: import("@kbn/config-schema").Type<boolean | undefined>;
                controlled_by: import("@kbn/config-schema").Type<string | undefined>;
                data_view_id: import("@kbn/config-schema").Type<string | undefined>;
                label: import("@kbn/config-schema").Type<string | undefined>;
                is_multi_index: import("@kbn/config-schema").Type<boolean | undefined>;
            }, "type" | "dsl"> & {
                type: import("@kbn/config-schema").Type<"spatial">;
                dsl: import("@kbn/config-schema").Type<Record<string, any>>;
            })>[] | undefined>;
            type: import("@kbn/config-schema").Type<"waffle">;
        }>;
        guidance: {
            description: string;
            guideline: string;
        };
    };
    mosaic: {
        schema: import("@kbn/config-schema").ObjectType<{
            metric: import("@kbn/config-schema").ObjectType<Omit<Omit<{
                label: import("@kbn/config-schema").Type<string | undefined>;
                format: import("@kbn/config-schema").Type<Readonly<{
                    suffix?: string | undefined;
                } & {
                    type: "number" | "percent";
                    compact: boolean;
                    decimals: number;
                }> | Readonly<{
                    suffix?: string | undefined;
                } & {
                    type: "bytes" | "bits";
                    decimals: number;
                }> | Readonly<{
                    suffix?: string | undefined;
                } & {
                    type: "duration";
                    from: string;
                    to: string;
                }> | Readonly<{} & {
                    pattern: string;
                    type: "custom";
                }> | undefined>;
            }, "operation" | "column"> & {
                operation: import("@kbn/config-schema").Type<"value">;
                column: import("@kbn/config-schema").Type<string>;
            }, never> & {}>;
            group_by: import("@kbn/config-schema").Type<Readonly<{
                color?: Readonly<{
                    unassignedColor?: Readonly<{
                        palette?: string | undefined;
                    } & {
                        type: "from_palette";
                        index: number;
                    }> | Readonly<{} & {
                        type: "color_code";
                        value: string;
                    }> | undefined;
                } & {
                    mapping: Readonly<{} & {
                        values: (string | number | Readonly<{} & {
                            type: "range_key";
                            from: string | number;
                            to: string | number;
                            ranges: Readonly<{} & {
                                label: string;
                                from: string | number;
                                to: string | number;
                            }>[];
                        }> | Readonly<{} & {
                            keys: string[];
                            type: "multi_field_key";
                        }>)[];
                        color: Readonly<{
                            palette?: string | undefined;
                        } & {
                            type: "from_palette";
                            index: number;
                        }> | Readonly<{} & {
                            type: "color_code";
                            value: string;
                        }>;
                    }>[];
                    palette: string;
                    mode: "categorical";
                }> | Readonly<{
                    sort?: "desc" | "asc" | undefined;
                    gradient?: (Readonly<{
                        palette?: string | undefined;
                    } & {
                        type: "from_palette";
                        index: number;
                    }> | Readonly<{} & {
                        type: "color_code";
                        value: string;
                    }>)[] | undefined;
                    mapping?: Readonly<{} & {
                        values: (string | number | Readonly<{} & {
                            type: "range_key";
                            from: string | number;
                            to: string | number;
                            ranges: Readonly<{} & {
                                label: string;
                                from: string | number;
                                to: string | number;
                            }>[];
                        }> | Readonly<{} & {
                            keys: string[];
                            type: "multi_field_key";
                        }>)[];
                    }>[] | undefined;
                    unassignedColor?: Readonly<{
                        palette?: string | undefined;
                    } & {
                        type: "from_palette";
                        index: number;
                    }> | Readonly<{} & {
                        type: "color_code";
                        value: string;
                    }> | undefined;
                } & {
                    palette: string;
                    mode: "gradient";
                }> | undefined;
                collapse_by?: "max" | "min" | "avg" | "sum" | undefined;
            } & {
                operation: "value";
                column: string;
            }>[] | undefined>;
            group_breakdown_by: import("@kbn/config-schema").Type<Readonly<{
                color?: Readonly<{
                    unassignedColor?: Readonly<{
                        palette?: string | undefined;
                    } & {
                        type: "from_palette";
                        index: number;
                    }> | Readonly<{} & {
                        type: "color_code";
                        value: string;
                    }> | undefined;
                } & {
                    mapping: Readonly<{} & {
                        values: (string | number | Readonly<{} & {
                            type: "range_key";
                            from: string | number;
                            to: string | number;
                            ranges: Readonly<{} & {
                                label: string;
                                from: string | number;
                                to: string | number;
                            }>[];
                        }> | Readonly<{} & {
                            keys: string[];
                            type: "multi_field_key";
                        }>)[];
                        color: Readonly<{
                            palette?: string | undefined;
                        } & {
                            type: "from_palette";
                            index: number;
                        }> | Readonly<{} & {
                            type: "color_code";
                            value: string;
                        }>;
                    }>[];
                    palette: string;
                    mode: "categorical";
                }> | Readonly<{
                    sort?: "desc" | "asc" | undefined;
                    gradient?: (Readonly<{
                        palette?: string | undefined;
                    } & {
                        type: "from_palette";
                        index: number;
                    }> | Readonly<{} & {
                        type: "color_code";
                        value: string;
                    }>)[] | undefined;
                    mapping?: Readonly<{} & {
                        values: (string | number | Readonly<{} & {
                            type: "range_key";
                            from: string | number;
                            to: string | number;
                            ranges: Readonly<{} & {
                                label: string;
                                from: string | number;
                                to: string | number;
                            }>[];
                        }> | Readonly<{} & {
                            keys: string[];
                            type: "multi_field_key";
                        }>)[];
                    }>[] | undefined;
                    unassignedColor?: Readonly<{
                        palette?: string | undefined;
                    } & {
                        type: "from_palette";
                        index: number;
                    }> | Readonly<{} & {
                        type: "color_code";
                        value: string;
                    }> | undefined;
                } & {
                    palette: string;
                    mode: "gradient";
                }> | undefined;
                collapse_by?: "max" | "min" | "avg" | "sum" | undefined;
            } & {
                operation: "value";
                column: string;
            }>[] | undefined>;
            legend: import("@kbn/config-schema").Type<Readonly<{
                size?: "auto" | "small" | "medium" | "large" | "xlarge" | undefined;
                nested?: boolean | undefined;
                visible?: "auto" | "show" | "hide" | undefined;
                truncate_after_lines?: number | undefined;
            } & {}> | undefined>;
            value_display: import("@kbn/config-schema").Type<Readonly<{
                percent_decimals?: number | undefined;
            } & {
                mode: "hidden" | "absolute" | "percentage";
            }> | undefined>;
            dataset: import("@kbn/config-schema").Type<Readonly<{} & {
                type: "esql";
                query: string;
            }> | Readonly<{
                table?: any;
            } & {
                type: "table";
            }>>;
            ignore_global_filters: import("@kbn/config-schema").Type<boolean>;
            sampling: import("@kbn/config-schema").Type<number>;
            title: import("@kbn/config-schema").Type<string | undefined>;
            description: import("@kbn/config-schema").Type<string | undefined>;
            filters: import("@kbn/config-schema").Type<import("@kbn/config-schema/src/types").ObjectResultUnionType<(Omit<{
                disabled: import("@kbn/config-schema").Type<boolean | undefined>;
                negate: import("@kbn/config-schema").Type<boolean | undefined>;
                controlled_by: import("@kbn/config-schema").Type<string | undefined>;
                data_view_id: import("@kbn/config-schema").Type<string | undefined>;
                label: import("@kbn/config-schema").Type<string | undefined>;
                is_multi_index: import("@kbn/config-schema").Type<boolean | undefined>;
            }, "type" | "condition"> & {
                type: import("@kbn/config-schema").Type<"condition">;
                condition: import("@kbn/config-schema").Type<import("@kbn/config-schema/src/types").ObjectResultUnionType<(Omit<{
                    field: import("@kbn/config-schema").Type<string>;
                    negate: import("@kbn/config-schema").Type<boolean | undefined>;
                }, "value" | "operator"> & {
                    value: import("@kbn/config-schema").Type<string | number | boolean>;
                    operator: import("@kbn/config-schema").Type<"is">;
                }) | (Omit<{
                    field: import("@kbn/config-schema").Type<string>;
                    negate: import("@kbn/config-schema").Type<boolean | undefined>;
                }, "value" | "operator"> & {
                    value: import("@kbn/config-schema").Type<number[] | string[] | boolean[]>;
                    operator: import("@kbn/config-schema").Type<"is_one_of">;
                }) | (Omit<{
                    field: import("@kbn/config-schema").Type<string>;
                    negate: import("@kbn/config-schema").Type<boolean | undefined>;
                }, "value" | "operator"> & {
                    value: import("@kbn/config-schema").ObjectType<{
                        gte: import("@kbn/config-schema").Type<string | number | undefined>;
                        lte: import("@kbn/config-schema").Type<string | number | undefined>;
                        gt: import("@kbn/config-schema").Type<string | number | undefined>;
                        lt: import("@kbn/config-schema").Type<string | number | undefined>;
                        format: import("@kbn/config-schema").Type<string | undefined>;
                    }>;
                    operator: import("@kbn/config-schema").Type<"range">;
                }) | (Omit<{
                    field: import("@kbn/config-schema").Type<string>;
                    negate: import("@kbn/config-schema").Type<boolean | undefined>;
                }, "operator"> & {
                    operator: import("@kbn/config-schema").Type<"exists">;
                })>>;
            }) | (Omit<{
                disabled: import("@kbn/config-schema").Type<boolean | undefined>;
                negate: import("@kbn/config-schema").Type<boolean | undefined>;
                controlled_by: import("@kbn/config-schema").Type<string | undefined>;
                data_view_id: import("@kbn/config-schema").Type<string | undefined>;
                label: import("@kbn/config-schema").Type<string | undefined>;
                is_multi_index: import("@kbn/config-schema").Type<boolean | undefined>;
            }, "group" | "type"> & {
                group: import("@kbn/config-schema").ObjectType<{
                    operator: import("@kbn/config-schema").Type<"and" | "or">;
                    conditions: import("@kbn/config-schema").Type<(import("@kbn/config-schema/src/types").ObjectResultUnionType<(Omit<{
                        field: import("@kbn/config-schema").Type<string>;
                        negate: import("@kbn/config-schema").Type<boolean | undefined>;
                    }, "value" | "operator"> & {
                        value: import("@kbn/config-schema").Type<string | number | boolean>;
                        operator: import("@kbn/config-schema").Type<"is">;
                    }) | (Omit<{
                        field: import("@kbn/config-schema").Type<string>;
                        negate: import("@kbn/config-schema").Type<boolean | undefined>;
                    }, "value" | "operator"> & {
                        value: import("@kbn/config-schema").Type<number[] | string[] | boolean[]>;
                        operator: import("@kbn/config-schema").Type<"is_one_of">;
                    }) | (Omit<{
                        field: import("@kbn/config-schema").Type<string>;
                        negate: import("@kbn/config-schema").Type<boolean | undefined>;
                    }, "value" | "operator"> & {
                        value: import("@kbn/config-schema").ObjectType<{
                            gte: import("@kbn/config-schema").Type<string | number | undefined>;
                            lte: import("@kbn/config-schema").Type<string | number | undefined>;
                            gt: import("@kbn/config-schema").Type<string | number | undefined>;
                            lt: import("@kbn/config-schema").Type<string | number | undefined>;
                            format: import("@kbn/config-schema").Type<string | undefined>;
                        }>;
                        operator: import("@kbn/config-schema").Type<"range">;
                    }) | (Omit<{
                        field: import("@kbn/config-schema").Type<string>;
                        negate: import("@kbn/config-schema").Type<boolean | undefined>;
                    }, "operator"> & {
                        operator: import("@kbn/config-schema").Type<"exists">;
                    })> | import("@kbn/as-code-filters-schema").AsCodeGroupFilterRecursive)[]>;
                }>;
                type: import("@kbn/config-schema").Type<"group">;
            }) | (Omit<{
                disabled: import("@kbn/config-schema").Type<boolean | undefined>;
                negate: import("@kbn/config-schema").Type<boolean | undefined>;
                controlled_by: import("@kbn/config-schema").Type<string | undefined>;
                data_view_id: import("@kbn/config-schema").Type<string | undefined>;
                label: import("@kbn/config-schema").Type<string | undefined>;
                is_multi_index: import("@kbn/config-schema").Type<boolean | undefined>;
            }, "field" | "type" | "params" | "dsl"> & {
                field: import("@kbn/config-schema").Type<string | undefined>;
                type: import("@kbn/config-schema").Type<"dsl">;
                params: import("@kbn/config-schema").Type<any>;
                dsl: import("@kbn/config-schema").Type<Record<string, any>>;
            }) | (Omit<{
                disabled: import("@kbn/config-schema").Type<boolean | undefined>;
                negate: import("@kbn/config-schema").Type<boolean | undefined>;
                controlled_by: import("@kbn/config-schema").Type<string | undefined>;
                data_view_id: import("@kbn/config-schema").Type<string | undefined>;
                label: import("@kbn/config-schema").Type<string | undefined>;
                is_multi_index: import("@kbn/config-schema").Type<boolean | undefined>;
            }, "type" | "dsl"> & {
                type: import("@kbn/config-schema").Type<"spatial">;
                dsl: import("@kbn/config-schema").Type<Record<string, any>>;
            })>[] | undefined>;
            type: import("@kbn/config-schema").Type<"mosaic">;
        }>;
        guidance: {
            description: string;
            guideline: string;
        };
    };
};
export type ChartTypeRegistry = typeof chartTypeRegistry;
export type VisualizationConfig = ReturnType<ChartTypeRegistry[SupportedChartType]['schema']['validate']>;
