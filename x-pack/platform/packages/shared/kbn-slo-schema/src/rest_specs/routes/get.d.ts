import * as t from 'io-ts';
declare const getSLOQuerySchema: t.PartialC<{
    query: t.PartialC<{
        instanceId: t.UnionC<[t.LiteralC<"*">, t.StringC]>;
        remoteName: t.StringC;
    }>;
}>;
declare const getSLOParamsSchema: t.IntersectionC<[t.TypeC<{
    path: t.TypeC<{
        id: t.Type<string, string, unknown>;
    }>;
}>, t.PartialC<{
    query: t.PartialC<{
        instanceId: t.UnionC<[t.LiteralC<"*">, t.StringC]>;
        remoteName: t.StringC;
    }>;
}>]>;
declare const getSLOResponseSchema: t.IntersectionC<[t.IntersectionC<[t.IntersectionC<[t.TypeC<{
    id: t.Type<string, string, unknown>;
    name: t.StringC;
    description: t.StringC;
    indicator: t.UnionC<[t.TypeC<{
        type: t.LiteralC<"sli.apm.transactionDuration">;
        params: t.IntersectionC<[t.TypeC<{
            environment: t.UnionC<[t.LiteralC<"*">, t.StringC]>;
            service: t.UnionC<[t.LiteralC<"*">, t.StringC]>;
            transactionType: t.UnionC<[t.LiteralC<"*">, t.StringC]>;
            transactionName: t.UnionC<[t.LiteralC<"*">, t.StringC]>;
            threshold: t.NumberC;
            index: t.StringC;
        }>, t.PartialC<{
            filter: t.UnionC<[t.StringC, t.TypeC<{
                kqlQuery: t.StringC;
                filters: t.ArrayC<t.IntersectionC<[t.TypeC<{
                    meta: t.PartialC<{
                        alias: t.UnionC<[t.StringC, t.NullC]>;
                        disabled: t.BooleanC;
                        negate: t.BooleanC;
                        controlledBy: t.StringC;
                        group: t.StringC;
                        index: t.StringC;
                        isMultiIndex: t.BooleanC;
                        type: t.StringC;
                        key: t.StringC;
                        field: t.StringC;
                        params: t.AnyC;
                        value: t.StringC;
                    }>;
                    query: t.RecordC<t.StringC, t.AnyC>;
                }>, t.PartialC<{
                    $state: t.AnyC;
                }>]>>;
            }>]>;
            dataViewId: t.StringC;
        }>]>;
    }>, t.TypeC<{
        type: t.LiteralC<"sli.apm.transactionErrorRate">;
        params: t.IntersectionC<[t.TypeC<{
            environment: t.UnionC<[t.LiteralC<"*">, t.StringC]>;
            service: t.UnionC<[t.LiteralC<"*">, t.StringC]>;
            transactionType: t.UnionC<[t.LiteralC<"*">, t.StringC]>;
            transactionName: t.UnionC<[t.LiteralC<"*">, t.StringC]>;
            index: t.StringC;
        }>, t.PartialC<{
            filter: t.UnionC<[t.StringC, t.TypeC<{
                kqlQuery: t.StringC;
                filters: t.ArrayC<t.IntersectionC<[t.TypeC<{
                    meta: t.PartialC<{
                        alias: t.UnionC<[t.StringC, t.NullC]>;
                        disabled: t.BooleanC;
                        negate: t.BooleanC;
                        controlledBy: t.StringC;
                        group: t.StringC;
                        index: t.StringC;
                        isMultiIndex: t.BooleanC;
                        type: t.StringC;
                        key: t.StringC;
                        field: t.StringC;
                        params: t.AnyC;
                        value: t.StringC;
                    }>;
                    query: t.RecordC<t.StringC, t.AnyC>;
                }>, t.PartialC<{
                    $state: t.AnyC;
                }>]>>;
            }>]>;
            dataViewId: t.StringC;
        }>]>;
    }>, t.TypeC<{
        type: t.LiteralC<"sli.synthetics.availability">;
        params: t.IntersectionC<[t.TypeC<{
            monitorIds: t.ArrayC<t.TypeC<{
                value: t.UnionC<[t.LiteralC<"*">, t.StringC]>;
                label: t.UnionC<[t.LiteralC<"*">, t.StringC]>;
            }>>;
            index: t.StringC;
        }>, t.PartialC<{
            tags: t.ArrayC<t.TypeC<{
                value: t.UnionC<[t.LiteralC<"*">, t.StringC]>;
                label: t.UnionC<[t.LiteralC<"*">, t.StringC]>;
            }>>;
            projects: t.ArrayC<t.TypeC<{
                value: t.UnionC<[t.LiteralC<"*">, t.StringC]>;
                label: t.UnionC<[t.LiteralC<"*">, t.StringC]>;
            }>>;
            filter: t.UnionC<[t.StringC, t.TypeC<{
                kqlQuery: t.StringC;
                filters: t.ArrayC<t.IntersectionC<[t.TypeC<{
                    meta: t.PartialC<{
                        alias: t.UnionC<[t.StringC, t.NullC]>;
                        disabled: t.BooleanC;
                        negate: t.BooleanC;
                        controlledBy: t.StringC;
                        group: t.StringC;
                        index: t.StringC;
                        isMultiIndex: t.BooleanC;
                        type: t.StringC;
                        key: t.StringC;
                        field: t.StringC;
                        params: t.AnyC;
                        value: t.StringC;
                    }>;
                    query: t.RecordC<t.StringC, t.AnyC>;
                }>, t.PartialC<{
                    $state: t.AnyC;
                }>]>>;
            }>]>;
            dataViewId: t.StringC;
        }>]>;
    }>, t.TypeC<{
        type: t.LiteralC<"sli.kql.custom">;
        params: t.IntersectionC<[t.TypeC<{
            index: t.StringC;
            good: t.UnionC<[t.StringC, t.TypeC<{
                kqlQuery: t.StringC;
                filters: t.ArrayC<t.IntersectionC<[t.TypeC<{
                    meta: t.PartialC<{
                        alias: t.UnionC<[t.StringC, t.NullC]>;
                        disabled: t.BooleanC;
                        negate: t.BooleanC;
                        controlledBy: t.StringC;
                        group: t.StringC;
                        index: t.StringC;
                        isMultiIndex: t.BooleanC;
                        type: t.StringC;
                        key: t.StringC;
                        field: t.StringC;
                        params: t.AnyC;
                        value: t.StringC;
                    }>;
                    query: t.RecordC<t.StringC, t.AnyC>;
                }>, t.PartialC<{
                    $state: t.AnyC;
                }>]>>;
            }>]>;
            total: t.UnionC<[t.StringC, t.TypeC<{
                kqlQuery: t.StringC;
                filters: t.ArrayC<t.IntersectionC<[t.TypeC<{
                    meta: t.PartialC<{
                        alias: t.UnionC<[t.StringC, t.NullC]>;
                        disabled: t.BooleanC;
                        negate: t.BooleanC;
                        controlledBy: t.StringC;
                        group: t.StringC;
                        index: t.StringC;
                        isMultiIndex: t.BooleanC;
                        type: t.StringC;
                        key: t.StringC;
                        field: t.StringC;
                        params: t.AnyC;
                        value: t.StringC;
                    }>;
                    query: t.RecordC<t.StringC, t.AnyC>;
                }>, t.PartialC<{
                    $state: t.AnyC;
                }>]>>;
            }>]>;
            timestampField: t.StringC;
        }>, t.PartialC<{
            filter: t.UnionC<[t.StringC, t.TypeC<{
                kqlQuery: t.StringC;
                filters: t.ArrayC<t.IntersectionC<[t.TypeC<{
                    meta: t.PartialC<{
                        alias: t.UnionC<[t.StringC, t.NullC]>;
                        disabled: t.BooleanC;
                        negate: t.BooleanC;
                        controlledBy: t.StringC;
                        group: t.StringC;
                        index: t.StringC;
                        isMultiIndex: t.BooleanC;
                        type: t.StringC;
                        key: t.StringC;
                        field: t.StringC;
                        params: t.AnyC;
                        value: t.StringC;
                    }>;
                    query: t.RecordC<t.StringC, t.AnyC>;
                }>, t.PartialC<{
                    $state: t.AnyC;
                }>]>>;
            }>]>;
            dataViewId: t.StringC;
        }>]>;
    }>, t.TypeC<{
        type: t.LiteralC<"sli.metric.custom">;
        params: t.IntersectionC<[t.TypeC<{
            index: t.StringC;
            good: t.TypeC<{
                metrics: t.ArrayC<t.UnionC<[t.IntersectionC<[t.TypeC<{
                    name: t.StringC;
                    aggregation: t.LiteralC<"sum">;
                    field: t.StringC;
                }>, t.PartialC<{
                    filter: t.UnionC<[t.StringC, t.TypeC<{
                        kqlQuery: t.StringC;
                        filters: t.ArrayC<t.IntersectionC<[t.TypeC<{
                            meta: t.PartialC<{
                                alias: t.UnionC<[t.StringC, t.NullC]>;
                                disabled: t.BooleanC;
                                negate: t.BooleanC;
                                controlledBy: t.StringC;
                                group: t.StringC;
                                index: t.StringC;
                                isMultiIndex: t.BooleanC;
                                type: t.StringC;
                                key: t.StringC;
                                field: t.StringC;
                                params: t.AnyC;
                                value: t.StringC;
                            }>;
                            query: t.RecordC<t.StringC, t.AnyC>;
                        }>, t.PartialC<{
                            $state: t.AnyC;
                        }>]>>;
                    }>]>;
                }>]>, t.IntersectionC<[t.TypeC<{
                    name: t.StringC;
                    aggregation: t.LiteralC<"doc_count">;
                }>, t.PartialC<{
                    filter: t.UnionC<[t.StringC, t.TypeC<{
                        kqlQuery: t.StringC;
                        filters: t.ArrayC<t.IntersectionC<[t.TypeC<{
                            meta: t.PartialC<{
                                alias: t.UnionC<[t.StringC, t.NullC]>;
                                disabled: t.BooleanC;
                                negate: t.BooleanC;
                                controlledBy: t.StringC;
                                group: t.StringC;
                                index: t.StringC;
                                isMultiIndex: t.BooleanC;
                                type: t.StringC;
                                key: t.StringC;
                                field: t.StringC;
                                params: t.AnyC;
                                value: t.StringC;
                            }>;
                            query: t.RecordC<t.StringC, t.AnyC>;
                        }>, t.PartialC<{
                            $state: t.AnyC;
                        }>]>>;
                    }>]>;
                }>]>]>>;
                equation: t.StringC;
            }>;
            total: t.TypeC<{
                metrics: t.ArrayC<t.UnionC<[t.IntersectionC<[t.TypeC<{
                    name: t.StringC;
                    aggregation: t.LiteralC<"sum">;
                    field: t.StringC;
                }>, t.PartialC<{
                    filter: t.UnionC<[t.StringC, t.TypeC<{
                        kqlQuery: t.StringC;
                        filters: t.ArrayC<t.IntersectionC<[t.TypeC<{
                            meta: t.PartialC<{
                                alias: t.UnionC<[t.StringC, t.NullC]>;
                                disabled: t.BooleanC;
                                negate: t.BooleanC;
                                controlledBy: t.StringC;
                                group: t.StringC;
                                index: t.StringC;
                                isMultiIndex: t.BooleanC;
                                type: t.StringC;
                                key: t.StringC;
                                field: t.StringC;
                                params: t.AnyC;
                                value: t.StringC;
                            }>;
                            query: t.RecordC<t.StringC, t.AnyC>;
                        }>, t.PartialC<{
                            $state: t.AnyC;
                        }>]>>;
                    }>]>;
                }>]>, t.IntersectionC<[t.TypeC<{
                    name: t.StringC;
                    aggregation: t.LiteralC<"doc_count">;
                }>, t.PartialC<{
                    filter: t.UnionC<[t.StringC, t.TypeC<{
                        kqlQuery: t.StringC;
                        filters: t.ArrayC<t.IntersectionC<[t.TypeC<{
                            meta: t.PartialC<{
                                alias: t.UnionC<[t.StringC, t.NullC]>;
                                disabled: t.BooleanC;
                                negate: t.BooleanC;
                                controlledBy: t.StringC;
                                group: t.StringC;
                                index: t.StringC;
                                isMultiIndex: t.BooleanC;
                                type: t.StringC;
                                key: t.StringC;
                                field: t.StringC;
                                params: t.AnyC;
                                value: t.StringC;
                            }>;
                            query: t.RecordC<t.StringC, t.AnyC>;
                        }>, t.PartialC<{
                            $state: t.AnyC;
                        }>]>>;
                    }>]>;
                }>]>]>>;
                equation: t.StringC;
            }>;
            timestampField: t.StringC;
        }>, t.PartialC<{
            filter: t.UnionC<[t.StringC, t.TypeC<{
                kqlQuery: t.StringC;
                filters: t.ArrayC<t.IntersectionC<[t.TypeC<{
                    meta: t.PartialC<{
                        alias: t.UnionC<[t.StringC, t.NullC]>;
                        disabled: t.BooleanC;
                        negate: t.BooleanC;
                        controlledBy: t.StringC;
                        group: t.StringC;
                        index: t.StringC;
                        isMultiIndex: t.BooleanC;
                        type: t.StringC;
                        key: t.StringC;
                        field: t.StringC;
                        params: t.AnyC;
                        value: t.StringC;
                    }>;
                    query: t.RecordC<t.StringC, t.AnyC>;
                }>, t.PartialC<{
                    $state: t.AnyC;
                }>]>>;
            }>]>;
            dataViewId: t.StringC;
        }>]>;
    }>, t.TypeC<{
        type: t.LiteralC<"sli.metric.timeslice">;
        params: t.IntersectionC<[t.TypeC<{
            index: t.StringC;
            metric: t.TypeC<{
                metrics: t.ArrayC<t.UnionC<[t.IntersectionC<[t.TypeC<{
                    name: t.StringC;
                    aggregation: t.KeyofC<{
                        avg: boolean;
                        max: boolean;
                        min: boolean;
                        sum: boolean;
                        cardinality: boolean;
                        last_value: boolean;
                        std_deviation: boolean;
                    }>;
                    field: t.StringC;
                }>, t.PartialC<{
                    filter: t.UnionC<[t.StringC, t.TypeC<{
                        kqlQuery: t.StringC;
                        filters: t.ArrayC<t.IntersectionC<[t.TypeC<{
                            meta: t.PartialC<{
                                alias: t.UnionC<[t.StringC, t.NullC]>;
                                disabled: t.BooleanC;
                                negate: t.BooleanC;
                                controlledBy: t.StringC;
                                group: t.StringC;
                                index: t.StringC;
                                isMultiIndex: t.BooleanC;
                                type: t.StringC;
                                key: t.StringC;
                                field: t.StringC;
                                params: t.AnyC;
                                value: t.StringC;
                            }>;
                            query: t.RecordC<t.StringC, t.AnyC>;
                        }>, t.PartialC<{
                            $state: t.AnyC;
                        }>]>>;
                    }>]>;
                }>]>, t.IntersectionC<[t.TypeC<{
                    name: t.StringC;
                    aggregation: t.LiteralC<"doc_count">;
                }>, t.PartialC<{
                    filter: t.UnionC<[t.StringC, t.TypeC<{
                        kqlQuery: t.StringC;
                        filters: t.ArrayC<t.IntersectionC<[t.TypeC<{
                            meta: t.PartialC<{
                                alias: t.UnionC<[t.StringC, t.NullC]>;
                                disabled: t.BooleanC;
                                negate: t.BooleanC;
                                controlledBy: t.StringC;
                                group: t.StringC;
                                index: t.StringC;
                                isMultiIndex: t.BooleanC;
                                type: t.StringC;
                                key: t.StringC;
                                field: t.StringC;
                                params: t.AnyC;
                                value: t.StringC;
                            }>;
                            query: t.RecordC<t.StringC, t.AnyC>;
                        }>, t.PartialC<{
                            $state: t.AnyC;
                        }>]>>;
                    }>]>;
                }>]>, t.IntersectionC<[t.TypeC<{
                    name: t.StringC;
                    aggregation: t.LiteralC<"percentile">;
                    field: t.StringC;
                    percentile: t.NumberC;
                }>, t.PartialC<{
                    filter: t.UnionC<[t.StringC, t.TypeC<{
                        kqlQuery: t.StringC;
                        filters: t.ArrayC<t.IntersectionC<[t.TypeC<{
                            meta: t.PartialC<{
                                alias: t.UnionC<[t.StringC, t.NullC]>;
                                disabled: t.BooleanC;
                                negate: t.BooleanC;
                                controlledBy: t.StringC;
                                group: t.StringC;
                                index: t.StringC;
                                isMultiIndex: t.BooleanC;
                                type: t.StringC;
                                key: t.StringC;
                                field: t.StringC;
                                params: t.AnyC;
                                value: t.StringC;
                            }>;
                            query: t.RecordC<t.StringC, t.AnyC>;
                        }>, t.PartialC<{
                            $state: t.AnyC;
                        }>]>>;
                    }>]>;
                }>]>]>>;
                equation: t.StringC;
                threshold: t.NumberC;
                comparator: t.KeyofC<{
                    GT: string;
                    GTE: string;
                    LT: string;
                    LTE: string;
                }>;
            }>;
            timestampField: t.StringC;
        }>, t.PartialC<{
            filter: t.UnionC<[t.StringC, t.TypeC<{
                kqlQuery: t.StringC;
                filters: t.ArrayC<t.IntersectionC<[t.TypeC<{
                    meta: t.PartialC<{
                        alias: t.UnionC<[t.StringC, t.NullC]>;
                        disabled: t.BooleanC;
                        negate: t.BooleanC;
                        controlledBy: t.StringC;
                        group: t.StringC;
                        index: t.StringC;
                        isMultiIndex: t.BooleanC;
                        type: t.StringC;
                        key: t.StringC;
                        field: t.StringC;
                        params: t.AnyC;
                        value: t.StringC;
                    }>;
                    query: t.RecordC<t.StringC, t.AnyC>;
                }>, t.PartialC<{
                    $state: t.AnyC;
                }>]>>;
            }>]>;
            dataViewId: t.StringC;
        }>]>;
    }>, t.TypeC<{
        type: t.LiteralC<"sli.histogram.custom">;
        params: t.IntersectionC<[t.TypeC<{
            index: t.StringC;
            timestampField: t.StringC;
            good: t.UnionC<[t.IntersectionC<[t.TypeC<{
                field: t.StringC;
                aggregation: t.LiteralC<"value_count">;
            }>, t.PartialC<{
                filter: t.UnionC<[t.StringC, t.TypeC<{
                    kqlQuery: t.StringC;
                    filters: t.ArrayC<t.IntersectionC<[t.TypeC<{
                        meta: t.PartialC<{
                            alias: t.UnionC<[t.StringC, t.NullC]>;
                            disabled: t.BooleanC;
                            negate: t.BooleanC;
                            controlledBy: t.StringC;
                            group: t.StringC;
                            index: t.StringC;
                            isMultiIndex: t.BooleanC;
                            type: t.StringC;
                            key: t.StringC;
                            field: t.StringC;
                            params: t.AnyC;
                            value: t.StringC;
                        }>;
                        query: t.RecordC<t.StringC, t.AnyC>;
                    }>, t.PartialC<{
                        $state: t.AnyC;
                    }>]>>;
                }>]>;
            }>]>, t.IntersectionC<[t.TypeC<{
                field: t.StringC;
                aggregation: t.LiteralC<"range">;
                from: t.NumberC;
                to: t.NumberC;
            }>, t.PartialC<{
                filter: t.UnionC<[t.StringC, t.TypeC<{
                    kqlQuery: t.StringC;
                    filters: t.ArrayC<t.IntersectionC<[t.TypeC<{
                        meta: t.PartialC<{
                            alias: t.UnionC<[t.StringC, t.NullC]>;
                            disabled: t.BooleanC;
                            negate: t.BooleanC;
                            controlledBy: t.StringC;
                            group: t.StringC;
                            index: t.StringC;
                            isMultiIndex: t.BooleanC;
                            type: t.StringC;
                            key: t.StringC;
                            field: t.StringC;
                            params: t.AnyC;
                            value: t.StringC;
                        }>;
                        query: t.RecordC<t.StringC, t.AnyC>;
                    }>, t.PartialC<{
                        $state: t.AnyC;
                    }>]>>;
                }>]>;
            }>]>]>;
            total: t.UnionC<[t.IntersectionC<[t.TypeC<{
                field: t.StringC;
                aggregation: t.LiteralC<"value_count">;
            }>, t.PartialC<{
                filter: t.UnionC<[t.StringC, t.TypeC<{
                    kqlQuery: t.StringC;
                    filters: t.ArrayC<t.IntersectionC<[t.TypeC<{
                        meta: t.PartialC<{
                            alias: t.UnionC<[t.StringC, t.NullC]>;
                            disabled: t.BooleanC;
                            negate: t.BooleanC;
                            controlledBy: t.StringC;
                            group: t.StringC;
                            index: t.StringC;
                            isMultiIndex: t.BooleanC;
                            type: t.StringC;
                            key: t.StringC;
                            field: t.StringC;
                            params: t.AnyC;
                            value: t.StringC;
                        }>;
                        query: t.RecordC<t.StringC, t.AnyC>;
                    }>, t.PartialC<{
                        $state: t.AnyC;
                    }>]>>;
                }>]>;
            }>]>, t.IntersectionC<[t.TypeC<{
                field: t.StringC;
                aggregation: t.LiteralC<"range">;
                from: t.NumberC;
                to: t.NumberC;
            }>, t.PartialC<{
                filter: t.UnionC<[t.StringC, t.TypeC<{
                    kqlQuery: t.StringC;
                    filters: t.ArrayC<t.IntersectionC<[t.TypeC<{
                        meta: t.PartialC<{
                            alias: t.UnionC<[t.StringC, t.NullC]>;
                            disabled: t.BooleanC;
                            negate: t.BooleanC;
                            controlledBy: t.StringC;
                            group: t.StringC;
                            index: t.StringC;
                            isMultiIndex: t.BooleanC;
                            type: t.StringC;
                            key: t.StringC;
                            field: t.StringC;
                            params: t.AnyC;
                            value: t.StringC;
                        }>;
                        query: t.RecordC<t.StringC, t.AnyC>;
                    }>, t.PartialC<{
                        $state: t.AnyC;
                    }>]>>;
                }>]>;
            }>]>]>;
        }>, t.PartialC<{
            filter: t.UnionC<[t.StringC, t.TypeC<{
                kqlQuery: t.StringC;
                filters: t.ArrayC<t.IntersectionC<[t.TypeC<{
                    meta: t.PartialC<{
                        alias: t.UnionC<[t.StringC, t.NullC]>;
                        disabled: t.BooleanC;
                        negate: t.BooleanC;
                        controlledBy: t.StringC;
                        group: t.StringC;
                        index: t.StringC;
                        isMultiIndex: t.BooleanC;
                        type: t.StringC;
                        key: t.StringC;
                        field: t.StringC;
                        params: t.AnyC;
                        value: t.StringC;
                    }>;
                    query: t.RecordC<t.StringC, t.AnyC>;
                }>, t.PartialC<{
                    $state: t.AnyC;
                }>]>>;
            }>]>;
            dataViewId: t.StringC;
        }>]>;
    }>]>;
    timeWindow: t.UnionC<[t.TypeC<{
        duration: t.Type<import("../../models").Duration, string, unknown>;
        type: t.LiteralC<"rolling">;
    }>, t.TypeC<{
        duration: t.Type<import("../../models").Duration, string, unknown>;
        type: t.LiteralC<"calendarAligned">;
    }>]>;
    budgetingMethod: t.UnionC<[t.LiteralC<"occurrences">, t.LiteralC<"timeslices">]>;
    objective: t.IntersectionC<[t.TypeC<{
        target: t.NumberC;
    }>, t.PartialC<{
        timesliceTarget: t.NumberC;
        timesliceWindow: t.Type<import("../../models").Duration, string, unknown>;
    }>]>;
    settings: t.IntersectionC<[t.TypeC<{
        syncDelay: t.Type<import("../../models").Duration, string, unknown>;
        frequency: t.Type<import("../../models").Duration, string, unknown>;
        preventInitialBackfill: t.BooleanC;
    }>, t.PartialC<{
        syncField: t.UnionC<[t.StringC, t.NullC]>;
    }>]>;
    revision: t.NumberC;
    enabled: t.BooleanC;
    tags: t.ArrayC<t.StringC>;
    createdAt: t.Type<Date, string, unknown>;
    updatedAt: t.Type<Date, string, unknown>;
    groupBy: t.UnionC<[t.LiteralC<"*">, t.StringC, t.ArrayC<t.UnionC<[t.LiteralC<"*">, t.StringC]>>]>;
    version: t.NumberC;
}>, t.PartialC<{
    createdBy: t.StringC;
    updatedBy: t.StringC;
}>]>, t.PartialC<{
    artifacts: t.PartialC<{
        dashboards: t.ArrayC<t.TypeC<{
            id: t.StringC;
        }>>;
    }>;
}>]>, t.TypeC<{
    summary: t.IntersectionC<[t.TypeC<{
        status: t.UnionC<[t.LiteralC<"NO_DATA">, t.LiteralC<"HEALTHY">, t.LiteralC<"DEGRADING">, t.LiteralC<"VIOLATED">]>;
        sliValue: t.NumberC;
        errorBudget: t.TypeC<{
            initial: t.NumberC;
            consumed: t.NumberC;
            remaining: t.NumberC;
            isEstimated: t.BooleanC;
        }>;
        fiveMinuteBurnRate: t.NumberC;
        oneHourBurnRate: t.NumberC;
        oneDayBurnRate: t.NumberC;
    }>, t.PartialC<{
        summaryUpdatedAt: t.UnionC<[t.StringC, t.NullC]>;
    }>]>;
    groupings: t.RecordC<t.StringC, t.UnionC<[t.StringC, t.NumberC]>>;
    instanceId: t.UnionC<[t.LiteralC<"*">, t.StringC]>;
}>, t.PartialC<{
    meta: t.PartialC<{
        synthetics: t.TypeC<{
            monitorId: t.StringC;
            locationId: t.StringC;
            configId: t.StringC;
        }>;
    }>;
    remote: t.TypeC<{
        remoteName: t.StringC;
        kibanaUrl: t.StringC;
    }>;
}>]>;
type GetSLOParams = t.TypeOf<typeof getSLOQuerySchema.props.query>;
type GetSLOResponse = t.OutputOf<typeof getSLOResponseSchema>;
export { getSLOParamsSchema, getSLOResponseSchema };
export type { GetSLOParams, GetSLOResponse };
