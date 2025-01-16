/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IRouter,
  CustomRequestHandlerContext,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import {
  IAssignmentService,
  SavedObjectsTaggingApiServer,
} from '@kbn/saved-objects-tagging-oss-plugin/server';
import type { ITagsClient } from '../common/types';

export interface ITagsRequestHandlerContext {
  tagsClient: ITagsClient;
  assignmentService: IAssignmentService;
}

/** @public */
export interface CreateTagClientOptions {
  client: SavedObjectsClientContract;
}

/** @public */
export interface CreateTagAssignmentServiceOptions {
  client: SavedObjectsClientContract;
}

/** @public */
export type SavedObjectTaggingStart = SavedObjectsTaggingApiServer;

/**
 * @internal
 */
export type TagsHandlerContext = CustomRequestHandlerContext<{
  tags: ITagsRequestHandlerContext;
}>;

/**
 * @internal
 */
export type TagsPluginRouter = IRouter<TagsHandlerContext>;
