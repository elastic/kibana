/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { defineAlertActionType } from '../define';

export const snoozeActionType = defineAlertActionType({
  id: 'snooze',
  description: 'Snoozes an alert.',
  bodySchema: z.object({
    expiry: z.string().optional().describe('ISO datetime when snooze should expire.'),
  }),
  esMappings: {
    expiry: { type: 'date' },
  },
});
