/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { MAX_USER_ACTIONS_PER_PAGE } from '../../../constants';
import { paginationSchema } from '../../../schema';
import type { CaseUserActionInjectedIdsSchema } from '../../domain/user_action/v1';
import {
  CaseUserActionBasicSchema,
  CaseUserActionInjectedDeprecatedIdsSchema,
  UserActionsSchema,
} from '../../domain/user_action/v1';
import { UserActionTypes } from '../../domain/user_action/action/v1';
import type { AttachmentsV2 } from '../../domain';

const UserActionAdditionalFindRequestFilterTypes = {
  action: 'action',
  alert: 'alert',
  user: 'user',
  attachment: 'attachment',
} as const;

const UserActionFindRequestTypes = {
  ...UserActionTypes,
  ...UserActionAdditionalFindRequestFilterTypes,
} as const;

type UserActionFindRequestTypeValue =
  (typeof UserActionFindRequestTypes)[keyof typeof UserActionFindRequestTypes];
const UserActionFindRequestTypesValues = Object.values(UserActionFindRequestTypes) as [
  UserActionFindRequestTypeValue,
  ...UserActionFindRequestTypeValue[]
];

/**
 * User actions stats API
 */
export const CaseUserActionStatsSchema = z.object({
  total: z.number(),
  total_deletions: z.number(),
  total_comments: z.number(),
  total_comment_deletions: z.number(),
  total_comment_creations: z.number(),
  total_hidden_comment_updates: z.number(),
  total_other_actions: z.number(),
  total_other_action_deletions: z.number(),
});

export const CaseUserActionStatsResponseSchema = CaseUserActionStatsSchema;

/**
 * Deprecated APIs
 */
export const CaseUserActionDeprecatedResponseSchema = CaseUserActionBasicSchema.and(
  CaseUserActionInjectedDeprecatedIdsSchema
);
export const CaseUserActionsDeprecatedResponseSchema = z.array(
  CaseUserActionDeprecatedResponseSchema
);

/**
 * Find User Actions API
 */
export const UserActionFindRequestSchema = paginationSchema({
  maxPerPage: MAX_USER_ACTIONS_PER_PAGE,
}).extend({
  types: z.array(z.enum(UserActionFindRequestTypesValues)).optional(),
  sortOrder: z.enum(['desc', 'asc']).optional(),
});

export const UserActionFindResponseSchema = z.object({
  userActions: UserActionsSchema,
  page: z.number(),
  perPage: z.number(),
  total: z.number(),
});

export type CaseUserActionStats = z.infer<typeof CaseUserActionStatsSchema>;
export type CaseUserActionStatsResponse = z.infer<typeof CaseUserActionStatsResponseSchema>;
export type UserActionFindRequest = z.infer<typeof UserActionFindRequestSchema>;
export type UserActionFindResponse = z.infer<typeof UserActionFindResponseSchema>;
export type CaseUserActionDeprecatedResponse = z.infer<
  typeof CaseUserActionDeprecatedResponseSchema
>;
export type CaseUserActionsDeprecatedResponse = z.infer<
  typeof CaseUserActionsDeprecatedResponseSchema
>;
export type UserActionFindRequestTypes = (typeof UserActionFindRequestTypesValues)[number];
export type UserActionWithResponse<T> = T & { id: string; version: string } & z.infer<
    typeof CaseUserActionInjectedIdsSchema
  >;

export interface UserActionInternalFindResponse extends UserActionFindResponse {
  latestAttachments: AttachmentsV2;
}
