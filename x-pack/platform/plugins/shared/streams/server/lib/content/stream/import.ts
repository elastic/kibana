/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import {
  ConflictResolution,
  ContentPack,
  ContentPackIncludedObjects,
  ContentPackStream,
} from '@kbn/content-packs-schema';
import { Streams } from '@kbn/streams-schema';
import { StreamTree, asTree, mergeTrees } from './tree';
import { AssetClient } from '../../streams/assets/asset_client';
import { StreamsClient } from '../../streams/client';
import {
  asContentPackEntry,
  buildResolvers,
  scopeContentPackStreams,
  scopeIncludedObjects,
} from './helpers';
import { ContentPackInstallation } from '../content_client';

export async function importContentPack({
  root,
  contentPack,
  assetClient,
  streamsClient,
  include,
  installation,
  resolutions,
}: {
  root: Streams.WiredStream.Definition;
  contentPack: ContentPack;
  assetClient: AssetClient;
  streamsClient: StreamsClient;
  include: ContentPackIncludedObjects;
  installation?: ContentPackInstallation;
  resolutions: ConflictResolution[];
}) {
  const { merged } = await mergeContentPack({
    root,
    contentPack,
    assetClient,
    streamsClient,
    include,
    installation,
    resolutions,
  });

  const streams = flattenTree(merged);
  return await streamsClient.bulkUpsert(streams);
}

export async function mergeContentPack({
  root,
  contentPack,
  assetClient,
  streamsClient,
  include,
  installation,
  resolutions,
}: {
  root: Streams.WiredStream.Definition;
  contentPack: ContentPack;
  assetClient: AssetClient;
  streamsClient: StreamsClient;
  include: ContentPackIncludedObjects;
  installation?: ContentPackInstallation;
  resolutions: ConflictResolution[];
}) {
  const descendants = await streamsClient.getDescendants(root.name);
  const queryLinks = await assetClient.getAssetLinks(
    [root.name, ...descendants.map(({ name }) => name)],
    ['query']
  );

  const baseTree = installation
    ? asTree({
        root: root.name,
        include: { objects: { all: {} } },
        streams: installation.streams,
      })
    : undefined;

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

  return mergeTrees({
    base: baseTree,
    existing: existingTree,
    incoming: incomingTree,
    resolverFactories: buildResolvers(resolutions),
  });
}

export function flattenTree(tree: StreamTree): ContentPackStream[] {
  return [omit(tree, 'children'), ...tree.children.flatMap(flattenTree)];
}
