/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ContentPackStream, ROOT_STREAM_ID } from '@kbn/content-packs-schema';
import { FieldDefinition } from '@kbn/streams-schema';
import { withoutRootPrefix } from './helpers';
import { StreamTree } from './tree';

export function prepareStreamsForExport({
  tree,
  inheritedFields,
}: {
  tree: StreamTree;
  inheritedFields: FieldDefinition;
}): ContentPackStream[] {
  const queue = [tree];
  const streams: ContentPackStream[] = [];
  while (queue.length > 0) {
    const stream = queue.shift()!;
    streams.push(asExportedObject(tree.name, stream, inheritedFields));
    queue.push(...stream.children);
  }
  return streams;
}

function asExportedObject(
  root: string,
  tree: StreamTree,
  inheritedFields: FieldDefinition
): ContentPackStream {
  const name = tree.name === root ? ROOT_STREAM_ID : withoutRootPrefix(root, tree.name);

  const streamFields = tree.request.stream.ingest.wired.fields;
  const fields = tree.name === root ? { ...inheritedFields, ...streamFields } : streamFields;

  const routing = tree.request.stream.ingest.wired.routing.map((routing) => ({
    ...routing,
    destination: withoutRootPrefix(root, routing.destination),
  }));

  return {
    type: 'stream' as const,
    name,
    request: {
      ...tree.request,
      stream: {
        ...tree.request.stream,
        ingest: {
          ...tree.request.stream.ingest,
          wired: { ...tree.request.stream.ingest.wired, routing, fields },
        },
      },
    },
  };
}
