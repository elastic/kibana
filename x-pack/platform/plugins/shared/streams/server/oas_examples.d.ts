/**
 * OAS example constants for the Streams API.
 *
 * These typed constants are imported directly by the Streams route definitions
 * via oasOperationObject, keeping examples co-located with routes and type-checked
 * against the @kbn/streams-schema types. If a schema change breaks an example
 * (e.g. a field is renamed or a required property is added), TypeScript catches
 * it immediately without any additional tooling or CI step.
 */
import type { SignificantEventsGetResponse, StreamQuery, Streams } from '@kbn/streams-schema';
export declare const createWiredStreamRequest: Streams.WiredStream.UpsertRequest;
export declare const updateClassicStreamRequest: Streams.ClassicStream.UpsertRequest;
export declare const createQueryStreamRequest: Streams.QueryStream.UpsertRequest;
export interface ForkStreamRequest {
    stream: {
        name: string;
    };
    where: {
        field: string;
        eq: string;
    };
    status?: 'enabled' | 'disabled';
}
export declare const forkStreamRequest: ForkStreamRequest;
export interface WiredIngestUpsertRequestBody {
    ingest: {
        lifecycle: {
            inherit: {};
        };
        processing: {
            steps: Array<{
                action: 'grok';
                from: string;
                patterns: string[];
                ignore_missing?: boolean;
            }>;
        };
        settings: Record<string, never>;
        failure_store: {
            inherit: {};
        };
        wired: {
            fields: Record<string, {
                type: string;
            }>;
            routing: Array<{
                destination: string;
                where: {
                    field: string;
                    eq: string;
                };
                status: string;
            }>;
        };
    };
}
export declare const upsertWiredIngestRequest: WiredIngestUpsertRequestBody;
export interface QueryStreamUpsertRequestBody {
    query: {
        esql: string;
    };
}
export declare const upsertQueryStreamRequest: QueryStreamUpsertRequestBody;
export declare const getWiredStreamResponse: Streams.WiredStream.GetResponse;
export declare const getWiredIngestResponse: {
    ingest: Streams.WiredStream.Definition['ingest'];
};
export declare const upsertStreamQueryRequest: {
    title: string;
    description: string;
    esql: {
        query: string;
    };
};
export declare const bulkStreamQueriesRequest: {
    operations: ({
        index: {
            id: string;
            title: string;
            description: string;
            esql: {
                query: string;
            };
        };
        delete?: undefined;
    } | {
        delete: {
            id: string;
        };
        index?: undefined;
    })[];
};
export declare const exportContentRequest: {
    name: string;
    description: string;
    version: string;
    include: {
        objects: {
            all: {};
        };
    };
};
export declare const listStreamQueriesResponse: {
    queries: StreamQuery[];
};
export declare const getSignificantEventsResponse: SignificantEventsGetResponse;
export declare const previewSignificantEventsRequest: {
    query: {
        esql: {
            query: string;
        };
    };
};
export declare const listStreamsResponse: {
    streams: Streams.all.Definition[];
};
