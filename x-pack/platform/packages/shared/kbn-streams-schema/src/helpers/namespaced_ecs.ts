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
