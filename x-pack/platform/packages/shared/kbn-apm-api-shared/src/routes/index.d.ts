import type { BuildGroupedRepository } from './types';
export declare const routeDefinitions: {
    historicalData: {
        hasData: {
            endpoint: "GET /internal/apm/has_data";
            params?: undefined;
        } & import("./types").WithResponse<import("./historical_data").HasDataResponse>;
    };
    suggestions: {
        suggestions: {
            endpoint: "GET /internal/apm/suggestions";
            params?: import("zod").ZodObject<{
                query: import("zod").ZodObject<{
                    fieldName: import("zod").ZodString;
                    fieldValue: import("zod").ZodString;
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    serviceName: import("zod").ZodOptional<import("zod").ZodString>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./suggestions").SuggestionsResponse>;
    };
    agentKeys: {
        agentKeys: {
            endpoint: "GET /internal/apm/agent_keys";
            params?: undefined;
        } & import("./types").WithResponse<import("./agent_keys").AgentKeysResponse>;
        agentKeysPrivileges: {
            endpoint: "GET /internal/apm/agent_keys/privileges";
            params?: undefined;
        } & import("./types").WithResponse<import("./agent_keys").AgentKeysPrivilegesResponse>;
        invalidateAgentKey: {
            endpoint: "POST /internal/apm/api_key/invalidate";
            params?: import("zod").ZodObject<{
                body: import("zod").ZodObject<{
                    id: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./agent_keys").InvalidateAgentKeyResponse>;
        createAgentKey: {
            endpoint: "POST /api/apm/agent_keys 2023-10-31";
            params?: import("zod").ZodObject<{
                body: import("zod").ZodObject<{
                    name: import("zod").ZodString;
                    privileges: import("zod").ZodArray<import("zod").ZodUnion<readonly [import("zod").ZodLiteral<import("@kbn/apm-types").PrivilegeType.EVENT>, import("zod").ZodLiteral<import("@kbn/apm-types").PrivilegeType.AGENT_CONFIG>]>>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./agent_keys").CreateAgentKeyResponse>;
    };
    traces: {
        unifiedTracesById: {
            endpoint: "GET /internal/apm/unified_traces/{traceId}";
            params?: import("zod").ZodObject<{
                path: import("zod").ZodObject<{
                    traceId: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
                query: import("zod").ZodObject<{
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    serviceName: import("zod").ZodOptional<import("zod").ZodString>;
                    entryTransactionId: import("zod").ZodOptional<import("zod").ZodString>;
                    ecsOnly: import("zod").ZodOptional<import("zod").ZodUnion<readonly [import("zod").ZodPipe<import("zod").ZodEnum<{
                        true: "true";
                        false: "false";
                    }>, import("zod").ZodTransform<boolean, "true" | "false">>, import("zod").ZodBoolean]> & import("@kbn/zod-helpers/v4/kbn_zod_types/kbn_zod_type").KbnZodType>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./traces").UnifiedTracesByIdResponse>;
        unifiedTracesByIdSummary: {
            endpoint: "GET /internal/apm/unified_traces/{traceId}/summary";
            params?: import("zod").ZodObject<{
                path: import("zod").ZodObject<{
                    traceId: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
                query: import("zod").ZodObject<{
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    maxTraceItems: import("zod").ZodOptional<import("zod").ZodCoercedNumber<unknown>>;
                    docId: import("zod").ZodOptional<import("zod").ZodString>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./traces").UnifiedTracesByIdSummaryResponse>;
        unifiedTracesByIdErrors: {
            endpoint: "GET /internal/apm/unified_traces/{traceId}/errors";
            params?: import("zod").ZodObject<{
                path: import("zod").ZodObject<{
                    traceId: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
                query: import("zod").ZodObject<{
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    docId: import("zod").ZodOptional<import("zod").ZodString>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("@kbn/apm-types").ErrorsByTraceId>;
        unifiedTracesRootSpan: {
            endpoint: "GET /internal/apm/unified_traces/{traceId}/root_span";
            params?: import("zod").ZodObject<{
                path: import("zod").ZodObject<{
                    traceId: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
                query: import("zod").ZodObject<{
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("@kbn/apm-types").TraceRootSpan>;
        rootTransactionByTraceId: {
            endpoint: "GET /internal/apm/traces/{traceId}/root_transaction";
            params?: import("zod").ZodObject<{
                path: import("zod").ZodObject<{
                    traceId: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
                query: import("zod").ZodObject<{
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./traces").RootTransactionByTraceIdResponse>;
        transactionByName: {
            endpoint: "GET /internal/apm/transactions";
            params?: import("zod").ZodObject<{
                query: import("zod").ZodObject<{
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    transactionName: import("zod").ZodString;
                    serviceName: import("zod").ZodString;
                    environment: import("zod").ZodOptional<import("zod").ZodString>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./traces").TransactionByNameResponse>;
        transactionById: {
            endpoint: "GET /internal/apm/transactions/{transactionId}";
            params?: import("zod").ZodObject<{
                path: import("zod").ZodObject<{
                    transactionId: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
                query: import("zod").ZodObject<{
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./traces").TransactionByIdResponse>;
        transactionFromTraceById: {
            endpoint: "GET /internal/apm/traces/{traceId}/transactions/{transactionId}";
            params?: import("zod").ZodObject<{
                path: import("zod").ZodObject<{
                    traceId: import("zod").ZodString;
                    transactionId: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
                query: import("zod").ZodObject<{
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("@kbn/apm-types").Transaction>;
        spanFromTraceById: {
            endpoint: "GET /internal/apm/traces/{traceId}/spans/{spanId}";
            params?: import("zod").ZodObject<{
                path: import("zod").ZodObject<{
                    traceId: import("zod").ZodString;
                    spanId: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
                query: import("zod").ZodObject<{
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    parentTransactionId: import("zod").ZodOptional<import("zod").ZodString>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./traces").SpanFromTraceByIdResponse>;
        unifiedTraceSpan: {
            endpoint: "GET /internal/apm/unified_traces/{traceId}/spans/{spanId}";
            params?: import("zod").ZodObject<{
                path: import("zod").ZodObject<{
                    traceId: import("zod").ZodString;
                    spanId: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
                query: import("zod").ZodObject<{
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("@kbn/apm-types").UnifiedSpanDocument>;
        traces: {
            endpoint: "GET /internal/apm/traces";
            params?: import("zod").ZodObject<{
                query: import("zod").ZodObject<{
                    environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                    kuery: import("zod").ZodString;
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    probability: import("zod").ZodCoercedNumber<unknown>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./traces").TopTracesPrimaryStatsResponse>;
    };
    spanLinks: {
        linkedParents: {
            endpoint: "GET /internal/apm/traces/{traceId}/span_links/{spanId}/parents";
            params?: import("zod").ZodObject<{
                path: import("zod").ZodObject<{
                    traceId: import("zod").ZodString;
                    spanId: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
                query: import("zod").ZodObject<{
                    kuery: import("zod").ZodString;
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    processorEvent: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<import("@kbn/apm-types-shared").ProcessorEvent.transaction>, import("zod").ZodLiteral<import("@kbn/apm-types-shared").ProcessorEvent.error>, import("zod").ZodLiteral<import("@kbn/apm-types-shared").ProcessorEvent.metric>, import("zod").ZodLiteral<import("@kbn/apm-types-shared").ProcessorEvent.span>]>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./span_links").LinkedParentsResponse>;
        linkedChildren: {
            endpoint: "GET /internal/apm/traces/{traceId}/span_links/{spanId}/children";
            params?: import("zod").ZodObject<{
                path: import("zod").ZodObject<{
                    traceId: import("zod").ZodString;
                    spanId: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
                query: import("zod").ZodObject<{
                    kuery: import("zod").ZodString;
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./span_links").LinkedChildrenResponse>;
        spanLinks: {
            endpoint: "GET /internal/apm/traces/{traceId}/span_links/{spanId}";
            params?: import("zod").ZodObject<{
                path: import("zod").ZodObject<{
                    traceId: import("zod").ZodString;
                    spanId: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
                query: import("zod").ZodObject<{
                    kuery: import("zod").ZodString;
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    processorEvent: import("zod").ZodOptional<import("zod").ZodUnion<readonly [import("zod").ZodLiteral<import("@kbn/apm-types-shared").ProcessorEvent.transaction>, import("zod").ZodLiteral<import("@kbn/apm-types-shared").ProcessorEvent.error>, import("zod").ZodLiteral<import("@kbn/apm-types-shared").ProcessorEvent.metric>, import("zod").ZodLiteral<import("@kbn/apm-types-shared").ProcessorEvent.span>]>>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./span_links").SpanLinksResponse>;
    };
    observabilityOverview: {
        observabilityOverviewHasData: {
            endpoint: "GET /internal/apm/observability_overview/has_data";
            params?: undefined;
        } & import("./types").WithResponse<import("./observability_overview").ObservabilityOverviewHasDataResponse>;
        observabilityOverview: {
            endpoint: "GET /internal/apm/observability_overview";
            params?: import("zod").ZodObject<{
                query: import("zod").ZodObject<{
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    bucketSize: import("zod").ZodCoercedNumber<unknown>;
                    intervalString: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./observability_overview").ObservabilityOverviewResponse>;
    };
    agentExplorer: {
        agentsPerService: {
            endpoint: "GET /internal/apm/get_agents_per_service";
            params?: import("zod").ZodObject<{
                query: import("zod").ZodObject<{
                    environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                    kuery: import("zod").ZodString;
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    probability: import("zod").ZodCoercedNumber<unknown>;
                    serviceName: import("zod").ZodOptional<import("zod").ZodString>;
                    agentLanguage: import("zod").ZodOptional<import("zod").ZodString>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./agent_explorer").AgentExplorerAgentsResponse>;
        latestAgentVersions: {
            endpoint: "GET /internal/apm/get_latest_agent_versions";
            params?: undefined;
        } & import("./types").WithResponse<import("./agent_explorer").AgentLatestVersionsResponse>;
        agentInstances: {
            endpoint: "GET /internal/apm/services/{serviceName}/agent_instances";
            params?: import("zod").ZodObject<{
                path: import("zod").ZodObject<{
                    serviceName: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
                query: import("zod").ZodObject<{
                    environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                    kuery: import("zod").ZodString;
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    probability: import("zod").ZodCoercedNumber<unknown>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./agent_explorer").AgentExplorerAgentInstancesRouteResponse>;
    };
    alerts: {
        transactionErrorRateChartPreview: {
            endpoint: "GET /internal/apm/rule_types/transaction_error_rate/chart_preview";
            params?: import("zod").ZodObject<{
                query: import("zod").ZodObject<{
                    aggregationType: import("zod").ZodOptional<import("zod").ZodUnion<readonly [import("zod").ZodLiteral<import("@kbn/apm-types").AggregationType.Avg>, import("zod").ZodLiteral<import("@kbn/apm-types").AggregationType.P95>, import("zod").ZodLiteral<import("@kbn/apm-types").AggregationType.P99>]>>;
                    serviceName: import("zod").ZodOptional<import("zod").ZodString>;
                    errorGroupingKey: import("zod").ZodOptional<import("zod").ZodString>;
                    transactionType: import("zod").ZodOptional<import("zod").ZodString>;
                    transactionName: import("zod").ZodOptional<import("zod").ZodString>;
                    interval: import("zod").ZodString;
                    groupBy: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString>>;
                    searchConfiguration: import("zod").ZodOptional<import("zod").ZodPipe<import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<any, string>>, import("zod").ZodObject<{
                        query: import("zod").ZodObject<{
                            query: import("zod").ZodUnion<readonly [import("zod").ZodString, import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodAny>]>;
                            language: import("zod").ZodString;
                        }, import("zod/v4/core").$strip>;
                    }, import("zod/v4/core").$strip>>>;
                    environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./alerts").TransactionErrorRateChartPreviewResponse>;
        errorCountChartPreview: {
            endpoint: "GET /internal/apm/rule_types/error_count/chart_preview";
            params?: import("zod").ZodObject<{
                query: import("zod").ZodObject<{
                    aggregationType: import("zod").ZodOptional<import("zod").ZodUnion<readonly [import("zod").ZodLiteral<import("@kbn/apm-types").AggregationType.Avg>, import("zod").ZodLiteral<import("@kbn/apm-types").AggregationType.P95>, import("zod").ZodLiteral<import("@kbn/apm-types").AggregationType.P99>]>>;
                    serviceName: import("zod").ZodOptional<import("zod").ZodString>;
                    errorGroupingKey: import("zod").ZodOptional<import("zod").ZodString>;
                    transactionType: import("zod").ZodOptional<import("zod").ZodString>;
                    transactionName: import("zod").ZodOptional<import("zod").ZodString>;
                    interval: import("zod").ZodString;
                    groupBy: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString>>;
                    searchConfiguration: import("zod").ZodOptional<import("zod").ZodPipe<import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<any, string>>, import("zod").ZodObject<{
                        query: import("zod").ZodObject<{
                            query: import("zod").ZodUnion<readonly [import("zod").ZodString, import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodAny>]>;
                            language: import("zod").ZodString;
                        }, import("zod/v4/core").$strip>;
                    }, import("zod/v4/core").$strip>>>;
                    environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./alerts").ErrorCountChartPreviewResponse>;
        transactionDurationChartPreview: {
            endpoint: "GET /internal/apm/rule_types/transaction_duration/chart_preview";
            params?: import("zod").ZodObject<{
                query: import("zod").ZodObject<{
                    aggregationType: import("zod").ZodOptional<import("zod").ZodUnion<readonly [import("zod").ZodLiteral<import("@kbn/apm-types").AggregationType.Avg>, import("zod").ZodLiteral<import("@kbn/apm-types").AggregationType.P95>, import("zod").ZodLiteral<import("@kbn/apm-types").AggregationType.P99>]>>;
                    serviceName: import("zod").ZodOptional<import("zod").ZodString>;
                    errorGroupingKey: import("zod").ZodOptional<import("zod").ZodString>;
                    transactionType: import("zod").ZodOptional<import("zod").ZodString>;
                    transactionName: import("zod").ZodOptional<import("zod").ZodString>;
                    interval: import("zod").ZodString;
                    groupBy: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString>>;
                    searchConfiguration: import("zod").ZodOptional<import("zod").ZodPipe<import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<any, string>>, import("zod").ZodObject<{
                        query: import("zod").ZodObject<{
                            query: import("zod").ZodUnion<readonly [import("zod").ZodString, import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodAny>]>;
                            language: import("zod").ZodString;
                        }, import("zod/v4/core").$strip>;
                    }, import("zod/v4/core").$strip>>>;
                    environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./alerts").TransactionDurationChartPreviewResponse>;
    };
    assistantFunctions: {
        getApmTimeseries: {
            endpoint: "POST /internal/apm/assistant/get_apm_timeseries";
            params?: import("zod").ZodObject<{
                body: import("zod").ZodObject<{
                    stats: import("zod").ZodArray<import("zod").ZodObject<{
                        'service.name': import("zod").ZodString;
                        title: import("zod").ZodString;
                        timeseries: import("zod").ZodUnion<readonly [import("zod").ZodObject<{
                            name: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<import("@kbn/apm-types").ApmTimeseriesType.transactionThroughput>, import("zod").ZodLiteral<import("@kbn/apm-types").ApmTimeseriesType.transactionFailureRate>]>;
                            'transaction.type': import("zod").ZodOptional<import("zod").ZodString>;
                            'transaction.name': import("zod").ZodOptional<import("zod").ZodString>;
                        }, import("zod/v4/core").$strip>, import("zod").ZodObject<{
                            name: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<import("@kbn/apm-types").ApmTimeseriesType.exitSpanThroughput>, import("zod").ZodLiteral<import("@kbn/apm-types").ApmTimeseriesType.exitSpanFailureRate>, import("zod").ZodLiteral<import("@kbn/apm-types").ApmTimeseriesType.exitSpanLatency>]>;
                            'span.destination.service.resource': import("zod").ZodOptional<import("zod").ZodString>;
                        }, import("zod/v4/core").$strip>, import("zod").ZodObject<{
                            name: import("zod").ZodLiteral<import("@kbn/apm-types").ApmTimeseriesType.transactionLatency>;
                            function: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<import("@kbn/apm-types").LatencyAggregationType.avg>, import("zod").ZodLiteral<import("@kbn/apm-types").LatencyAggregationType.p95>, import("zod").ZodLiteral<import("@kbn/apm-types").LatencyAggregationType.p99>]>;
                            'transaction.type': import("zod").ZodOptional<import("zod").ZodString>;
                            'transaction.name': import("zod").ZodOptional<import("zod").ZodString>;
                        }, import("zod/v4/core").$strip>, import("zod").ZodObject<{
                            name: import("zod").ZodLiteral<import("@kbn/apm-types").ApmTimeseriesType.errorEventRate>;
                        }, import("zod/v4/core").$strip>]>;
                        filter: import("zod").ZodOptional<import("zod").ZodString>;
                        offset: import("zod").ZodOptional<import("zod").ZodString>;
                        'service.environment': import("zod").ZodOptional<import("zod").ZodString>;
                    }, import("zod/v4/core").$strip>>;
                    start: import("zod").ZodString;
                    end: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./assistant_functions").GetApmTimeseriesResponse>;
        getDownstreamDependencies: {
            endpoint: "GET /internal/apm/assistant/get_downstream_dependencies";
            params?: import("zod").ZodObject<{
                query: import("zod").ZodObject<{
                    serviceName: import("zod").ZodString;
                    start: import("zod").ZodString;
                    end: import("zod").ZodString;
                    serviceEnvironment: import("zod").ZodOptional<import("zod").ZodString>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./assistant_functions").GetDownstreamDependenciesResponse>;
    };
    correlations: {
        fieldCandidatesTransactions: {
            endpoint: "GET /internal/apm/correlations/field_candidates/transactions";
            params?: import("zod").ZodObject<{
                query: import("zod").ZodObject<{
                    serviceName: import("zod").ZodOptional<import("zod").ZodString>;
                    transactionName: import("zod").ZodOptional<import("zod").ZodString>;
                    transactionType: import("zod").ZodOptional<import("zod").ZodString>;
                    environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                    kuery: import("zod").ZodString;
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./correlations").DurationFieldCandidatesResponse>;
        fieldValueStatsTransactions: {
            endpoint: "GET /internal/apm/correlations/field_value_stats/transactions";
            params?: import("zod").ZodObject<{
                query: import("zod").ZodObject<{
                    serviceName: import("zod").ZodOptional<import("zod").ZodString>;
                    transactionName: import("zod").ZodOptional<import("zod").ZodString>;
                    transactionType: import("zod").ZodOptional<import("zod").ZodString>;
                    samplerShardSize: import("zod").ZodOptional<import("zod").ZodString>;
                    environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                    kuery: import("zod").ZodString;
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    fieldName: import("zod").ZodString;
                    fieldValue: import("zod").ZodUnion<readonly [import("zod").ZodString, import("zod").ZodNumber]>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("@kbn/apm-types").TopValuesStats>;
        fieldValuePairsTransactions: {
            endpoint: "POST /internal/apm/correlations/field_value_pairs/transactions";
            params?: import("zod").ZodObject<{
                body: import("zod").ZodObject<{
                    serviceName: import("zod").ZodOptional<import("zod").ZodString>;
                    transactionName: import("zod").ZodOptional<import("zod").ZodString>;
                    transactionType: import("zod").ZodOptional<import("zod").ZodString>;
                    environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                    kuery: import("zod").ZodString;
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    fieldCandidates: import("zod").ZodArray<import("zod").ZodString>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./correlations").FieldValuePairsResponse>;
        significantCorrelationsTransactions: {
            endpoint: "POST /internal/apm/correlations/significant_correlations/transactions";
            params?: import("zod").ZodObject<{
                body: import("zod").ZodObject<{
                    serviceName: import("zod").ZodOptional<import("zod").ZodString>;
                    transactionName: import("zod").ZodOptional<import("zod").ZodString>;
                    transactionType: import("zod").ZodOptional<import("zod").ZodString>;
                    durationMin: import("zod").ZodOptional<import("zod").ZodCoercedNumber<unknown>>;
                    durationMax: import("zod").ZodOptional<import("zod").ZodCoercedNumber<unknown>>;
                    environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                    kuery: import("zod").ZodString;
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    fieldValuePairs: import("zod").ZodArray<import("zod").ZodObject<{
                        fieldName: import("zod").ZodString;
                        fieldValue: import("zod").ZodUnion<readonly [import("zod").ZodString, import("zod").ZodCoercedNumber<unknown>]>;
                    }, import("zod/v4/core").$strip>>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./correlations").SignificantCorrelationsResponse>;
        pValuesTransactions: {
            endpoint: "POST /internal/apm/correlations/p_values/transactions";
            params?: import("zod").ZodObject<{
                body: import("zod").ZodObject<{
                    serviceName: import("zod").ZodOptional<import("zod").ZodString>;
                    transactionName: import("zod").ZodOptional<import("zod").ZodString>;
                    transactionType: import("zod").ZodOptional<import("zod").ZodString>;
                    durationMin: import("zod").ZodOptional<import("zod").ZodCoercedNumber<unknown>>;
                    durationMax: import("zod").ZodOptional<import("zod").ZodCoercedNumber<unknown>>;
                    environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                    kuery: import("zod").ZodString;
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    fieldCandidates: import("zod").ZodArray<import("zod").ZodString>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./correlations").PValuesResponse>;
        unifiedCorrelations: {
            endpoint: "POST /internal/apm/correlations";
            params?: import("zod").ZodObject<{
                body: import("zod").ZodObject<{
                    entityType: import("zod").ZodEnum<{
                        transaction: "transaction";
                        exit_span: "exit_span";
                    }>;
                    metric: import("zod").ZodEnum<{
                        latency: "latency";
                        failure_rate: "failure_rate";
                        throughput: "throughput";
                        infra_metrics: "infra_metrics";
                    }>;
                    serviceName: import("zod").ZodOptional<import("zod").ZodString>;
                    transactionName: import("zod").ZodOptional<import("zod").ZodString>;
                    transactionType: import("zod").ZodOptional<import("zod").ZodString>;
                    fieldCandidates: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString>>;
                    durationMin: import("zod").ZodOptional<import("zod").ZodCoercedNumber<unknown>>;
                    durationMax: import("zod").ZodOptional<import("zod").ZodCoercedNumber<unknown>>;
                    percentileThreshold: import("zod").ZodOptional<import("zod").ZodCoercedNumber<unknown>>;
                    includeHistogram: import("zod").ZodOptional<import("zod").ZodUnion<readonly [import("zod").ZodPipe<import("zod").ZodEnum<{
                        true: "true";
                        false: "false";
                    }>, import("zod").ZodTransform<boolean, "true" | "false">>, import("zod").ZodBoolean]> & import("@kbn/zod-helpers/v4/kbn_zod_types/kbn_zod_type").KbnZodType>;
                    kuery: import("zod").ZodOptional<import("zod").ZodString>;
                    environment: import("zod").ZodOptional<import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>>;
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("@kbn/apm-types").CorrelationsResponse>;
    };
    customDashboards: {
        saveServiceDashboard: {
            endpoint: "POST /internal/apm/custom-dashboard";
            params?: import("zod").ZodObject<{
                query: import("zod").ZodOptional<import("zod").ZodObject<{
                    customDashboardId: import("zod").ZodOptional<import("zod").ZodString>;
                }, import("zod/v4/core").$strip>>;
                body: import("zod").ZodObject<{
                    dashboardSavedObjectId: import("zod").ZodString;
                    kuery: import("zod").ZodOptional<import("zod").ZodString>;
                    serviceNameFilterEnabled: import("zod").ZodBoolean;
                    serviceEnvironmentFilterEnabled: import("zod").ZodBoolean;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("@kbn/apm-types").SavedApmCustomDashboard>;
        getServiceDashboards: {
            endpoint: "GET /internal/apm/services/{serviceName}/dashboards";
            params?: import("zod").ZodObject<{
                path: import("zod").ZodObject<{
                    serviceName: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
                query: import("zod").ZodObject<{
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./custom_dashboards").GetServiceDashboardsResponse>;
        deleteServiceDashboard: {
            endpoint: "DELETE /internal/apm/custom-dashboard";
            params?: import("zod").ZodObject<{
                query: import("zod").ZodObject<{
                    customDashboardId: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<void>;
    };
    dependencies: {
        topDependencies: {
            endpoint: "GET /internal/apm/dependencies/top_dependencies";
            params?: import("zod").ZodObject<{
                query: import("zod").ZodObject<{
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                    kuery: import("zod").ZodString;
                    numBuckets: import("zod").ZodCoercedNumber<unknown>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./dependencies").TopDependenciesResponse>;
        topDependenciesStatistics: {
            endpoint: "POST /internal/apm/dependencies/top_dependencies/statistics";
            params?: import("zod").ZodObject<{
                query: import("zod").ZodObject<{
                    environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                    kuery: import("zod").ZodString;
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    offset: import("zod").ZodOptional<import("zod").ZodString>;
                    numBuckets: import("zod").ZodCoercedNumber<unknown>;
                }, import("zod/v4/core").$strip>;
                body: import("zod").ZodObject<{
                    dependencyNames: import("zod").ZodPipe<import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<any, string>>, import("zod").ZodArray<import("zod").ZodString>>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./dependencies").DependenciesTimeseriesStatisticsResponse>;
        upstreamServices: {
            endpoint: "GET /internal/apm/dependencies/upstream_services";
            params?: import("zod").ZodObject<{
                query: import("zod").ZodObject<{
                    dependencyName: import("zod").ZodString;
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    numBuckets: import("zod").ZodCoercedNumber<unknown>;
                    environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                    offset: import("zod").ZodOptional<import("zod").ZodString>;
                    kuery: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./dependencies").UpstreamServicesForDependencyResponse>;
        metadata: {
            endpoint: "GET /internal/apm/dependencies/metadata";
            params?: import("zod").ZodObject<{
                query: import("zod").ZodObject<{
                    dependencyName: import("zod").ZodString;
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./dependencies").DependencyMetadataRouteResponse>;
        latencyCharts: {
            endpoint: "GET /internal/apm/dependencies/charts/latency";
            params?: import("zod").ZodObject<{
                query: import("zod").ZodObject<{
                    dependencyName: import("zod").ZodString;
                    spanName: import("zod").ZodString;
                    searchServiceDestinationMetrics: import("zod").ZodDefault<import("zod").ZodUnion<readonly [import("zod").ZodPipe<import("zod").ZodEnum<{
                        true: "true";
                        false: "false";
                    }>, import("zod").ZodTransform<boolean, "true" | "false">>, import("zod").ZodBoolean]> & import("@kbn/zod-helpers/v4/kbn_zod_types/kbn_zod_type").KbnZodType>;
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    kuery: import("zod").ZodString;
                    environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                    offset: import("zod").ZodOptional<import("zod").ZodString>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./dependencies").LatencyChartsDependencyResponse>;
        throughputCharts: {
            endpoint: "GET /internal/apm/dependencies/charts/throughput";
            params?: import("zod").ZodObject<{
                query: import("zod").ZodObject<{
                    dependencyName: import("zod").ZodString;
                    spanName: import("zod").ZodString;
                    searchServiceDestinationMetrics: import("zod").ZodDefault<import("zod").ZodUnion<readonly [import("zod").ZodPipe<import("zod").ZodEnum<{
                        true: "true";
                        false: "false";
                    }>, import("zod").ZodTransform<boolean, "true" | "false">>, import("zod").ZodBoolean]> & import("@kbn/zod-helpers/v4/kbn_zod_types/kbn_zod_type").KbnZodType>;
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    kuery: import("zod").ZodString;
                    environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                    offset: import("zod").ZodOptional<import("zod").ZodString>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./dependencies").ThroughputChartsForDependencyResponse>;
        errorRateCharts: {
            endpoint: "GET /internal/apm/dependencies/charts/error_rate";
            params?: import("zod").ZodObject<{
                query: import("zod").ZodObject<{
                    dependencyName: import("zod").ZodString;
                    spanName: import("zod").ZodString;
                    searchServiceDestinationMetrics: import("zod").ZodDefault<import("zod").ZodUnion<readonly [import("zod").ZodPipe<import("zod").ZodEnum<{
                        true: "true";
                        false: "false";
                    }>, import("zod").ZodTransform<boolean, "true" | "false">>, import("zod").ZodBoolean]> & import("@kbn/zod-helpers/v4/kbn_zod_types/kbn_zod_type").KbnZodType>;
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    kuery: import("zod").ZodString;
                    environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                    offset: import("zod").ZodOptional<import("zod").ZodString>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./dependencies").DependencyErrorRateChartsResponse>;
        operations: {
            endpoint: "GET /internal/apm/dependencies/operations";
            params?: import("zod").ZodObject<{
                query: import("zod").ZodObject<{
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                    kuery: import("zod").ZodString;
                    offset: import("zod").ZodOptional<import("zod").ZodString>;
                    dependencyName: import("zod").ZodString;
                    searchServiceDestinationMetrics: import("zod").ZodDefault<import("zod").ZodUnion<readonly [import("zod").ZodPipe<import("zod").ZodEnum<{
                        true: "true";
                        false: "false";
                    }>, import("zod").ZodTransform<boolean, "true" | "false">>, import("zod").ZodBoolean]> & import("@kbn/zod-helpers/v4/kbn_zod_types/kbn_zod_type").KbnZodType>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./dependencies").DependencyOperationsResponse>;
        latencyDistribution: {
            endpoint: "GET /internal/apm/dependencies/charts/distribution";
            params?: import("zod").ZodObject<{
                query: import("zod").ZodObject<{
                    dependencyName: import("zod").ZodString;
                    spanName: import("zod").ZodString;
                    percentileThreshold: import("zod").ZodCoercedNumber<unknown>;
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    kuery: import("zod").ZodString;
                    environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./dependencies").DependencyLatencyDistributionResponse>;
        topDependencySpans: {
            endpoint: "GET /internal/apm/dependencies/operations/spans";
            params?: import("zod").ZodObject<{
                query: import("zod").ZodObject<{
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                    kuery: import("zod").ZodString;
                    dependencyName: import("zod").ZodString;
                    spanName: import("zod").ZodString;
                    sampleRangeFrom: import("zod").ZodOptional<import("zod").ZodCoercedNumber<unknown>>;
                    sampleRangeTo: import("zod").ZodOptional<import("zod").ZodCoercedNumber<unknown>>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./dependencies").TopDependencySpansResponse>;
    };
    transactions: {
        groupsMainStatistics: {
            endpoint: "GET /internal/apm/services/{serviceName}/transactions/groups/main_statistics";
            params?: import("zod").ZodObject<{
                path: import("zod").ZodObject<{
                    serviceName: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
                query: import("zod").ZodObject<{
                    searchQuery: import("zod").ZodOptional<import("zod").ZodString>;
                    environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    kuery: import("zod").ZodString;
                    useDurationSummary: import("zod").ZodDefault<import("zod").ZodUnion<readonly [import("zod").ZodPipe<import("zod").ZodEnum<{
                        true: "true";
                        false: "false";
                    }>, import("zod").ZodTransform<boolean, "true" | "false">>, import("zod").ZodBoolean]> & import("@kbn/zod-helpers/v4/kbn_zod_types/kbn_zod_type").KbnZodType>;
                    transactionType: import("zod").ZodString;
                    latencyAggregationType: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<import("@kbn/apm-types").LatencyAggregationType.avg>, import("zod").ZodLiteral<import("@kbn/apm-types").LatencyAggregationType.p95>, import("zod").ZodLiteral<import("@kbn/apm-types").LatencyAggregationType.p99>]>;
                    documentType: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<import("@kbn/apm-types").ApmDocumentType.TransactionMetric>, import("zod").ZodLiteral<import("@kbn/apm-types").ApmDocumentType.TransactionEvent>]>;
                    rollupInterval: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<import("@kbn/apm-types").RollupInterval.OneMinute>, import("zod").ZodLiteral<import("@kbn/apm-types").RollupInterval.TenMinutes>, import("zod").ZodLiteral<import("@kbn/apm-types").RollupInterval.SixtyMinutes>, import("zod").ZodLiteral<import("@kbn/apm-types").RollupInterval.None>]>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./transactions").MergedServiceTransactionGroupsResponse>;
        groupsDetailedStatistics: {
            endpoint: "GET /internal/apm/services/{serviceName}/transactions/groups/detailed_statistics";
            params?: import("zod").ZodObject<{
                path: import("zod").ZodObject<{
                    serviceName: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
                query: import("zod").ZodObject<{
                    environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                    kuery: import("zod").ZodString;
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    offset: import("zod").ZodOptional<import("zod").ZodString>;
                    documentType: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<import("@kbn/apm-types").ApmDocumentType.TransactionMetric>, import("zod").ZodLiteral<import("@kbn/apm-types").ApmDocumentType.TransactionEvent>]>;
                    rollupInterval: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<import("@kbn/apm-types").RollupInterval.OneMinute>, import("zod").ZodLiteral<import("@kbn/apm-types").RollupInterval.TenMinutes>, import("zod").ZodLiteral<import("@kbn/apm-types").RollupInterval.SixtyMinutes>, import("zod").ZodLiteral<import("@kbn/apm-types").RollupInterval.None>]>;
                    bucketSizeInSeconds: import("zod").ZodCoercedNumber<unknown>;
                    useDurationSummary: import("zod").ZodDefault<import("zod").ZodUnion<readonly [import("zod").ZodPipe<import("zod").ZodEnum<{
                        true: "true";
                        false: "false";
                    }>, import("zod").ZodTransform<boolean, "true" | "false">>, import("zod").ZodBoolean]> & import("@kbn/zod-helpers/v4/kbn_zod_types/kbn_zod_type").KbnZodType>;
                    transactionNames: import("zod").ZodPipe<import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<any, string>>, import("zod").ZodArray<import("zod").ZodString>>;
                    transactionType: import("zod").ZodString;
                    latencyAggregationType: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<import("@kbn/apm-types").LatencyAggregationType.avg>, import("zod").ZodLiteral<import("@kbn/apm-types").LatencyAggregationType.p95>, import("zod").ZodLiteral<import("@kbn/apm-types").LatencyAggregationType.p99>]>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./transactions").ServiceTransactionGroupDetailedStatisticsResponse>;
        latencyCharts: {
            endpoint: "GET /internal/apm/services/{serviceName}/transactions/charts/latency";
            params?: import("zod").ZodObject<{
                path: import("zod").ZodObject<{
                    serviceName: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
                query: import("zod").ZodObject<{
                    latencyAggregationType: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<import("@kbn/apm-types").LatencyAggregationType.avg>, import("zod").ZodLiteral<import("@kbn/apm-types").LatencyAggregationType.p95>, import("zod").ZodLiteral<import("@kbn/apm-types").LatencyAggregationType.p99>]>;
                    bucketSizeInSeconds: import("zod").ZodCoercedNumber<unknown>;
                    useDurationSummary: import("zod").ZodDefault<import("zod").ZodUnion<readonly [import("zod").ZodPipe<import("zod").ZodEnum<{
                        true: "true";
                        false: "false";
                    }>, import("zod").ZodTransform<boolean, "true" | "false">>, import("zod").ZodBoolean]> & import("@kbn/zod-helpers/v4/kbn_zod_types/kbn_zod_type").KbnZodType>;
                    transactionType: import("zod").ZodOptional<import("zod").ZodString>;
                    transactionName: import("zod").ZodOptional<import("zod").ZodString>;
                    filters: import("zod").ZodOptional<import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<import("@kbn/es-query").BoolQuery, string>>>;
                    environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                    kuery: import("zod").ZodString;
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    offset: import("zod").ZodOptional<import("zod").ZodString>;
                    documentType: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<import("@kbn/apm-types").ApmDocumentType.ServiceTransactionMetric>, import("zod").ZodLiteral<import("@kbn/apm-types").ApmDocumentType.TransactionMetric>, import("zod").ZodLiteral<import("@kbn/apm-types").ApmDocumentType.TransactionEvent>]>;
                    rollupInterval: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<import("@kbn/apm-types").RollupInterval.OneMinute>, import("zod").ZodLiteral<import("@kbn/apm-types").RollupInterval.TenMinutes>, import("zod").ZodLiteral<import("@kbn/apm-types").RollupInterval.SixtyMinutes>, import("zod").ZodLiteral<import("@kbn/apm-types").RollupInterval.None>]>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./transactions").TransactionLatencyResponse>;
        traceSamples: {
            endpoint: "GET /internal/apm/services/{serviceName}/transactions/traces/samples";
            params?: import("zod").ZodObject<{
                path: import("zod").ZodObject<{
                    serviceName: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
                query: import("zod").ZodObject<{
                    transactionType: import("zod").ZodString;
                    transactionName: import("zod").ZodString;
                    transactionId: import("zod").ZodOptional<import("zod").ZodString>;
                    traceId: import("zod").ZodOptional<import("zod").ZodString>;
                    sampleRangeFrom: import("zod").ZodOptional<import("zod").ZodCoercedNumber<unknown>>;
                    sampleRangeTo: import("zod").ZodOptional<import("zod").ZodCoercedNumber<unknown>>;
                    environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                    kuery: import("zod").ZodString;
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./transactions").TransactionTraceSamplesResponse>;
        chartsBreakdown: {
            endpoint: "GET /internal/apm/services/{serviceName}/transaction/charts/breakdown";
            params?: import("zod").ZodObject<{
                path: import("zod").ZodObject<{
                    serviceName: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
                query: import("zod").ZodObject<{
                    transactionType: import("zod").ZodString;
                    transactionName: import("zod").ZodOptional<import("zod").ZodString>;
                    environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                    kuery: import("zod").ZodString;
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./transactions").TransactionBreakdownResponse>;
        chartsErrorRate: {
            endpoint: "GET /internal/apm/services/{serviceName}/transactions/charts/error_rate";
            params?: import("zod").ZodObject<{
                path: import("zod").ZodObject<{
                    serviceName: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
                query: import("zod").ZodObject<{
                    transactionType: import("zod").ZodString;
                    bucketSizeInSeconds: import("zod").ZodCoercedNumber<unknown>;
                    transactionName: import("zod").ZodOptional<import("zod").ZodString>;
                    filters: import("zod").ZodOptional<import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<import("@kbn/es-query").BoolQuery, string>>>;
                    environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                    kuery: import("zod").ZodString;
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    offset: import("zod").ZodOptional<import("zod").ZodString>;
                    documentType: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<import("@kbn/apm-types").ApmDocumentType.ServiceTransactionMetric>, import("zod").ZodLiteral<import("@kbn/apm-types").ApmDocumentType.TransactionMetric>, import("zod").ZodLiteral<import("@kbn/apm-types").ApmDocumentType.TransactionEvent>]>;
                    rollupInterval: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<import("@kbn/apm-types").RollupInterval.OneMinute>, import("zod").ZodLiteral<import("@kbn/apm-types").RollupInterval.TenMinutes>, import("zod").ZodLiteral<import("@kbn/apm-types").RollupInterval.SixtyMinutes>, import("zod").ZodLiteral<import("@kbn/apm-types").RollupInterval.None>]>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./transactions").FailedTransactionRateResponse>;
        chartsColdstartRate: {
            endpoint: "GET /internal/apm/services/{serviceName}/transactions/charts/coldstart_rate";
            params?: import("zod").ZodObject<{
                path: import("zod").ZodObject<{
                    serviceName: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
                query: import("zod").ZodObject<{
                    transactionType: import("zod").ZodString;
                    environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                    kuery: import("zod").ZodString;
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    offset: import("zod").ZodOptional<import("zod").ZodString>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./transactions").ColdstartRateResponse>;
        chartsColdstartRateByTransactionName: {
            endpoint: "GET /internal/apm/services/{serviceName}/transactions/charts/coldstart_rate_by_transaction_name";
            params?: import("zod").ZodObject<{
                path: import("zod").ZodObject<{
                    serviceName: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
                query: import("zod").ZodObject<{
                    transactionType: import("zod").ZodString;
                    transactionName: import("zod").ZodString;
                    environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                    kuery: import("zod").ZodString;
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    offset: import("zod").ZodOptional<import("zod").ZodString>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./transactions").ColdstartRateResponse>;
    };
    services: {
        servicesList: {
            endpoint: "GET /internal/apm/services";
            params?: import("zod").ZodObject<{
                query: import("zod").ZodObject<{
                    searchQuery: import("zod").ZodOptional<import("zod").ZodString>;
                    serviceGroup: import("zod").ZodOptional<import("zod").ZodString>;
                    probability: import("zod").ZodCoercedNumber<unknown>;
                    documentType: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<import("@kbn/apm-types").ApmDocumentType.ServiceTransactionMetric>, import("zod").ZodLiteral<import("@kbn/apm-types").ApmDocumentType.TransactionMetric>, import("zod").ZodLiteral<import("@kbn/apm-types").ApmDocumentType.TransactionEvent>]>;
                    rollupInterval: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<import("@kbn/apm-types").RollupInterval.OneMinute>, import("zod").ZodLiteral<import("@kbn/apm-types").RollupInterval.TenMinutes>, import("zod").ZodLiteral<import("@kbn/apm-types").RollupInterval.SixtyMinutes>, import("zod").ZodLiteral<import("@kbn/apm-types").RollupInterval.None>]>;
                    useDurationSummary: import("zod").ZodDefault<import("zod").ZodUnion<readonly [import("zod").ZodPipe<import("zod").ZodEnum<{
                        true: "true";
                        false: "false";
                    }>, import("zod").ZodTransform<boolean, "true" | "false">>, import("zod").ZodBoolean]> & import("@kbn/zod-helpers/v4/kbn_zod_types/kbn_zod_type").KbnZodType>;
                    environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                    kuery: import("zod").ZodString;
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./services").ServicesItemsResponse>;
        detailedStatistics: {
            endpoint: "POST /internal/apm/services/detailed_statistics";
            params?: import("zod").ZodObject<{
                query: import("zod").ZodObject<{
                    environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                    kuery: import("zod").ZodString;
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    offset: import("zod").ZodOptional<import("zod").ZodString>;
                    probability: import("zod").ZodCoercedNumber<unknown>;
                    documentType: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<import("@kbn/apm-types").ApmDocumentType.ServiceTransactionMetric>, import("zod").ZodLiteral<import("@kbn/apm-types").ApmDocumentType.TransactionMetric>, import("zod").ZodLiteral<import("@kbn/apm-types").ApmDocumentType.TransactionEvent>]>;
                    rollupInterval: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<import("@kbn/apm-types").RollupInterval.OneMinute>, import("zod").ZodLiteral<import("@kbn/apm-types").RollupInterval.TenMinutes>, import("zod").ZodLiteral<import("@kbn/apm-types").RollupInterval.SixtyMinutes>, import("zod").ZodLiteral<import("@kbn/apm-types").RollupInterval.None>]>;
                    bucketSizeInSeconds: import("zod").ZodCoercedNumber<unknown>;
                }, import("zod/v4/core").$strip>;
                body: import("zod").ZodObject<{
                    serviceNames: import("zod").ZodPipe<import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<any, string>>, import("zod").ZodArray<import("zod").ZodString>>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./services").ServiceTransactionDetailedStatPeriodsResponse>;
        metadataDetails: {
            endpoint: "GET /internal/apm/services/{serviceName}/metadata/details";
            params?: import("zod").ZodObject<{
                path: import("zod").ZodObject<{
                    serviceName: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
                query: import("zod").ZodObject<{
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./services").ServiceMetadataDetails>;
        metadataIcons: {
            endpoint: "GET /internal/apm/services/{serviceName}/metadata/icons";
            params?: import("zod").ZodObject<{
                path: import("zod").ZodObject<{
                    serviceName: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
                query: import("zod").ZodObject<{
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./services").ServiceMetadataIcons>;
        agent: {
            endpoint: "GET /internal/apm/services/{serviceName}/agent";
            params?: import("zod").ZodObject<{
                path: import("zod").ZodObject<{
                    serviceName: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
                query: import("zod").ZodObject<{
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./services").ServiceAgentResponse>;
        transactionTypes: {
            endpoint: "GET /internal/apm/services/{serviceName}/transaction_types";
            params?: import("zod").ZodObject<{
                path: import("zod").ZodObject<{
                    serviceName: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
                query: import("zod").ZodObject<{
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    documentType: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<import("@kbn/apm-types").ApmDocumentType.ServiceTransactionMetric>, import("zod").ZodLiteral<import("@kbn/apm-types").ApmDocumentType.TransactionMetric>, import("zod").ZodLiteral<import("@kbn/apm-types").ApmDocumentType.TransactionEvent>]>;
                    rollupInterval: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<import("@kbn/apm-types").RollupInterval.OneMinute>, import("zod").ZodLiteral<import("@kbn/apm-types").RollupInterval.TenMinutes>, import("zod").ZodLiteral<import("@kbn/apm-types").RollupInterval.SixtyMinutes>, import("zod").ZodLiteral<import("@kbn/apm-types").RollupInterval.None>]>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./services").ServiceTransactionTypesResponse>;
        nodeMetadata: {
            endpoint: "GET /internal/apm/services/{serviceName}/node/{serviceNodeName}/metadata";
            params?: import("zod").ZodObject<{
                path: import("zod").ZodObject<{
                    serviceName: import("zod").ZodString;
                    serviceNodeName: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
                query: import("zod").ZodObject<{
                    kuery: import("zod").ZodString;
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                    documentType: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<import("@kbn/apm-types").ApmDocumentType.ServiceTransactionMetric>, import("zod").ZodLiteral<import("@kbn/apm-types").ApmDocumentType.TransactionMetric>, import("zod").ZodLiteral<import("@kbn/apm-types").ApmDocumentType.TransactionEvent>]>;
                    rollupInterval: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<import("@kbn/apm-types").RollupInterval.OneMinute>, import("zod").ZodLiteral<import("@kbn/apm-types").RollupInterval.TenMinutes>, import("zod").ZodLiteral<import("@kbn/apm-types").RollupInterval.SixtyMinutes>, import("zod").ZodLiteral<import("@kbn/apm-types").RollupInterval.None>]>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./services").ServiceNodeMetadataResponse>;
        annotationsSearch: {
            endpoint: "GET /api/apm/services/{serviceName}/annotation/search 2023-10-31";
            params?: import("zod").ZodObject<{
                path: import("zod").ZodObject<{
                    serviceName: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
                query: import("zod").ZodObject<{
                    environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./services").ServiceAnnotationResponse>;
        throughput: {
            endpoint: "GET /internal/apm/services/{serviceName}/throughput";
            params?: import("zod").ZodObject<{
                path: import("zod").ZodObject<{
                    serviceName: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
                query: import("zod").ZodObject<{
                    bucketSizeInSeconds: import("zod").ZodCoercedNumber<unknown>;
                    transactionType: import("zod").ZodOptional<import("zod").ZodString>;
                    transactionName: import("zod").ZodOptional<import("zod").ZodString>;
                    filters: import("zod").ZodOptional<import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<import("@kbn/es-query").BoolQuery, string>>>;
                    environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                    kuery: import("zod").ZodString;
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    offset: import("zod").ZodOptional<import("zod").ZodString>;
                    documentType: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<import("@kbn/apm-types").ApmDocumentType.ServiceTransactionMetric>, import("zod").ZodLiteral<import("@kbn/apm-types").ApmDocumentType.TransactionMetric>, import("zod").ZodLiteral<import("@kbn/apm-types").ApmDocumentType.TransactionEvent>]>;
                    rollupInterval: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<import("@kbn/apm-types").RollupInterval.OneMinute>, import("zod").ZodLiteral<import("@kbn/apm-types").RollupInterval.TenMinutes>, import("zod").ZodLiteral<import("@kbn/apm-types").RollupInterval.SixtyMinutes>, import("zod").ZodLiteral<import("@kbn/apm-types").RollupInterval.None>]>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./services").ServiceThroughputRouteResponse>;
        instancesMainStatistics: {
            endpoint: "GET /internal/apm/services/{serviceName}/service_overview_instances/main_statistics";
            params?: import("zod").ZodObject<{
                path: import("zod").ZodObject<{
                    serviceName: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
                query: import("zod").ZodObject<{
                    latencyAggregationType: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<import("@kbn/apm-types").LatencyAggregationType.avg>, import("zod").ZodLiteral<import("@kbn/apm-types").LatencyAggregationType.p95>, import("zod").ZodLiteral<import("@kbn/apm-types").LatencyAggregationType.p99>]>;
                    transactionType: import("zod").ZodString;
                    sortField: import("zod").ZodEnum<{
                        latency: "latency";
                        serviceNodeName: "serviceNodeName";
                        throughput: "throughput";
                        errorRate: "errorRate";
                        cpuUsage: "cpuUsage";
                        memoryUsage: "memoryUsage";
                    }>;
                    sortDirection: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"asc">, import("zod").ZodLiteral<"desc">]>;
                    offset: import("zod").ZodOptional<import("zod").ZodString>;
                    environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                    kuery: import("zod").ZodString;
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./services").ServiceInstancesMainStatisticsRouteResponse>;
        instancesDetailedStatistics: {
            endpoint: "GET /internal/apm/services/{serviceName}/service_overview_instances/detailed_statistics";
            params?: import("zod").ZodObject<{
                path: import("zod").ZodObject<{
                    serviceName: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
                query: import("zod").ZodObject<{
                    latencyAggregationType: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<import("@kbn/apm-types").LatencyAggregationType.avg>, import("zod").ZodLiteral<import("@kbn/apm-types").LatencyAggregationType.p95>, import("zod").ZodLiteral<import("@kbn/apm-types").LatencyAggregationType.p99>]>;
                    transactionType: import("zod").ZodString;
                    serviceNodeIds: import("zod").ZodPipe<import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<any, string>>, import("zod").ZodArray<import("zod").ZodString>>;
                    numBuckets: import("zod").ZodCoercedNumber<unknown>;
                    environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                    kuery: import("zod").ZodString;
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    offset: import("zod").ZodOptional<import("zod").ZodString>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./services").ServiceInstancesDetailedStatisticsResponse>;
        instancesMetadataDetails: {
            endpoint: "GET /internal/apm/services/{serviceName}/service_overview_instances/details/{serviceNodeName}";
            params?: import("zod").ZodObject<{
                path: import("zod").ZodObject<{
                    serviceName: import("zod").ZodString;
                    serviceNodeName: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
                query: import("zod").ZodObject<{
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./services").ServiceInstancesMetadataDetailsRouteResponse>;
        dependencies: {
            endpoint: "GET /internal/apm/services/{serviceName}/dependencies";
            params?: import("zod").ZodObject<{
                path: import("zod").ZodObject<{
                    serviceName: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
                query: import("zod").ZodObject<{
                    numBuckets: import("zod").ZodCoercedNumber<unknown>;
                    environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    offset: import("zod").ZodOptional<import("zod").ZodString>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./services").ServiceDependenciesRouteResponse>;
        dependenciesBreakdown: {
            endpoint: "GET /internal/apm/services/{serviceName}/dependencies/breakdown";
            params?: import("zod").ZodObject<{
                path: import("zod").ZodObject<{
                    serviceName: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
                query: import("zod").ZodObject<{
                    environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    kuery: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./services").ServiceDependenciesBreakdownRouteResponse>;
        anomalyCharts: {
            endpoint: "GET /internal/apm/services/{serviceName}/anomaly_charts";
            params?: import("zod").ZodObject<{
                path: import("zod").ZodObject<{
                    serviceName: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
                query: import("zod").ZodObject<{
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                    transactionType: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./services").ServiceAnomalyChartsResponse>;
        alertsCount: {
            endpoint: "GET /internal/apm/services/{serviceName}/alerts_count";
            params?: import("zod").ZodObject<{
                path: import("zod").ZodObject<{
                    serviceName: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
                query: import("zod").ZodObject<{
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<{
            serviceName: string;
            alertsCount: number;
        }>;
        slos: {
            endpoint: "GET /internal/apm/services/{serviceName}/slos";
            params?: import("zod").ZodObject<{
                path: import("zod").ZodObject<{
                    serviceName: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
                query: import("zod").ZodObject<{
                    environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                    page: import("zod").ZodCoercedNumber<unknown>;
                    perPage: import("zod").ZodCoercedNumber<unknown>;
                    statusFilters: import("zod").ZodOptional<import("zod").ZodPipe<import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<any, string>>, import("zod").ZodArray<import("zod").ZodString>>>;
                    kqlQuery: import("zod").ZodOptional<import("zod").ZodString>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./services").ServiceSlosResponse>;
        mixedIngestion: {
            endpoint: "GET /internal/apm/services/{serviceName}/metrics/mixed_ingestion";
            params?: import("zod").ZodObject<{
                path: import("zod").ZodObject<{
                    serviceName: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
                query: import("zod").ZodObject<{
                    environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                    kuery: import("zod").ZodString;
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./services").ServiceMixedIngestionResponse>;
        anomalyScore: {
            endpoint: "GET /internal/apm/services/{serviceName}/anomaly_score";
            params?: import("zod").ZodObject<{
                path: import("zod").ZodObject<{
                    serviceName: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
                query: import("zod").ZodObject<{
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./services").ServiceAnomalyScoreResponse>;
    };
    serviceMap: {
        serviceMap: {
            endpoint: "GET /internal/apm/service-map";
            params?: import("zod").ZodObject<{
                query: import("zod").ZodObject<{
                    serviceName: import("zod").ZodOptional<import("zod").ZodString>;
                    serviceGroup: import("zod").ZodOptional<import("zod").ZodString>;
                    kuery: import("zod").ZodOptional<import("zod").ZodString>;
                    esQuery: import("zod").ZodOptional<import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<any, string>>>;
                    environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("@kbn/apm-types").ServiceMapResponse>;
        dependencyNode: {
            endpoint: "GET /internal/apm/service-map/dependency";
            params?: import("zod").ZodObject<{
                query: import("zod").ZodObject<{
                    dependencies: import("zod").ZodUnion<readonly [import("zod").ZodString, import("zod").ZodArray<import("zod").ZodString>]>;
                    sourceServiceName: import("zod").ZodOptional<import("zod").ZodString>;
                    environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    offset: import("zod").ZodOptional<import("zod").ZodString>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./service_map").ServiceMapServiceDependencyInfoResponse>;
        serviceBadges: {
            endpoint: "POST /internal/apm/service-map/service_badges";
            params?: import("zod").ZodObject<{
                query: import("zod").ZodObject<{
                    environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    kuery: import("zod").ZodOptional<import("zod").ZodString>;
                }, import("zod/v4/core").$strip>;
                body: import("zod").ZodObject<{
                    serviceNames: import("zod").ZodPipe<import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<any, string>>, import("zod").ZodArray<import("zod").ZodString>>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./service_map").ServiceMapServiceBadgesResponse>;
    };
    errors: {
        mainStatistics: {
            endpoint: "GET /internal/apm/services/{serviceName}/errors/groups/main_statistics";
            params?: import("zod").ZodObject<{
                path: import("zod").ZodObject<{
                    serviceName: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
                query: import("zod").ZodObject<{
                    sortField: import("zod").ZodOptional<import("zod").ZodString>;
                    sortDirection: import("zod").ZodOptional<import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"asc">, import("zod").ZodLiteral<"desc">]>>;
                    searchQuery: import("zod").ZodOptional<import("zod").ZodString>;
                    environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                    kuery: import("zod").ZodString;
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./errors").ErrorGroupMainStatisticsResponse>;
        mainStatisticsByTransactionName: {
            endpoint: "GET /internal/apm/services/{serviceName}/errors/groups/main_statistics_by_transaction_name";
            params?: import("zod").ZodObject<{
                path: import("zod").ZodObject<{
                    serviceName: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
                query: import("zod").ZodObject<{
                    transactionType: import("zod").ZodString;
                    transactionName: import("zod").ZodString;
                    maxNumberOfErrorGroups: import("zod").ZodCoercedNumber<unknown>;
                    environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                    kuery: import("zod").ZodString;
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./errors").ErrorGroupMainStatisticsResponse>;
        detailedStatistics: {
            endpoint: "POST /internal/apm/services/{serviceName}/errors/groups/detailed_statistics";
            params?: import("zod").ZodObject<{
                path: import("zod").ZodObject<{
                    serviceName: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
                query: import("zod").ZodObject<{
                    environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                    kuery: import("zod").ZodString;
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    offset: import("zod").ZodOptional<import("zod").ZodString>;
                    numBuckets: import("zod").ZodCoercedNumber<unknown>;
                }, import("zod/v4/core").$strip>;
                body: import("zod").ZodObject<{
                    groupIds: import("zod").ZodPipe<import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<any, string>>, import("zod").ZodArray<import("zod").ZodString>>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./errors").ErrorGroupPeriodsResponse>;
        groupSamples: {
            endpoint: "GET /internal/apm/services/{serviceName}/errors/{groupId}/samples";
            params?: import("zod").ZodObject<{
                path: import("zod").ZodObject<{
                    serviceName: import("zod").ZodString;
                    groupId: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
                query: import("zod").ZodObject<{
                    environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                    kuery: import("zod").ZodString;
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./errors").ErrorGroupSampleIdsResponse>;
        sampleDetails: {
            endpoint: "GET /internal/apm/services/{serviceName}/errors/{groupId}/error/{errorId}";
            params?: import("zod").ZodObject<{
                path: import("zod").ZodObject<{
                    serviceName: import("zod").ZodString;
                    groupId: import("zod").ZodString;
                    errorId: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
                query: import("zod").ZodObject<{
                    environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                    kuery: import("zod").ZodString;
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./errors").ErrorSampleDetailsResponse>;
        distribution: {
            endpoint: "GET /internal/apm/services/{serviceName}/errors/distribution";
            params?: import("zod").ZodObject<{
                path: import("zod").ZodObject<{
                    serviceName: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
                query: import("zod").ZodObject<{
                    groupId: import("zod").ZodOptional<import("zod").ZodString>;
                    transactionName: import("zod").ZodOptional<import("zod").ZodString>;
                    bucketSizeInSeconds: import("zod").ZodOptional<import("zod").ZodCoercedNumber<unknown>>;
                    environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                    kuery: import("zod").ZodString;
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    offset: import("zod").ZodOptional<import("zod").ZodString>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./errors").ErrorDistributionResponse>;
        topErroneousTransactions: {
            endpoint: "GET /internal/apm/services/{serviceName}/errors/{groupId}/top_erroneous_transactions";
            params?: import("zod").ZodObject<{
                path: import("zod").ZodObject<{
                    serviceName: import("zod").ZodString;
                    groupId: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
                query: import("zod").ZodObject<{
                    environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                    kuery: import("zod").ZodString;
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    offset: import("zod").ZodOptional<import("zod").ZodString>;
                    numBuckets: import("zod").ZodCoercedNumber<unknown>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./errors").TopErroneousTransactionsResponse>;
    };
    infrastructure: {
        infrastructureAttributes: {
            endpoint: "GET /internal/apm/services/{serviceName}/infrastructure_attributes";
            params?: import("zod").ZodObject<{
                path: import("zod").ZodObject<{
                    serviceName: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
                query: import("zod").ZodObject<{
                    kuery: import("zod").ZodString;
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                    agentName: import("zod").ZodOptional<import("zod").ZodString>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./infrastructure").InfrastructureAttributesResponse>;
    };
    environments: {
        environments: {
            endpoint: "GET /internal/apm/environments";
            params?: import("zod").ZodObject<{
                query: import("zod").ZodObject<{
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    serviceName: import("zod").ZodOptional<import("zod").ZodString>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./environments").EnvironmentsResponse>;
    };
    eventMetadata: {
        eventMetadata: {
            endpoint: "GET /internal/apm/event_metadata/{processorEvent}/{id}";
            params?: import("zod").ZodObject<{
                path: import("zod").ZodObject<{
                    processorEvent: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<import("@kbn/apm-types-shared").ProcessorEvent.transaction>, import("zod").ZodLiteral<import("@kbn/apm-types-shared").ProcessorEvent.error>, import("zod").ZodLiteral<import("@kbn/apm-types-shared").ProcessorEvent.metric>, import("zod").ZodLiteral<import("@kbn/apm-types-shared").ProcessorEvent.span>]>;
                    id: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
                query: import("zod").ZodObject<{
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./event_metadata").EventMetadataResponse>;
    };
    fallbackToTransactions: {
        fallbackToTransactions: {
            endpoint: "GET /internal/apm/fallback_to_transactions";
            params?: import("zod").ZodObject<{
                query: import("zod").ZodOptional<import("zod").ZodObject<{
                    kuery: import("zod").ZodString;
                    start: import("zod").ZodOptional<import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>>;
                    end: import("zod").ZodOptional<import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>>;
                }, import("zod/v4/core").$strip>>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./fallback_to_transactions").FallbackToTransactionsResponse>;
    };
    latencyDistribution: {
        overallTransactionDistribution: {
            endpoint: "POST /internal/apm/latency/overall_distribution/transactions";
            params?: import("zod").ZodObject<{
                body: import("zod").ZodObject<{
                    serviceName: import("zod").ZodOptional<import("zod").ZodString>;
                    transactionName: import("zod").ZodOptional<import("zod").ZodString>;
                    transactionType: import("zod").ZodOptional<import("zod").ZodString>;
                    termFilters: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodObject<{
                        fieldName: import("zod").ZodString;
                        fieldValue: import("zod").ZodUnion<readonly [import("zod").ZodString, import("zod").ZodNumber]>;
                    }, import("zod/v4/core").$strip>>>;
                    durationMin: import("zod").ZodOptional<import("zod").ZodCoercedNumber<unknown>>;
                    durationMax: import("zod").ZodOptional<import("zod").ZodCoercedNumber<unknown>>;
                    percentileThreshold: import("zod").ZodCoercedNumber<unknown>;
                    chartType: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<import("@kbn/apm-types").LatencyDistributionChartType.transactionLatency>, import("zod").ZodLiteral<import("@kbn/apm-types").LatencyDistributionChartType.spanLatency>, import("zod").ZodLiteral<import("@kbn/apm-types").LatencyDistributionChartType.latencyCorrelations>, import("zod").ZodLiteral<import("@kbn/apm-types").LatencyDistributionChartType.failedTransactionsCorrelations>, import("zod").ZodLiteral<import("@kbn/apm-types").LatencyDistributionChartType.dependencyLatency>]>;
                    environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                    kuery: import("zod").ZodString;
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("@kbn/apm-types").OverallLatencyDistributionResponse>;
        overallSpanDistribution: {
            endpoint: "POST /internal/apm/latency/overall_distribution/spans";
            params?: import("zod").ZodObject<{
                body: import("zod").ZodObject<{
                    serviceName: import("zod").ZodOptional<import("zod").ZodString>;
                    spanName: import("zod").ZodOptional<import("zod").ZodString>;
                    transactionId: import("zod").ZodOptional<import("zod").ZodString>;
                    termFilters: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodObject<{
                        fieldName: import("zod").ZodString;
                        fieldValue: import("zod").ZodUnion<readonly [import("zod").ZodString, import("zod").ZodNumber]>;
                    }, import("zod/v4/core").$strip>>>;
                    durationMin: import("zod").ZodOptional<import("zod").ZodCoercedNumber<unknown>>;
                    durationMax: import("zod").ZodOptional<import("zod").ZodCoercedNumber<unknown>>;
                    isOtel: import("zod").ZodOptional<import("zod").ZodBoolean>;
                    percentileThreshold: import("zod").ZodCoercedNumber<unknown>;
                    chartType: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<import("@kbn/apm-types").LatencyDistributionChartType.transactionLatency>, import("zod").ZodLiteral<import("@kbn/apm-types").LatencyDistributionChartType.spanLatency>, import("zod").ZodLiteral<import("@kbn/apm-types").LatencyDistributionChartType.latencyCorrelations>, import("zod").ZodLiteral<import("@kbn/apm-types").LatencyDistributionChartType.failedTransactionsCorrelations>, import("zod").ZodLiteral<import("@kbn/apm-types").LatencyDistributionChartType.dependencyLatency>]>;
                    environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                    kuery: import("zod").ZodString;
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("@kbn/apm-types").OverallLatencyDistributionResponse>;
    };
    metrics: {
        charts: {
            endpoint: "GET /internal/apm/services/{serviceName}/metrics/charts";
            params?: import("zod").ZodObject<{
                path: import("zod").ZodObject<{
                    serviceName: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
                query: import("zod").ZodObject<{
                    agentName: import("zod").ZodString;
                    serviceNodeName: import("zod").ZodOptional<import("zod").ZodString>;
                    environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                    kuery: import("zod").ZodString;
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./metrics").MetricsChartsResponse>;
        nodes: {
            endpoint: "GET /internal/apm/services/{serviceName}/metrics/nodes";
            params?: import("zod").ZodObject<{
                path: import("zod").ZodObject<{
                    serviceName: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
                query: import("zod").ZodObject<{
                    kuery: import("zod").ZodString;
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./metrics").ServiceMetricsNodesRouteResponse>;
        serverlessCharts: {
            endpoint: "GET /internal/apm/services/{serviceName}/metrics/serverless/charts";
            params?: import("zod").ZodObject<{
                path: import("zod").ZodObject<{
                    serviceName: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
                query: import("zod").ZodObject<{
                    environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                    kuery: import("zod").ZodString;
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    serverlessId: import("zod").ZodOptional<import("zod").ZodString>;
                    documentType: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<import("@kbn/apm-types").ApmDocumentType.TransactionMetric>, import("zod").ZodLiteral<import("@kbn/apm-types").ApmDocumentType.TransactionEvent>]>;
                    rollupInterval: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<import("@kbn/apm-types").RollupInterval.OneMinute>, import("zod").ZodLiteral<import("@kbn/apm-types").RollupInterval.TenMinutes>, import("zod").ZodLiteral<import("@kbn/apm-types").RollupInterval.SixtyMinutes>, import("zod").ZodLiteral<import("@kbn/apm-types").RollupInterval.None>]>;
                    bucketSizeInSeconds: import("zod").ZodCoercedNumber<unknown>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./metrics").ServerlessMetricsChartsResponse>;
        serverlessActiveInstances: {
            endpoint: "GET /internal/apm/services/{serviceName}/metrics/serverless/active_instances";
            params?: import("zod").ZodObject<{
                path: import("zod").ZodObject<{
                    serviceName: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
                query: import("zod").ZodObject<{
                    environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                    kuery: import("zod").ZodString;
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    serverlessId: import("zod").ZodOptional<import("zod").ZodString>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./metrics").ServerlessActiveInstancesResponse>;
        serverlessFunctionsOverview: {
            endpoint: "GET /internal/apm/services/{serviceName}/metrics/serverless/functions_overview";
            params?: import("zod").ZodObject<{
                path: import("zod").ZodObject<{
                    serviceName: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
                query: import("zod").ZodObject<{
                    environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                    kuery: import("zod").ZodString;
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./metrics").ServerlessFunctionsOverviewRouteResponse>;
        serverlessSummary: {
            endpoint: "GET /internal/apm/services/{serviceName}/metrics/serverless/summary";
            params?: import("zod").ZodObject<{
                path: import("zod").ZodObject<{
                    serviceName: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
                query: import("zod").ZodObject<{
                    environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                    kuery: import("zod").ZodString;
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    serverlessId: import("zod").ZodOptional<import("zod").ZodString>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./metrics").ServerlessSummaryResponse>;
    };
    profiling: {
        flamegraph: {
            endpoint: "GET /internal/apm/services/{serviceName}/profiling/flamegraph";
            params?: import("zod").ZodObject<{
                path: import("zod").ZodObject<{
                    serviceName: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
                query: import("zod").ZodObject<{
                    kuery: import("zod").ZodString;
                    environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    transactionName: import("zod").ZodOptional<import("zod").ZodString>;
                    transactionType: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("@kbn/profiling-utils").BaseFlameGraph>;
        functions: {
            endpoint: "GET /internal/apm/services/{serviceName}/profiling/functions";
            params?: import("zod").ZodObject<{
                path: import("zod").ZodObject<{
                    serviceName: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
                query: import("zod").ZodObject<{
                    environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    transactionName: import("zod").ZodOptional<import("zod").ZodString>;
                    startIndex: import("zod").ZodCoercedNumber<unknown>;
                    endIndex: import("zod").ZodCoercedNumber<unknown>;
                    transactionType: import("zod").ZodString;
                    kuery: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("@kbn/profiling-utils").TopNFunctions>;
        status: {
            endpoint: "GET /internal/apm/profiling/status";
            params?: undefined;
        } & import("./types").WithResponse<import("./profiling").ProfilingStatusResponse>;
        hostsFlamegraph: {
            endpoint: "GET /internal/apm/services/{serviceName}/profiling/hosts/flamegraph";
            params?: import("zod").ZodObject<{
                path: import("zod").ZodObject<{
                    serviceName: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
                query: import("zod").ZodObject<{
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                    documentType: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<import("@kbn/apm-types").ApmDocumentType.ServiceTransactionMetric>, import("zod").ZodLiteral<import("@kbn/apm-types").ApmDocumentType.TransactionMetric>, import("zod").ZodLiteral<import("@kbn/apm-types").ApmDocumentType.TransactionEvent>]>;
                    rollupInterval: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<import("@kbn/apm-types").RollupInterval.OneMinute>, import("zod").ZodLiteral<import("@kbn/apm-types").RollupInterval.TenMinutes>, import("zod").ZodLiteral<import("@kbn/apm-types").RollupInterval.SixtyMinutes>, import("zod").ZodLiteral<import("@kbn/apm-types").RollupInterval.None>]>;
                    kuery: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./profiling").ProfilingHostsFlamegraphResponse>;
        hostsFunctions: {
            endpoint: "GET /internal/apm/services/{serviceName}/profiling/hosts/functions";
            params?: import("zod").ZodObject<{
                path: import("zod").ZodObject<{
                    serviceName: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
                query: import("zod").ZodObject<{
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                    documentType: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<import("@kbn/apm-types").ApmDocumentType.ServiceTransactionMetric>, import("zod").ZodLiteral<import("@kbn/apm-types").ApmDocumentType.TransactionMetric>, import("zod").ZodLiteral<import("@kbn/apm-types").ApmDocumentType.TransactionEvent>]>;
                    rollupInterval: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<import("@kbn/apm-types").RollupInterval.OneMinute>, import("zod").ZodLiteral<import("@kbn/apm-types").RollupInterval.TenMinutes>, import("zod").ZodLiteral<import("@kbn/apm-types").RollupInterval.SixtyMinutes>, import("zod").ZodLiteral<import("@kbn/apm-types").RollupInterval.None>]>;
                    startIndex: import("zod").ZodCoercedNumber<unknown>;
                    endIndex: import("zod").ZodCoercedNumber<unknown>;
                    kuery: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./profiling").ProfilingHostsFunctionsResponse>;
    };
    serviceGroups: {
        list: {
            endpoint: "GET /internal/apm/service-groups";
            params?: undefined;
        } & import("./types").WithResponse<import("./service_groups").ServiceGroupsResponse>;
        get: {
            endpoint: "GET /internal/apm/service-group";
            params?: import("zod").ZodObject<{
                query: import("zod").ZodObject<{
                    serviceGroup: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./service_groups").ServiceGroupResponse>;
        save: {
            endpoint: "POST /internal/apm/service-group";
            params?: import("zod").ZodObject<{
                query: import("zod").ZodOptional<import("zod").ZodObject<{
                    serviceGroupId: import("zod").ZodOptional<import("zod").ZodString>;
                }, import("zod/v4/core").$strip>>;
                body: import("zod").ZodObject<{
                    groupName: import("zod").ZodString;
                    kuery: import("zod").ZodString;
                    description: import("zod").ZodOptional<import("zod").ZodString>;
                    color: import("zod").ZodOptional<import("zod").ZodString>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("@kbn/apm-types").SavedServiceGroup>;
        delete: {
            endpoint: "DELETE /internal/apm/service-group";
            params?: import("zod").ZodObject<{
                query: import("zod").ZodObject<{
                    serviceGroupId: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<void>;
        services: {
            endpoint: "GET /internal/apm/service-group/services";
            params?: import("zod").ZodObject<{
                query: import("zod").ZodObject<{
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    kuery: import("zod").ZodOptional<import("zod").ZodString>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./service_groups").LookupServicesRouteResponse>;
        counts: {
            endpoint: "GET /internal/apm/service-group/counts";
            params?: undefined;
        } & import("./types").WithResponse<import("./service_groups").ServiceGroupCounts>;
    };
    timeRangeMetadata: {
        timeRangeMetadata: {
            endpoint: "GET /internal/apm/time_range_metadata";
            params?: import("zod").ZodObject<{
                query: import("zod").ZodObject<{
                    useSpanName: import("zod").ZodDefault<import("zod").ZodUnion<readonly [import("zod").ZodPipe<import("zod").ZodEnum<{
                        true: "true";
                        false: "false";
                    }>, import("zod").ZodTransform<boolean, "true" | "false">>, import("zod").ZodBoolean]> & import("@kbn/zod-helpers/v4/kbn_zod_types/kbn_zod_type").KbnZodType>;
                    kuery: import("zod").ZodString;
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("@kbn/apm-types").TimeRangeMetadata>;
    };
    customLinks: {
        transaction: {
            endpoint: "GET /internal/apm/settings/custom_links/transaction";
            params?: import("zod").ZodObject<{
                query: import("zod").ZodOptional<import("zod").ZodObject<{
                    'service.name': import("zod").ZodOptional<import("zod").ZodString>;
                    'service.environment': import("zod").ZodOptional<import("zod").ZodString>;
                    'transaction.name': import("zod").ZodOptional<import("zod").ZodString>;
                    'transaction.type': import("zod").ZodOptional<import("zod").ZodString>;
                }, import("zod/v4/core").$strip>>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("@kbn/apm-types").Transaction>;
        list: {
            endpoint: "GET /internal/apm/settings/custom_links";
            params?: import("zod").ZodObject<{
                query: import("zod").ZodOptional<import("zod").ZodObject<{
                    'service.name': import("zod").ZodOptional<import("zod").ZodString>;
                    'service.environment': import("zod").ZodOptional<import("zod").ZodString>;
                    'transaction.name': import("zod").ZodOptional<import("zod").ZodString>;
                    'transaction.type': import("zod").ZodOptional<import("zod").ZodString>;
                }, import("zod/v4/core").$strip>>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./custom_links").ListCustomLinksResponse>;
        create: {
            endpoint: "POST /internal/apm/settings/custom_links";
            params?: import("zod").ZodObject<{
                body: import("zod").ZodObject<{
                    label: import("zod").ZodString;
                    url: import("zod").ZodString;
                    id: import("zod").ZodOptional<import("zod").ZodString>;
                    filters: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodObject<{
                        key: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"">, import("zod").ZodEnum<{
                            "service.name": "service.name";
                            "transaction.name": "transaction.name";
                            "transaction.type": "transaction.type";
                            "service.environment": "service.environment";
                        }>]>;
                        value: import("zod").ZodString;
                    }, import("zod/v4/core").$strip>>>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<void>;
        update: {
            endpoint: "PUT /internal/apm/settings/custom_links/{id}";
            params?: import("zod").ZodObject<{
                path: import("zod").ZodObject<{
                    id: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
                body: import("zod").ZodObject<{
                    label: import("zod").ZodString;
                    url: import("zod").ZodString;
                    id: import("zod").ZodOptional<import("zod").ZodString>;
                    filters: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodObject<{
                        key: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"">, import("zod").ZodEnum<{
                            "service.name": "service.name";
                            "transaction.name": "transaction.name";
                            "transaction.type": "transaction.type";
                            "service.environment": "service.environment";
                        }>]>;
                        value: import("zod").ZodString;
                    }, import("zod/v4/core").$strip>>>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<void>;
        delete: {
            endpoint: "DELETE /internal/apm/settings/custom_links/{id}";
            params?: import("zod").ZodObject<{
                path: import("zod").ZodObject<{
                    id: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./custom_links").DeleteCustomLinkResponse>;
    };
    anomalyDetection: {
        jobs: {
            endpoint: "GET /internal/apm/settings/anomaly-detection/jobs";
            params?: undefined;
        } & import("./types").WithResponse<import("./anomaly_detection").AnomalyDetectionJobsResponse>;
        createJobs: {
            endpoint: "POST /internal/apm/settings/anomaly-detection/jobs";
            params?: import("zod").ZodObject<{
                body: import("zod").ZodObject<{
                    environments: import("zod").ZodArray<import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./anomaly_detection").CreateAnomalyDetectionJobsResponse>;
        environments: {
            endpoint: "GET /internal/apm/settings/anomaly-detection/environments";
            params?: undefined;
        } & import("./types").WithResponse<import("./anomaly_detection").AnomalyDetectionEnvironmentsResponse>;
        updateToV3: {
            endpoint: "POST /internal/apm/settings/anomaly-detection/update_to_v3";
            params?: undefined;
        } & import("./types").WithResponse<import("./anomaly_detection").AnomalyDetectionUpdateToV3Response>;
    };
    mobile: {
        filters: {
            endpoint: "GET /internal/apm/services/{serviceName}/mobile/filters";
            params?: import("zod").ZodObject<{
                path: import("zod").ZodObject<{
                    serviceName: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
                query: import("zod").ZodObject<{
                    transactionType: import("zod").ZodOptional<import("zod").ZodString>;
                    kuery: import("zod").ZodString;
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./mobile").MobileFiltersRouteResponse>;
        mostUsedCharts: {
            endpoint: "GET /internal/apm/mobile-services/{serviceName}/most_used_charts";
            params?: import("zod").ZodObject<{
                path: import("zod").ZodObject<{
                    serviceName: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
                query: import("zod").ZodObject<{
                    transactionType: import("zod").ZodOptional<import("zod").ZodString>;
                    kuery: import("zod").ZodString;
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./mobile").MobileMostUsedChartsRouteResponse>;
        stats: {
            endpoint: "GET /internal/apm/mobile-services/{serviceName}/stats";
            params?: import("zod").ZodObject<{
                path: import("zod").ZodObject<{
                    serviceName: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
                query: import("zod").ZodObject<{
                    transactionType: import("zod").ZodOptional<import("zod").ZodString>;
                    kuery: import("zod").ZodString;
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                    offset: import("zod").ZodOptional<import("zod").ZodString>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./mobile").MobilePeriodStats>;
        locationStats: {
            endpoint: "GET /internal/apm/mobile-services/{serviceName}/location/stats";
            params?: import("zod").ZodObject<{
                path: import("zod").ZodObject<{
                    serviceName: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
                query: import("zod").ZodObject<{
                    locationField: import("zod").ZodOptional<import("zod").ZodString>;
                    kuery: import("zod").ZodString;
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                    offset: import("zod").ZodOptional<import("zod").ZodString>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./mobile").MobileLocationStats>;
        sessions: {
            endpoint: "GET /internal/apm/mobile-services/{serviceName}/transactions/charts/sessions";
            params?: import("zod").ZodObject<{
                path: import("zod").ZodObject<{
                    serviceName: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
                query: import("zod").ZodObject<{
                    transactionType: import("zod").ZodOptional<import("zod").ZodString>;
                    transactionName: import("zod").ZodOptional<import("zod").ZodString>;
                    kuery: import("zod").ZodString;
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                    offset: import("zod").ZodOptional<import("zod").ZodString>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./mobile").SessionsTimeseries>;
        httpRequests: {
            endpoint: "GET /internal/apm/mobile-services/{serviceName}/transactions/charts/http_requests";
            params?: import("zod").ZodObject<{
                path: import("zod").ZodObject<{
                    serviceName: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
                query: import("zod").ZodObject<{
                    transactionType: import("zod").ZodOptional<import("zod").ZodString>;
                    transactionName: import("zod").ZodOptional<import("zod").ZodString>;
                    kuery: import("zod").ZodString;
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                    offset: import("zod").ZodOptional<import("zod").ZodString>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./mobile").HttpRequestsTimeseries>;
        termsByField: {
            endpoint: "GET /internal/apm/mobile-services/{serviceName}/terms";
            params?: import("zod").ZodObject<{
                path: import("zod").ZodObject<{
                    serviceName: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
                query: import("zod").ZodObject<{
                    size: import("zod").ZodCoercedNumber<unknown>;
                    fieldName: import("zod").ZodString;
                    kuery: import("zod").ZodString;
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./mobile").MobileTermsByFieldRouteResponse>;
        mainStatistics: {
            endpoint: "GET /internal/apm/mobile-services/{serviceName}/main_statistics";
            params?: import("zod").ZodObject<{
                path: import("zod").ZodObject<{
                    serviceName: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
                query: import("zod").ZodObject<{
                    field: import("zod").ZodString;
                    kuery: import("zod").ZodString;
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./mobile").MobileMainStatisticsResponse>;
        detailedStatistics: {
            endpoint: "GET /internal/apm/mobile-services/{serviceName}/detailed_statistics";
            params?: import("zod").ZodObject<{
                path: import("zod").ZodObject<{
                    serviceName: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
                query: import("zod").ZodObject<{
                    field: import("zod").ZodString;
                    fieldValues: import("zod").ZodPipe<import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<any, string>>, import("zod").ZodArray<import("zod").ZodString>>;
                    kuery: import("zod").ZodString;
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    offset: import("zod").ZodOptional<import("zod").ZodString>;
                    environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./mobile").MobileDetailedStatisticsResponse>;
    };
    mobileErrors: {
        httpErrorRate: {
            endpoint: "GET /internal/apm/mobile-services/{serviceName}/error/http_error_rate";
            params?: import("zod").ZodObject<{
                path: import("zod").ZodObject<{
                    serviceName: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
                query: import("zod").ZodObject<{
                    environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                    kuery: import("zod").ZodString;
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    offset: import("zod").ZodOptional<import("zod").ZodString>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./mobile_errors").MobileHttpErrorsTimeseries>;
        detailedStatistics: {
            endpoint: "POST /internal/apm/mobile-services/{serviceName}/errors/groups/detailed_statistics";
            params?: import("zod").ZodObject<{
                path: import("zod").ZodObject<{
                    serviceName: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
                query: import("zod").ZodObject<{
                    environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                    kuery: import("zod").ZodString;
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    offset: import("zod").ZodOptional<import("zod").ZodString>;
                    numBuckets: import("zod").ZodCoercedNumber<unknown>;
                }, import("zod/v4/core").$strip>;
                body: import("zod").ZodObject<{
                    groupIds: import("zod").ZodPipe<import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<any, string>>, import("zod").ZodArray<import("zod").ZodString>>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./mobile_errors").MobileErrorGroupPeriodsResponse>;
        errorTerms: {
            endpoint: "GET /internal/apm/mobile-services/{serviceName}/error_terms";
            params?: import("zod").ZodObject<{
                path: import("zod").ZodObject<{
                    serviceName: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
                query: import("zod").ZodObject<{
                    kuery: import("zod").ZodString;
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                    size: import("zod").ZodCoercedNumber<unknown>;
                    fieldName: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./mobile_errors").MobileErrorTermsRouteResponse>;
        mainStatistics: {
            endpoint: "GET /internal/apm/mobile-services/{serviceName}/errors/groups/main_statistics";
            params?: import("zod").ZodObject<{
                path: import("zod").ZodObject<{
                    serviceName: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
                query: import("zod").ZodObject<{
                    sortField: import("zod").ZodOptional<import("zod").ZodString>;
                    sortDirection: import("zod").ZodOptional<import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"asc">, import("zod").ZodLiteral<"desc">]>>;
                    environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                    kuery: import("zod").ZodString;
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./mobile_errors").MobileErrorsMainStatisticsRouteResponse>;
    };
    mobileCrashes: {
        distribution: {
            endpoint: "GET /internal/apm/mobile-services/{serviceName}/crashes/distribution";
            params?: import("zod").ZodObject<{
                path: import("zod").ZodObject<{
                    serviceName: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
                query: import("zod").ZodObject<{
                    groupId: import("zod").ZodOptional<import("zod").ZodString>;
                    environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                    kuery: import("zod").ZodString;
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    offset: import("zod").ZodOptional<import("zod").ZodString>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./mobile_crashes").CrashDistributionResponse>;
        mainStatistics: {
            endpoint: "GET /internal/apm/mobile-services/{serviceName}/crashes/groups/main_statistics";
            params?: import("zod").ZodObject<{
                path: import("zod").ZodObject<{
                    serviceName: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
                query: import("zod").ZodObject<{
                    sortField: import("zod").ZodOptional<import("zod").ZodString>;
                    sortDirection: import("zod").ZodOptional<import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"asc">, import("zod").ZodLiteral<"desc">]>>;
                    environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                    kuery: import("zod").ZodString;
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./mobile_crashes").CrashMainStatisticsRouteResponse>;
        detailedStatistics: {
            endpoint: "POST /internal/apm/mobile-services/{serviceName}/crashes/groups/detailed_statistics";
            params?: import("zod").ZodObject<{
                path: import("zod").ZodObject<{
                    serviceName: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
                query: import("zod").ZodObject<{
                    environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                    kuery: import("zod").ZodString;
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    offset: import("zod").ZodOptional<import("zod").ZodString>;
                    numBuckets: import("zod").ZodCoercedNumber<unknown>;
                }, import("zod/v4/core").$strip>;
                body: import("zod").ZodObject<{
                    groupIds: import("zod").ZodPipe<import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<any, string>>, import("zod").ZodArray<import("zod").ZodString>>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./mobile_crashes").MobileCrashesGroupPeriodsResponse>;
    };
    fleet: {
        hasApmPolicies: {
            endpoint: "GET /internal/apm/fleet/has_apm_policies";
            params?: undefined;
        } & import("./types").WithResponse<import("./fleet").HasApmPoliciesResponse>;
        agents: {
            endpoint: "GET /internal/apm/fleet/agents";
            params?: undefined;
        } & import("./types").WithResponse<import("./fleet").FleetAgentResponse>;
        saveSchema: {
            endpoint: "POST /api/apm/fleet/apm_server_schema 2023-10-31";
            params?: import("zod").ZodObject<{
                body: import("zod").ZodObject<{
                    schema: import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodUnknown>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<void>;
        unsupportedSchema: {
            endpoint: "GET /internal/apm/fleet/apm_server_schema/unsupported";
            params?: undefined;
        } & import("./types").WithResponse<import("./fleet").UnsupportedApmServerSchemaResponse>;
        javaAgentVersions: {
            endpoint: "GET /internal/apm/fleet/java_agent_versions";
            params?: undefined;
        } & import("./types").WithResponse<import("./fleet").JavaAgentVersionsResponse>;
    };
    storageExplorer: {
        storageExplorer: {
            endpoint: "GET /internal/apm/storage_explorer";
            params?: import("zod").ZodObject<{
                query: import("zod").ZodObject<{
                    indexLifecyclePhase: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.All>, import("zod").ZodLiteral<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.Hot>, import("zod").ZodLiteral<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.Warm>, import("zod").ZodLiteral<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.Cold>, import("zod").ZodLiteral<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.Frozen>]>;
                    probability: import("zod").ZodCoercedNumber<unknown>;
                    environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                    kuery: import("zod").ZodString;
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./storage_explorer").StorageExplorerRouteResponse>;
        serviceDetails: {
            endpoint: "GET /internal/apm/services/{serviceName}/storage_details";
            params?: import("zod").ZodObject<{
                path: import("zod").ZodObject<{
                    serviceName: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
                query: import("zod").ZodObject<{
                    indexLifecyclePhase: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.All>, import("zod").ZodLiteral<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.Hot>, import("zod").ZodLiteral<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.Warm>, import("zod").ZodLiteral<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.Cold>, import("zod").ZodLiteral<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.Frozen>]>;
                    probability: import("zod").ZodCoercedNumber<unknown>;
                    environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                    kuery: import("zod").ZodString;
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./storage_explorer").StorageDetailsResponse>;
        chart: {
            endpoint: "GET /internal/apm/storage_chart";
            params?: import("zod").ZodObject<{
                query: import("zod").ZodObject<{
                    indexLifecyclePhase: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.All>, import("zod").ZodLiteral<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.Hot>, import("zod").ZodLiteral<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.Warm>, import("zod").ZodLiteral<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.Cold>, import("zod").ZodLiteral<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.Frozen>]>;
                    probability: import("zod").ZodCoercedNumber<unknown>;
                    environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                    kuery: import("zod").ZodString;
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./storage_explorer").StorageChartRouteResponse>;
        privileges: {
            endpoint: "GET /internal/apm/storage_explorer/privileges";
            params?: undefined;
        } & import("./types").WithResponse<import("./storage_explorer").StorageExplorerPrivilegesResponse>;
        summaryStats: {
            endpoint: "GET /internal/apm/storage_explorer_summary_stats";
            params?: import("zod").ZodObject<{
                query: import("zod").ZodObject<{
                    indexLifecyclePhase: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.All>, import("zod").ZodLiteral<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.Hot>, import("zod").ZodLiteral<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.Warm>, import("zod").ZodLiteral<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.Cold>, import("zod").ZodLiteral<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.Frozen>]>;
                    probability: import("zod").ZodCoercedNumber<unknown>;
                    environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                    kuery: import("zod").ZodString;
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./storage_explorer").StorageExplorerSummaryStatisticsResponse>;
        isCrossCluster: {
            endpoint: "GET /internal/apm/storage_explorer/is_cross_cluster_search";
            params?: undefined;
        } & import("./types").WithResponse<import("./storage_explorer").StorageExplorerIsCrossClusterResponse>;
        getServices: {
            endpoint: "GET /internal/apm/storage_explorer/get_services";
            params?: import("zod").ZodObject<{
                query: import("zod").ZodObject<{
                    indexLifecyclePhase: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.All>, import("zod").ZodLiteral<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.Hot>, import("zod").ZodLiteral<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.Warm>, import("zod").ZodLiteral<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.Cold>, import("zod").ZodLiteral<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.Frozen>]>;
                    environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                    kuery: import("zod").ZodString;
                    start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                    end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./storage_explorer").StorageExplorerGetServicesResponse>;
    };
    sourceMaps: {
        list: {
            endpoint: "GET /api/apm/sourcemaps 2023-10-31";
            params?: import("zod").ZodObject<{
                query: import("zod").ZodOptional<import("zod").ZodObject<{
                    page: import("zod").ZodOptional<import("zod").ZodCoercedNumber<unknown>>;
                    perPage: import("zod").ZodOptional<import("zod").ZodCoercedNumber<unknown>>;
                }, import("zod/v4/core").$strip>>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./source_maps").ListSourceMapArtifactsResponse | undefined>;
        delete: {
            endpoint: "DELETE /api/apm/sourcemaps/{id} 2023-10-31";
            params?: import("zod").ZodObject<{
                path: import("zod").ZodObject<{
                    id: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<void>;
        migrateFleetArtifacts: {
            endpoint: "POST /internal/apm/sourcemaps/migrate_fleet_artifacts";
            params?: undefined;
        } & import("./types").WithResponse<void>;
    };
    agentConfiguration: {
        list: {
            endpoint: "GET /api/apm/settings/agent-configuration 2023-10-31";
            params?: undefined;
        } & import("./types").WithResponse<import("./agent_configuration").ListAgentConfigurationsResponse>;
        getSingle: {
            endpoint: "GET /api/apm/settings/agent-configuration/view 2023-10-31";
            params?: import("zod").ZodObject<{
                query: import("zod").ZodOptional<import("zod").ZodObject<{
                    name: import("zod").ZodOptional<import("zod").ZodString>;
                    environment: import("zod").ZodOptional<import("zod").ZodString>;
                }, import("zod/v4/core").$strip>>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("@kbn/apm-common").AgentConfiguration>;
        delete: {
            endpoint: "DELETE /api/apm/settings/agent-configuration 2023-10-31";
            params?: import("zod").ZodObject<{
                body: import("zod").ZodObject<{
                    service: import("zod").ZodObject<{
                        name: import("zod").ZodOptional<import("zod").ZodString>;
                        environment: import("zod").ZodOptional<import("zod").ZodString>;
                    }, import("zod/v4/core").$strip>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./agent_configuration").DeleteAgentConfigurationResponse>;
        createOrUpdate: {
            endpoint: "PUT /api/apm/settings/agent-configuration 2023-10-31";
            params?: import("zod").ZodObject<{
                query: import("zod").ZodOptional<import("zod").ZodObject<{
                    overwrite: import("zod").ZodOptional<import("zod").ZodUnion<readonly [import("zod").ZodPipe<import("zod").ZodEnum<{
                        true: "true";
                        false: "false";
                    }>, import("zod").ZodTransform<boolean, "true" | "false">>, import("zod").ZodBoolean]> & import("@kbn/zod-helpers/v4/kbn_zod_types/kbn_zod_type").KbnZodType>;
                }, import("zod/v4/core").$strip>>;
                body: import("zod").ZodObject<{
                    agent_name: import("zod").ZodOptional<import("zod").ZodString>;
                    service: import("zod").ZodObject<{
                        name: import("zod").ZodOptional<import("zod").ZodString>;
                        environment: import("zod").ZodOptional<import("zod").ZodString>;
                    }, import("zod/v4/core").$strip>;
                    settings: import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodString>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<void>;
        search: {
            endpoint: "POST /api/apm/settings/agent-configuration/search 2023-10-31";
            params?: import("zod").ZodObject<{
                body: import("zod").ZodObject<{
                    service: import("zod").ZodObject<{
                        name: import("zod").ZodOptional<import("zod").ZodString>;
                        environment: import("zod").ZodOptional<import("zod").ZodString>;
                    }, import("zod/v4/core").$strip>;
                    etag: import("zod").ZodOptional<import("zod").ZodString>;
                    mark_as_applied_by_agent: import("zod").ZodOptional<import("zod").ZodBoolean>;
                    error: import("zod").ZodOptional<import("zod").ZodString>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./agent_configuration").SearchAgentConfigurationResponse>;
        listEnvironments: {
            endpoint: "GET /api/apm/settings/agent-configuration/environments 2023-10-31";
            params?: import("zod").ZodObject<{
                query: import("zod").ZodOptional<import("zod").ZodObject<{
                    serviceName: import("zod").ZodOptional<import("zod").ZodString>;
                }, import("zod/v4/core").$strip>>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./agent_configuration").ListAgentConfigurationEnvironmentsResponse>;
        agentName: {
            endpoint: "GET /api/apm/settings/agent-configuration/agent_name 2023-10-31";
            params?: import("zod").ZodObject<{
                query: import("zod").ZodObject<{
                    serviceName: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip> | undefined;
        } & import("./types").WithResponse<import("./agent_configuration").AgentConfigurationAgentNameResponse>;
    };
};
export type SharedAPMRouteRepository = BuildGroupedRepository<typeof routeDefinitions>;
