/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { appDocumentShapeSchema } from '@kbn/custom-app-common';

export const customAppCreateSchema = lazySchema(() =>
  z.object({
    title: z
      .string()
      .max(256)
      .optional()
      .describe('A short title for the app, used when it is saved to a dashboard.'),
    document: appDocumentShapeSchema.describe('The complete app to create.'),
  })
);

export type CustomAppCreate = z.output<typeof customAppCreateSchema>;
