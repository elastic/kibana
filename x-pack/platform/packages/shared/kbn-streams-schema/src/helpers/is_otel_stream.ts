/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Streams } from '../models/streams';
import { getRoot, LOGS_ECS_STREAM_NAME } from '../shared/hierarchy';

/**
 * Determines whether a stream should conform to OpenTelemetry (OTel) naming convention or not.
 *
 * A stream should conform to OTel in the following cases:
 * - If it is a wired stream whose root is NOT `logs.ecs` (ECS wired streams use ECS naming)
 * - If its name matches the pattern `logs-*.otel-*`
 *
 * @param stream - The stream definition to check
 * @returns boolean - true if the stream should conform to OTel naming convention, false otherwise
 */
export const OTEL_CONTENT_FIELD = 'body.text';
export const ECS_CONTENT_FIELD = 'message';
export const OTEL_SEVERITY_FIELD = 'severity_text';
export const ECS_SEVERITY_FIELD = 'log.level';

export function isOtelStream(stream: Streams.all.Definition) {
  const isWiredStream = Streams.WiredStream.Definition.is(stream);
  const isEcsStream = getRoot(stream.name) === LOGS_ECS_STREAM_NAME;
  return (isWiredStream && !isEcsStream) || stream.name.match(/^logs-.*\.otel-/) !== null;
}
