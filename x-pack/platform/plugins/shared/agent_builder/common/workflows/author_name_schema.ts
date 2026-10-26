/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazySchema, z } from '@kbn/zod/v4';
import { USER_MESSAGE_AUTHOR_NAME_MAX_LENGTH } from '@kbn/agent-builder-common';

/**
 * Optional display name for the user message a workflow step writes. Shared by every step that
 * can run as a service account, so the bound and the blank check never drift between them.
 */
export const authorNameSchema = lazySchema(() =>
  z
    .string()
    .max(USER_MESSAGE_AUTHOR_NAME_MAX_LENGTH)
    .refine((value) => value.trim().length > 0, { message: 'author_name must not be blank' })
    .optional()
    .describe(
      'Display name recorded on the user message this step writes, for example the workflow name. Applied only when the workflow runs as a service account; the message stays attributed to that account.'
    )
);
