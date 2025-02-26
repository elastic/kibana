/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const keepFields: string[] = [
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
  'body.text',
  'body.structured',
  'resource.schema_url',
  'resource.dropped_attributes_count',
];

const renameMap: Record<string, string> = {
  'error.exception.type': 'attributes.error.exception.type',
  'error.stack_trace': 'attributes.error.stack_trace',
  'error.exception.message': 'attributes.error.exception.message',
  'span.id': 'span_id',
  message: 'body.text',
  'log.level': 'severity_text',
  'trace.id': 'trace_id',
};

export function getRealFieldName(fieldName: string) {
  // Return unchanged if field is already namespaced or real
  if (
    keepFields.includes(fieldName) ||
    fieldName.startsWith('body.structured.') ||
    fieldName.startsWith('resource.attributes.') ||
    fieldName.startsWith('attributes.')
  ) {
    return fieldName;
  }
  if (renameMap[fieldName]) {
    return renameMap[fieldName];
  }

  if (
    fieldName.startsWith('host.') ||
    fieldName.startsWith('cloud.') ||
    fieldName.startsWith('agent.')
  ) {
    return `resource.attributes.${fieldName}`;
  }
  // Default: prefix with "attributes."
  return `attributes.${fieldName}`;
}
