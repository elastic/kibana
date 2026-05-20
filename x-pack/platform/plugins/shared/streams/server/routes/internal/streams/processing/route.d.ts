import type { FlattenRecord } from '@kbn/streams-schema';
import { z } from '@kbn/zod/v4';
import type { ServerSentEventBase } from '@kbn/sse-utils';
import type { Observable } from 'rxjs';
import { handleProcessingGrokSuggestions } from './grok_suggestions_handler';
import { handleProcessingDissectSuggestions } from './dissect_suggestions_handler';
import type { FailureStoreSamplesResponse } from './failure_store_samples_handler';
export declare const simulateProcessorRoute: Record<"POST /internal/streams/{name}/processing/_simulate", import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/streams/{name}/processing/_simulate", z.ZodObject<{
    path: z.ZodObject<{
        name: z.ZodString;
    }, z.core.$strip>;
    body: z.ZodObject<{
        processing: z.ZodObject<{
            steps: z.ZodArray<z.ZodType<import("@kbn/streamlang/types/streamlang").StreamlangStep, unknown, z.core.$ZodTypeInternals<import("@kbn/streamlang/types/streamlang").StreamlangStep, unknown>>>;
        }, z.core.$strip>;
        documents: z.ZodArray<z.ZodType<FlattenRecord, unknown, z.core.$ZodTypeInternals<FlattenRecord, unknown>>>;
        detected_fields: z.ZodOptional<z.ZodArray<z.ZodType<(import("@elastic/elasticsearch/lib/api/types").MappingBooleanProperty & {
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
        }), unknown, z.core.$ZodTypeInternals<(import("@elastic/elasticsearch/lib/api/types").MappingBooleanProperty & {
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
    }, z.core.$strip>;
}, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, import("@kbn/streams-schema").ProcessingSimulationResponse, undefined>>;
export interface ProcessingSuggestionBody {
    field: string;
    connectorId: string;
    samples: FlattenRecord[];
}
type GrokSuggestionResponse = Observable<ServerSentEventBase<'grok_suggestion', {
    grokProcessor: Awaited<ReturnType<typeof handleProcessingGrokSuggestions>> | null;
}>>;
export declare const processingGrokSuggestionRoute: Record<"POST /internal/streams/{name}/processing/_suggestions/grok", import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/streams/{name}/processing/_suggestions/grok", z.ZodObject<{
    path: z.ZodObject<{
        name: z.ZodString;
    }, z.core.$strip>;
    body: z.ZodObject<{
        connector_id: z.ZodString;
        field_name: z.ZodString;
        sample_messages: z.ZodArray<z.ZodString>;
    }, z.core.$strip>;
}, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, GrokSuggestionResponse, undefined>>;
type DissectSuggestionResponse = Observable<ServerSentEventBase<'dissect_suggestion', {
    dissectProcessor: Awaited<ReturnType<typeof handleProcessingDissectSuggestions>> | null;
}>>;
export declare const processingDissectSuggestionRoute: Record<"POST /internal/streams/{name}/processing/_suggestions/dissect", import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/streams/{name}/processing/_suggestions/dissect", z.ZodObject<{
    path: z.ZodObject<{
        name: z.ZodString;
    }, z.core.$strip>;
    body: z.ZodObject<{
        connector_id: z.ZodString;
        field_name: z.ZodString;
        sample_messages: z.ZodArray<z.ZodString>;
    }, z.core.$strip>;
}, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, DissectSuggestionResponse, undefined>>;
export declare const processingDateSuggestionsRoute: Record<"POST /internal/streams/{name}/processing/_suggestions/date", import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/streams/{name}/processing/_suggestions/date", z.ZodObject<{
    path: z.ZodObject<{
        name: z.ZodString;
    }, z.core.$strip>;
    body: z.ZodObject<{
        dates: z.ZodArray<z.ZodUnknown>;
    }, z.core.$strip>;
}, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, {
    formats: string[];
}, undefined>>;
export declare const failureStoreSamplesRoute: Record<"GET /internal/streams/{name}/processing/_failure_store_samples", import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/streams/{name}/processing/_failure_store_samples", z.ZodObject<{
    path: z.ZodObject<{
        name: z.ZodString;
    }, z.core.$strip>;
    query: z.ZodOptional<z.ZodObject<{
        size: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
        start: z.ZodOptional<z.ZodString>;
        end: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, FailureStoreSamplesResponse, undefined>>;
export declare const internalProcessingRoutes: {
    "GET /internal/streams/{name}/processing/_failure_store_samples": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/streams/{name}/processing/_failure_store_samples", z.ZodObject<{
        path: z.ZodObject<{
            name: z.ZodString;
        }, z.core.$strip>;
        query: z.ZodOptional<z.ZodObject<{
            size: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
            start: z.ZodOptional<z.ZodString>;
            end: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
    }, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, FailureStoreSamplesResponse, undefined>;
    "POST /internal/streams/{name}/processing/_suggestions/date": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/streams/{name}/processing/_suggestions/date", z.ZodObject<{
        path: z.ZodObject<{
            name: z.ZodString;
        }, z.core.$strip>;
        body: z.ZodObject<{
            dates: z.ZodArray<z.ZodUnknown>;
        }, z.core.$strip>;
    }, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, {
        formats: string[];
    }, undefined>;
    "POST /internal/streams/{name}/processing/_suggestions/dissect": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/streams/{name}/processing/_suggestions/dissect", z.ZodObject<{
        path: z.ZodObject<{
            name: z.ZodString;
        }, z.core.$strip>;
        body: z.ZodObject<{
            connector_id: z.ZodString;
            field_name: z.ZodString;
            sample_messages: z.ZodArray<z.ZodString>;
        }, z.core.$strip>;
    }, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, DissectSuggestionResponse, undefined>;
    "POST /internal/streams/{name}/processing/_suggestions/grok": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/streams/{name}/processing/_suggestions/grok", z.ZodObject<{
        path: z.ZodObject<{
            name: z.ZodString;
        }, z.core.$strip>;
        body: z.ZodObject<{
            connector_id: z.ZodString;
            field_name: z.ZodString;
            sample_messages: z.ZodArray<z.ZodString>;
        }, z.core.$strip>;
    }, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, GrokSuggestionResponse, undefined>;
    "POST /internal/streams/{name}/processing/_simulate": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/streams/{name}/processing/_simulate", z.ZodObject<{
        path: z.ZodObject<{
            name: z.ZodString;
        }, z.core.$strip>;
        body: z.ZodObject<{
            processing: z.ZodObject<{
                steps: z.ZodArray<z.ZodType<import("@kbn/streamlang/types/streamlang").StreamlangStep, unknown, z.core.$ZodTypeInternals<import("@kbn/streamlang/types/streamlang").StreamlangStep, unknown>>>;
            }, z.core.$strip>;
            documents: z.ZodArray<z.ZodType<FlattenRecord, unknown, z.core.$ZodTypeInternals<FlattenRecord, unknown>>>;
            detected_fields: z.ZodOptional<z.ZodArray<z.ZodType<(import("@elastic/elasticsearch/lib/api/types").MappingBooleanProperty & {
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
            }), unknown, z.core.$ZodTypeInternals<(import("@elastic/elasticsearch/lib/api/types").MappingBooleanProperty & {
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
        }, z.core.$strip>;
    }, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, import("@kbn/streams-schema").ProcessingSimulationResponse, undefined>;
};
export {};
