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
import type { ITagsClient } from '../common/types';
import type { IAssignmentService } from './services';

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
export interface SavedObjectTaggingStart {
  /**
   * Creates a TagClient bound to the provided SavedObject client.
   */
  createTagClient: (options: CreateTagClientOptions) => ITagsClient;

  /**
   * Creates an internal AssignmentService bound to the provided SavedObject client.
   *
   * @remark: As assignment services created via this API will not be performing authz check to ensure
   *          that the current user is allowed to update the assigned/unassigned objects.
   *          This API is only meant to be used to perform operations on behalf of the 'internal' Kibana user.
   *          When trying to assign or unassign tags on behalf of a user, use the `tags` request handler context
   *          instead.
   */
  createInternalAssignmentService: (
    options: CreateTagAssignmentServiceOptions
  ) => IAssignmentService;
}

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
