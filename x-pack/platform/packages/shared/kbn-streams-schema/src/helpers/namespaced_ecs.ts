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

export const aliases: Record<string, string> = {
  trace_id: 'trace.id',
  span_id: 'span.id',
  severity_text: 'log.level',
  'body.text': 'message',
};

export const namespacePrefixes = [
  'body.structured.',
  'attributes.',
  'scope.attributes.',
  'resource.attributes.',
];

export function getRegularEcsField(field: string): string {
  // check whether it starts with a namespace prefix
  for (const prefix of namespacePrefixes) {
    if (field.startsWith(prefix)) {
      return field.slice(prefix.length);
    }
  }
  // check aliases
  if (aliases[field]) {
    return aliases[field];
  }
  return field;
}

export function isNamespacedEcsField(field: string): boolean {
  return namespacePrefixes.some((prefix) => field.startsWith(prefix)) || keepFields.includes(field);
}
