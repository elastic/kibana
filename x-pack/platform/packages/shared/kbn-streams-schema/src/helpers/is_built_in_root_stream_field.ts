/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isRoot, LOGS_ECS_STREAM_NAME } from '../shared/hierarchy';

/**
 * Built-in field names on OTel-based root streams (`logs`, `logs.otel`, and other
 * non-ECS roots). Must match the keys of `otelBaseFields` in logs_otel_layer.ts.
 */
export const otelRootBuiltInFieldNames = [
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
] as const;

/**
 * Built-in field names on the ECS root stream (`logs.ecs`).
 * Must match the keys of `ecsBaseFields` in logs_ecs_layer.ts.
 */
export const ecsRootBuiltInFieldNames = [
  '@timestamp',
  'stream.name',
  'scope.name',
  'host.name',
  'trace.id',
  'span.id',
  'service.name',
  'message',
  'log.level',
] as const;

/**
 * Returns whether `fieldName` is a built-in default mapping on the given root stream.
 * Custom mappings may be added on root streams, but these defaults cannot be removed
 * or overridden.
 */
export function isBuiltInRootStreamField(streamName: string, fieldName: string): boolean {
  if (!isRoot(streamName)) {
    return false;
  }

  const builtInFields =
    streamName === LOGS_ECS_STREAM_NAME ? ecsRootBuiltInFieldNames : otelRootBuiltInFieldNames;

  return (builtInFields as readonly string[]).includes(fieldName);
}
