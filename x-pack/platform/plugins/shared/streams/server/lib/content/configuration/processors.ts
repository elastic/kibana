/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ContentPackIncludedObjects, isIncludeAll } from '@kbn/content-packs-schema';
import { Streams } from '@kbn/streams-schema';
import { ContentPackProcessors } from '@kbn/content-packs-schema/src/models/processors';

export async function getProcessorsEntry({
  stream,
  includedObjects,
}: {
  stream: Streams.all.Definition;
  includedObjects: ContentPackIncludedObjects;
}): Promise<ContentPackProcessors | undefined> {
  if (
    !Streams.WiredStream.Definition.is(stream) ||
    (!isIncludeAll(includedObjects) && !isIncludeAll(includedObjects.objects.processors))
  ) {
    return undefined;
  }

  if (stream.ingest.processing.length === 0) {
    return undefined;
  }

  return {
    id: 'processors',
    type: 'processors',
    content: stream.ingest.processing,
  };
}
