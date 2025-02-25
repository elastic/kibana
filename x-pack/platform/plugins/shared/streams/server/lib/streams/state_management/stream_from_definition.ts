/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StreamDefinition, isWiredStreamDefinition } from '@kbn/streams-schema';
import { StreamActiveRecord } from './stream_active_record';
import { WiredStream } from './wired_stream';

// This should be the only thing that knows about the various stream types (except the types themselves)
export function streamFromDefinition(definition: StreamDefinition): StreamActiveRecord {
  if (isWiredStreamDefinition(definition)) {
    return new WiredStream(definition);
  } else {
    throw new Error('Unsupported stream type');
  }
}
