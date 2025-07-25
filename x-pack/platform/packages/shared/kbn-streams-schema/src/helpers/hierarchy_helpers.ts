/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Streams } from '../models/streams';

export function getIndexPatternsForStream<T extends Streams.all.Definition | undefined>(
  stream: T
): T extends Streams.all.Definition ? string[] : undefined;

export function getIndexPatternsForStream(stream: Streams.all.Definition | undefined) {
  if (!stream) {
    return undefined;
  }
  if (Streams.UnwiredStream.Definition.is(stream)) {
    return [stream.name];
  }
  const dataStreamOfDefinition = stream.name;
  return [dataStreamOfDefinition, `${dataStreamOfDefinition}.*`];
}
