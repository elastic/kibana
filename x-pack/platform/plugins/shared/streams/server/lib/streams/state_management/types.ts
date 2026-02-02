/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient, Logger } from '@kbn/core/server';
import type { Feature, Streams, StreamQuery } from '@kbn/streams-schema';
import type { LockManagerService } from '@kbn/lock-manager';
import type { StreamsClient } from '../client';
import type { StreamsStorageClient } from '../storage/streams_storage_client';
import type { QueryClient } from '../assets/query/query_client';
import type { AttachmentClient } from '../attachments/attachment_client';
import type { SystemClient } from '../system/system_client';
import type { FeatureClient } from '../feature/feature_client';
import type { AttachmentLink } from '../attachments/types';

interface StreamUpsertChange {
  type: 'upsert';
  definition: Streams.all.Definition;
}

interface StreamDeleteChange {
  name: string;
  type: 'delete';
}

// Attachment changes
interface LinkAttachmentChange {
  type: 'link_attachment';
  name: string;
  attachment: AttachmentLink;
}

interface UnlinkAttachmentChange {
  type: 'unlink_attachment';
  name: string;
  attachment: AttachmentLink;
}

// Query changes
interface UpsertQueryChange {
  type: 'upsert_query';
  name: string;
  query: StreamQuery;
}

interface DeleteQueryChange {
  type: 'delete_query';
  name: string;
  queryId: string;
}

// Feature changes
interface UpsertFeatureChange {
  type: 'upsert_feature';
  name: string;
  feature: Feature;
}

interface DeleteFeatureChange {
  type: 'delete_feature';
  name: string;
  featureId: string;
}

export type StreamChange =
  | StreamUpsertChange
  | StreamDeleteChange
  | LinkAttachmentChange
  | UnlinkAttachmentChange
  | UpsertQueryChange
  | DeleteQueryChange
  | UpsertFeatureChange
  | DeleteFeatureChange;

export interface StateDependencies {
  logger: Logger;
  lockManager: LockManagerService;
  streamsClient: StreamsClient;
  storageClient: StreamsStorageClient;
  scopedClusterClient: IScopedClusterClient;
  systemClient: SystemClient;
  attachmentClient: AttachmentClient;
  queryClient: QueryClient;
  featureClient: FeatureClient;
  isServerless: boolean;
  isDev: boolean;
}
