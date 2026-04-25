/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Streams } from '../models/streams';

export type StreamType = 'wired' | 'classic' | 'query' | 'unknown';

export function getStreamTypeFromDefinition(definition: Streams.all.Definition): StreamType {
  if (Streams.WiredStream.Definition.is(definition)) {
    return 'wired';
  }

  if (Streams.ClassicStream.Definition.is(definition)) {
    return 'classic';
  }

  if (Streams.QueryStream.Definition.is(definition)) {
    return 'query';
  }

  return 'unknown';
}
