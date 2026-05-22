/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { MAX_SUGGESTED_PROFILES } from '../../../constants';
import { limitedNumberSchema } from '../../../schema_zod';
import { UserWithProfileInfoSchema } from '../../domain_zod/user/v1';

export const GetCaseUsersResponseSchema = z.object({
  assignees: z.array(UserWithProfileInfoSchema),
  unassignedUsers: z.array(UserWithProfileInfoSchema),
  participants: z.array(UserWithProfileInfoSchema),
  reporter: UserWithProfileInfoSchema,
});

export const SuggestUserProfilesRequestSchema = z.object({
  name: z.string(),
  owners: z.array(z.string()),
  size: limitedNumberSchema({ fieldName: 'size', min: 1, max: MAX_SUGGESTED_PROFILES }).optional(),
});

export type GetCaseUsersResponse = z.infer<typeof GetCaseUsersResponseSchema>;
export type SuggestUserProfilesRequest = z.infer<typeof SuggestUserProfilesRequestSchema>;
