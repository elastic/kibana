/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

const suggestedUserProfileSchema = z.object({
  uid: z.string(),
  user: z.object({
    username: z.string(),
    full_name: z.string().optional(),
    email: z.string().optional(),
  }),
  avatar: z
    .object({
      initials: z.string().nullable().optional(),
      color: z.string().nullable().optional(),
      image_url: z.string().nullable().optional(),
    })
    .optional(),
});

export const suggestUserProfilesResponseSchema = z
  .array(suggestedUserProfileSchema)
  .meta({ id: 'alerting_suggest_user_profiles_response' });
