/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { appDocumentShapeSchema } from '@kbn/custom-app-common';

/**
 * What an agent gives the tool: which panel, and the whole app as it should be. Only the shape of
 * the document is checked here; what the tool then finds wrong across it (a value that does not
 * exist, two components with one id) it reports in words the agent can act on.
 */
export const customAppUpdateSchema = lazySchema(() =>
  z.object({
    embeddable_id: z
      .string()
      .min(1)
      .max(256)
      .optional()
      .describe(
        'The embeddable_id of the custom app to change, as shown in its context. Use this for an app the user sent to chat from a panel.'
      ),
    attachment_id: z
      .string()
      .min(1)
      .max(256)
      .optional()
      .describe(
        'The attachment_id returned when the app was created in this conversation. Use this instead of embeddable_id for such an app.'
      ),
    document: appDocumentShapeSchema.describe(
      'The complete app as it should be after the change. Start from the current document in the context and change only what was asked.'
    ),
  })
);

export type CustomAppUpdate = z.output<typeof customAppUpdateSchema>;
