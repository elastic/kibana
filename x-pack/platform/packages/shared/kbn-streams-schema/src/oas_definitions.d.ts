/**
 * Registry of kbn-streams-schema Zod v4 schemas emitted as named OAS components
 * (`$ref: '#/components/schemas/<key>'`). Each schema carries `.meta({ id })`
 * at its definition site, so the OAS generator picks it up automatically via
 * the Zod v4 global registry — no separate registration step required.
 */
import type { WiredStream } from './models/ingest/wired';
import type { ClassicStream, ClassicIngest } from './models/ingest/classic';
import type { WiredIngest } from './models/ingest/wired';
import type { QueryStream } from './models/query';
import type { Streams } from './models/streams';
export declare const streamsOasDefinitions: {
    /**
     * Top-level union of all stream definition variants, with an explicit OAS
     * discriminator on `type`. .meta({ id: 'StreamDefinition', openapi: { discriminator } })
     * is applied at definition time in models/streams.ts.
     */
    readonly StreamDefinition: import("zod").ZodUnion<readonly [import("zod").ZodType<WiredStream.Definition, unknown, import("zod/v4/core").$ZodTypeInternals<WiredStream.Definition, unknown>>, import("zod").ZodType<ClassicStream.Definition, unknown, import("zod/v4/core").$ZodTypeInternals<ClassicStream.Definition, unknown>>, import("zod").ZodType<QueryStream.Definition, unknown, import("zod/v4/core").$ZodTypeInternals<QueryStream.Definition, unknown>>]>;
    readonly WiredStreamDefinition: import("zod").ZodType<WiredStream.Definition, unknown, import("zod/v4/core").$ZodTypeInternals<WiredStream.Definition, unknown>>;
    readonly ClassicStreamDefinition: import("zod").ZodType<ClassicStream.Definition, unknown, import("zod/v4/core").$ZodTypeInternals<ClassicStream.Definition, unknown>>;
    readonly QueryStreamDefinition: import("zod").ZodType<QueryStream.Definition, unknown, import("zod/v4/core").$ZodTypeInternals<QueryStream.Definition, unknown>>;
    readonly StreamGetResponse: import("zod").ZodType<Streams.all.GetResponse, unknown, import("zod/v4/core").$ZodTypeInternals<Streams.all.GetResponse, unknown>>;
    readonly WiredStreamGetResponse: import("zod").ZodType<WiredStream.GetResponse, unknown, import("zod/v4/core").$ZodTypeInternals<WiredStream.GetResponse, unknown>>;
    readonly ClassicStreamGetResponse: import("zod").ZodType<ClassicStream.GetResponse, unknown, import("zod/v4/core").$ZodTypeInternals<ClassicStream.GetResponse, unknown>>;
    readonly QueryStreamGetResponse: import("zod").ZodType<QueryStream.GetResponse, unknown, import("zod/v4/core").$ZodTypeInternals<QueryStream.GetResponse, unknown>>;
    readonly StreamUpsertRequest: import("zod").ZodType<Streams.all.UpsertRequest, unknown, import("zod/v4/core").$ZodTypeInternals<Streams.all.UpsertRequest, unknown>>;
    readonly WiredStreamUpsertRequest: import("zod").ZodType<WiredStream.UpsertRequest, unknown, import("zod/v4/core").$ZodTypeInternals<WiredStream.UpsertRequest, unknown>>;
    readonly ClassicStreamUpsertRequest: import("zod").ZodType<ClassicStream.UpsertRequest, unknown, import("zod/v4/core").$ZodTypeInternals<ClassicStream.UpsertRequest, unknown>>;
    readonly QueryStreamUpsertRequest: import("zod").ZodType<QueryStream.UpsertRequest, unknown, import("zod/v4/core").$ZodTypeInternals<QueryStream.UpsertRequest, unknown>>;
    readonly WiredIngest: import("zod").ZodType<WiredIngest, unknown, import("zod/v4/core").$ZodTypeInternals<WiredIngest, unknown>>;
    readonly ClassicIngest: import("zod").ZodType<ClassicIngest, unknown, import("zod/v4/core").$ZodTypeInternals<ClassicIngest, unknown>>;
    readonly FieldDefinition: import("zod").ZodType<import("./fields").FieldDefinition, unknown, import("zod/v4/core").$ZodTypeInternals<import("./fields").FieldDefinition, unknown>>;
    readonly FieldDefinitionConfig: import("zod").ZodType<(import("@elastic/elasticsearch/lib/api/types").MappingBooleanProperty & {
        type: import("./fields").FieldDefinitionType;
        format?: string;
        description?: string;
    }) | (import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
        type: import("./fields").FieldDefinitionType;
        format?: string;
        description?: string;
    }) | (import("@elastic/elasticsearch/lib/api/types").MappingMatchOnlyTextProperty & {
        type: import("./fields").FieldDefinitionType;
        format?: string;
        description?: string;
    }) | (import("@elastic/elasticsearch/lib/api/types").MappingTextProperty & {
        type: import("./fields").FieldDefinitionType;
        format?: string;
        description?: string;
    }) | (import("@elastic/elasticsearch/lib/api/types").MappingVersionProperty & {
        type: import("./fields").FieldDefinitionType;
        format?: string;
        description?: string;
    }) | (import("@elastic/elasticsearch/lib/api/types").MappingWildcardProperty & {
        type: import("./fields").FieldDefinitionType;
        format?: string;
        description?: string;
    }) | (import("@elastic/elasticsearch/lib/api/types").MappingDateNanosProperty & {
        type: import("./fields").FieldDefinitionType;
        format?: string;
        description?: string;
    }) | (import("@elastic/elasticsearch/lib/api/types").MappingDateProperty & {
        type: import("./fields").FieldDefinitionType;
        format?: string;
        description?: string;
    }) | (import("@elastic/elasticsearch/lib/api/types").MappingIpProperty & {
        type: import("./fields").FieldDefinitionType;
        format?: string;
        description?: string;
    }) | (import("@elastic/elasticsearch/lib/api/types").MappingGeoPointProperty & {
        type: import("./fields").FieldDefinitionType;
        format?: string;
        description?: string;
    }) | (import("@elastic/elasticsearch/lib/api/types").MappingByteNumberProperty & {
        type: import("./fields").FieldDefinitionType;
        format?: string;
        description?: string;
    }) | (import("@elastic/elasticsearch/lib/api/types").MappingDoubleNumberProperty & {
        type: import("./fields").FieldDefinitionType;
        format?: string;
        description?: string;
    }) | (import("@elastic/elasticsearch/lib/api/types").MappingFloatNumberProperty & {
        type: import("./fields").FieldDefinitionType;
        format?: string;
        description?: string;
    }) | (import("@elastic/elasticsearch/lib/api/types").MappingHalfFloatNumberProperty & {
        type: import("./fields").FieldDefinitionType;
        format?: string;
        description?: string;
    }) | (import("@elastic/elasticsearch/lib/api/types").MappingIntegerNumberProperty & {
        type: import("./fields").FieldDefinitionType;
        format?: string;
        description?: string;
    }) | (import("@elastic/elasticsearch/lib/api/types").MappingLongNumberProperty & {
        type: import("./fields").FieldDefinitionType;
        format?: string;
        description?: string;
    }) | (import("@elastic/elasticsearch/lib/api/types").MappingShortNumberProperty & {
        type: import("./fields").FieldDefinitionType;
        format?: string;
        description?: string;
    }) | (import("@elastic/elasticsearch/lib/api/types").MappingUnsignedLongNumberProperty & {
        type: import("./fields").FieldDefinitionType;
        format?: string;
        description?: string;
    }) | {
        description: string;
        type?: never;
        format?: never;
    } | {
        type: "system";
        description?: string;
    }, unknown, import("zod/v4/core").$ZodTypeInternals<(import("@elastic/elasticsearch/lib/api/types").MappingBooleanProperty & {
        type: import("./fields").FieldDefinitionType;
        format?: string;
        description?: string;
    }) | (import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
        type: import("./fields").FieldDefinitionType;
        format?: string;
        description?: string;
    }) | (import("@elastic/elasticsearch/lib/api/types").MappingMatchOnlyTextProperty & {
        type: import("./fields").FieldDefinitionType;
        format?: string;
        description?: string;
    }) | (import("@elastic/elasticsearch/lib/api/types").MappingTextProperty & {
        type: import("./fields").FieldDefinitionType;
        format?: string;
        description?: string;
    }) | (import("@elastic/elasticsearch/lib/api/types").MappingVersionProperty & {
        type: import("./fields").FieldDefinitionType;
        format?: string;
        description?: string;
    }) | (import("@elastic/elasticsearch/lib/api/types").MappingWildcardProperty & {
        type: import("./fields").FieldDefinitionType;
        format?: string;
        description?: string;
    }) | (import("@elastic/elasticsearch/lib/api/types").MappingDateNanosProperty & {
        type: import("./fields").FieldDefinitionType;
        format?: string;
        description?: string;
    }) | (import("@elastic/elasticsearch/lib/api/types").MappingDateProperty & {
        type: import("./fields").FieldDefinitionType;
        format?: string;
        description?: string;
    }) | (import("@elastic/elasticsearch/lib/api/types").MappingIpProperty & {
        type: import("./fields").FieldDefinitionType;
        format?: string;
        description?: string;
    }) | (import("@elastic/elasticsearch/lib/api/types").MappingGeoPointProperty & {
        type: import("./fields").FieldDefinitionType;
        format?: string;
        description?: string;
    }) | (import("@elastic/elasticsearch/lib/api/types").MappingByteNumberProperty & {
        type: import("./fields").FieldDefinitionType;
        format?: string;
        description?: string;
    }) | (import("@elastic/elasticsearch/lib/api/types").MappingDoubleNumberProperty & {
        type: import("./fields").FieldDefinitionType;
        format?: string;
        description?: string;
    }) | (import("@elastic/elasticsearch/lib/api/types").MappingFloatNumberProperty & {
        type: import("./fields").FieldDefinitionType;
        format?: string;
        description?: string;
    }) | (import("@elastic/elasticsearch/lib/api/types").MappingHalfFloatNumberProperty & {
        type: import("./fields").FieldDefinitionType;
        format?: string;
        description?: string;
    }) | (import("@elastic/elasticsearch/lib/api/types").MappingIntegerNumberProperty & {
        type: import("./fields").FieldDefinitionType;
        format?: string;
        description?: string;
    }) | (import("@elastic/elasticsearch/lib/api/types").MappingLongNumberProperty & {
        type: import("./fields").FieldDefinitionType;
        format?: string;
        description?: string;
    }) | (import("@elastic/elasticsearch/lib/api/types").MappingShortNumberProperty & {
        type: import("./fields").FieldDefinitionType;
        format?: string;
        description?: string;
    }) | (import("@elastic/elasticsearch/lib/api/types").MappingUnsignedLongNumberProperty & {
        type: import("./fields").FieldDefinitionType;
        format?: string;
        description?: string;
    }) | {
        description: string;
        type?: never;
        format?: never;
    } | {
        type: "system";
        description?: string;
    }, unknown>>;
    readonly ClassicFieldDefinition: import("zod").ZodType<import("./fields").ClassicFieldDefinition, unknown, import("zod/v4/core").$ZodTypeInternals<import("./fields").ClassicFieldDefinition, unknown>>;
    readonly ClassicFieldDefinitionConfig: import("zod").ZodType<(import("@elastic/elasticsearch/lib/api/types").MappingBooleanProperty & {
        type: import("./fields").FieldDefinitionType;
        format?: string;
        description?: string;
    }) | (import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
        type: import("./fields").FieldDefinitionType;
        format?: string;
        description?: string;
    }) | (import("@elastic/elasticsearch/lib/api/types").MappingMatchOnlyTextProperty & {
        type: import("./fields").FieldDefinitionType;
        format?: string;
        description?: string;
    }) | (import("@elastic/elasticsearch/lib/api/types").MappingTextProperty & {
        type: import("./fields").FieldDefinitionType;
        format?: string;
        description?: string;
    }) | (import("@elastic/elasticsearch/lib/api/types").MappingVersionProperty & {
        type: import("./fields").FieldDefinitionType;
        format?: string;
        description?: string;
    }) | (import("@elastic/elasticsearch/lib/api/types").MappingWildcardProperty & {
        type: import("./fields").FieldDefinitionType;
        format?: string;
        description?: string;
    }) | (import("@elastic/elasticsearch/lib/api/types").MappingDateNanosProperty & {
        type: import("./fields").FieldDefinitionType;
        format?: string;
        description?: string;
    }) | (import("@elastic/elasticsearch/lib/api/types").MappingDateProperty & {
        type: import("./fields").FieldDefinitionType;
        format?: string;
        description?: string;
    }) | (import("@elastic/elasticsearch/lib/api/types").MappingIpProperty & {
        type: import("./fields").FieldDefinitionType;
        format?: string;
        description?: string;
    }) | (import("@elastic/elasticsearch/lib/api/types").MappingGeoPointProperty & {
        type: import("./fields").FieldDefinitionType;
        format?: string;
        description?: string;
    }) | (import("@elastic/elasticsearch/lib/api/types").MappingByteNumberProperty & {
        type: import("./fields").FieldDefinitionType;
        format?: string;
        description?: string;
    }) | (import("@elastic/elasticsearch/lib/api/types").MappingDoubleNumberProperty & {
        type: import("./fields").FieldDefinitionType;
        format?: string;
        description?: string;
    }) | (import("@elastic/elasticsearch/lib/api/types").MappingFloatNumberProperty & {
        type: import("./fields").FieldDefinitionType;
        format?: string;
        description?: string;
    }) | (import("@elastic/elasticsearch/lib/api/types").MappingHalfFloatNumberProperty & {
        type: import("./fields").FieldDefinitionType;
        format?: string;
        description?: string;
    }) | (import("@elastic/elasticsearch/lib/api/types").MappingIntegerNumberProperty & {
        type: import("./fields").FieldDefinitionType;
        format?: string;
        description?: string;
    }) | (import("@elastic/elasticsearch/lib/api/types").MappingLongNumberProperty & {
        type: import("./fields").FieldDefinitionType;
        format?: string;
        description?: string;
    }) | (import("@elastic/elasticsearch/lib/api/types").MappingShortNumberProperty & {
        type: import("./fields").FieldDefinitionType;
        format?: string;
        description?: string;
    }) | (import("@elastic/elasticsearch/lib/api/types").MappingUnsignedLongNumberProperty & {
        type: import("./fields").FieldDefinitionType;
        format?: string;
        description?: string;
    }) | {
        type: "system";
        description?: string;
    }, unknown, import("zod/v4/core").$ZodTypeInternals<(import("@elastic/elasticsearch/lib/api/types").MappingBooleanProperty & {
        type: import("./fields").FieldDefinitionType;
        format?: string;
        description?: string;
    }) | (import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
        type: import("./fields").FieldDefinitionType;
        format?: string;
        description?: string;
    }) | (import("@elastic/elasticsearch/lib/api/types").MappingMatchOnlyTextProperty & {
        type: import("./fields").FieldDefinitionType;
        format?: string;
        description?: string;
    }) | (import("@elastic/elasticsearch/lib/api/types").MappingTextProperty & {
        type: import("./fields").FieldDefinitionType;
        format?: string;
        description?: string;
    }) | (import("@elastic/elasticsearch/lib/api/types").MappingVersionProperty & {
        type: import("./fields").FieldDefinitionType;
        format?: string;
        description?: string;
    }) | (import("@elastic/elasticsearch/lib/api/types").MappingWildcardProperty & {
        type: import("./fields").FieldDefinitionType;
        format?: string;
        description?: string;
    }) | (import("@elastic/elasticsearch/lib/api/types").MappingDateNanosProperty & {
        type: import("./fields").FieldDefinitionType;
        format?: string;
        description?: string;
    }) | (import("@elastic/elasticsearch/lib/api/types").MappingDateProperty & {
        type: import("./fields").FieldDefinitionType;
        format?: string;
        description?: string;
    }) | (import("@elastic/elasticsearch/lib/api/types").MappingIpProperty & {
        type: import("./fields").FieldDefinitionType;
        format?: string;
        description?: string;
    }) | (import("@elastic/elasticsearch/lib/api/types").MappingGeoPointProperty & {
        type: import("./fields").FieldDefinitionType;
        format?: string;
        description?: string;
    }) | (import("@elastic/elasticsearch/lib/api/types").MappingByteNumberProperty & {
        type: import("./fields").FieldDefinitionType;
        format?: string;
        description?: string;
    }) | (import("@elastic/elasticsearch/lib/api/types").MappingDoubleNumberProperty & {
        type: import("./fields").FieldDefinitionType;
        format?: string;
        description?: string;
    }) | (import("@elastic/elasticsearch/lib/api/types").MappingFloatNumberProperty & {
        type: import("./fields").FieldDefinitionType;
        format?: string;
        description?: string;
    }) | (import("@elastic/elasticsearch/lib/api/types").MappingHalfFloatNumberProperty & {
        type: import("./fields").FieldDefinitionType;
        format?: string;
        description?: string;
    }) | (import("@elastic/elasticsearch/lib/api/types").MappingIntegerNumberProperty & {
        type: import("./fields").FieldDefinitionType;
        format?: string;
        description?: string;
    }) | (import("@elastic/elasticsearch/lib/api/types").MappingLongNumberProperty & {
        type: import("./fields").FieldDefinitionType;
        format?: string;
        description?: string;
    }) | (import("@elastic/elasticsearch/lib/api/types").MappingShortNumberProperty & {
        type: import("./fields").FieldDefinitionType;
        format?: string;
        description?: string;
    }) | (import("@elastic/elasticsearch/lib/api/types").MappingUnsignedLongNumberProperty & {
        type: import("./fields").FieldDefinitionType;
        format?: string;
        description?: string;
    }) | {
        type: "system";
        description?: string;
    }, unknown>>;
    readonly InheritedFieldDefinition: import("zod").ZodType<import("./fields").InheritedFieldDefinition, unknown, import("zod/v4/core").$ZodTypeInternals<import("./fields").InheritedFieldDefinition, unknown>>;
    readonly RoutingDefinition: import("zod").ZodType<import("./models/ingest/routing").RoutingDefinition, unknown, import("zod/v4/core").$ZodTypeInternals<import("./models/ingest/routing").RoutingDefinition, unknown>>;
    readonly IngestStreamLifecycle: import("zod").ZodType<import("./models/ingest/lifecycle").IngestStreamLifecycle, unknown, import("zod/v4/core").$ZodTypeInternals<import("./models/ingest/lifecycle").IngestStreamLifecycle, unknown>>;
    readonly ClassicIngestStreamEffectiveLifecycle: import("zod").ZodType<import("./models/ingest/lifecycle").ClassicIngestStreamEffectiveLifecycle, unknown, import("zod/v4/core").$ZodTypeInternals<import("./models/ingest/lifecycle").ClassicIngestStreamEffectiveLifecycle, unknown>>;
    readonly WiredIngestStreamEffectiveLifecycle: import("zod").ZodType<import("./models/ingest/lifecycle").WiredIngestStreamEffectiveLifecycle, unknown, import("zod/v4/core").$ZodTypeInternals<import("./models/ingest/lifecycle").WiredIngestStreamEffectiveLifecycle, unknown>>;
    readonly FailureStore: import("zod").ZodType<import("./models/ingest/failure_store").FailureStore, unknown, import("zod/v4/core").$ZodTypeInternals<import("./models/ingest/failure_store").FailureStore, unknown>>;
    readonly EffectiveFailureStore: import("zod").ZodType<import("./models/ingest/failure_store").EffectiveFailureStore, unknown, import("zod/v4/core").$ZodTypeInternals<import("./models/ingest/failure_store").EffectiveFailureStore, unknown>>;
};
export type StreamsOasDefinitions = typeof streamsOasDefinitions;
