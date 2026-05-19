/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ECS_BASE_FIELD_NAMES: ReadonlySet<string> = new Set([
  '@timestamp',
  'stream.name',
  'scope.name',
  'host.name',
  'trace.id',
  'span.id',
  'service.name',
  'message',
  'log.level',
]);

export const OTEL_BASE_FIELD_NAMES: ReadonlySet<string> = new Set([
  '@timestamp',
  'stream.name',
  'scope.name',
  'trace_id',
  'span_id',
  'event_name',
  'severity_text',
  'body.text',
  'severity_number',
  'resource.attributes.host.name',
  'resource.attributes.service.name',
]);
