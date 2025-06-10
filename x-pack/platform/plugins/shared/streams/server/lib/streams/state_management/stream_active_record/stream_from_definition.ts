/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Streams } from '@kbn/streams-schema';
import type { StateDependencies } from '../types';
import type { StreamActiveRecord } from './stream_active_record';
import { UnwiredStream } from '../streams/unwired_stream';
import { WiredStream } from '../streams/wired_stream';
import { GroupStream } from '../streams/group_stream';

// This should be the only thing that knows about the various stream types
export function streamFromDefinition(
  definition: Streams.all.Definition,
  dependencies: StateDependencies
): StreamActiveRecord {
  if (Streams.WiredStream.Definition.is(definition)) {
    return new WiredStream(definition, dependencies);
  } else if (Streams.UnwiredStream.Definition.is(definition)) {
    return new UnwiredStream(definition, dependencies);
  } else if (Streams.GroupStream.Definition.is(definition)) {
    return new GroupStream(definition, dependencies);
  }

  throw new Error('Unsupported stream type');
}
