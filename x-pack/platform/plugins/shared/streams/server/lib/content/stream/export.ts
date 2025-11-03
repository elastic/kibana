/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ContentPackStream } from '@kbn/content-packs-schema';
import { ROOT_STREAM_ID } from '@kbn/content-packs-schema';
import { withoutRootPrefix } from './helpers';
import type { StreamTree } from './tree';

export function prepareStreamsForExport({ tree }: { tree: StreamTree }): ContentPackStream[] {
  return asExportedObjects(tree.name, tree);
}

function asExportedObjects(root: string, tree: StreamTree): ContentPackStream[] {
  const name = tree.name === root ? ROOT_STREAM_ID : withoutRootPrefix(root, tree.name);

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
            wired: { ...tree.request.stream.ingest.wired, routing },
          },
        },
      },
    },
    ...tree.children.flatMap((child) => asExportedObjects(root, child)),
  ];
}
