/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldMetadataPlain } from '@kbn/fields-metadata-plugin/common';
import { RESOURCE_FIELDS } from '@kbn/otel-semantic-conventions';

/**
 * Maps ECS field to corresponding OTel semantic convention attribute.
 *
 * See https://www.elastic.co/docs/reference/ecs/ecs-otel-alignment-details for full reference.
 */
export function getOtelFieldName(
  ecsFieldName: string,
  fieldMetadata: FieldMetadataPlain | undefined
): string {
  if (ecsFieldName === '@timestamp') {
    return `@timestamp`; // Special case for `@timestamp` field which should be kept as is.
  }
  if (ecsFieldName === 'message') {
    return `body.text`; // Special case for `message` field which should be stored as `body.text` instead of `body` (SemConv).
  }
  let otelName = ecsFieldName;
  let isOtlpField = false;
  if (fieldMetadata && fieldMetadata.otel) {
    // If the field has an 'equivalent' OTEL mapping, use that as the authoritative field name (still need to namespace it though)
    const equivalent = fieldMetadata.otel.find(
      (otel) => otel.relation === 'equivalent' || otel.relation === 'otlp'
    );
    if (equivalent && equivalent.relation === 'otlp' && 'otlp_field' in equivalent) {
      otelName = equivalent.otlp_field;
      isOtlpField = true;
    }
    if (equivalent && 'attribute' in equivalent) {
      otelName = equivalent.attribute;
    }
  }

  if (isOtlpField) {
    return otelName; // OTLP fields are already fully qualified.
  }
  const prefix = RESOURCE_FIELDS.includes(ecsFieldName) ? `resource.attributes` : `attributes`; // Resource fields are stored under `resource.attributes`, all other fields under `attributes`.
  return `${prefix}.${otelName}`;
}
