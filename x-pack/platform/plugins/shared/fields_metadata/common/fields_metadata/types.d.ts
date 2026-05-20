import type { EcsFlat } from '@elastic/ecs';
import * as rt from 'io-ts';
import type { TSemconvFields, SemconvFieldName } from '@kbn/otel-semantic-conventions';
import type { MetadataFields } from '../metadata_fields';
export declare const fieldSourceRT: rt.KeyofC<{
    ecs: null;
    integration: null;
    metadata: null;
    otel: null;
    streams: null;
    unknown: null;
}>;
export declare const allowedValueRT: rt.IntersectionC<[rt.TypeC<{
    description: rt.StringC;
    name: rt.StringC;
}>, rt.PartialC<{
    expected_event_types: rt.ArrayC<rt.StringC>;
    beta: rt.StringC;
}>]>;
export declare const multiFieldRT: rt.TypeC<{
    flat_name: rt.StringC;
    name: rt.StringC;
    type: rt.StringC;
}>;
export declare const baseOTELPropertyRT: rt.IntersectionC<[rt.TypeC<{
    stability: rt.KeyofC<{
        development: null;
        stable: null;
        experimental: null;
    }>;
}>, rt.PartialC<{
    note: rt.StringC;
}>]>;
export declare const otelMatchPropertyRT: rt.TypeC<{
    relation: rt.LiteralC<"match">;
}>;
export declare const otelEquivalentPropertyRT: rt.TypeC<{
    relation: rt.LiteralC<"equivalent">;
    attribute: rt.StringC;
}>;
export declare const otelRelatedPropertyRT: rt.TypeC<{
    relation: rt.LiteralC<"related">;
    attribute: rt.StringC;
}>;
export declare const otelConflictPropertyRT: rt.TypeC<{
    relation: rt.LiteralC<"conflict">;
    attribute: rt.StringC;
}>;
export declare const otelOtlpPropertyRT: rt.TypeC<{
    relation: rt.LiteralC<"otlp">;
    otlp_field: rt.StringC;
}>;
export declare const otelMetricPropertyRT: rt.TypeC<{
    relation: rt.LiteralC<"metric">;
    metric: rt.StringC;
}>;
export declare const otelNaPropertyRT: rt.TypeC<{
    relation: rt.LiteralC<"na">;
}>;
export declare const otelPropertyRT: rt.UnionC<[rt.IntersectionC<[rt.IntersectionC<[rt.TypeC<{
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
}>]>;
export declare const partialFieldMetadataPlainRT: rt.PartialC<{
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
}>;
export declare const fieldMetadataPlainRT: rt.IntersectionC<[rt.TypeC<{
    name: rt.StringC;
}>, rt.PartialC<{
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
}>]>;
export declare const fieldAttributeRT: rt.KeyofC<{
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
}>;
export declare const fieldsMetadataDictionaryRT: rt.RecordC<rt.StringC, rt.IntersectionC<[rt.TypeC<{
    name: rt.StringC;
}>, rt.PartialC<{
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
}>]>>;
export type AnyFieldName = string & {};
export type TMetadataFields = typeof MetadataFields;
export type MetadataFieldName = keyof TMetadataFields;
export type TEcsFields = typeof EcsFlat;
export type EcsFieldName = keyof TEcsFields;
export type TOtelFields = TSemconvFields;
export type OtelFieldName = SemconvFieldName;
export type IntegrationFieldName = AnyFieldName;
export type FieldName = MetadataFieldName | EcsFieldName | OtelFieldName | IntegrationFieldName;
export type FieldMetadataPlain = rt.TypeOf<typeof fieldMetadataPlainRT>;
export type PartialFieldMetadataPlain = rt.TypeOf<typeof partialFieldMetadataPlainRT>;
export type FieldSource = rt.TypeOf<typeof fieldSourceRT>;
export type FieldAttribute = rt.TypeOf<typeof fieldAttributeRT>;
