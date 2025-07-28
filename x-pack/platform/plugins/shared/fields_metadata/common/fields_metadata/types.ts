/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EcsFlat } from '@elastic/ecs';
import * as rt from 'io-ts';
import { MetadataFields } from '../metadata_fields';

export const fieldSourceRT = rt.keyof({
  ecs: null,
  integration: null,
  metadata: null,
  unknown: null,
});

export const allowedValueRT = rt.intersection([
  rt.type({
    description: rt.string,
    name: rt.string,
  }),
  rt.partial({
    expected_event_types: rt.array(rt.string),
    beta: rt.string,
  }),
]);

export const multiFieldRT = rt.type({
  flat_name: rt.string,
  name: rt.string,
  type: rt.string,
});

export const baseOTELPropertyRT = rt.intersection([
  rt.type({
    stability: rt.keyof({
      stable: null,
      experimental: null,
    }),
  }),
  rt.partial({
    note: rt.string,
  }),
]);

export const otelMatchPropertyRT = rt.type({
  relation: rt.literal('match'),
});

export const otelEquivalentPropertyRT = rt.type({
  relation: rt.literal('equivalent'),
  attribute: rt.string,
});

export const otelRelatedPropertyRT = rt.type({
  relation: rt.literal('related'),
  attribute: rt.string,
});

export const otelConflictPropertyRT = rt.type({
  relation: rt.literal('conflict'),
  attribute: rt.string,
});

export const otelOtlpPropertyRT = rt.type({
  relation: rt.literal('otlp'),
  otlp_field: rt.string,
});

export const otelMetricPropertyRT = rt.type({
  relation: rt.literal('metric'),
  metric: rt.string,
});

export const otelNaPropertyRT = rt.type({
  relation: rt.literal('na'),
});

export const otelPropertyRT = rt.union([
  rt.intersection([
    baseOTELPropertyRT,
    rt.union([
      otelMatchPropertyRT,
      otelEquivalentPropertyRT,
      otelRelatedPropertyRT,
      otelConflictPropertyRT,
      otelOtlpPropertyRT,
      otelMetricPropertyRT,
    ]),
  ]),
  otelNaPropertyRT,
]);

const requiredBaseMetadataPlainRT = rt.type({
  name: rt.string,
});

const optionalBaseMetadataPlainRT = rt.partial(requiredBaseMetadataPlainRT.props);

const optionalMetadataPlainRT = rt.partial({
  allowed_values: rt.array(allowedValueRT),
  beta: rt.string,
  dashed_name: rt.string,
  description: rt.string,
  doc_values: rt.boolean,
  example: rt.unknown,
  expected_values: rt.array(rt.string),
  flat_name: rt.string,
  format: rt.string,
  ignore_above: rt.number,
  index: rt.boolean,
  input_format: rt.string,
  level: rt.string,
  multi_fields: rt.array(multiFieldRT),
  normalize: rt.array(rt.string),
  object_type: rt.string,
  original_fieldset: rt.string,
  otel: rt.array(otelPropertyRT),
  output_format: rt.string,
  output_precision: rt.number,
  pattern: rt.string,
  required: rt.boolean,
  scaling_factor: rt.number,
  short: rt.string,
  source: fieldSourceRT,
  type: rt.string,
  documentation_url: rt.string,
});

export const partialFieldMetadataPlainRT = rt.intersection([
  optionalBaseMetadataPlainRT,
  optionalMetadataPlainRT,
]);

export const fieldMetadataPlainRT = rt.intersection([
  requiredBaseMetadataPlainRT,
  optionalMetadataPlainRT,
]);

export const fieldAttributeRT = rt.union([
  rt.keyof(requiredBaseMetadataPlainRT.props),
  rt.keyof(optionalMetadataPlainRT.props),
]);

export const fieldsMetadataDictionaryRT = rt.record(rt.string, fieldMetadataPlainRT);

export type AnyFieldName = string & {};
export type TMetadataFields = typeof MetadataFields;
export type MetadataFieldName = keyof TMetadataFields;
export type TEcsFields = typeof EcsFlat;
export type EcsFieldName = keyof TEcsFields;
export type IntegrationFieldName = AnyFieldName;

export type FieldName = MetadataFieldName | EcsFieldName | IntegrationFieldName;
export type FieldMetadataPlain = rt.TypeOf<typeof fieldMetadataPlainRT>;
export type PartialFieldMetadataPlain = rt.TypeOf<typeof partialFieldMetadataPlainRT>;

export type FieldAttribute = rt.TypeOf<typeof fieldAttributeRT>;
