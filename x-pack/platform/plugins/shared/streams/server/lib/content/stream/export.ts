/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ContentPackStream } from '@kbn/content-packs-schema';
import { ROOT_STREAM_ID } from '@kbn/content-packs-schema';
import type { FieldDefinition } from '@kbn/streams-schema';
import { withoutRootPrefix } from './helpers';
import type { StreamTree } from './tree';

export function prepareStreamsForExport({
  tree,
  inheritedFields,
}: {
  tree: StreamTree;
  inheritedFields: FieldDefinition;
}): ContentPackStream[] {
  return asExportedObjects(tree.name, tree, inheritedFields);
}

function asExportedObjects(
  root: string,
  tree: StreamTree,
  inheritedFields: FieldDefinition
): ContentPackStream[] {
  const name = tree.name === root ? ROOT_STREAM_ID : withoutRootPrefix(root, tree.name);

  const streamFields = tree.request.stream.ingest.wired.fields;
  const fields = tree.name === root ? { ...inheritedFields, ...streamFields } : streamFields;

  const routing = tree.request.stream.ingest.wired.routing.map(({ destination, ...rest }) => ({
    ...rest,
    destination: withoutRootPrefix(root, destination),
  }));

  return [
    {
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
    },
    ...tree.children.flatMap((child) => asExportedObjects(root, child, inheritedFields)),
  ];
}
