/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient, Logger } from '@kbn/core/server';
import { Streams } from '@kbn/streams-schema';
import { LockManagerService } from '@kbn/lock-manager';
import type { AssetClient } from '../assets/asset_client';
import type { StreamsClient } from '../client';
import type { StreamsStorageClient } from '../service';

interface StreamUpsertChange {
  type: 'upsert';
  definition: Streams.all.Definition;
}

interface StreamDeleteChange {
  name: string;
  type: 'delete';
}

export type StreamChange = StreamUpsertChange | StreamDeleteChange;

export interface StateDependencies {
  logger: Logger;
  lockManager: LockManagerService;
  streamsClient: StreamsClient;
  storageClient: StreamsStorageClient;
  scopedClusterClient: IScopedClusterClient;
  assetClient: AssetClient;
  isServerless: boolean;
  isDev: boolean;
}
