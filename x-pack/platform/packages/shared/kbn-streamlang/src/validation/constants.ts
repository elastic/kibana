/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

/**
 * Human-readable labels for validation error types
 */
export const validationErrorTypeLabels = {
  non_namespaced_field: i18n.translate('xpack.streamlang.validation.nonNamespacedField', {
    defaultMessage: 'Non-namespaced field',
  }),
  reserved_field: i18n.translate('xpack.streamlang.validation.reservedField', {
    defaultMessage: 'Reserved field',
  }),
  type_mismatch: i18n.translate('xpack.streamlang.validation.typeMismatch', {
    defaultMessage: 'Type mismatch',
  }),
  mixed_type: i18n.translate('xpack.streamlang.validation.mixedType', {
    defaultMessage: 'Mixed type',
  }),
  invalid_value: i18n.translate('xpack.streamlang.validation.invalidValue', {
    defaultMessage: 'Invalid value',
  }),
  invalid_field_name: i18n.translate('xpack.streamlang.validation.invalidFieldName', {
    defaultMessage: 'Invalid field name',
  }),
  forbidden_processor: i18n.translate('xpack.streamlang.validation.forbiddenProcessor', {
    defaultMessage: 'Forbidden processor',
  }),
  invalid_processor_placement: i18n.translate(
    'xpack.streamlang.validation.invalidProcessorPlacement',
    {
      defaultMessage: 'Invalid processor placement',
    }
  ),
};

/**
 * List of special fields that are allowed without namespacing (from kbn-streams-schema)
 * These are OTel standard fields that don't require custom namespace prefixes
 */
export const KEEP_FIELDS = [
  '@timestamp',
  'observed_timestamp',
  'trace_id',
  'span_id',
  'severity_text',
  'body',
  'severity_number',
  'event_name',
  'dropped_attributes_count',
  'scope',
  'scope.name',
  'body.text',
  'body.structured',
  'resource.schema_url',
  'resource.dropped_attributes_count',
] as const;

/**
 * Valid namespace prefixes for custom fields in wired streams
 */
export const NAMESPACE_PREFIXES = [
  'body.structured.',
  'attributes.',
  'scope.attributes.',
  'resource.attributes.',
] as const;
