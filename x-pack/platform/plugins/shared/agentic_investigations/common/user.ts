/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

const MAX_ID_LENGTH = 1024;
const MAX_NAME_LENGTH = 256;

/**
 * Who acted, shared by every entity this plugin owns.
 *
 * The shape Cases established: the profile uid is the stable identity a UI
 * resolves an avatar from, and the names are stored rather than looked up so
 * attribution survives a missing profile. The uid is genuinely often absent —
 * security disabled, a `run-as` proxy, a session without a profile, or an API
 * key whose creator has no activated profile.
 */
export const userSchema = z.object({
  username: z.string().max(MAX_ID_LENGTH).nullable(),
  fullName: z.string().max(MAX_NAME_LENGTH).nullable(),
  email: z.string().max(MAX_NAME_LENGTH).nullable(),
  profileUid: z.string().max(MAX_ID_LENGTH).optional(),
});
export type User = z.infer<typeof userSchema>;
