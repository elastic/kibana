/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamDefinition } from '@kbn/streams-schema';
import { isUnwiredStreamDefinition } from '@kbn/streams-schema';

export function getIndexPatterns(stream: StreamDefinition | undefined) {
  if (!stream) {
    return undefined;
  }
  if (!isUnwiredStreamDefinition(stream)) {
    return [stream.name];
  }
  const isRoot = stream.name.indexOf('.') === -1;
  const dataStreamOfDefinition = stream.name;
  return isRoot
    ? [dataStreamOfDefinition, `${dataStreamOfDefinition}.*`]
    : [`${dataStreamOfDefinition}*`];
}
