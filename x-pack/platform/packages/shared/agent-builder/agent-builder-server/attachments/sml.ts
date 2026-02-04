/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { Logger } from '@kbn/logging';
import type { MaybePromise } from '@kbn/utility-types';
import type { Attachment } from '@kbn/agent-builder-common/attachments';

export type SmlUpdateAction = 'create' | 'update' | 'delete';

export interface SmlAttachmentListItem {
  attachmentId: string;
  attachmentType: string;
  createdAt?: string;
  updatedAt: string;
  spaceId?: string;
}

export interface SmlAttachmentListContext {
  esClient: ElasticsearchClient;
  savedObjectsClient: SavedObjectsClientContract;
  logger: Logger;
}

export interface SmlAttachmentChunk {
  id?: string;
  type: string;
  title?: string;
  fields?: string[];
  indexPatterns?: string[];
  tags?: string[];
  content: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SmlAttachmentData {
  chunks: SmlAttachmentChunk[];
}

export interface SmlAttachmentPermissions {
  spaces: string[];
}

export interface SmlAttachmentDataContext {
  request?: KibanaRequest;
  savedObjectsClient: SavedObjectsClientContract;
  spaceId: string;
}

export interface SmlAttachmentTypeDefinition<TType extends string = string, TContent = unknown> {
  list: (context: SmlAttachmentListContext) => MaybePromise<SmlAttachmentListItem[]>;
  fetchFrequency?: () => string;
  getSmlData: (
    attachment: Attachment<TType, TContent>,
    context: SmlAttachmentDataContext
  ) => MaybePromise<SmlAttachmentData>;
}
