/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

const UserWithoutProfileUidSchema = z.object({
  email: z.string().nullable().optional(),
  full_name: z.string().nullable().optional(),
  username: z.string().nullable().optional(),
});

export const UserSchema = UserWithoutProfileUidSchema.extend({
  profile_uid: z.string().optional(),
});

export const UserWithProfileInfoSchema = z.object({
  user: UserWithoutProfileUidSchema,
  uid: z.string().optional(),
  avatar: z
    .object({
      initials: z.string().nullable(),
      color: z.string().nullable(),
      imageUrl: z.string().nullable(),
    })
    .optional(),
});

export const UsersSchema = z.array(UserSchema);

export type User = z.infer<typeof UserSchema>;
export type UserWithProfileInfo = z.infer<typeof UserWithProfileInfoSchema>;

export const CaseUserProfileSchema = z.object({
  uid: z.string(),
});

export type CaseUserProfile = z.infer<typeof CaseUserProfileSchema>;

/**
 * UID-only assignees for caller-supplied input (templates, imports). Identity
 * fields are server-derived, so they must not be expressible on the input side.
 */
export const CaseUserProfilesSchema = z.array(CaseUserProfileSchema);
export type CaseUserProfiles = z.infer<typeof CaseUserProfilesSchema>;

export const CaseAssigneeSchema = z.object({
  uid: z.string(),
  username: z.string().nullable().optional(),
  full_name: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
});

export type CaseAssignee = z.infer<typeof CaseAssigneeSchema>;

/**
 * Assignees
 */
export const CaseAssigneesSchema = z.array(CaseAssigneeSchema);
export type CaseAssignees = z.infer<typeof CaseAssigneesSchema>;
