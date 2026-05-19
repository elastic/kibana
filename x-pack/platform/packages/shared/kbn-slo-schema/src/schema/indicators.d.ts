import * as t from 'io-ts';
declare const kqlQuerySchema: t.StringC;
declare const filtersSchema: t.ArrayC<t.IntersectionC<[t.TypeC<{
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
declare const kqlWithFiltersSchema: t.TypeC<{
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
}>;
declare const querySchema: t.UnionC<[t.StringC, t.TypeC<{
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
declare const apmTransactionDurationIndicatorTypeSchema: t.LiteralC<"sli.apm.transactionDuration">;
declare const apmTransactionDurationIndicatorSchema: t.TypeC<{
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
}>;
declare const apmTransactionErrorRateIndicatorTypeSchema: t.LiteralC<"sli.apm.transactionErrorRate">;
declare const apmTransactionErrorRateIndicatorSchema: t.TypeC<{
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
}>;
declare const kqlCustomIndicatorTypeSchema: t.LiteralC<"sli.kql.custom">;
declare const kqlCustomIndicatorSchema: t.TypeC<{
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
}>;
declare const timesliceMetricComparatorMapping: {
    GT: string;
    GTE: string;
    LT: string;
    LTE: string;
};
declare const timesliceMetricBasicMetricWithField: t.IntersectionC<[t.TypeC<{
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
}>]>;
declare const timesliceMetricDocCountMetric: t.IntersectionC<[t.TypeC<{
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
}>]>;
declare const timesliceMetricPercentileMetric: t.IntersectionC<[t.TypeC<{
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
}>]>;
declare const timesliceMetricMetricDef: t.UnionC<[t.IntersectionC<[t.TypeC<{
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
}>]>]>;
declare const timesliceMetricIndicatorTypeSchema: t.LiteralC<"sli.metric.timeslice">;
declare const timesliceMetricIndicatorSchema: t.TypeC<{
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
}>;
declare const metricCustomDocCountMetric: t.IntersectionC<[t.TypeC<{
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
}>]>;
declare const metricCustomBasicMetric: t.IntersectionC<[t.TypeC<{
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
}>]>;
declare const metricCustomIndicatorTypeSchema: t.LiteralC<"sli.metric.custom">;
declare const metricCustomIndicatorSchema: t.TypeC<{
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
}>;
declare const histogramIndicatorTypeSchema: t.LiteralC<"sli.histogram.custom">;
declare const histogramIndicatorSchema: t.TypeC<{
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
}>;
declare const syntheticsAvailabilityIndicatorTypeSchema: t.LiteralC<"sli.synthetics.availability">;
declare const syntheticsAvailabilityIndicatorSchema: t.TypeC<{
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
}>;
declare const indicatorTypesSchema: t.UnionC<[t.LiteralC<"sli.apm.transactionDuration">, t.LiteralC<"sli.apm.transactionErrorRate">, t.LiteralC<"sli.synthetics.availability">, t.LiteralC<"sli.kql.custom">, t.LiteralC<"sli.metric.custom">, t.LiteralC<"sli.metric.timeslice">, t.LiteralC<"sli.histogram.custom">]>;
declare const indicatorTypesArraySchema: t.Type<string[], string, unknown>;
declare const indicatorSchema: t.UnionC<[t.TypeC<{
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
export { kqlQuerySchema, kqlWithFiltersSchema, querySchema, filtersSchema, apmTransactionDurationIndicatorSchema, apmTransactionDurationIndicatorTypeSchema, apmTransactionErrorRateIndicatorSchema, apmTransactionErrorRateIndicatorTypeSchema, syntheticsAvailabilityIndicatorSchema, syntheticsAvailabilityIndicatorTypeSchema, kqlCustomIndicatorSchema, kqlCustomIndicatorTypeSchema, metricCustomIndicatorSchema, metricCustomIndicatorTypeSchema, metricCustomDocCountMetric, metricCustomBasicMetric, timesliceMetricComparatorMapping, timesliceMetricIndicatorSchema, timesliceMetricIndicatorTypeSchema, timesliceMetricMetricDef, timesliceMetricBasicMetricWithField, timesliceMetricDocCountMetric, timesliceMetricPercentileMetric, histogramIndicatorTypeSchema, histogramIndicatorSchema, indicatorSchema, indicatorTypesArraySchema, indicatorTypesSchema, };
