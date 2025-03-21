/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient, Logger } from '@kbn/core/server';
import type { UnwiredStreamUpsertRequest, WiredStreamUpsertRequest } from '@kbn/streams-schema';
import type { AssetClient } from '../assets/asset_client';
import type { StreamsClient } from '../client';
import type { StreamsStorageClient } from '../service';

interface WiredStreamUpsertChange {
  target: string;
  type: 'wired_upsert';
  request: WiredStreamUpsertRequest & {
    stream: {
      name: string;
    };
  };
}

interface UnwiredStreamUpsertChange {
  target: string;
  type: 'unwired_upsert';
  request: UnwiredStreamUpsertRequest & {
    stream: {
      name: string;
    };
  };
}

interface StreamDeleteChange {
  target: string;
  type: 'delete';
}

export type StreamChange = UnwiredStreamUpsertChange | WiredStreamUpsertChange | StreamDeleteChange;

export interface StateDependencies {
  scopedClusterClient: IScopedClusterClient;
  assetClient: AssetClient;
  storageClient: StreamsStorageClient;
  logger: Logger;
  isServerless: boolean;
  streamsClient: StreamsClient;
}
