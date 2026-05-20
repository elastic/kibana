export declare const streamsRouteRepository: {
    "POST /api/streams/{streamName}/attachments/_bulk 2023-10-31": import("@kbn/server-route-repository-utils").ServerRoute<"POST /api/streams/{streamName}/attachments/_bulk 2023-10-31", import("zod").ZodObject<{
        path: import("zod").ZodObject<{
            streamName: import("zod").ZodString;
        }, import("zod/v4/core").$strip>;
        body: import("zod").ZodObject<{
            operations: import("zod").ZodArray<import("zod").ZodUnion<readonly [import("zod").ZodObject<{
                index: import("zod").ZodObject<{
                    id: import("zod").ZodString;
                    type: import("zod").ZodEnum<{
                        rule: "rule";
                        dashboard: "dashboard";
                        slo: "slo";
                    }>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip>, import("zod").ZodObject<{
                delete: import("zod").ZodObject<{
                    id: import("zod").ZodString;
                    type: import("zod").ZodEnum<{
                        rule: "rule";
                        dashboard: "dashboard";
                        slo: "slo";
                    }>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip>]>>;
        }, import("zod/v4/core").$strip>;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, import("./attachments/route").BulkUpdateAttachmentsResponse, undefined>;
    "DELETE /api/streams/{streamName}/attachments/{attachmentType}/{attachmentId} 2023-10-31": import("@kbn/server-route-repository-utils").ServerRoute<"DELETE /api/streams/{streamName}/attachments/{attachmentType}/{attachmentId} 2023-10-31", import("zod").ZodObject<{
        path: import("zod").ZodObject<{
            streamName: import("zod").ZodString;
            attachmentType: import("zod").ZodEnum<{
                rule: "rule";
                dashboard: "dashboard";
                slo: "slo";
            }>;
            attachmentId: import("zod").ZodString;
        }, import("zod/v4/core").$strip>;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, import("./attachments/route").UnlinkAttachmentResponse, undefined>;
    "PUT /api/streams/{streamName}/attachments/{attachmentType}/{attachmentId} 2023-10-31": import("@kbn/server-route-repository-utils").ServerRoute<"PUT /api/streams/{streamName}/attachments/{attachmentType}/{attachmentId} 2023-10-31", import("zod").ZodObject<{
        path: import("zod").ZodObject<{
            streamName: import("zod").ZodString;
            attachmentType: import("zod").ZodEnum<{
                rule: "rule";
                dashboard: "dashboard";
                slo: "slo";
            }>;
            attachmentId: import("zod").ZodString;
        }, import("zod/v4/core").$strip>;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, import("./attachments/route").LinkAttachmentResponse, undefined>;
    "GET /api/streams/{streamName}/attachments 2023-10-31": import("@kbn/server-route-repository-utils").ServerRoute<"GET /api/streams/{streamName}/attachments 2023-10-31", import("zod").ZodObject<{
        path: import("zod").ZodObject<{
            streamName: import("zod").ZodString;
        }, import("zod/v4/core").$strip>;
        query: import("zod").ZodOptional<import("zod").ZodObject<{
            query: import("zod").ZodOptional<import("zod").ZodString>;
            attachmentTypes: import("zod").ZodOptional<import("zod").ZodUnion<readonly [import("zod").ZodEnum<{
                rule: "rule";
                dashboard: "dashboard";
                slo: "slo";
            }>, import("zod").ZodArray<import("zod").ZodEnum<{
                rule: "rule";
                dashboard: "dashboard";
                slo: "slo";
            }>>]>>;
            tags: import("zod").ZodOptional<import("zod").ZodUnion<readonly [import("zod").ZodString, import("zod").ZodArray<import("zod").ZodString>]>>;
        }, import("zod/v4/core").$strip>>;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, import("./attachments/route").ListAttachmentsResponse, undefined>;
    "POST /api/streams/{name}/queries/_bulk 2023-10-31": import("@kbn/server-route-repository-utils").ServerRoute<"POST /api/streams/{name}/queries/_bulk 2023-10-31", import("zod").ZodObject<{
        path: import("zod").ZodObject<{
            name: import("zod").ZodString;
        }, import("zod/v4/core").$strip>;
        body: import("zod").ZodObject<{
            operations: import("zod").ZodArray<import("zod").ZodUnion<readonly [import("zod").ZodObject<{
                index: import("zod").ZodObject<{
                    title: import("zod").ZodString;
                    esql: import("zod").ZodType<import("@kbn/streams-schema").EsqlQuery, unknown, import("zod/v4/core").$ZodTypeInternals<import("@kbn/streams-schema").EsqlQuery, unknown>>;
                    severity_score: import("zod").ZodOptional<import("zod").ZodNumber>;
                    evidence: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString>>;
                    description: import("zod").ZodDefault<import("zod").ZodString>;
                    id: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip>, import("zod").ZodObject<{
                delete: import("zod").ZodObject<{
                    id: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip>]>>;
        }, import("zod/v4/core").$strip>;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, import("./sig_events/queries/route").BulkUpdateAssetsResponse, undefined>;
    "DELETE /api/streams/{name}/queries/{queryId} 2023-10-31": import("@kbn/server-route-repository-utils").ServerRoute<"DELETE /api/streams/{name}/queries/{queryId} 2023-10-31", import("zod").ZodObject<{
        path: import("zod").ZodObject<{
            name: import("zod").ZodString;
            queryId: import("zod").ZodString;
        }, import("zod/v4/core").$strip>;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, import("./sig_events/queries/route").DeleteQueryResponse, undefined>;
    "PUT /api/streams/{name}/queries/{queryId} 2023-10-31": import("@kbn/server-route-repository-utils").ServerRoute<"PUT /api/streams/{name}/queries/{queryId} 2023-10-31", import("zod").ZodObject<{
        path: import("zod").ZodObject<{
            name: import("zod").ZodString;
            queryId: import("zod").ZodString;
        }, import("zod/v4/core").$strip>;
        body: import("zod").ZodObject<{
            title: import("zod").ZodString;
            esql: import("zod").ZodType<import("@kbn/streams-schema").EsqlQuery, unknown, import("zod/v4/core").$ZodTypeInternals<import("@kbn/streams-schema").EsqlQuery, unknown>>;
            severity_score: import("zod").ZodOptional<import("zod").ZodNumber>;
            evidence: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString>>;
            description: import("zod").ZodDefault<import("zod").ZodString>;
        }, import("zod/v4/core").$strip>;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, import("./sig_events/queries/route").UpsertQueryResponse, undefined>;
    "GET /api/streams/{name}/queries 2023-10-31": import("@kbn/server-route-repository-utils").ServerRoute<"GET /api/streams/{name}/queries 2023-10-31", import("zod").ZodObject<{
        path: import("zod").ZodObject<{
            name: import("zod").ZodString;
        }, import("zod/v4/core").$strip>;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, import("./sig_events/queries/route").ListQueriesResponse, undefined>;
    "POST /api/streams/{name}/significant_events/_generate 2023-10-31": import("@kbn/server-route-repository-utils").ServerRoute<"POST /api/streams/{name}/significant_events/_generate 2023-10-31", import("zod").ZodObject<{
        path: import("zod").ZodObject<{
            name: import("zod").ZodString;
        }, import("zod/v4/core").$strip>;
        query: import("zod").ZodObject<{
            connectorId: import("zod").ZodOptional<import("zod").ZodString>;
            from: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<Date, string>>;
            to: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<Date, string>>;
            sampleDocsSize: import("zod").ZodOptional<import("zod").ZodNumber>;
        }, import("zod/v4/core").$strip>;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, import("@kbn/streams-schema").SignificantEventsGenerateResponse, undefined>;
    "POST /api/streams/{name}/significant_events/_preview 2023-10-31": import("@kbn/server-route-repository-utils").ServerRoute<"POST /api/streams/{name}/significant_events/_preview 2023-10-31", import("zod").ZodObject<{
        path: import("zod").ZodObject<{
            name: import("zod").ZodString;
        }, import("zod/v4/core").$strip>;
        query: import("zod").ZodObject<{
            from: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<Date, string>>;
            to: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<Date, string>>;
            bucketSize: import("zod").ZodString;
        }, import("zod/v4/core").$strip>;
        body: import("zod").ZodObject<{
            query: import("zod").ZodObject<{
                esql: import("zod").ZodObject<{
                    query: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip>;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, import("@kbn/streams-schema").SignificantEventsPreviewResponse, undefined>;
    "GET /api/streams/{name}/significant_events 2023-10-31": import("@kbn/server-route-repository-utils").ServerRoute<"GET /api/streams/{name}/significant_events 2023-10-31", import("zod").ZodObject<{
        path: import("zod").ZodObject<{
            name: import("zod").ZodString;
        }, import("zod/v4/core").$strip>;
        query: import("zod").ZodObject<{
            from: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<Date, string>>;
            to: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<Date, string>>;
            bucketSize: import("zod").ZodString;
            query: import("zod").ZodOptional<import("zod").ZodString>;
            searchMode: import("zod").ZodOptional<import("zod").ZodEnum<{
                keyword: "keyword";
                semantic: "semantic";
                hybrid: "hybrid";
            }>>;
        }, import("zod/v4/core").$strip>;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, import("@kbn/streams-schema").SignificantEventsGetResponse, undefined>;
    "POST /internal/streams/{name}/content/preview": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/streams/{name}/content/preview", import("zod").ZodObject<{
        path: import("zod").ZodObject<{
            name: import("zod").ZodString;
        }, import("zod/v4/core").$strip>;
        body: import("zod").ZodObject<{
            content: import("zod").ZodCustom<import("stream").Readable, import("stream").Readable>;
        }, import("zod/v4/core").$strip>;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, import("../../../../../packages/shared/kbn-content-packs-schema").ContentPack, undefined>;
    "POST /api/streams/{name}/content/import 2023-10-31": import("@kbn/server-route-repository-utils").ServerRoute<"POST /api/streams/{name}/content/import 2023-10-31", import("zod").ZodObject<{
        path: import("zod").ZodObject<{
            name: import("zod").ZodString;
        }, import("zod/v4/core").$strip>;
        body: import("zod").ZodObject<{
            include: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<import("../../../../../packages/shared/kbn-content-packs-schema").ContentPackIncludeAll | {
                objects: {
                    mappings: boolean;
                    queries: Array<{
                        id: string;
                    }>;
                    routing: Array<{
                        destination: string;
                    } & import("../../../../../packages/shared/kbn-content-packs-schema").ContentPackIncludedObjects>;
                };
            }, string>>;
            content: import("zod").ZodCustom<import("stream").Readable, import("stream").Readable>;
        }, import("zod/v4/core").$strip>;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, {
        acknowledged: boolean;
        result: {
            created: string[];
            updated: string[];
        };
    }, undefined>;
    "POST /api/streams/{name}/content/export 2023-10-31": import("@kbn/server-route-repository-utils").ServerRoute<"POST /api/streams/{name}/content/export 2023-10-31", import("zod").ZodObject<{
        path: import("zod").ZodObject<{
            name: import("zod").ZodString;
        }, import("zod/v4/core").$strip>;
        body: import("zod").ZodObject<{
            name: import("zod").ZodString;
            description: import("zod").ZodString;
            version: import("zod").ZodString;
            include: import("zod").ZodType<import("../../../../../packages/shared/kbn-content-packs-schema").ContentPackIncludedObjects, unknown, import("zod/v4/core").$ZodTypeInternals<import("../../../../../packages/shared/kbn-content-packs-schema").ContentPackIncludedObjects, unknown>>;
        }, import("zod/v4/core").$strip>;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, import("@kbn/core/server").IKibanaResponse<Buffer<ArrayBufferLike>>, undefined>;
    "PUT /api/streams/{name}/_query 2023-10-31": import("@kbn/server-route-repository-utils").ServerRoute<"PUT /api/streams/{name}/_query 2023-10-31", import("zod").ZodObject<{
        path: import("zod").ZodObject<{
            name: import("zod").ZodString;
        }, import("zod/v4/core").$strip>;
        body: import("zod").ZodObject<{
            query: import("zod").ZodObject<{
                esql: import("zod").ZodString;
            }, import("zod/v4/core").$strip>;
            field_descriptions: import("zod").ZodOptional<import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodString>>;
        }, import("zod/v4/core").$strip>;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, import("../lib/streams/client").UpsertStreamResponse, undefined>;
    "GET /api/streams/{name}/_query 2023-10-31": import("@kbn/server-route-repository-utils").ServerRoute<"GET /api/streams/{name}/_query 2023-10-31", import("zod").ZodObject<{
        path: import("zod").ZodObject<{
            name: import("zod").ZodString;
        }, import("zod/v4/core").$strip>;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, import("./streams/query/route").QueryStreamObjectGetResponse, undefined>;
    "PUT /api/streams/{name}/_ingest 2023-10-31": import("@kbn/server-route-repository-utils").ServerRoute<"PUT /api/streams/{name}/_ingest 2023-10-31", import("zod").ZodObject<{
        path: import("zod").ZodObject<{
            name: import("zod").ZodString;
        }, import("zod/v4/core").$strip>;
        body: import("zod").ZodObject<{
            ingest: import("zod").ZodType<import("@kbn/streams-schema").IngestUpsertRequest, unknown, import("zod/v4/core").$ZodTypeInternals<import("@kbn/streams-schema").IngestUpsertRequest, unknown>>;
        }, import("zod/v4/core").$strip>;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, import("../lib/streams/client").UpsertStreamResponse, undefined>;
    "GET /api/streams/{name}/_ingest 2023-10-31": import("@kbn/server-route-repository-utils").ServerRoute<"GET /api/streams/{name}/_ingest 2023-10-31", import("zod").ZodObject<{
        path: import("zod").ZodObject<{
            name: import("zod").ZodString;
        }, import("zod/v4/core").$strip>;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, {
        ingest: import("@kbn/streams-schema").IngestStream.all.Definition["ingest"];
    }, undefined>;
    "GET /internal/streams/_classic_status": {
        endpoint: "GET /internal/streams/_classic_status";
        handler: (options: import("./types").RouteDependencies & import("@kbn/server-route-repository-utils").DefaultRouteHandlerResources) => Promise<{
            can_manage: boolean;
        }>;
        security: import("@kbn/core/server").RouteSecurity;
    };
    "GET /api/streams/_status": {
        endpoint: "GET /api/streams/_status";
        handler: (options: import("./types").RouteDependencies & import("@kbn/server-route-repository-utils").DefaultRouteHandlerResources) => Promise<{
            logs: boolean | "conflict";
            'logs.otel': boolean | "conflict";
            'logs.ecs': boolean | "conflict";
            can_manage: boolean;
        }>;
        security: import("@kbn/core/server").RouteSecurity;
    };
    "POST /api/streams/_resync 2023-10-31": import("@kbn/server-route-repository-utils").ServerRoute<"POST /api/streams/_resync 2023-10-31", import("zod").ZodObject<{}, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, import("../lib/streams/client").ResyncStreamsResponse, undefined>;
    "POST /api/streams/{name}/_fork 2023-10-31": import("@kbn/server-route-repository-utils").ServerRoute<"POST /api/streams/{name}/_fork 2023-10-31", import("zod").ZodObject<{
        path: import("zod").ZodObject<{
            name: import("zod").ZodString;
        }, import("zod/v4/core").$strip>;
        body: import("zod").ZodObject<{
            stream: import("zod").ZodObject<{
                name: import("zod").ZodString;
            }, import("zod/v4/core").$strip>;
            where: import("zod").ZodType<import("@kbn/streamlang").Condition, unknown, import("zod/v4/core").$ZodTypeInternals<import("@kbn/streamlang").Condition, unknown>>;
            status: import("zod").ZodOptional<import("zod").ZodEnum<{
                disabled: "disabled";
                enabled: "enabled";
            }>>;
            draft: import("zod").ZodOptional<import("zod").ZodBoolean>;
        }, import("zod/v4/core").$strip>;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, {
        acknowledged: true;
    }, undefined>;
    "POST /api/streams/_disable 2023-10-31": import("@kbn/server-route-repository-utils").ServerRoute<"POST /api/streams/_disable 2023-10-31", import("zod").ZodObject<{}, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, import("../lib/streams/client").DisableStreamsResponse, undefined>;
    "POST /api/streams/_enable 2023-10-31": import("@kbn/server-route-repository-utils").ServerRoute<"POST /api/streams/_enable 2023-10-31", import("zod").ZodObject<{}, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, import("../lib/streams/client").EnableStreamsResponse, undefined>;
    "POST /internal/streams/_validate_classic_stream": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/streams/_validate_classic_stream", import("zod").ZodObject<{
        body: import("zod").ZodObject<{
            name: import("zod").ZodString;
            selectedTemplateName: import("zod").ZodString;
        }, import("zod/v4/core").$strip>;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, {
        isValid: boolean;
        errorType: "duplicate";
        conflictingIndexPattern?: undefined;
    } | {
        isValid: boolean;
        errorType: "higherPriority";
        conflictingIndexPattern: string;
    } | {
        isValid: boolean;
        errorType: null;
        conflictingIndexPattern?: undefined;
    }, undefined>;
    "POST /internal/streams/_create_classic": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/streams/_create_classic", import("zod").ZodObject<{
        body: import("zod").ZodObject<{
            name: import("zod").ZodString;
            description: import("zod").ZodOptional<import("zod").ZodString>;
            ingest: import("zod").ZodAny;
        }, import("zod/v4/core").$strip>;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, import("../lib/streams/client").UpsertStreamResponse, undefined>;
    "DELETE /api/streams/{name} 2023-10-31": import("@kbn/server-route-repository-utils").ServerRoute<"DELETE /api/streams/{name} 2023-10-31", import("zod").ZodObject<{
        path: import("zod").ZodObject<{
            name: import("zod").ZodString;
        }, import("zod/v4/core").$strip>;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, {
        acknowledged: true;
    }, undefined>;
    "PUT /api/streams/{name} 2023-10-31": import("@kbn/server-route-repository-utils").ServerRoute<"PUT /api/streams/{name} 2023-10-31", import("zod").ZodObject<{
        path: import("zod").ZodObject<{
            name: import("zod").ZodString;
        }, import("zod/v4/core").$strip>;
        body: import("zod").ZodType<import("@kbn/streams-schema").Streams.all.UpsertRequest, unknown, import("zod/v4/core").$ZodTypeInternals<import("@kbn/streams-schema").Streams.all.UpsertRequest, unknown>>;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, import("../lib/streams/client").UpsertStreamResponse, undefined>;
    "GET /api/streams 2023-10-31": import("@kbn/server-route-repository-utils").ServerRoute<"GET /api/streams 2023-10-31", import("zod").ZodObject<{}, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, {
        streams: import("@kbn/streams-schema").Streams.all.Definition[];
    }, undefined>;
    "GET /api/streams/{name} 2023-10-31": import("@kbn/server-route-repository-utils").ServerRoute<"GET /api/streams/{name} 2023-10-31", import("zod").ZodObject<{
        path: import("zod").ZodObject<{
            name: import("zod").ZodString;
        }, import("zod/v4/core").$strip>;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, import("@kbn/streams-schema").Streams.all.GetResponse, undefined>;
    "GET /internal/streams/doc_counts/failed": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/streams/doc_counts/failed", import("zod").ZodObject<{
        query: import("zod").ZodObject<{
            start: import("zod").ZodCoercedNumber<unknown>;
            end: import("zod").ZodCoercedNumber<unknown>;
            stream: import("zod").ZodOptional<import("zod").ZodString>;
        }, import("zod/v4/core").$strip>;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, import("../../common").StreamDocsStat[], undefined>;
    "GET /internal/streams/doc_counts/total": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/streams/doc_counts/total", import("zod").ZodObject<{
        query: import("zod").ZodOptional<import("zod").ZodObject<{
            stream: import("zod").ZodOptional<import("zod").ZodString>;
        }, import("zod/v4/core").$strip>>;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, import("../../common").StreamDocsStat[], undefined>;
    "GET /internal/streams/doc_counts/degraded": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/streams/doc_counts/degraded", import("zod").ZodObject<{
        query: import("zod").ZodOptional<import("zod").ZodObject<{
            stream: import("zod").ZodOptional<import("zod").ZodString>;
        }, import("zod/v4/core").$strip>>;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, import("../../common").StreamDocsStat[], undefined>;
    "POST /internal/sig_events/events": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/sig_events/events", import("zod").ZodObject<{
        body: import("zod").ZodArray<import("zod").ZodObject<{
            '@timestamp': import("zod").ZodISODateTime;
            created_at: import("zod").ZodISODateTime;
            event_id: import("zod").ZodString;
            discovery_id: import("zod").ZodString;
            discovery_slug: import("zod").ZodString;
            previous_event_id: import("zod").ZodOptional<import("zod").ZodString>;
            verdict: import("zod").ZodString;
            verdict_id: import("zod").ZodString;
            workflow_execution_id: import("zod").ZodString;
            rule_names: import("zod").ZodArray<import("zod").ZodString>;
            stream_names: import("zod").ZodArray<import("zod").ZodString>;
            title: import("zod").ZodString;
            summary: import("zod").ZodString;
            root_cause: import("zod").ZodString;
            criticality: import("zod").ZodNumber;
            confidence: import("zod").ZodNumber;
            recommended_action: import("zod").ZodString;
            impact: import("zod").ZodString;
            recommendations: import("zod").ZodArray<import("zod").ZodString>;
            dependency_edges: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodObject<{
                source: import("zod").ZodString;
                target: import("zod").ZodString;
                protocol: import("zod").ZodOptional<import("zod").ZodString>;
                exposure: import("zod").ZodOptional<import("zod").ZodString>;
            }, import("zod/v4/core").$strip>>>;
            infra_components: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodObject<{
                title: import("zod").ZodOptional<import("zod").ZodString>;
                workloads: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString>>;
                exposure: import("zod").ZodOptional<import("zod").ZodString>;
            }, import("zod/v4/core").$strip>>>;
            cause_kis: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodObject<{
                name: import("zod").ZodOptional<import("zod").ZodString>;
                stream_name: import("zod").ZodOptional<import("zod").ZodString>;
            }, import("zod/v4/core").$strip>>>;
            evidences: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodObject<{
                rule_name: import("zod").ZodOptional<import("zod").ZodString>;
                result: import("zod").ZodOptional<import("zod").ZodString>;
                description: import("zod").ZodOptional<import("zod").ZodString>;
                stream_name: import("zod").ZodOptional<import("zod").ZodString>;
                row_count: import("zod").ZodOptional<import("zod").ZodNumber>;
                collected_at: import("zod").ZodOptional<import("zod").ZodString>;
                esql_query: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodString>>;
                confirmed: import("zod").ZodOptional<import("zod").ZodBoolean>;
            }, import("zod/v4/core").$strip>>>;
            grouped_into: import("zod").ZodOptional<import("zod").ZodString>;
        }, import("zod/v4/core").$strip>>;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, import("@elastic/elasticsearch/lib/api/types").BulkResponse, undefined>;
    "GET /internal/sig_events/events": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/sig_events/events", import("zod").ZodObject<{
        query: import("zod").ZodObject<{
            from: import("zod").ZodOptional<import("zod").ZodISODateTime>;
            to: import("zod").ZodOptional<import("zod").ZodISODateTime>;
        }, import("zod/v4/core").$strip>;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, {
        hits: import("@kbn/streams-schema").SigEvent[];
    }, undefined>;
    "POST /internal/sig_events/verdicts": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/sig_events/verdicts", import("zod").ZodObject<{
        body: import("zod").ZodArray<import("zod").ZodObject<{
            '@timestamp': import("zod").ZodISODateTime;
            verdict: import("zod").ZodString;
            verdict_id: import("zod").ZodOptional<import("zod").ZodString>;
            discovery_id: import("zod").ZodString;
            discovery_slug: import("zod").ZodString;
            rule_names: import("zod").ZodArray<import("zod").ZodString>;
            stream_names: import("zod").ZodArray<import("zod").ZodString>;
            title: import("zod").ZodString;
            summary: import("zod").ZodString;
            root_cause: import("zod").ZodString;
            criticality: import("zod").ZodNumber;
            confidence: import("zod").ZodNumber;
            impact: import("zod").ZodOptional<import("zod").ZodString>;
            recommended_action: import("zod").ZodOptional<import("zod").ZodString>;
            recommendations: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString>>;
            verdict_summary: import("zod").ZodString;
            assessment_note: import("zod").ZodOptional<import("zod").ZodString>;
            conversation_id: import("zod").ZodOptional<import("zod").ZodString>;
            workflow_execution_id: import("zod").ZodOptional<import("zod").ZodString>;
            original_verdict: import("zod").ZodOptional<import("zod").ZodString>;
            verdict_source: import("zod").ZodOptional<import("zod").ZodString>;
            grouped_discovery_ids: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString>>;
            grouped_into: import("zod").ZodOptional<import("zod").ZodString>;
            dependency_edges: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodObject<{
                source: import("zod").ZodString;
                target: import("zod").ZodString;
                protocol: import("zod").ZodOptional<import("zod").ZodString>;
                exposure: import("zod").ZodOptional<import("zod").ZodString>;
            }, import("zod/v4/core").$strip>>>;
            infra_components: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodObject<{
                title: import("zod").ZodOptional<import("zod").ZodString>;
                workloads: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString>>;
                exposure: import("zod").ZodOptional<import("zod").ZodString>;
            }, import("zod/v4/core").$strip>>>;
            cause_kis: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodObject<{
                name: import("zod").ZodOptional<import("zod").ZodString>;
                stream_name: import("zod").ZodOptional<import("zod").ZodString>;
            }, import("zod/v4/core").$strip>>>;
            evidences: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodObject<{
                rule_name: import("zod").ZodOptional<import("zod").ZodString>;
                result: import("zod").ZodOptional<import("zod").ZodString>;
                description: import("zod").ZodOptional<import("zod").ZodString>;
                stream_name: import("zod").ZodOptional<import("zod").ZodString>;
                row_count: import("zod").ZodOptional<import("zod").ZodNumber>;
                collected_at: import("zod").ZodOptional<import("zod").ZodString>;
                esql_query: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodString>>;
                confirmed: import("zod").ZodOptional<import("zod").ZodBoolean>;
            }, import("zod/v4/core").$strip>>>;
        }, import("zod/v4/core").$strip>>;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, import("@elastic/elasticsearch/lib/api/types").BulkResponse, undefined>;
    "GET /internal/sig_events/verdicts": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/sig_events/verdicts", import("zod").ZodObject<{
        query: import("zod").ZodObject<{
            from: import("zod").ZodOptional<import("zod").ZodISODateTime>;
            to: import("zod").ZodOptional<import("zod").ZodISODateTime>;
        }, import("zod/v4/core").$strip>;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, {
        hits: import("@kbn/streams-schema").Verdict[];
    }, undefined>;
    "POST /internal/sig_events/discoveries": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/sig_events/discoveries", import("zod").ZodObject<{
        body: import("zod").ZodArray<import("zod").ZodObject<{
            '@timestamp': import("zod").ZodISODateTime;
            kind: import("zod").ZodString;
            discovery_id: import("zod").ZodString;
            discovery_slug: import("zod").ZodString;
            rule_names: import("zod").ZodArray<import("zod").ZodString>;
            stream_names: import("zod").ZodArray<import("zod").ZodString>;
            title: import("zod").ZodString;
            summary: import("zod").ZodString;
            root_cause: import("zod").ZodString;
            criticality: import("zod").ZodNumber;
            confidence: import("zod").ZodNumber;
            impact: import("zod").ZodString;
            detections: import("zod").ZodArray<import("zod").ZodObject<{
                detection_id: import("zod").ZodOptional<import("zod").ZodString>;
                rule_name: import("zod").ZodOptional<import("zod").ZodString>;
                rule_uuid: import("zod").ZodOptional<import("zod").ZodString>;
                stream_name: import("zod").ZodOptional<import("zod").ZodString>;
                change_point_type: import("zod").ZodOptional<import("zod").ZodString>;
                event_count: import("zod").ZodOptional<import("zod").ZodNumber>;
                detected_at: import("zod").ZodOptional<import("zod").ZodString>;
            }, import("zod/v4/core").$strip>>;
            dependency_edges: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodObject<{
                source: import("zod").ZodString;
                target: import("zod").ZodString;
                protocol: import("zod").ZodOptional<import("zod").ZodString>;
                exposure: import("zod").ZodOptional<import("zod").ZodString>;
            }, import("zod/v4/core").$strip>>>;
            infra_components: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodObject<{
                title: import("zod").ZodOptional<import("zod").ZodString>;
                workloads: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString>>;
                exposure: import("zod").ZodOptional<import("zod").ZodString>;
            }, import("zod/v4/core").$strip>>>;
            cause_kis: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodObject<{
                name: import("zod").ZodOptional<import("zod").ZodString>;
                stream_name: import("zod").ZodOptional<import("zod").ZodString>;
            }, import("zod/v4/core").$strip>>>;
            evidences: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodObject<{
                rule_name: import("zod").ZodOptional<import("zod").ZodString>;
                result: import("zod").ZodOptional<import("zod").ZodString>;
                description: import("zod").ZodOptional<import("zod").ZodString>;
                stream_name: import("zod").ZodOptional<import("zod").ZodString>;
                row_count: import("zod").ZodOptional<import("zod").ZodNumber>;
                collected_at: import("zod").ZodOptional<import("zod").ZodString>;
                esql_query: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodString>>;
                confirmed: import("zod").ZodOptional<import("zod").ZodBoolean>;
            }, import("zod/v4/core").$strip>>>;
            closes: import("zod").ZodOptional<import("zod").ZodString>;
            grouped_into: import("zod").ZodOptional<import("zod").ZodString>;
            grouped_discovery_ids: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString>>;
            grouping_rationale: import("zod").ZodOptional<import("zod").ZodString>;
            previous_discovery_id: import("zod").ZodOptional<import("zod").ZodString>;
            change_point_occurrence: import("zod").ZodOptional<import("zod").ZodString>;
            workflow_execution_id: import("zod").ZodOptional<import("zod").ZodString>;
            conversation_id: import("zod").ZodOptional<import("zod").ZodString>;
            closed_by_execution_id: import("zod").ZodOptional<import("zod").ZodString>;
        }, import("zod/v4/core").$strip>>;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, import("@elastic/elasticsearch/lib/api/types").BulkResponse, undefined>;
    "GET /internal/sig_events/discoveries": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/sig_events/discoveries", import("zod").ZodObject<{
        query: import("zod").ZodObject<{
            from: import("zod").ZodOptional<import("zod").ZodISODateTime>;
            to: import("zod").ZodOptional<import("zod").ZodISODateTime>;
        }, import("zod/v4/core").$strip>;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, {
        hits: import("@kbn/streams-schema").Discovery[];
    }, undefined>;
    "POST /internal/sig_events/detections": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/sig_events/detections", import("zod").ZodObject<{
        body: import("zod").ZodArray<import("zod").ZodObject<{
            '@timestamp': import("zod").ZodISODateTime;
            silent: import("zod").ZodBoolean;
            processed: import("zod").ZodBoolean;
            detection_id: import("zod").ZodOptional<import("zod").ZodString>;
            rule_uuid: import("zod").ZodString;
            rule_name: import("zod").ZodString;
            stream_name: import("zod").ZodOptional<import("zod").ZodString>;
            alert_count: import("zod").ZodOptional<import("zod").ZodNumber>;
            alert_index: import("zod").ZodOptional<import("zod").ZodString>;
            workflow_execution_id: import("zod").ZodOptional<import("zod").ZodString>;
            resolution_lookback_minutes: import("zod").ZodOptional<import("zod").ZodNumber>;
            peak_30m_alert_count: import("zod").ZodOptional<import("zod").ZodNumber>;
            detection_evidence: import("zod").ZodOptional<import("zod").ZodObject<{
                change_point_type: import("zod").ZodOptional<import("zod").ZodString>;
                p_value: import("zod").ZodOptional<import("zod").ZodNumber>;
            }, import("zod/v4/core").$strip>>;
            alert_samples: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodUnknown>>>;
            rules_activity: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodUnknown>>>;
        }, import("zod/v4/core").$strip>>;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, import("@elastic/elasticsearch/lib/api/types").BulkResponse, undefined>;
    "GET /internal/sig_events/detections": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/sig_events/detections", import("zod").ZodObject<{
        query: import("zod").ZodObject<{
            from: import("zod").ZodOptional<import("zod").ZodISODateTime>;
            to: import("zod").ZodOptional<import("zod").ZodISODateTime>;
            rule_uuid: import("zod").ZodOptional<import("zod").ZodUnion<readonly [import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<string[], string>>, import("zod").ZodArray<import("zod").ZodString>]>>;
            rule_name: import("zod").ZodOptional<import("zod").ZodString>;
        }, import("zod/v4/core").$strip>;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, {
        hits: import("@kbn/streams-schema").Detection[];
    }, undefined>;
    "POST /internal/streams/{streamName}/memory/_generate": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/streams/{streamName}/memory/_generate", import("zod").ZodObject<{
        path: import("zod").ZodObject<{
            streamName: import("zod").ZodString;
        }, import("zod/v4/core").$strip>;
        body: import("zod").ZodObject<{
            features: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodIntersection<import("zod").ZodObject<{
                id: import("zod").ZodString;
                stream_name: import("zod").ZodString;
                type: import("zod").ZodString;
                subtype: import("zod").ZodOptional<import("zod").ZodString>;
                title: import("zod").ZodOptional<import("zod").ZodString>;
                description: import("zod").ZodString;
                properties: import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodUnknown>;
                confidence: import("zod").ZodNumber;
                evidence: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString>>;
                evidence_doc_ids: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString>>;
                tags: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString>>;
                filter: import("zod").ZodOptional<import("zod").ZodType<import("@kbn/streamlang").Condition, unknown, import("zod/v4/core").$ZodTypeInternals<import("@kbn/streamlang").Condition, unknown>>>;
                meta: import("zod").ZodOptional<import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodUnknown>>;
            }, import("zod/v4/core").$strip>, import("zod").ZodObject<{
                uuid: import("zod").ZodString;
                status: import("zod").ZodEnum<{
                    active: "active";
                    expired: "expired";
                    stale: "stale";
                }>;
                last_seen: import("zod").ZodString;
                expires_at: import("zod").ZodOptional<import("zod").ZodString>;
                excluded_at: import("zod").ZodOptional<import("zod").ZodString>;
                run_id: import("zod").ZodOptional<import("zod").ZodString>;
            }, import("zod/v4/core").$strip>>>>;
            queries: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodObject<{
                type: import("zod").ZodEnum<{
                    stats: "stats";
                    match: "match";
                }>;
                title: import("zod").ZodString;
                esql: import("zod").ZodType<import("@kbn/streams-schema").EsqlQuery, unknown, import("zod/v4/core").$ZodTypeInternals<import("@kbn/streams-schema").EsqlQuery, unknown>>;
                severity_score: import("zod").ZodNumber;
                description: import("zod").ZodString;
                evidence: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString>>;
                replaces: import("zod").ZodOptional<import("zod").ZodString>;
                features: import("zod").ZodArray<import("zod").ZodObject<{
                    id: import("zod").ZodString;
                    run_id: import("zod").ZodOptional<import("zod").ZodString>;
                }, import("zod/v4/core").$strip>>;
            }, import("zod/v4/core").$strip>>>;
        }, import("zod/v4/core").$strip>;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, import("../lib/sig_events/memory_generation").MemoryGenerationResult & {
        skipped?: boolean;
        reason?: string;
        connectorId?: string;
    }, undefined>;
    "POST /internal/streams/memory/_consolidate": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/streams/memory/_consolidate", import("zod").ZodObject<{
        body: import("zod").ZodDiscriminatedUnion<[import("zod").ZodObject<{
            action: import("zod").ZodLiteral<"schedule">;
        }, import("zod/v4/core").$strip>, import("zod").ZodObject<{
            action: import("zod").ZodLiteral<"cancel">;
        }, import("zod/v4/core").$strip>, import("zod").ZodObject<{
            action: import("zod").ZodLiteral<"acknowledge">;
        }, import("zod/v4/core").$strip>], "action">;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, import("@kbn/streams-schema").TaskResult<import("../lib/tasks/task_definitions/memory_consolidation").MemoryConsolidationTaskResult>, undefined>;
    "POST /internal/streams/memory/_scrape_conversations": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/streams/memory/_scrape_conversations", import("zod").ZodObject<{
        body: import("zod").ZodDiscriminatedUnion<[import("zod").ZodObject<{
            action: import("zod").ZodLiteral<"schedule">;
        }, import("zod/v4/core").$strip>, import("zod").ZodObject<{
            action: import("zod").ZodLiteral<"cancel">;
        }, import("zod/v4/core").$strip>, import("zod").ZodObject<{
            action: import("zod").ZodLiteral<"acknowledge">;
        }, import("zod/v4/core").$strip>], "action">;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, import("@kbn/streams-schema").TaskResult<import("../lib/tasks/task_definitions/conversation_scraper").ConversationScraperTaskResult>, undefined>;
    "GET /internal/streams/memory/recent-changes": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/streams/memory/recent-changes", import("zod").ZodObject<{
        query: import("zod").ZodDefault<import("zod").ZodOptional<import("zod").ZodObject<{
            size: import("zod").ZodOptional<import("zod").ZodCoercedNumber<unknown>>;
        }, import("zod/v4/core").$strip>>>;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, {
        changes: import("../lib/memory").MemoryVersionRecord[];
    }, undefined>;
    "GET /internal/streams/memory/entries/{id}/history/{version}": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/streams/memory/entries/{id}/history/{version}", import("zod").ZodObject<{
        path: import("zod").ZodObject<{
            id: import("zod").ZodString;
            version: import("zod").ZodCoercedNumber<unknown>;
        }, import("zod/v4/core").$strip>;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, import("../lib/memory").MemoryVersionRecord, undefined>;
    "GET /internal/streams/memory/entries/{id}/history": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/streams/memory/entries/{id}/history", import("zod").ZodObject<{
        path: import("zod").ZodObject<{
            id: import("zod").ZodString;
        }, import("zod/v4/core").$strip>;
        query: import("zod").ZodDefault<import("zod").ZodOptional<import("zod").ZodObject<{
            size: import("zod").ZodOptional<import("zod").ZodCoercedNumber<unknown>>;
        }, import("zod/v4/core").$strip>>>;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, {
        history: import("../lib/memory").MemoryVersionRecord[];
    }, undefined>;
    "GET /internal/streams/memory/categories": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/streams/memory/categories", import("zod").ZodObject<{}, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, {
        tree: import("../lib/memory").MemoryCategoryNode[];
    }, undefined>;
    "POST /internal/streams/memory/search": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/streams/memory/search", import("zod").ZodObject<{
        body: import("zod").ZodObject<{
            query: import("zod").ZodString;
            tags: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString>>;
            categories: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString>>;
            references: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString>>;
            size: import("zod").ZodOptional<import("zod").ZodNumber>;
        }, import("zod/v4/core").$strip>;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, {
        results: import("../lib/memory").MemorySearchResult[];
    }, undefined>;
    "POST /internal/streams/memory/entries/{id}/rename": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/streams/memory/entries/{id}/rename", import("zod").ZodObject<{
        path: import("zod").ZodObject<{
            id: import("zod").ZodString;
        }, import("zod/v4/core").$strip>;
        body: import("zod").ZodObject<{
            new_name: import("zod").ZodString;
        }, import("zod/v4/core").$strip>;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, import("../lib/memory").MemoryEntry, undefined>;
    "DELETE /internal/streams/memory/entries/{id}": import("@kbn/server-route-repository-utils").ServerRoute<"DELETE /internal/streams/memory/entries/{id}", import("zod").ZodObject<{
        path: import("zod").ZodObject<{
            id: import("zod").ZodString;
        }, import("zod/v4/core").$strip>;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, {
        deleted: boolean;
    }, undefined>;
    "PUT /internal/streams/memory/entries/{id}": import("@kbn/server-route-repository-utils").ServerRoute<"PUT /internal/streams/memory/entries/{id}", import("zod").ZodObject<{
        path: import("zod").ZodObject<{
            id: import("zod").ZodString;
        }, import("zod/v4/core").$strip>;
        body: import("zod").ZodObject<{
            title: import("zod").ZodOptional<import("zod").ZodString>;
            content: import("zod").ZodOptional<import("zod").ZodString>;
            name: import("zod").ZodOptional<import("zod").ZodString>;
            categories: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString>>;
            references: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString>>;
            tags: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString>>;
            change_summary: import("zod").ZodOptional<import("zod").ZodString>;
        }, import("zod/v4/core").$strip>;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, import("../lib/memory").MemoryEntry, undefined>;
    "GET /internal/streams/memory/entries/by-name": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/streams/memory/entries/by-name", import("zod").ZodObject<{
        query: import("zod").ZodObject<{
            name: import("zod").ZodString;
        }, import("zod/v4/core").$strip>;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, import("../lib/memory").MemoryEntry, undefined>;
    "GET /internal/streams/memory/entries/{id}": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/streams/memory/entries/{id}", import("zod").ZodObject<{
        path: import("zod").ZodObject<{
            id: import("zod").ZodString;
        }, import("zod/v4/core").$strip>;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, import("../lib/memory").MemoryEntry, undefined>;
    "POST /internal/streams/memory/entries": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/streams/memory/entries", import("zod").ZodObject<{
        body: import("zod").ZodObject<{
            name: import("zod").ZodString;
            title: import("zod").ZodString;
            content: import("zod").ZodString;
            categories: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString>>;
            references: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString>>;
            tags: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString>>;
        }, import("zod/v4/core").$strip>;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, import("../lib/memory").MemoryEntry, undefined>;
    "PUT /internal/streams/_significant_events/settings": import("@kbn/server-route-repository-utils").ServerRoute<"PUT /internal/streams/_significant_events/settings", import("zod").ZodObject<{
        body: import("zod").ZodObject<{
            continuousKiExtraction: import("zod").ZodObject<{
                enabled: import("zod").ZodOptional<import("zod").ZodBoolean>;
                intervalHours: import("zod").ZodOptional<import("zod").ZodNumber>;
                excludedStreamPatterns: import("zod").ZodOptional<import("zod").ZodString>;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip>;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, {
        success: true;
    }, undefined>;
    "GET /internal/streams/_extraction/_eligible": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/streams/_extraction/_eligible", import("zod").ZodObject<{
        query: import("zod").ZodOptional<import("zod").ZodObject<{
            maxScheduledStreams: import("zod").ZodPipe<import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number | undefined, string>>, import("zod").ZodOptional<import("zod").ZodNumber>>;
            extractionIntervalHours: import("zod").ZodPipe<import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number | undefined, string>>, import("zod").ZodOptional<import("zod").ZodNumber>>;
            lookbackHours: import("zod").ZodPipe<import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number | undefined, string>>, import("zod").ZodOptional<import("zod").ZodNumber>>;
            excludedStreamPatterns: import("zod").ZodOptional<import("zod").ZodString>;
        }, import("zod/v4/core").$strip>>;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, import("./internal/sig_events/extraction/eligible_streams_route").EligibleStreamsResponse, undefined>;
    "POST /internal/streams/{streamName}/queries/_persist": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/streams/{streamName}/queries/_persist", import("zod").ZodObject<{
        path: import("zod").ZodObject<{
            streamName: import("zod").ZodString;
        }, import("zod/v4/core").$strip>;
        body: import("zod").ZodObject<{
            queries: import("zod").ZodArray<import("zod").ZodObject<{
                type: import("zod").ZodEnum<{
                    stats: "stats";
                    match: "match";
                }>;
                title: import("zod").ZodString;
                esql: import("zod").ZodType<import("@kbn/streams-schema").EsqlQuery, unknown, import("zod/v4/core").$ZodTypeInternals<import("@kbn/streams-schema").EsqlQuery, unknown>>;
                severity_score: import("zod").ZodNumber;
                description: import("zod").ZodString;
                evidence: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString>>;
                replaces: import("zod").ZodOptional<import("zod").ZodString>;
                features: import("zod").ZodArray<import("zod").ZodObject<{
                    id: import("zod").ZodString;
                    run_id: import("zod").ZodOptional<import("zod").ZodString>;
                }, import("zod/v4/core").$strip>>;
            }, import("zod/v4/core").$strip>>;
        }, import("zod/v4/core").$strip>;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, import("../lib/sig_events/persist_queries").PersistQueriesResult, undefined>;
    "POST /internal/streams/{streamName}/queries/_generate": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/streams/{streamName}/queries/_generate", import("zod").ZodObject<{
        path: import("zod").ZodObject<{
            streamName: import("zod").ZodString;
        }, import("zod/v4/core").$strip>;
        body: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodObject<{
            connectorId: import("zod").ZodOptional<import("zod").ZodString>;
            maxExistingQueriesForContext: import("zod").ZodOptional<import("zod").ZodNumber>;
        }, import("zod/v4/core").$strip>>>;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, import("@kbn/streams-schema").SignificantEventsQueriesGenerationResult & {
        connectorId: string;
    }, undefined>;
    "GET /internal/streams/_queries/_occurrences": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/streams/_queries/_occurrences", import("zod").ZodObject<{
        query: import("zod").ZodObject<{
            from: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<Date, string>>;
            to: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<Date, string>>;
            bucketSize: import("zod").ZodString;
            query: import("zod").ZodOptional<import("zod").ZodString>;
            streamNames: import("zod").ZodOptional<import("zod").ZodPreprocess<import("zod").ZodArray<import("zod").ZodString>>>;
        }, import("zod/v4/core").$strip>;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, import("@kbn/streams-schema").QueriesOccurrencesGetResponse, undefined>;
    "GET /internal/streams/_queries": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/streams/_queries", import("zod").ZodObject<{
        query: import("zod").ZodObject<{
            from: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<Date, string>>;
            to: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<Date, string>>;
            bucketSize: import("zod").ZodString;
            query: import("zod").ZodOptional<import("zod").ZodString>;
            streamNames: import("zod").ZodOptional<import("zod").ZodPreprocess<import("zod").ZodArray<import("zod").ZodString>>>;
            searchMode: import("zod").ZodOptional<import("zod").ZodEnum<{
                keyword: "keyword";
                semantic: "semantic";
                hybrid: "hybrid";
            }>>;
            page: import("zod").ZodOptional<import("zod").ZodCoercedNumber<unknown>>;
            perPage: import("zod").ZodOptional<import("zod").ZodCoercedNumber<unknown>>;
            status: import("zod").ZodOptional<import("zod").ZodPreprocess<import("zod").ZodArray<import("zod").ZodEnum<{
                active: "active";
                draft: "draft";
            }>>>>;
        }, import("zod/v4/core").$strip>;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, import("@kbn/streams-schema").QueriesGetResponse, undefined>;
    "POST /internal/streams/queries/_bulk_delete": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/streams/queries/_bulk_delete", import("zod").ZodObject<{
        body: import("zod").ZodObject<{
            queryIds: import("zod").ZodArray<import("zod").ZodString>;
        }, import("zod/v4/core").$strip>;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, {
        succeeded: number;
        failed: number;
        skipped: number;
    }, undefined>;
    "POST /internal/streams/queries/_demote": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/streams/queries/_demote", import("zod").ZodObject<{
        body: import("zod").ZodObject<{
            queryIds: import("zod").ZodArray<import("zod").ZodString>;
        }, import("zod/v4/core").$strip>;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, {
        demoted: number;
    }, undefined>;
    "POST /internal/streams/queries/_promote": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/streams/queries/_promote", import("zod").ZodObject<{
        body: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodObject<{
            queryIds: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString>>;
            minSeverityScore: import("zod").ZodOptional<import("zod").ZodNumber>;
        }, import("zod/v4/core").$strip>>>;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, {
        promoted: number;
        skipped_stats: number;
    }, undefined>;
    "GET /internal/streams/{streamName}/onboarding/_status": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/streams/{streamName}/onboarding/_status", import("zod").ZodObject<{
        path: import("zod").ZodObject<{
            streamName: import("zod").ZodString;
        }, import("zod/v4/core").$strip>;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, import("./internal/streams/onboarding/route").OnboardingTaskResult, undefined>;
    "POST /internal/streams/{streamName}/onboarding/_task": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/streams/{streamName}/onboarding/_task", import("zod").ZodObject<{
        path: import("zod").ZodObject<{
            streamName: import("zod").ZodString;
        }, import("zod/v4/core").$strip>;
        body: import("zod").ZodDiscriminatedUnion<[import("zod").ZodObject<{
            action: import("zod").ZodLiteral<"schedule">;
            from: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
            to: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
            steps: import("zod").ZodDefault<import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodEnum<typeof import("@kbn/streams-schema").OnboardingStep>>>>;
            connectors: import("zod").ZodOptional<import("zod").ZodObject<{
                features: import("zod").ZodOptional<import("zod").ZodString>;
                queries: import("zod").ZodOptional<import("zod").ZodString>;
            }, import("zod/v4/core").$strip>>;
        }, import("zod/v4/core").$strip>, import("zod").ZodObject<{
            action: import("zod").ZodLiteral<"cancel">;
        }, import("zod/v4/core").$strip>, import("zod").ZodObject<{
            action: import("zod").ZodLiteral<"acknowledge">;
        }, import("zod/v4/core").$strip>], "action">;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, import("./internal/streams/onboarding/route").OnboardingTaskResult, undefined>;
    "DELETE /internal/streams/_tasks/{id}": import("@kbn/server-route-repository-utils").ServerRoute<"DELETE /internal/streams/_tasks/{id}", import("zod").ZodObject<{
        path: import("zod").ZodObject<{
            id: import("zod").ZodString;
        }, import("zod/v4/core").$strip>;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, {
        acknowledged: boolean;
    }, undefined>;
    "GET /internal/streams/_tasks": {
        endpoint: "GET /internal/streams/_tasks";
        handler: (options: import("./types").RouteDependencies & import("@kbn/server-route-repository-utils").DefaultRouteHandlerResources) => Promise<{
            tasks: Array<{
                id: string;
                created_at: string;
            }>;
        }>;
        security: import("@kbn/core/server").RouteSecurity;
    };
    "POST /internal/streams/_insights/_bulk": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/streams/_insights/_bulk", import("zod").ZodObject<{
        body: import("zod").ZodObject<{
            operations: import("zod").ZodArray<import("zod").ZodUnion<readonly [import("zod").ZodObject<{
                index: import("zod").ZodIntersection<import("zod").ZodObject<{
                    title: import("zod").ZodString;
                    description: import("zod").ZodString;
                    impact: import("zod").ZodEnum<{
                        low: "low";
                        medium: "medium";
                        high: "high";
                        critical: "critical";
                    }>;
                    evidence: import("zod").ZodArray<import("zod").ZodObject<{
                        stream_name: import("zod").ZodString;
                        query_title: import("zod").ZodString;
                        event_count: import("zod").ZodNumber;
                    }, import("zod/v4/core").$strip>>;
                    recommendations: import("zod").ZodArray<import("zod").ZodString>;
                }, import("zod/v4/core").$strip>, import("zod").ZodObject<{
                    id: import("zod").ZodString;
                    generated_at: import("zod").ZodString;
                    impact_level: import("zod").ZodNumber;
                    user_evaluation: import("zod").ZodOptional<import("zod").ZodEnum<{
                        helpful: "helpful";
                        not_helpful: "not_helpful";
                    }>>;
                }, import("zod/v4/core").$strip>>;
            }, import("zod/v4/core").$strip>, import("zod").ZodObject<{
                delete: import("zod").ZodObject<{
                    id: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip>]>>;
        }, import("zod/v4/core").$strip>;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, {
        acknowledged: boolean;
    }, undefined>;
    "DELETE /internal/streams/_insights/{id}": import("@kbn/server-route-repository-utils").ServerRoute<"DELETE /internal/streams/_insights/{id}", import("zod").ZodObject<{
        path: import("zod").ZodObject<{
            id: import("zod").ZodString;
        }, import("zod/v4/core").$strip>;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, {
        acknowledged: boolean;
    }, undefined>;
    "PUT /internal/streams/_insights/{id}": import("@kbn/server-route-repository-utils").ServerRoute<"PUT /internal/streams/_insights/{id}", import("zod").ZodObject<{
        path: import("zod").ZodObject<{
            id: import("zod").ZodString;
        }, import("zod/v4/core").$strip>;
        body: import("zod").ZodIntersection<import("zod").ZodObject<{
            title: import("zod").ZodString;
            description: import("zod").ZodString;
            impact: import("zod").ZodEnum<{
                low: "low";
                medium: "medium";
                high: "high";
                critical: "critical";
            }>;
            evidence: import("zod").ZodArray<import("zod").ZodObject<{
                stream_name: import("zod").ZodString;
                query_title: import("zod").ZodString;
                event_count: import("zod").ZodNumber;
            }, import("zod/v4/core").$strip>>;
            recommendations: import("zod").ZodArray<import("zod").ZodString>;
        }, import("zod/v4/core").$strip>, import("zod").ZodObject<{
            impact_level: import("zod").ZodNumber;
            generated_at: import("zod").ZodString;
            user_evaluation: import("zod").ZodOptional<import("zod").ZodEnum<{
                helpful: "helpful";
                not_helpful: "not_helpful";
            }>>;
        }, import("zod/v4/core").$strip>>;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, {
        insight: import("@kbn/streams-schema").Insight;
    }, undefined>;
    "GET /internal/streams/_insights/{id}": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/streams/_insights/{id}", import("zod").ZodObject<{
        path: import("zod").ZodObject<{
            id: import("zod").ZodString;
        }, import("zod/v4/core").$strip>;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, {
        insight: import("@kbn/streams-schema").Insight;
    }, undefined>;
    "GET /internal/streams/_insights": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/streams/_insights", import("zod").ZodObject<{
        query: import("zod").ZodObject<{
            impact: import("zod").ZodOptional<import("zod").ZodUnion<readonly [import("zod").ZodEnum<{
                low: "low";
                medium: "medium";
                high: "high";
                critical: "critical";
            }>, import("zod").ZodArray<import("zod").ZodEnum<{
                low: "low";
                medium: "medium";
                high: "high";
                critical: "critical";
            }>>]>>;
        }, import("zod/v4/core").$strip>;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, {
        insights: import("@kbn/streams-schema").Insight[];
        total: number;
    }, undefined>;
    "POST /internal/streams/_insights/_status": {
        endpoint: "POST /internal/streams/_insights/_status";
        handler: (options: import("./types").RouteDependencies & import("@kbn/server-route-repository-utils").DefaultRouteHandlerResources) => Promise<import("./internal/sig_events/insights/route").InsightsTaskResult>;
        security: import("@kbn/core/server").RouteSecurity;
    };
    "POST /internal/streams/_insights/_task": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/streams/_insights/_task", import("zod").ZodObject<{
        body: import("zod").ZodDiscriminatedUnion<[import("zod").ZodObject<{
            action: import("zod").ZodLiteral<"schedule">;
            streamNames: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString>>;
            connectorId: import("zod").ZodOptional<import("zod").ZodString>;
        }, import("zod/v4/core").$strip>, import("zod").ZodObject<{
            action: import("zod").ZodLiteral<"cancel">;
        }, import("zod/v4/core").$strip>, import("zod").ZodObject<{
            action: import("zod").ZodLiteral<"acknowledge">;
        }, import("zod/v4/core").$strip>], "action">;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, import("./internal/sig_events/insights/route").InsightsTaskResult, undefined>;
    "GET /internal/streams/{streamName}/features/_should_identify": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/streams/{streamName}/features/_should_identify", import("zod").ZodObject<{
        path: import("zod").ZodObject<{
            streamName: import("zod").ZodString;
        }, import("zod/v4/core").$strip>;
        query: import("zod").ZodObject<{
            thresholdHours: import("zod").ZodCoercedNumber<unknown>;
        }, import("zod/v4/core").$strip>;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, import("../lib/sig_events/features/should_identify_features").ShouldIdentifyFeaturesResult, undefined>;
    "POST /internal/streams/{streamName}/features/_identify/computed": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/streams/{streamName}/features/_identify/computed", import("zod").ZodObject<{
        path: import("zod").ZodObject<{
            streamName: import("zod").ZodString;
        }, import("zod/v4/core").$strip>;
        body: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodObject<{
            start: import("zod").ZodOptional<import("zod").ZodNumber>;
            end: import("zod").ZodOptional<import("zod").ZodNumber>;
            runId: import("zod").ZodOptional<import("zod").ZodString>;
            featureTtlDays: import("zod").ZodOptional<import("zod").ZodNumber>;
        }, import("zod/v4/core").$strip>>>;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, {
        computedFeatures: ({
            id: string;
            stream_name: string;
            type: string;
            description: string;
            properties: Record<string, unknown>;
            confidence: number;
            subtype?: string | undefined;
            title?: string | undefined;
            evidence?: string[] | undefined;
            evidence_doc_ids?: string[] | undefined;
            tags?: string[] | undefined;
            filter?: import("@kbn/streamlang").Condition | undefined;
            meta?: Record<string, unknown> | undefined;
        } & {
            uuid: string;
            status: "active" | "expired" | "stale";
            last_seen: string;
            expires_at?: string | undefined;
            excluded_at?: string | undefined;
            run_id?: string | undefined;
        })[];
        computedFeaturesCount: number;
    }, undefined>;
    "POST /internal/streams/{streamName}/features/_identify/inferred": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/streams/{streamName}/features/_identify/inferred", import("zod").ZodObject<{
        path: import("zod").ZodObject<{
            streamName: import("zod").ZodString;
        }, import("zod/v4/core").$strip>;
        body: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodObject<{
            connectorId: import("zod").ZodOptional<import("zod").ZodString>;
            start: import("zod").ZodOptional<import("zod").ZodNumber>;
            end: import("zod").ZodOptional<import("zod").ZodNumber>;
            runId: import("zod").ZodOptional<import("zod").ZodString>;
            iteration: import("zod").ZodOptional<import("zod").ZodNumber>;
            featureTtlDays: import("zod").ZodOptional<import("zod").ZodNumber>;
            sampleSize: import("zod").ZodOptional<import("zod").ZodNumber>;
            entityFilteredRatio: import("zod").ZodOptional<import("zod").ZodNumber>;
            diverseRatio: import("zod").ZodOptional<import("zod").ZodNumber>;
            maxEntityFilters: import("zod").ZodOptional<import("zod").ZodNumber>;
            maxExcludedFeaturesInPrompt: import("zod").ZodOptional<import("zod").ZodNumber>;
            maxPreviouslyIdentifiedFeatures: import("zod").ZodOptional<import("zod").ZodNumber>;
            diverseOffset: import("zod").ZodOptional<import("zod").ZodNumber>;
        }, import("zod/v4/core").$strip>>>;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, {
        connectorId: string;
        hasDocuments: boolean;
        docsCount: number;
        docIds: string[];
        discoveredFeatures: import("@kbn/streams-schema").Feature[];
        iterationResult: import("@kbn/streams-schema").IterationResult;
        nextDiverseOffset: number;
    }, undefined>;
    "POST /internal/streams/{name}/features/_task": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/streams/{name}/features/_task", import("zod").ZodObject<{
        path: import("zod").ZodObject<{
            name: import("zod").ZodString;
        }, import("zod/v4/core").$strip>;
        body: import("zod").ZodDiscriminatedUnion<[import("zod").ZodObject<{
            action: import("zod").ZodLiteral<"schedule">;
            from: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<Date, string>>;
            to: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<Date, string>>;
        }, import("zod/v4/core").$strip>, import("zod").ZodObject<{
            action: import("zod").ZodLiteral<"cancel">;
        }, import("zod/v4/core").$strip>, import("zod").ZodObject<{
            action: import("zod").ZodLiteral<"acknowledge">;
        }, import("zod/v4/core").$strip>], "action">;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, import("./internal/sig_events/features/route").FeaturesIdentificationTaskResult, undefined>;
    "GET /internal/streams/{name}/features/_status": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/streams/{name}/features/_status", import("zod").ZodObject<{
        path: import("zod").ZodObject<{
            name: import("zod").ZodString;
        }, import("zod/v4/core").$strip>;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, import("./internal/sig_events/features/route").FeaturesIdentificationTaskResult, undefined>;
    "POST /internal/streams/features/_bulk": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/streams/features/_bulk", import("zod").ZodObject<{
        body: import("zod").ZodObject<{
            operations: import("zod").ZodArray<import("zod").ZodUnion<readonly [import("zod").ZodObject<{
                delete: import("zod").ZodObject<{
                    id: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip>, import("zod").ZodObject<{
                exclude: import("zod").ZodObject<{
                    id: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip>, import("zod").ZodObject<{
                restore: import("zod").ZodObject<{
                    id: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip>]>>;
        }, import("zod/v4/core").$strip>;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, {
        succeeded: number;
        failed: number;
        skipped: number;
    }, undefined>;
    "POST /internal/streams/{name}/features/_bulk": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/streams/{name}/features/_bulk", import("zod").ZodObject<{
        path: import("zod").ZodObject<{
            name: import("zod").ZodString;
        }, import("zod/v4/core").$strip>;
        body: import("zod").ZodObject<{
            operations: import("zod").ZodArray<import("zod").ZodUnion<readonly [import("zod").ZodObject<{
                index: import("zod").ZodObject<{
                    feature: import("zod").ZodIntersection<import("zod").ZodObject<{
                        id: import("zod").ZodString;
                        stream_name: import("zod").ZodString;
                        type: import("zod").ZodString;
                        subtype: import("zod").ZodOptional<import("zod").ZodString>;
                        title: import("zod").ZodOptional<import("zod").ZodString>;
                        description: import("zod").ZodString;
                        properties: import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodUnknown>;
                        confidence: import("zod").ZodNumber;
                        evidence: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString>>;
                        evidence_doc_ids: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString>>;
                        tags: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString>>;
                        filter: import("zod").ZodOptional<import("zod").ZodType<import("@kbn/streamlang").Condition, unknown, import("zod/v4/core").$ZodTypeInternals<import("@kbn/streamlang").Condition, unknown>>>;
                        meta: import("zod").ZodOptional<import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodUnknown>>;
                    }, import("zod/v4/core").$strip>, import("zod").ZodObject<{
                        uuid: import("zod").ZodString;
                        status: import("zod").ZodEnum<{
                            active: "active";
                            expired: "expired";
                            stale: "stale";
                        }>;
                        last_seen: import("zod").ZodString;
                        expires_at: import("zod").ZodOptional<import("zod").ZodString>;
                        excluded_at: import("zod").ZodOptional<import("zod").ZodString>;
                        run_id: import("zod").ZodOptional<import("zod").ZodString>;
                    }, import("zod/v4/core").$strip>>;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip>, import("zod").ZodObject<{
                delete: import("zod").ZodObject<{
                    id: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip>, import("zod").ZodObject<{
                exclude: import("zod").ZodObject<{
                    id: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip>, import("zod").ZodObject<{
                restore: import("zod").ZodObject<{
                    id: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
            }, import("zod/v4/core").$strip>]>>;
        }, import("zod/v4/core").$strip>;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, {
        acknowledged: boolean;
    }, undefined>;
    "GET /internal/streams/_features": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/streams/_features", import("zod").ZodObject<{
        query: import("zod").ZodOptional<import("zod").ZodObject<{
            query: import("zod").ZodOptional<import("zod").ZodString>;
            search_mode: import("zod").ZodOptional<import("zod").ZodOptional<import("zod").ZodEnum<{
                keyword: "keyword";
                semantic: "semantic";
                hybrid: "hybrid";
            }>>>;
            include_excluded: import("zod").ZodOptional<import("zod").ZodUnion<readonly [import("zod").ZodPipe<import("zod").ZodEnum<{
                true: "true";
                false: "false";
            }>, import("zod").ZodTransform<boolean, "true" | "false">>, import("zod").ZodBoolean]> & import("@kbn/zod-helpers/v4/kbn_zod_types/kbn_zod_type").KbnZodType>;
        }, import("zod/v4/core").$strip>>;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, {
        features: import("@kbn/streams-schema").Feature[];
    }, undefined>;
    "GET /internal/streams/{name}/features": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/streams/{name}/features", import("zod").ZodObject<{
        path: import("zod").ZodObject<{
            name: import("zod").ZodString;
        }, import("zod/v4/core").$strip>;
        query: import("zod").ZodOptional<import("zod").ZodObject<{
            query: import("zod").ZodOptional<import("zod").ZodString>;
            search_mode: import("zod").ZodOptional<import("zod").ZodOptional<import("zod").ZodEnum<{
                keyword: "keyword";
                semantic: "semantic";
                hybrid: "hybrid";
            }>>>;
            include_excluded: import("zod").ZodOptional<import("zod").ZodUnion<readonly [import("zod").ZodPipe<import("zod").ZodEnum<{
                true: "true";
                false: "false";
            }>, import("zod").ZodTransform<boolean, "true" | "false">>, import("zod").ZodBoolean]> & import("@kbn/zod-helpers/v4/kbn_zod_types/kbn_zod_type").KbnZodType>;
        }, import("zod/v4/core").$strip>>;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, {
        features: import("@kbn/streams-schema").Feature[];
    }, undefined>;
    "DELETE /internal/streams/{name}/features/{uuid}": import("@kbn/server-route-repository-utils").ServerRoute<"DELETE /internal/streams/{name}/features/{uuid}", import("zod").ZodObject<{
        path: import("zod").ZodObject<{
            name: import("zod").ZodString;
            uuid: import("zod").ZodString;
        }, import("zod/v4/core").$strip>;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, {
        acknowledged: boolean;
    }, undefined>;
    "POST /internal/streams/{name}/features": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/streams/{name}/features", import("zod").ZodObject<{
        path: import("zod").ZodObject<{
            name: import("zod").ZodString;
        }, import("zod/v4/core").$strip>;
        body: import("zod").ZodIntersection<import("zod").ZodObject<{
            id: import("zod").ZodString;
            stream_name: import("zod").ZodString;
            type: import("zod").ZodString;
            subtype: import("zod").ZodOptional<import("zod").ZodString>;
            title: import("zod").ZodOptional<import("zod").ZodString>;
            description: import("zod").ZodString;
            properties: import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodUnknown>;
            confidence: import("zod").ZodNumber;
            evidence: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString>>;
            evidence_doc_ids: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString>>;
            tags: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString>>;
            filter: import("zod").ZodOptional<import("zod").ZodType<import("@kbn/streamlang").Condition, unknown, import("zod/v4/core").$ZodTypeInternals<import("@kbn/streamlang").Condition, unknown>>>;
            meta: import("zod").ZodOptional<import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodUnknown>>;
        }, import("zod/v4/core").$strip>, import("zod").ZodObject<{
            uuid: import("zod").ZodOptional<import("zod").ZodString>;
        }, import("zod/v4/core").$strip>>;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, {
        acknowledged: boolean;
    }, undefined>;
    "POST /internal/streams/{name}/_description_generation/_task": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/streams/{name}/_description_generation/_task", import("zod").ZodObject<{
        path: import("zod").ZodObject<{
            name: import("zod").ZodString;
        }, import("zod/v4/core").$strip>;
        body: import("zod").ZodDiscriminatedUnion<[import("zod").ZodObject<{
            action: import("zod").ZodLiteral<"schedule">;
            from: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<Date, string>>;
            to: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<Date, string>>;
            connectorId: import("zod").ZodOptional<import("zod").ZodString>;
        }, import("zod/v4/core").$strip>, import("zod").ZodObject<{
            action: import("zod").ZodLiteral<"cancel">;
        }, import("zod/v4/core").$strip>, import("zod").ZodObject<{
            action: import("zod").ZodLiteral<"acknowledge">;
        }, import("zod/v4/core").$strip>], "action">;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, import("./internal/sig_events/description_generation/route").DescriptionGenerationTaskResult, undefined>;
    "GET /internal/streams/{name}/_description_generation/_status": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/streams/{name}/_description_generation/_status", import("zod").ZodObject<{
        path: import("zod").ZodObject<{
            name: import("zod").ZodString;
        }, import("zod/v4/core").$strip>;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, import("./internal/sig_events/description_generation/route").DescriptionGenerationTaskResult, undefined>;
    "GET /internal/streams/{streamName}/attachments/_suggestions": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/streams/{streamName}/attachments/_suggestions", import("zod").ZodObject<{
        path: import("zod").ZodObject<{
            streamName: import("zod").ZodString;
        }, import("zod/v4/core").$strip>;
        query: import("zod").ZodOptional<import("zod").ZodObject<{
            query: import("zod").ZodOptional<import("zod").ZodString>;
            attachmentTypes: import("zod").ZodOptional<import("zod").ZodUnion<readonly [import("zod").ZodEnum<{
                rule: "rule";
                dashboard: "dashboard";
                slo: "slo";
            }>, import("zod").ZodArray<import("zod").ZodEnum<{
                rule: "rule";
                dashboard: "dashboard";
                slo: "slo";
            }>>]>>;
            tags: import("zod").ZodOptional<import("zod").ZodUnion<readonly [import("zod").ZodString, import("zod").ZodArray<import("zod").ZodString>]>>;
        }, import("zod/v4/core").$strip>>;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, import("./internal/attachments/route").SuggestAttachmentsResponse, undefined>;
    "GET /internal/streams/connectors/{connectorId}": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/streams/connectors/{connectorId}", import("zod").ZodObject<{
        path: import("zod").ZodObject<{
            connectorId: import("zod").ZodString;
        }, import("zod/v4/core").$strip>;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, import("@kbn/inference-common").InferenceConnector, undefined>;
    "GET /internal/streams/ingest/processor_suggestions": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/streams/ingest/processor_suggestions", import("zod").ZodObject<{}, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, import("../../common").ProcessorSuggestionsResponse, undefined>;
    "GET /internal/streams/_significant_events": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/streams/_significant_events", import("zod").ZodObject<{
        query: import("zod").ZodObject<{
            from: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<Date, string>>;
            to: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<Date, string>>;
            bucketSize: import("zod").ZodString;
            query: import("zod").ZodOptional<import("zod").ZodString>;
            streamNames: import("zod").ZodOptional<import("zod").ZodUnion<readonly [import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<string[], string>>, import("zod").ZodArray<import("zod").ZodString>]>>;
            searchMode: import("zod").ZodOptional<import("zod").ZodEnum<{
                keyword: "keyword";
                semantic: "semantic";
                hybrid: "hybrid";
            }>>;
        }, import("zod/v4/core").$strip>;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, import("@kbn/streams-schema").SignificantEventsGetResponse, undefined>;
    "POST /internal/streams/{name}/significant_events/_task": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/streams/{name}/significant_events/_task", import("zod").ZodObject<{
        path: import("zod").ZodObject<{
            name: import("zod").ZodString;
        }, import("zod/v4/core").$strip>;
        body: import("zod").ZodDiscriminatedUnion<[import("zod").ZodObject<{
            action: import("zod").ZodLiteral<"schedule">;
            from: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<Date, string>>;
            to: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<Date, string>>;
        }, import("zod/v4/core").$strip>, import("zod").ZodObject<{
            action: import("zod").ZodLiteral<"cancel">;
        }, import("zod/v4/core").$strip>, import("zod").ZodObject<{
            action: import("zod").ZodLiteral<"acknowledge">;
        }, import("zod/v4/core").$strip>], "action">;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, import("@kbn/streams-schema").SignificantEventsQueriesGenerationTaskResult, undefined>;
    "GET /internal/streams/{name}/significant_events/_status": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/streams/{name}/significant_events/_status", import("zod").ZodObject<{
        path: import("zod").ZodObject<{
            name: import("zod").ZodString;
        }, import("zod/v4/core").$strip>;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, import("@kbn/streams-schema").SignificantEventsQueriesGenerationTaskResult, undefined>;
    "DELETE /internal/streams/_prompts": import("@kbn/server-route-repository-utils").ServerRoute<"DELETE /internal/streams/_prompts", import("zod").ZodObject<{}, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, {
        success: boolean;
    }, undefined>;
    "GET /internal/streams/_prompts": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/streams/_prompts", import("zod").ZodObject<{}, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, Readonly<{
        featurePromptOverride?: string | undefined;
        significantEventsPromptOverride?: string | undefined;
        descriptionPromptOverride?: string | undefined;
        systemsPromptOverride?: string | undefined;
    } & {}>, undefined>;
    "PUT /internal/streams/_prompts": import("@kbn/server-route-repository-utils").ServerRoute<"PUT /internal/streams/_prompts", import("zod").ZodObject<{
        body: import("zod").ZodObject<{
            featurePromptOverride: import("zod").ZodOptional<import("zod").ZodString>;
            significantEventsPromptOverride: import("zod").ZodOptional<import("zod").ZodString>;
            descriptionPromptOverride: import("zod").ZodOptional<import("zod").ZodString>;
        }, import("zod/v4/core").$strip>;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, {
        results: import("../lib/sig_events/saved_objects/prompts_config").PromptsConfigAttributes;
    }, undefined>;
    "GET /internal/streams/{name}/time_series/_count": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/streams/{name}/time_series/_count", import("zod").ZodObject<{
        path: import("zod").ZodObject<{
            name: import("zod").ZodString;
        }, import("zod/v4/core").$strip>;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, {
        timeSeriesCount: null;
    } | {
        timeSeriesCount: number;
    }, undefined>;
    "GET /internal/streams/failure_store/default_retention": {
        endpoint: "GET /internal/streams/failure_store/default_retention";
        handler: (options: import("./types").RouteDependencies & import("@kbn/server-route-repository-utils").DefaultRouteHandlerResources) => Promise<{
            default_retention: string | undefined;
        }>;
        security: import("@kbn/core/server").RouteSecurity;
    };
    "GET /internal/streams/{name}/failure_store/stats": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/streams/{name}/failure_store/stats", import("zod").ZodObject<{
        path: import("zod").ZodObject<{
            name: import("zod").ZodString;
        }, import("zod/v4/core").$strip>;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, {
        stats: null;
    } | {
        stats: import("@kbn/streams-schema").FailureStoreStatsResponse;
    }, undefined>;
    "GET /internal/streams/{name}/processing/_failure_store_samples": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/streams/{name}/processing/_failure_store_samples", import("zod").ZodObject<{
        path: import("zod").ZodObject<{
            name: import("zod").ZodString;
        }, import("zod/v4/core").$strip>;
        query: import("zod").ZodOptional<import("zod").ZodObject<{
            size: import("zod").ZodOptional<import("zod").ZodCoercedNumber<unknown>>;
            start: import("zod").ZodOptional<import("zod").ZodString>;
            end: import("zod").ZodOptional<import("zod").ZodString>;
        }, import("zod/v4/core").$strip>>;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, import("./internal/streams/processing/failure_store_samples_handler").FailureStoreSamplesResponse, undefined>;
    "POST /internal/streams/{name}/processing/_suggestions/date": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/streams/{name}/processing/_suggestions/date", import("zod").ZodObject<{
        path: import("zod").ZodObject<{
            name: import("zod").ZodString;
        }, import("zod/v4/core").$strip>;
        body: import("zod").ZodObject<{
            dates: import("zod").ZodArray<import("zod").ZodUnknown>;
        }, import("zod/v4/core").$strip>;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, {
        formats: string[];
    }, undefined>;
    "POST /internal/streams/{name}/processing/_suggestions/dissect": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/streams/{name}/processing/_suggestions/dissect", import("zod").ZodObject<{
        path: import("zod").ZodObject<{
            name: import("zod").ZodString;
        }, import("zod/v4/core").$strip>;
        body: import("zod").ZodObject<{
            connector_id: import("zod").ZodString;
            field_name: import("zod").ZodString;
            sample_messages: import("zod").ZodArray<import("zod").ZodString>;
        }, import("zod/v4/core").$strip>;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, import("rxjs").Observable<{
        dissectProcessor: Awaited<ReturnType<typeof import("./internal/streams/processing/dissect_suggestions_handler").handleProcessingDissectSuggestions>> | null;
    } & {
        type: "dissect_suggestion";
    }>, undefined>;
    "POST /internal/streams/{name}/processing/_suggestions/grok": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/streams/{name}/processing/_suggestions/grok", import("zod").ZodObject<{
        path: import("zod").ZodObject<{
            name: import("zod").ZodString;
        }, import("zod/v4/core").$strip>;
        body: import("zod").ZodObject<{
            connector_id: import("zod").ZodString;
            field_name: import("zod").ZodString;
            sample_messages: import("zod").ZodArray<import("zod").ZodString>;
        }, import("zod/v4/core").$strip>;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, import("rxjs").Observable<{
        grokProcessor: Awaited<ReturnType<typeof import("./internal/streams/processing/grok_suggestions_handler").handleProcessingGrokSuggestions>> | null;
    } & {
        type: "grok_suggestion";
    }>, undefined>;
    "POST /internal/streams/{name}/processing/_simulate": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/streams/{name}/processing/_simulate", import("zod").ZodObject<{
        path: import("zod").ZodObject<{
            name: import("zod").ZodString;
        }, import("zod/v4/core").$strip>;
        body: import("zod").ZodObject<{
            processing: import("zod").ZodObject<{
                steps: import("zod").ZodArray<import("zod").ZodType<import("@kbn/streamlang/types/streamlang").StreamlangStep, unknown, import("zod/v4/core").$ZodTypeInternals<import("@kbn/streamlang/types/streamlang").StreamlangStep, unknown>>>;
            }, import("zod/v4/core").$strip>;
            documents: import("zod").ZodArray<import("zod").ZodType<import("@kbn/streams-schema").FlattenRecord, unknown, import("zod/v4/core").$ZodTypeInternals<import("@kbn/streams-schema").FlattenRecord, unknown>>>;
            detected_fields: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodType<(import("@elastic/elasticsearch/lib/api/types").MappingBooleanProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingMatchOnlyTextProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingTextProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingVersionProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingWildcardProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingDateNanosProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingDateProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingIpProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingGeoPointProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingByteNumberProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingDoubleNumberProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingFloatNumberProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingHalfFloatNumberProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingIntegerNumberProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingLongNumberProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingShortNumberProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingUnsignedLongNumberProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | ({
                description: string;
                type?: never;
                format?: never;
            } & {
                name: string;
            }) | ({
                type: "system";
                description?: string;
            } & {
                name: string;
            }), unknown, import("zod/v4/core").$ZodTypeInternals<(import("@elastic/elasticsearch/lib/api/types").MappingBooleanProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingMatchOnlyTextProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingTextProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingVersionProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingWildcardProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingDateNanosProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingDateProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingIpProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingGeoPointProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingByteNumberProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingDoubleNumberProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingFloatNumberProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingHalfFloatNumberProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingIntegerNumberProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingLongNumberProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingShortNumberProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingUnsignedLongNumberProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | ({
                description: string;
                type?: never;
                format?: never;
            } & {
                name: string;
            }) | ({
                type: "system";
                description?: string;
            } & {
                name: string;
            }), unknown>>>>;
        }, import("zod/v4/core").$strip>;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, import("@kbn/streams-schema").ProcessingSimulationResponse, undefined>;
    "GET /internal/streams/lifecycle/_snapshot_repositories": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/streams/lifecycle/_snapshot_repositories", import("zod").ZodObject<{}, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, {
        repositories: Array<{
            name: string;
            type: string;
        }>;
    }, undefined>;
    "POST /internal/streams/lifecycle/_policy": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/streams/lifecycle/_policy", import("zod").ZodObject<{
        body: import("zod").ZodObject<{
            name: import("zod").ZodString;
            phases: import("zod").ZodObject<{
                hot: import("zod").ZodOptional<import("zod").ZodObject<{
                    min_age: import("zod").ZodOptional<import("zod").ZodString>;
                    actions: import("zod").ZodOptional<import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodAny>>;
                }, import("zod/v4/core").$loose>>;
                warm: import("zod").ZodOptional<import("zod").ZodObject<{
                    min_age: import("zod").ZodOptional<import("zod").ZodString>;
                    actions: import("zod").ZodOptional<import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodAny>>;
                }, import("zod/v4/core").$loose>>;
                cold: import("zod").ZodOptional<import("zod").ZodObject<{
                    min_age: import("zod").ZodOptional<import("zod").ZodString>;
                    actions: import("zod").ZodOptional<import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodAny>>;
                }, import("zod/v4/core").$loose>>;
                frozen: import("zod").ZodOptional<import("zod").ZodObject<{
                    min_age: import("zod").ZodOptional<import("zod").ZodString>;
                    actions: import("zod").ZodOptional<import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodAny>>;
                }, import("zod/v4/core").$loose>>;
                delete: import("zod").ZodOptional<import("zod").ZodObject<{
                    min_age: import("zod").ZodOptional<import("zod").ZodString>;
                    actions: import("zod").ZodOptional<import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodAny>>;
                }, import("zod/v4/core").$loose>>;
            }, import("zod/v4/core").$strip>;
            meta: import("zod").ZodOptional<import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodAny>>;
            deprecated: import("zod").ZodOptional<import("zod").ZodBoolean>;
            source_policy_name: import("zod").ZodOptional<import("zod").ZodString>;
        }, import("zod/v4/core").$strip>;
        query: import("zod").ZodObject<{
            allow_overwrite: import("zod").ZodDefault<import("zod").ZodOptional<import("zod").ZodUnion<readonly [import("zod").ZodPipe<import("zod").ZodEnum<{
                true: "true";
                false: "false";
            }>, import("zod").ZodTransform<boolean, "true" | "false">>, import("zod").ZodBoolean]> & import("@kbn/zod-helpers/v4/kbn_zod_types/kbn_zod_type").KbnZodType>>;
        }, import("zod/v4/core").$strip>;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, {
        acknowledged: boolean;
    }, undefined>;
    "GET /internal/streams/lifecycle/_policies": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/streams/lifecycle/_policies", import("zod").ZodObject<{}, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, import("@kbn/streams-schema").IlmPolicyWithUsage[], undefined>;
    "GET /internal/streams/{name}/lifecycle/_explain": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/streams/{name}/lifecycle/_explain", import("zod").ZodObject<{
        path: import("zod").ZodObject<{
            name: import("zod").ZodString;
        }, import("zod/v4/core").$strip>;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, import("@elastic/elasticsearch/lib/api/types").IlmExplainLifecycleResponse, undefined>;
    "GET /internal/streams/{name}/lifecycle/_stats": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/streams/{name}/lifecycle/_stats", import("zod").ZodObject<{
        path: import("zod").ZodObject<{
            name: import("zod").ZodString;
        }, import("zod/v4/core").$strip>;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, {
        phases: undefined;
        policy_missing: boolean;
    } | {
        phases: import("@kbn/streams-schema").IlmPolicyPhases;
        policy_missing: boolean;
    }, undefined>;
    "POST /internal/streams/{name}/schema/fields_conflicts": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/streams/{name}/schema/fields_conflicts", import("zod").ZodObject<{
        path: import("zod").ZodObject<{
            name: import("zod").ZodString;
        }, import("zod/v4/core").$strip>;
        body: import("zod").ZodObject<{
            field_definitions: import("zod").ZodArray<import("zod").ZodType<(import("@elastic/elasticsearch/lib/api/types").MappingBooleanProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingMatchOnlyTextProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingTextProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingVersionProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingWildcardProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingDateNanosProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingDateProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingIpProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingGeoPointProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingByteNumberProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingDoubleNumberProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingFloatNumberProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingHalfFloatNumberProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingIntegerNumberProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingLongNumberProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingShortNumberProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingUnsignedLongNumberProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | ({
                description: string;
                type?: never;
                format?: never;
            } & {
                name: string;
            }) | ({
                type: "system";
                description?: string;
            } & {
                name: string;
            }), unknown, import("zod/v4/core").$ZodTypeInternals<(import("@elastic/elasticsearch/lib/api/types").MappingBooleanProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingMatchOnlyTextProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingTextProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingVersionProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingWildcardProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingDateNanosProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingDateProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingIpProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingGeoPointProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingByteNumberProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingDoubleNumberProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingFloatNumberProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingHalfFloatNumberProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingIntegerNumberProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingLongNumberProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingShortNumberProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingUnsignedLongNumberProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | ({
                description: string;
                type?: never;
                format?: never;
            } & {
                name: string;
            }) | ({
                type: "system";
                description?: string;
            } & {
                name: string;
            }), unknown>>>;
        }, import("zod/v4/core").$strip>;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, import("./internal/streams/schema/route").FieldsConflictsResponse, undefined>;
    "POST /internal/streams/{name}/schema/fields_simulation": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/streams/{name}/schema/fields_simulation", import("zod").ZodObject<{
        path: import("zod").ZodObject<{
            name: import("zod").ZodString;
        }, import("zod/v4/core").$strip>;
        body: import("zod").ZodObject<{
            field_definitions: import("zod").ZodArray<import("zod").ZodType<(import("@elastic/elasticsearch/lib/api/types").MappingBooleanProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingMatchOnlyTextProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingTextProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingVersionProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingWildcardProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingDateNanosProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingDateProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingIpProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingGeoPointProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingByteNumberProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingDoubleNumberProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingFloatNumberProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingHalfFloatNumberProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingIntegerNumberProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingLongNumberProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingShortNumberProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingUnsignedLongNumberProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | ({
                description: string;
                type?: never;
                format?: never;
            } & {
                name: string;
            }) | ({
                type: "system";
                description?: string;
            } & {
                name: string;
            }), unknown, import("zod/v4/core").$ZodTypeInternals<(import("@elastic/elasticsearch/lib/api/types").MappingBooleanProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingMatchOnlyTextProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingTextProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingVersionProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingWildcardProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingDateNanosProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingDateProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingIpProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingGeoPointProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingByteNumberProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingDoubleNumberProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingFloatNumberProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingHalfFloatNumberProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingIntegerNumberProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingLongNumberProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingShortNumberProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingUnsignedLongNumberProperty & {
                type: import("@kbn/streams-schema").FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | ({
                description: string;
                type?: never;
                format?: never;
            } & {
                name: string;
            }) | ({
                type: "system";
                description?: string;
            } & {
                name: string;
            }), unknown>>>;
        }, import("zod/v4/core").$strip>;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, {
        status: "unknown" | "success" | "failure";
        simulationError: string | null;
        documentsWithRuntimeFieldsApplied: import("@kbn/streams-schema/src/shared/record_types").DocumentWithIgnoredFields[] | null;
    }, undefined>;
    "GET /internal/streams/{name}/schema/unmapped_fields": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/streams/{name}/schema/unmapped_fields", import("zod").ZodObject<{
        path: import("zod").ZodObject<{
            name: import("zod").ZodString;
        }, import("zod/v4/core").$strip>;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, {
        unmappedFields: string[];
    }, undefined>;
    "POST /internal/streams/{name}/_restore_data_stream": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/streams/{name}/_restore_data_stream", import("zod").ZodObject<{
        path: import("zod").ZodObject<{
            name: import("zod").ZodString;
        }, import("zod/v4/core").$strip>;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, {
        acknowledged: true;
    }, undefined>;
    "GET /internal/streams/{name}/_store_stats": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/streams/{name}/_store_stats", import("zod").ZodObject<{
        path: import("zod").ZodObject<{
            name: import("zod").ZodString;
        }, import("zod/v4/core").$strip>;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, import("./internal/streams/management/store_stats_route").StreamStoreStat, undefined>;
    "POST /internal/streams/{name}/_suggest_processing_pipeline": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/streams/{name}/_suggest_processing_pipeline", import("zod").ZodObject<{
        path: import("zod").ZodObject<{
            name: import("zod").ZodString;
        }, import("zod/v4/core").$strip>;
        body: import("zod").ZodObject<{
            connector_id: import("zod").ZodString;
            documents: import("zod").ZodArray<import("zod").ZodType<import("@kbn/streams-schema").FlattenRecord, unknown, import("zod/v4/core").$ZodTypeInternals<import("@kbn/streams-schema").FlattenRecord, unknown>>>;
        }, import("zod/v4/core").$strip>;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, import("rxjs").Observable<{
        pipeline: import("@kbn/streams-ai").SuggestProcessingPipelineResult["pipeline"];
    } & {
        type: "suggested_processing_pipeline";
    }>, undefined>;
    "POST /internal/streams/{name}/_suggest_partitions": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/streams/{name}/_suggest_partitions", import("zod").ZodObject<{
        path: import("zod").ZodObject<{
            name: import("zod").ZodString;
        }, import("zod/v4/core").$strip>;
        body: import("zod").ZodObject<{
            connector_id: import("zod").ZodString;
            start: import("zod").ZodNumber;
            end: import("zod").ZodNumber;
            user_prompt: import("zod").ZodOptional<import("zod").ZodString>;
            existing_partitions: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodObject<{
                name: import("zod").ZodString;
                condition: import("zod").ZodType<import("@kbn/streamlang").Condition, unknown, import("zod/v4/core").$ZodTypeInternals<import("@kbn/streamlang").Condition, unknown>>;
            }, import("zod/v4/core").$strip>>>;
        }, import("zod/v4/core").$strip>;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, import("rxjs").Observable<import("@kbn/streams-ai/workflows/partition_stream").PartitionStreamResponse & {
        type: "suggested_partitions";
    }>, undefined>;
    "POST /internal/streams/{name}/_suggest_description": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/streams/{name}/_suggest_description", import("zod").ZodObject<{
        path: import("zod").ZodObject<{
            name: import("zod").ZodString;
        }, import("zod/v4/core").$strip>;
        body: import("zod").ZodObject<{
            connector_id: import("zod").ZodString;
            start: import("zod").ZodNumber;
            end: import("zod").ZodNumber;
        }, import("zod/v4/core").$strip>;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, {
        description: string;
    }, undefined>;
    "GET /internal/streams/{name}/_unmanaged_assets": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/streams/{name}/_unmanaged_assets", import("zod").ZodObject<{
        path: import("zod").ZodObject<{
            name: import("zod").ZodString;
        }, import("zod/v4/core").$strip>;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, import("../lib/streams/stream_crud").UnmanagedElasticsearchAssetDetails, undefined>;
    "POST /internal/streams/_bulk_get_summaries": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/streams/_bulk_get_summaries", import("zod").ZodObject<{
        body: import("zod").ZodObject<{
            names: import("zod").ZodArray<import("zod").ZodString>;
        }, import("zod/v4/core").$strip>;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, {
        summaries: import("../../common").StreamSummary[];
    }, undefined>;
    "GET /internal/streams/_resolve_index": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/streams/_resolve_index", import("zod").ZodObject<{
        query: import("zod").ZodObject<{
            index: import("zod").ZodString;
        }, import("zod/v4/core").$strip>;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, {
        stream?: import("@kbn/streams-schema").Streams.all.Definition;
    }, undefined>;
    "GET /internal/streams/{name}/_details": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/streams/{name}/_details", import("zod").ZodObject<{
        path: import("zod").ZodObject<{
            name: import("zod").ZodString;
        }, import("zod/v4/core").$strip>;
        query: import("zod").ZodObject<{
            start: import("zod").ZodString;
            end: import("zod").ZodString;
        }, import("zod/v4/core").$strip>;
    }, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, import("./internal/streams/crud/route").StreamDetailsResponse, undefined>;
    "GET /internal/streams": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/streams", import("zod").ZodObject<{}, import("zod/v4/core").$strip>, import("./types").StreamsRouteHandlerResources, {
        streams: import("./internal/streams/crud/route").ListStreamDetail[];
    }, undefined>;
};
export type StreamsRouteRepository = typeof streamsRouteRepository;
