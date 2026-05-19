import * as rt from 'io-ts';
import type { ANY_DATASET } from '../common';
import type { FieldAttribute, FieldName, FieldSource } from '../types';
export declare const findFieldsMetadataRequestQueryRT: rt.Type<{
    attributes?: ("normalize" | "name" | "index" | "type" | "source" | "pattern" | "otel" | "format" | "required" | "description" | "level" | "short" | "example" | "beta" | "doc_values" | "ignore_above" | "scaling_factor" | "multi_fields" | "flat_name" | "allowed_values" | "dashed_name" | "expected_values" | "input_format" | "object_type" | "original_fieldset" | "output_format" | "output_precision" | "documentation_url" | "otel_equivalent")[] | undefined;
    fieldNames?: string[] | undefined;
    source?: "metadata" | "streams" | "ecs" | "otel" | "unknown" | "integration" | ("metadata" | "streams" | "ecs" | "otel" | "unknown" | "integration")[] | undefined;
    integration?: string | undefined;
    dataset?: string | undefined;
    streamNames?: string[] | undefined;
}, {
    attributes?: string | undefined;
    fieldNames?: string | undefined;
    source?: "metadata" | "streams" | "ecs" | "otel" | "unknown" | "integration" | ("metadata" | "streams" | "ecs" | "otel" | "unknown" | "integration")[] | undefined;
    integration?: string | undefined;
    dataset?: string | undefined;
    streamNames?: string | undefined;
}, unknown>;
export declare const findFieldsMetadataResponsePayloadRT: rt.TypeC<{
    fields: rt.RecordC<rt.StringC, rt.PartialC<{
        allowed_values: rt.ArrayC<rt.IntersectionC<[rt.TypeC<{
            description: rt.StringC;
            name: rt.StringC;
        }>, rt.PartialC<{
            expected_event_types: rt.ArrayC<rt.StringC>;
            beta: rt.StringC;
        }>]>>;
        beta: rt.StringC;
        dashed_name: rt.StringC;
        description: rt.StringC;
        doc_values: rt.BooleanC;
        example: rt.UnknownC;
        expected_values: rt.ArrayC<rt.StringC>;
        flat_name: rt.StringC;
        format: rt.StringC;
        ignore_above: rt.NumberC;
        index: rt.BooleanC;
        input_format: rt.StringC;
        level: rt.StringC;
        multi_fields: rt.ArrayC<rt.TypeC<{
            flat_name: rt.StringC;
            name: rt.StringC;
            type: rt.StringC;
        }>>;
        normalize: rt.ArrayC<rt.StringC>;
        object_type: rt.StringC;
        original_fieldset: rt.StringC;
        otel: rt.ArrayC<rt.UnionC<[rt.IntersectionC<[rt.IntersectionC<[rt.TypeC<{
            stability: rt.KeyofC<{
                development: null;
                stable: null;
                experimental: null;
            }>;
        }>, rt.PartialC<{
            note: rt.StringC;
        }>]>, rt.UnionC<[rt.TypeC<{
            relation: rt.LiteralC<"match">;
        }>, rt.TypeC<{
            relation: rt.LiteralC<"equivalent">;
            attribute: rt.StringC;
        }>, rt.TypeC<{
            relation: rt.LiteralC<"related">;
            attribute: rt.StringC;
        }>, rt.TypeC<{
            relation: rt.LiteralC<"conflict">;
            attribute: rt.StringC;
        }>, rt.TypeC<{
            relation: rt.LiteralC<"otlp">;
            otlp_field: rt.StringC;
        }>, rt.TypeC<{
            relation: rt.LiteralC<"metric">;
            metric: rt.StringC;
        }>]>]>, rt.TypeC<{
            relation: rt.LiteralC<"na">;
        }>]>>;
        output_format: rt.StringC;
        output_precision: rt.NumberC;
        pattern: rt.StringC;
        required: rt.BooleanC;
        scaling_factor: rt.NumberC;
        short: rt.StringC;
        source: rt.KeyofC<{
            ecs: null;
            integration: null;
            metadata: null;
            otel: null;
            streams: null;
            unknown: null;
        }>;
        type: rt.StringC;
        documentation_url: rt.StringC;
        otel_equivalent: rt.StringC;
        name: rt.StringC;
    }>>;
    streamFields: rt.RecordC<rt.StringC, rt.RecordC<rt.StringC, rt.PartialC<{
        allowed_values: rt.ArrayC<rt.IntersectionC<[rt.TypeC<{
            description: rt.StringC;
            name: rt.StringC;
        }>, rt.PartialC<{
            expected_event_types: rt.ArrayC<rt.StringC>;
            beta: rt.StringC;
        }>]>>;
        beta: rt.StringC;
        dashed_name: rt.StringC;
        description: rt.StringC;
        doc_values: rt.BooleanC;
        example: rt.UnknownC;
        expected_values: rt.ArrayC<rt.StringC>;
        flat_name: rt.StringC;
        format: rt.StringC;
        ignore_above: rt.NumberC;
        index: rt.BooleanC;
        input_format: rt.StringC;
        level: rt.StringC;
        multi_fields: rt.ArrayC<rt.TypeC<{
            flat_name: rt.StringC;
            name: rt.StringC;
            type: rt.StringC;
        }>>;
        normalize: rt.ArrayC<rt.StringC>;
        object_type: rt.StringC;
        original_fieldset: rt.StringC;
        otel: rt.ArrayC<rt.UnionC<[rt.IntersectionC<[rt.IntersectionC<[rt.TypeC<{
            stability: rt.KeyofC<{
                development: null;
                stable: null;
                experimental: null;
            }>;
        }>, rt.PartialC<{
            note: rt.StringC;
        }>]>, rt.UnionC<[rt.TypeC<{
            relation: rt.LiteralC<"match">;
        }>, rt.TypeC<{
            relation: rt.LiteralC<"equivalent">;
            attribute: rt.StringC;
        }>, rt.TypeC<{
            relation: rt.LiteralC<"related">;
            attribute: rt.StringC;
        }>, rt.TypeC<{
            relation: rt.LiteralC<"conflict">;
            attribute: rt.StringC;
        }>, rt.TypeC<{
            relation: rt.LiteralC<"otlp">;
            otlp_field: rt.StringC;
        }>, rt.TypeC<{
            relation: rt.LiteralC<"metric">;
            metric: rt.StringC;
        }>]>]>, rt.TypeC<{
            relation: rt.LiteralC<"na">;
        }>]>>;
        output_format: rt.StringC;
        output_precision: rt.NumberC;
        pattern: rt.StringC;
        required: rt.BooleanC;
        scaling_factor: rt.NumberC;
        short: rt.StringC;
        source: rt.KeyofC<{
            ecs: null;
            integration: null;
            metadata: null;
            otel: null;
            streams: null;
            unknown: null;
        }>;
        type: rt.StringC;
        documentation_url: rt.StringC;
        otel_equivalent: rt.StringC;
        name: rt.StringC;
    }>>>;
}>;
export type FindFieldsMetadataRequestQuery = {
    attributes?: FieldAttribute[];
    fieldNames?: FieldName[];
    source?: FieldSource | FieldSource[];
    integration?: undefined;
    dataset?: undefined;
    streamNames?: string[];
} | {
    attributes?: FieldAttribute[];
    fieldNames?: FieldName[];
    source?: FieldSource | FieldSource[];
    integration: string;
    dataset: typeof ANY_DATASET | (string & {});
    streamNames?: string[];
};
export type FindFieldsMetadataResponsePayload = rt.TypeOf<typeof findFieldsMetadataResponsePayloadRT>;
