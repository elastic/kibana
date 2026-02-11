/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Streams } from '../models/streams';

/**
 * Determines whether a stream should conform to OpenTelemetry (OTel) naming convention or not.
 *
 * A stream should conform to OTel in the following cases:
 * - If it is a wired stream (Streams.WiredStream.Definition)
 * - If its name matches the pattern `logs-*.otel-*`
 *
 * @param stream - The stream definition to check
 * @returns boolean - true if the stream should conform to OTel naming convention, false otherwise
 */
export function isOtelStream(stream: Streams.all.Definition) {
  const isWiredStream = Streams.WiredStream.Definition.is(stream);
  return isWiredStream || stream.name.match(/^logs-.*\.otel-/) !== null;
}
