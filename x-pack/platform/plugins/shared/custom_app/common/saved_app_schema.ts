/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { appDocumentSchema } from '@kbn/custom-app-common';
import { MAX_APP_DESCRIPTION_LENGTH, MAX_APP_TITLE_LENGTH } from './constants';

/** What a client sends to save an app: the document goes through the full rules of its schema. */
export const savedAppInputSchema = lazySchema(() =>
  z.object({
    title: z.string().min(1).max(MAX_APP_TITLE_LENGTH),
    description: z.string().max(MAX_APP_DESCRIPTION_LENGTH).optional(),
    document: appDocumentSchema,
  })
);

export type SavedAppInput = z.output<typeof savedAppInputSchema>;

export const findSavedAppsQuerySchema = lazySchema(() =>
  z.object({
    search: z.string().max(MAX_APP_TITLE_LENGTH).optional(),
    page: z.coerce.number().int().min(1).max(10_000).default(1),
    perPage: z.coerce.number().int().min(1).max(100).default(20),
  })
);

export const savedAppIdParamsSchema = lazySchema(() =>
  z.object({ id: z.string().min(1).max(256) })
);
