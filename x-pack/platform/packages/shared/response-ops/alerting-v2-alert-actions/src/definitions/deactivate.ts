/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { defineAlertActionType } from '../define';

export const deactivateActionType = defineAlertActionType({
  id: 'deactivate',
  description: 'Deactivates an alert.',
  bodySchema: z.object({
    reason: z.string().describe('Reason for deactivating the alert.'),
  }),
  esMappings: {
    reason: { type: 'text' },
  },
});
