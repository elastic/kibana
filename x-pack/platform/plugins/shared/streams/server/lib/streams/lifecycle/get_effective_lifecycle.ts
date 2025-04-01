/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndicesDataStream } from '@elastic/elasticsearch/lib/api/types';
import {
  IngestStreamDefinition,
  findInheritedLifecycle,
  isInheritLifecycle,
  isUnwiredStreamDefinition,
} from '@kbn/streams-schema';
import { StreamsClient } from '../client';
import { getDataStreamLifecycle } from '../stream_crud';

export async function getEffectiveLifecycle({
  definition,
  streamsClient,
  dataStream,
}: {
  definition: IngestStreamDefinition;
  streamsClient: StreamsClient;
  dataStream: IndicesDataStream;
}) {
  if (isUnwiredStreamDefinition(definition)) {
    return getDataStreamLifecycle(dataStream);
  }

  if (isInheritLifecycle(definition.ingest.lifecycle)) {
    const ancestors = await streamsClient.getAncestors(definition.name);
    return findInheritedLifecycle(definition, ancestors);
  }

  return definition.ingest.lifecycle;
}
