/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import {
  ContentPack,
  ContentPackIncludedObjects,
  ContentPackStream,
} from '@kbn/content-packs-schema';
import { Streams } from '@kbn/streams-schema';
import { StreamTree, asTree, mergeTrees } from './tree';
import { AssetClient } from '../../streams/assets/asset_client';
import { StreamsClient } from '../../streams/client';
import { asContentPackEntry, scopeContentPackStreams, scopeIncludedObjects } from './helpers';

export async function importContentPack({
  root,
  contentPack,
  assetClient,
  streamsClient,
  include,
}: {
  root: Streams.WiredStream.Definition;
  contentPack: ContentPack;
  assetClient: AssetClient;
  streamsClient: StreamsClient;
  include: ContentPackIncludedObjects;
}) {
  const descendants = await streamsClient.getDescendants(root.name);
  const queryLinks = await assetClient.getAssetLinks(
    [root.name, ...descendants.map(({ name }) => name)],
    ['query']
  );

  const existingTree = asTree({
    root: root.name,
    include: { objects: { all: {} } },
    streams: [root, ...descendants].map((stream) =>
      asContentPackEntry({ stream, queryLinks: queryLinks[stream.name] })
    ),
  });

  const incomingTree = asTree({
    root: root.name,
    include: scopeIncludedObjects({ root: root.name, include }),
    streams: scopeContentPackStreams({
      root: root.name,
      streams: contentPack.entries.filter(
        (entry): entry is ContentPackStream => entry.type === 'stream'
      ),
    }),
  });

  const streams = prepareStreamsForImport({ existing: existingTree, incoming: incomingTree });
  return await streamsClient.bulkUpsert(streams);
}

export function prepareStreamsForImport({
  existing,
  incoming,
}: {
  existing: StreamTree;
  incoming: StreamTree;
}): ContentPackStream[] {
  return flattenTree(mergeTrees({ existing, incoming }));
}

function flattenTree(tree: StreamTree): ContentPackStream[] {
  return [omit(tree, 'children'), ...tree.children.flatMap(flattenTree)];
}
